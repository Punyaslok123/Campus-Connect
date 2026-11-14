/**
 * modules/subscription/subscription.service.js
 * Flow: createOrder → (Razorpay checkout in browser) → verifyPayment → activated
 *
 * Plan pricing is now stored in the Plan collection (persistent).
 * At purchase time, planLabel, durationMonths, and amount are LOCKED into the
 * Subscription document so future Plan edits never affect existing subscriptions.
 */

import crypto   from 'crypto';
import razorpay from '../../config/razorpay.js';
import {
  Subscription,
  College,
  Plan,
  AuditLog,
  AUDIT_ACTIONS,
  PLAN_CONFIG,
} from '../../models/index.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalError,
} from '../../utils/AppError.js';

// ── Plan CRUD (Owner) ─────────────────────────────────────────────────────────

export const listPlans = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Plan.find(filter).sort({ sortOrder: 1, durationMonths: 1 }).lean();
};

export const getPlanByKey = async (key) => {
  const plan = await Plan.findOne({ key }).lean();
  if (!plan) throw new NotFoundError(`Plan '${key}' not found`);
  return plan;
};

export const createPlan = async ({ key, label, durationMonths, priceINR, highlight, sortOrder }) => {
  const existing = await Plan.findOne({ key });
  if (existing) throw new ConflictError(`Plan with key '${key}' already exists`);

  const plan = await Plan.create({
    key,
    label,
    durationMonths,
    priceINR,
    pricePaise: Math.round(priceINR * 100),
    highlight:  highlight ?? false,
    sortOrder:  sortOrder ?? 0,
    isActive:   true,
  });
  return plan.toObject();
};

export const updatePlan = async (key, updates) => {
  const plan = await Plan.findOne({ key });
  if (!plan) throw new NotFoundError(`Plan '${key}' not found`);

  if (updates.label          != null) plan.label          = updates.label;
  if (updates.durationMonths != null) plan.durationMonths = updates.durationMonths;
  if (updates.priceINR       != null) plan.priceINR       = updates.priceINR;
  if (updates.highlight      != null) plan.highlight      = updates.highlight;
  if (updates.sortOrder      != null) plan.sortOrder      = updates.sortOrder;
  if (updates.isActive       != null) plan.isActive       = updates.isActive;
  // pricePaise auto-synced by pre-save hook

  await plan.save();
  return plan.toObject();
};

export const deletePlan = async (key) => {
  const plan = await Plan.findOne({ key });
  if (!plan) throw new NotFoundError(`Plan '${key}' not found`);

  // Soft-delete: just deactivate so it no longer shows to College Admins
  plan.isActive = false;
  await plan.save();
  return { key: plan.key, isActive: false };
};

// ── createOrder ───────────────────────────────────────────────────────────────

export const createOrder = async ({ collegeId, planKey, purchasedBy }) => {
  // 1. Load plan from DB — validates key and gets locked-in price
  const plan = await Plan.findOne({ key: planKey, isActive: true }).lean();
  if (!plan) throw new ValidationError(`Plan '${planKey}' is not available`);

  const college = await College.findById(collegeId).lean();
  if (!college) throw new NotFoundError('College not found');

  // 2. Create Razorpay order
  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount:   plan.pricePaise,
      currency: 'INR',
      receipt:  `cc_${String(collegeId).slice(-8)}_${planKey}_${Date.now().toString().slice(-8)}`,
      notes: {
        collegeId:   collegeId.toString(),
        collegeName: college.name,
        planKey,
        planLabel:   plan.label,
        purchasedBy: purchasedBy.toString(),
      },
    });
  } catch (err) {
    const detail = err?.error?.description ?? err?.message ?? String(err);
    throw new InternalError(`Failed to create payment order: ${detail}`);
  }

  // 3. Create pending subscription — lock plan values NOW so future Plan edits
  //    cannot change what this college purchased
  const subscription = await Subscription.create({
    collegeId,
    purchasedBy,
    planType:       plan.key,
    planLabel:      plan.label,
    durationMonths: plan.durationMonths,
    amount:         plan.pricePaise,
    currency:       'INR',
    status:         'pending',
    razorpayOrderId: razorpayOrder.id,
  });

  return {
    orderId:        razorpayOrder.id,
    amount:         plan.pricePaise,
    currency:       'INR',
    planType:       plan.key,
    planLabel:      plan.label,
    displayAmount:  plan.priceINR,
    subscriptionId: subscription._id,
    keyId:          process.env.RAZORPAY_KEY_ID,
    prefill:        { name: college.name },
  };
};

// ── verifyPayment ─────────────────────────────────────────────────────────────

export const verifyPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  planKey,
  collegeId,
  purchasedBy,
  ipAddress,
}) => {
  // 1. Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== razorpaySignature) {
    await AuditLog.record({
      action:          AUDIT_ACTIONS.PAYMENT_FAILED,
      collegeId,
      performedBy:     purchasedBy,
      performedByRole: 'collegeAdmin',
      metadata:        { razorpayOrderId, reason: 'signature_mismatch' },
      ipAddress,
    });
    throw new ValidationError('Payment verification failed: invalid signature. Contact support.');
  }

  // 2. Find the pending subscription for this order
  const sub = await Subscription.findOne({
    razorpayOrderId,
    collegeId,
    status: 'pending',
  });
  if (!sub) throw new NotFoundError('Subscription order not found or already processed.');

  // 3. Idempotency — reject if this paymentId was already used on a different doc
  const duplicate = await Subscription.findOne({
    razorpayPaymentId,
    _id: { $ne: sub._id },
  }).lean();
  if (duplicate) throw new ValidationError('This payment has already been processed.');

  // 4. Expire any previously active subscription for this college
  await Subscription.updateMany(
    { collegeId, status: 'active' },
    { $set: { status: 'expired' } }
  );

  // 5. Activate — set real dates now using durationMonths locked at order time
  const startDate = new Date();
  const endDate   = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (sub.durationMonths || 1));

  sub.status            = 'active';
  sub.startDate         = startDate;
  sub.endDate           = endDate;
  sub.razorpayPaymentId = razorpayPaymentId;
  sub.razorpaySignature = razorpaySignature;
  await sub.save();

  // 6. Update college record
  await College.findByIdAndUpdate(collegeId, {
    activeSubscriptionId: sub._id,
    status: 'active',
  });

  // 7. Audit log
  await AuditLog.logSubscription({
    action:          AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED,
    collegeId,
    performedBy:     purchasedBy,
    performedByRole: 'collegeAdmin',
    subscriptionId:  sub._id,
    planType:        sub.planType,
    amount:          sub.amount,
    ipAddress,
  });

  return {
    subscription: {
      _id:            sub._id,
      planType:       sub.planType,
      planLabel:      sub.planLabel,
      durationMonths: sub.durationMonths,
      startDate:      sub.startDate,
      endDate:        sub.endDate,
      status:         sub.status,
    },
  };
};

// ── getSubscriptionStatus ─────────────────────────────────────────────────────

export const getSubscriptionStatus = async (collegeId) => {
  // Always include college status so frontend can show the suspended screen
  const college = await College.findById(collegeId).select('status statusReason').lean();

  const sub = await Subscription.findOne({ collegeId, status: 'active' })
    .sort({ createdAt: -1 })
    .lean();

  const collegeStatus = {
    status:       college?.status ?? 'inactive',
    statusReason: college?.statusReason ?? null,
    isSuspended:  college?.status === 'suspended',
  };

  if (!sub) return { hasActiveSubscription: false, subscription: null, college: collegeStatus };

  const daysRemaining = sub.endDate
    ? Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const amountPaid = sub.amount ? (sub.amount / 100).toFixed(2) : '0.00';

  // planLabel: use stored value; fall back to PLAN_CONFIG for old documents
  const planLabel = sub.planLabel || PLAN_CONFIG[sub.planType]?.label || sub.planType;

  return {
    hasActiveSubscription: true,
    college: collegeStatus,
    subscription: {
      _id:            sub._id,
      planType:       sub.planType,
      planLabel,
      durationMonths: sub.durationMonths,
      startDate:      sub.startDate,
      endDate:        sub.endDate,
      daysRemaining,
      status:         sub.status,
      amountPaid,
    },
  };
};

// ── getSubscriptionHistory ────────────────────────────────────────────────────

export const getSubscriptionHistory = async (collegeId, { skip, limit }) => {
  const query = { collegeId, status: { $ne: 'pending' } };
  const [subscriptions, total] = await Promise.all([
    Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(query),
  ]);

  // Enrich old documents that predate planLabel storage
  const enriched = subscriptions.map(s => ({
    ...s,
    planLabel:      s.planLabel || PLAN_CONFIG[s.planType]?.label || s.planType,
    amountPaid:     s.amount ? (s.amount / 100).toFixed(2) : '0.00',
  }));

  return { subscriptions: enriched, total };
};
