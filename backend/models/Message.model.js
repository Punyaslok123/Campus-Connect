/**
 * Message.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Direct messages between users within the same college tenant.
 * Designed to work with Socket.io real-time delivery.
 *
 * Use case: Students ↔ Faculty, Students ↔ Alumni (mentorship chat)
 *
 * Thread model: a "conversation" is identified by a sorted pair of userIds.
 * The conversationId virtual is: [senderId, receiverId].sort().join('_')
 * This is consistent regardless of who sends first.
 *
 * Indexes:
 *   { collegeId, receiverId, isRead }       — unread count badge
 *   { collegeId, senderId, receiverId }     — conversation thread
 *   { collegeId, receiverId, senderId }     — reverse lookup
 *   { conversationKey, createdAt }          — thread message history (pagination)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Supported attachment types (Cloudinary assets)
const AttachmentSchema = new Schema(
  {
    url:       { type: String, required: true },
    publicId:  { type: String, required: true },
    type:      {
      type: String,
      enum: ['image', 'document', 'pdf'],
      required: true,
    },
    filename:  { type: String, default: null },
    bytes:     { type: Number, default: null },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    // Messages are fully tenant-scoped — no cross-college messaging
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    // ── Participants ──────────────────────────────────────────────────────────
    senderId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'senderId is required'],
    },

    receiverId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'receiverId is required'],
    },

    // Deterministic conversation key: sorted user IDs joined
    // Stored (not virtual) so it can be indexed for fast thread queries
    conversationKey: {
      type:    String,
      // Set in pre-save hook from senderId + receiverId
    },

    // ── Content ───────────────────────────────────────────────────────────────
    content: {
      type:      String,
      trim:      true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
      default:   null,
      // Can be null if message is attachment-only
    },

    attachments: {
      type:    [AttachmentSchema],
      default: [],
    },

    // Message type for UI rendering
    messageType: {
      type:    String,
      enum:    ['text', 'attachment', 'system'],
      default: 'text',
    },

    // ── Read Status ───────────────────────────────────────────────────────────
    isRead: {
      type:    Boolean,
      default: false,
    },

    readAt: {
      type:    Date,
      default: null,
    },

    // ── Delivery Status (Socket.io tracking) ─────────────────────────────────
    deliveryStatus: {
      type:    String,
      enum:    ['sent', 'delivered', 'read'],
      default: 'sent',
    },

    // ── Soft Delete ───────────────────────────────────────────────────────────
    // Each participant can independently "delete" from their view
    deletedBySender:   { type: Boolean, default: false },
    deletedByReceiver: { type: Boolean, default: false },

    // Hard delete timestamp (both parties deleted, message fully purged by cron)
    isFullyDeleted: {
      type:    Boolean,
      default: false,
      select:  false,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Unread count badge — most frequent realtime query
MessageSchema.index({ collegeId: 1, receiverId: 1, isRead: 1 });

// Thread history — paginated conversation fetch
MessageSchema.index({ conversationKey: 1, createdAt: -1 });

// Inbox: all conversations for a user (latest message per thread)
MessageSchema.index({ collegeId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ collegeId: 1, senderId: 1,   createdAt: -1 });

// Delivery status updates (Socket.io event → DB write)
MessageSchema.index({ receiverId: 1, deliveryStatus: 1 });

// ── Pre-save Hooks ────────────────────────────────────────────────────────────

// Build deterministic conversationKey from sorted participant IDs
MessageSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('senderId') || this.isModified('receiverId')) {
    const ids = [this.senderId.toString(), this.receiverId.toString()].sort();
    this.conversationKey = ids.join('_');
  }

  // Validate: at least content or attachment required
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error('Message must have content or at least one attachment'));
  }

  // Set messageType
  if (this.attachments?.length > 0 && !this.content) {
    this.messageType = 'attachment';
  }

  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

// Convenience: is this message visible to sender?
MessageSchema.virtual('visibleToSender').get(function () {
  return !this.deletedBySender;
});

// Convenience: is this message visible to receiver?
MessageSchema.virtual('visibleToReceiver').get(function () {
  return !this.deletedByReceiver;
});

// ── Static Methods ────────────────────────────────────────────────────────────

// Get the latest message from each conversation for a user (inbox view)
MessageSchema.statics.getInbox = function (userId, collegeId, limit = 20) {
  return this.aggregate([
    {
      $match: {
        collegeId,
        $or: [
          { senderId: userId,   deletedBySender:   false },
          { receiverId: userId, deletedByReceiver: false },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id:            '$conversationKey',
        latestMessage:  { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$latestMessage' } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
  ]);
};

// Count unread messages for a user
MessageSchema.statics.unreadCount = function (userId, collegeId) {
  return this.countDocuments({
    collegeId,
    receiverId:       userId,
    isRead:           false,
    deletedByReceiver: false,
  });
};

// ── Model export ─────────────────────────────────────────────────────────────
const Message = model('Message', MessageSchema);
export default Message;
