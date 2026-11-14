/**
 * Subscription.model.js
 *
 * Lifecycle: pending → active → expired | cancelled
 *
 * KEY DESIGN NOTES:
 * - planLabel, durationMonths, and amount are LOCKED at purchase time by copying
 *   from the Plan document. Later Plan edits never affect existing subscriptions.
 * - razorpayPaymentId / razorpaySignature have NO default — they are omitted
 *   from the document until set (required for the partial-filter unique index).
 * - startDate / endDate are set only on payment activation, not at order time.
 * - amount stored in paise at purchase time so history stays accurate if pricing changes.
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Kept for backward-compat reads of old documents; new code uses Plan model
export const PLAN_CONFIG = {
  '1m':  { months: 1,   label: '1 Month'  },
  '6m':  { months: 6,   label: '6 Months' },
  '1y':  { months: 12,  label: '1 Year'   },
  '5y':  { months: 60,  label: '5 Years'  },
};

const SUB_STATUSES = ['pending', 'active', 'expired', 'cancelled'];

const SubscriptionSchema = new Schema(
  {
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    purchasedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'purchasedBy is required'],
    },

    // Plan key at time of purchase (e.g. '1m', '1y') — informational only,
    // NOT validated against a fixed enum so new plan keys work automatically.
    planType: {
      type:     String,
      required: [true, 'planType is required'],
      trim:     true,
    },

    // Human-readable label locked at purchase time from Plan.label
    planLabel: {
      type:    String,
      default: '',
    },

    // Duration locked at purchase time from Plan.durationMonths
    durationMonths: {
      type:    Number,
      default: 0,
    },

    // Price locked in paise at purchase time (₹1 = 100 paise)
    amount: {
      type:     Number,
      required: [true, 'amount is required'],
      min:      [0, 'Amount cannot be negative'],
    },

    currency: {
      type:      String,
      default:   'INR',
      uppercase: true,
    },

    // Set on activation (verifyPayment), NOT at order creation
    startDate: { type: Date },

    // Computed as startDate + durationMonths on activation
    endDate: { type: Date },

    status: {
      type:    String,
      enum:    { values: SUB_STATUSES, message: 'Invalid subscription status' },
      default: 'pending',
    },

    razorpayOrderId: { type: String },

    // Absent until payment verification — required for partial-filter unique index
    razorpayPaymentId: { type: String },

    // Stored for audit trail — never returned in API responses
    razorpaySignature: { type: String, select: false },

    renewedFromId: {
      type:    Schema.Types.ObjectId,
      ref:     'Subscription',
      default: null,
    },

    cancelledAt:        { type: Date,                  default: null },
    cancelledBy:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancellationReason: { type: String,                default: null },
    gracePeriodDays:    { type: Number,                default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: 'subscriptions',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

SubscriptionSchema.index({ collegeId: 1, status: 1 });
SubscriptionSchema.index({ collegeId: 1, status: 1, endDate: 1 });
SubscriptionSchema.index({ collegeId: 1, createdAt: -1 });
SubscriptionSchema.index({ status: 1, endDate: 1 });
SubscriptionSchema.index({ razorpayOrderId: 1 }, { sparse: true });

SubscriptionSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayPaymentId: { $exists: true, $type: 'string' },
    },
    name: 'razorpayPaymentId_1',
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

SubscriptionSchema.virtual('isValid').get(function () {
  if (this.status !== 'active' || !this.endDate) return false;
  const effectiveEnd = new Date(this.endDate);
  effectiveEnd.setDate(effectiveEnd.getDate() + (this.gracePeriodDays || 0));
  return effectiveEnd > new Date();
});

SubscriptionSchema.virtual('amountInRupees').get(function () {
  return (this.amount / 100).toFixed(2);
});

SubscriptionSchema.virtual('daysRemaining').get(function () {
  if (!this.endDate) return null;
  return Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
});

// ── Statics ───────────────────────────────────────────────────────────────────

SubscriptionSchema.statics.findActive = function (collegeId) {
  return this.findOne({ collegeId, status: 'active', endDate: { $gt: new Date() } });
};

SubscriptionSchema.statics.hasValidAccess = async function (collegeId) {
  const sub = await this.findOne({
    collegeId,
    status:  'active',
    endDate: { $gt: new Date() },
  }).lean();
  if (!sub) return false;
  if (sub.gracePeriodDays > 0) {
    const gracefulEnd = new Date(sub.endDate);
    gracefulEnd.setDate(gracefulEnd.getDate() + sub.gracePeriodDays);
    return gracefulEnd > new Date();
  }
  return true;
};

const Subscription = model('Subscription', SubscriptionSchema);
export default Subscription;
