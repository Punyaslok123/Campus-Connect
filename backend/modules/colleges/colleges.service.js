/**
 * modules/colleges/colleges.service.js
 * Owner-only: list all colleges with subscription data, activate/deactivate.
 */

import mongoose from 'mongoose';
import { College, Subscription, User, PLAN_CONFIG } from '../../models/index.js';
import { NotFoundError, ValidationError } from '../../utils/AppError.js';

// Derive a readable plan label — prefers the stored value, falls back to PLAN_CONFIG
// for legacy documents created before planLabel was added to the Subscription model.
const resolvePlanLabel = (sub) => {
  if (!sub) return null;
  return sub.planLabel || PLAN_CONFIG[sub.planType]?.label || sub.planType || '—';
};

// ── list ──────────────────────────────────────────────────────────────────────

export const listColleges = async ({ page = 1, limit = 50, status, search } = {}) => {
  const query = {};
  if (status) query.status = status;
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip  = (page - 1) * limit;
  const total = await College.countDocuments(query);

  const colleges = await College.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('activeSubscriptionId', 'planType planLabel durationMonths startDate endDate status amount')
    .lean();

  const enriched = await Promise.all(colleges.map(async (c) => {
    const admin = await User.findOne({ collegeId: c._id, role: 'collegeAdmin' })
      .select('firstName lastName email')
      .lean();

    const rawSub = c.activeSubscriptionId;
    let daysRemaining = 0;
    if (rawSub?.status === 'active' && rawSub?.endDate) {
      const diff = new Date(rawSub.endDate) - new Date();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const subscription = rawSub
      ? {
          ...rawSub,
          planLabel:  resolvePlanLabel(rawSub),
          amountPaid: rawSub.amount ? (rawSub.amount / 100).toFixed(2) : '0.00',
        }
      : null;

    return {
      ...c,
      admin,
      daysRemaining,
      subscription,
      activeSubscriptionId: undefined,
    };
  }));

  return { colleges: enriched, total, page, limit, pages: Math.ceil(total / limit) };
};

// ── getById ───────────────────────────────────────────────────────────────────

export const getCollegeById = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ValidationError('Invalid college ID');

  const college = await College.findById(id)
    .populate('activeSubscriptionId', 'planType planLabel durationMonths startDate endDate status amount')
    .lean();

  if (!college) throw new NotFoundError('College not found');

  const admin = await User.findOne({ collegeId: college._id, role: 'collegeAdmin' })
    .select('firstName lastName email createdAt')
    .lean();

  const subHistory = await Subscription.find({ collegeId: college._id, status: { $ne: 'pending' } })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const rawSub = college.activeSubscriptionId;
  let daysRemaining = 0;
  if (rawSub?.status === 'active' && rawSub?.endDate) {
    const diff = new Date(rawSub.endDate) - new Date();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const subscription = rawSub
    ? {
        ...rawSub,
        planLabel:  resolvePlanLabel(rawSub),
        amountPaid: rawSub.amount ? (rawSub.amount / 100).toFixed(2) : '0.00',
      }
    : null;

  const enrichedHistory = subHistory.map(s => ({
    ...s,
    planLabel:  resolvePlanLabel(s),
    amountPaid: s.amount ? (s.amount / 100).toFixed(2) : '0.00',
  }));

  return {
    ...college,
    admin,
    daysRemaining,
    subscription,
    subscriptionHistory: enrichedHistory,
    activeSubscriptionId: undefined,
  };
};

// ── activate ──────────────────────────────────────────────────────────────────

export const activateCollege = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ValidationError('Invalid college ID');

  const college = await College.findById(id);
  if (!college) throw new NotFoundError('College not found');
  if (college.status === 'active') throw new ValidationError('College is already active');

  college.status = 'active';
  college.statusReason = null;
  await college.save();

  return { _id: college._id, name: college.name, status: college.status };
};

// ── deactivate ────────────────────────────────────────────────────────────────

export const deactivateCollege = async (id, { reason } = {}) => {
  if (!mongoose.isValidObjectId(id)) throw new ValidationError('Invalid college ID');

  const college = await College.findById(id);
  if (!college) throw new NotFoundError('College not found');
  if (college.status === 'suspended') throw new ValidationError('College is already suspended');

  college.status = 'suspended';
  college.statusReason = reason ?? 'Deactivated by owner';
  await college.save();

  return { _id: college._id, name: college.name, status: college.status };
};

// ── dashboard stats ───────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const [total, active, inactive, suspended] = await Promise.all([
    College.countDocuments(),
    College.countDocuments({ status: 'active' }),
    College.countDocuments({ status: 'inactive' }),
    College.countDocuments({ status: 'suspended' }),
  ]);

  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const expiringSoon = await Subscription.countDocuments({
    status:  'active',
    endDate: { $gte: new Date(), $lte: soon },
  });

  // Revenue = sum of `amount` field (paise) across all paid subscriptions → convert to INR
  const revenueAgg = await Subscription.aggregate([
    { $match: { status: { $in: ['active', 'expired'] }, amount: { $exists: true, $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const revenueINR = revenueAgg[0] ? Math.round(revenueAgg[0].total / 100) : 0;

  return { total, active, inactive, suspended, expiringSoon, revenueINR };
};
