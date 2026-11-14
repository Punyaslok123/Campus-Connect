/**
 * Notification.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * User-facing in-app notifications. Delivered in real-time via Socket.io
 * and persisted here for the notification bell/center.
 *
 * Polymorphic refId/refModel pattern allows linking to any entity
 * (Event, Job, Message, MentorshipSession, etc.).
 *
 * Bulk ops: notifications are often bulk-created (e.g. new event → notify
 * all dept students). Use insertMany, NOT save() in a loop, in the service.
 *
 * TTL: Auto-expire notifications after 90 days via MongoDB TTL index.
 *
 * Indexes:
 *   { userId, isRead, createdAt }    — notification bell count + feed
 *   { userId, collegeId, createdAt } — user's full notification list
 *   { collegeId, type, createdAt }   — admin broadcast monitoring
 *   { createdAt }                    — TTL index (auto-expire after 90 days)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const NOTIFICATION_TYPES = {
  // Content
  NEW_EVENT:           'NEW_EVENT',
  NEW_NOTE:            'NEW_NOTE',
  NOTE_DELETED:        'NOTE_DELETED',

  // Jobs & Mentorship
  NEW_JOB:             'NEW_JOB',
  NEW_INTERNSHIP:      'NEW_INTERNSHIP',
  NEW_SESSION:         'NEW_SESSION',
  SESSION_REMINDER:    'SESSION_REMINDER',   // 1hr before session
  SESSION_CANCELLED:   'SESSION_CANCELLED',

  // Messaging
  NEW_MESSAGE:         'NEW_MESSAGE',

  // Verification
  ACCOUNT_VERIFIED:    'ACCOUNT_VERIFIED',
  ACCOUNT_REJECTED:    'ACCOUNT_REJECTED',
  VERIFICATION_PENDING:'VERIFICATION_PENDING',

  // Subscription
  SUBSCRIPTION_EXPIRING:  'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED:   'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_RENEWED:   'SUBSCRIPTION_RENEWED',

  // System
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  COLLEGE_SUSPENDED:   'COLLEGE_SUSPENDED',
  WELCOME:             'WELCOME',
};

const NotificationSchema = new Schema(
  {
    // ── Recipient ─────────────────────────────────────────────────────────────
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'userId is required'],
    },

    // ── Tenant ────────────────────────────────────────────────────────────────
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    // ── Content ───────────────────────────────────────────────────────────────
    type: {
      type:     String,
      enum:     {
        values:  Object.values(NOTIFICATION_TYPES),
        message: 'Invalid notification type',
      },
      required: [true, 'type is required'],
    },

    title: {
      type:      String,
      required:  [true, 'title is required'],
      trim:      true,
      maxlength: 150,
    },

    message: {
      type:      String,
      required:  [true, 'message is required'],
      trim:      true,
      maxlength: 500,
    },

    // Optional CTA link shown in notification (frontend route)
    actionUrl: {
      type:    String,
      default: null,
    },

    // ── Reference Entity (polymorphic) ────────────────────────────────────────
    // The entity this notification is about — nullable for system notifications
    refId: {
      type:    Schema.Types.ObjectId,
      default: null,
      refPath: 'refModel',
    },

    refModel: {
      type:    String,
      enum:    ['Event', 'Note', 'Job', 'MentorshipSession', 'Message',
                'Subscription', 'User', 'Department', null],
      default: null,
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

    // ── Delivery ──────────────────────────────────────────────────────────────
    // Was this notification delivered via Socket.io in real-time?
    isDelivered: {
      type:    Boolean,
      default: false,
    },

    deliveredAt: {
      type:    Date,
      default: null,
    },

    // ── Priority ──────────────────────────────────────────────────────────────
    priority: {
      type:    String,
      enum:    ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      // urgent: subscription expiry alerts (shown in topbar, not just bell)
    },

    // ── TTL ───────────────────────────────────────────────────────────────────
    // Notifications auto-expire 90 days after creation (via TTL index)
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },  // write-once, no updatedAt needed
    collection: 'notifications',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary: notification bell feed for a user
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Unread count (most frequent query — badge on bell icon)
NotificationSchema.index({ userId: 1, isRead: 1 });

// Full notification center list
NotificationSchema.index({ userId: 1, collegeId: 1, createdAt: -1 });

// Admin: monitor notification broadcasts by type
NotificationSchema.index({ collegeId: 1, type: 1, createdAt: -1 });

// Priority notifications (urgent alerts in topbar)
NotificationSchema.index({ userId: 1, priority: 1, isRead: 1 });

// TTL index — MongoDB auto-deletes documents when expiresAt is reached
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Instance Methods ──────────────────────────────────────────────────────────

// Mark as read
NotificationSchema.methods.markRead = async function () {
  if (this.isRead) return this;
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Mark as delivered (called by Socket.io emit success handler)
NotificationSchema.methods.markDelivered = async function () {
  if (this.isDelivered) return this;
  this.isDelivered  = true;
  this.deliveredAt  = new Date();
  return this.save();
};

// ── Static Methods ────────────────────────────────────────────────────────────

// Unread count for notification bell badge
NotificationSchema.statics.unreadCount = function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Mark all as read for a user
NotificationSchema.statics.markAllRead = function (userId, collegeId) {
  return this.updateMany(
    { userId, collegeId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

/**
 * Bulk-notify multiple users efficiently.
 * Usage:
 *   await Notification.bulkNotify({
 *     userIds:   [id1, id2, ...],
 *     collegeId: college._id,
 *     type:      NOTIFICATION_TYPES.NEW_EVENT,
 *     title:     'New Event Posted',
 *     message:   'Annual Tech Fest is happening on Dec 15th',
 *     refId:     event._id,
 *     refModel:  'Event',
 *     actionUrl: '/events/123',
 *   });
 */
NotificationSchema.statics.bulkNotify = async function ({
  userIds,
  collegeId,
  type,
  title,
  message,
  refId       = null,
  refModel    = null,
  actionUrl   = null,
  priority    = 'normal',
}) {
  if (!userIds?.length) return;

  const notifications = userIds.map(userId => ({
    userId,
    collegeId,
    type,
    title,
    message,
    refId,
    refModel,
    actionUrl,
    priority,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  }));

  // insertMany with ordered:false — partial failures don't block rest
  return this.insertMany(notifications, { ordered: false });
};

// Convenience: create a single notification
NotificationSchema.statics.notify = function (data) {
  return this.create(data);
};

// ── Model export ─────────────────────────────────────────────────────────────
const Notification = model('Notification', NotificationSchema);
export default Notification;
