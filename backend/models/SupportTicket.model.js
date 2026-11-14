import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['collegeAdmin', 'owner'], required: true },
    body:       { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true }
);

const SupportTicketSchema = new Schema(
  {
    collegeId:   { type: Schema.Types.ObjectId, ref: 'College', required: true },
    raisedBy:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },

    subject:     { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    status: {
      type:    String,
      enum:    ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },

    // Conversation thread on the ticket
    messages: [MessageSchema],

    // Track when the owner last replied (for "unread" indicator on admin side)
    lastOwnerReplyAt: { type: Date, default: null },
    // Track when college admin last replied
    lastAdminReplyAt: { type: Date, default: null },

    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'support_tickets',
  }
);

SupportTicketSchema.index({ collegeId: 1, createdAt: -1 });
SupportTicketSchema.index({ collegeId: 1, status: 1 });
SupportTicketSchema.index({ status: 1, createdAt: -1 }); // owner view

const SupportTicket = model('SupportTicket', SupportTicketSchema);
export default SupportTicket;
