/**
 * middlewares/checkSubscription.js
 *
 * Guards ALL college-scoped routes. Two distinct failure modes:
 *   402 SUBSCRIPTION_EXPIRED — subscription missing or past endDate
 *   403 COLLEGE_SUSPENDED    — owner has manually suspended this college
 *
 * BYPASS CONDITIONS (middleware returns next() immediately):
 *   1. Role is 'owner'          — cross-tenant, no college subscription
 *   2. req.skipSubscriptionCheck === true — explicit public tag in route
 *   3. Path matches ALWAYS_ALLOWED — auth + renewal + support routes
 *
 * Support routes (/support/*) are always accessible to College Admins so
 * a suspended college can still contact the owner for help.
 *
 * Must run AFTER authenticate (requires req.user).
 */

import { College, Subscription } from '../models/index.js';
import { SubscriptionError, ForbiddenError, UnauthorizedError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ALWAYS_ALLOWED = [
  /^\/auth\//,
  /^\/subscription\/create-order/,
  /^\/subscription\/verify-payment/,
  /^\/subscription\/status/,
  /^\/subscription\/plans/,
  /^\/support/,          // suspended college can always reach Help & Support
];

const isAlwaysAllowed = (path) => ALWAYS_ALLOWED.some(p => p.test(path));

const checkSubscription = asyncHandler(async (req, _res, next) => {
  // 1. Owner is cross-tenant — exempt
  if (req.user?.role === 'owner') return next();

  // 2. Explicit public tag
  if (req.skipSubscriptionCheck === true) return next();

  // 3. Auth / renewal / support routes always work
  if (isAlwaysAllowed(req.path)) return next();

  // 4. Require collegeId
  const { collegeId } = req.user ?? {};
  if (!collegeId) {
    return next(new UnauthorizedError('Cannot verify subscription: collegeId missing.'));
  }

  // 5. Check college status FIRST — suspension overrides everything
  const college = await College.findById(collegeId).select('status statusReason').lean();
  if (college?.status === 'suspended') {
    const err = new ForbiddenError(
      college.statusReason
        ? `Your college has been suspended: ${college.statusReason}`
        : 'Your college has been suspended. Contact support for assistance.'
    );
    err.errorCode = 'COLLEGE_SUSPENDED';
    err.meta      = { reason: college.statusReason ?? null };
    return next(err);
  }

  // 6. Check active subscription
  const subscription = await Subscription.findOne({ collegeId, status: 'active' })
    .select('endDate gracePeriodDays')
    .lean();

  if (!subscription) {
    return next(new SubscriptionError('No active subscription found. Please purchase a plan.'));
  }

  // 7. Check endDate + grace period
  const effectiveEnd = new Date(subscription.endDate);
  if (subscription.gracePeriodDays > 0) {
    effectiveEnd.setDate(effectiveEnd.getDate() + subscription.gracePeriodDays);
  }

  if (effectiveEnd <= new Date()) {
    const err = new SubscriptionError('Subscription expired. Please renew.');
    err.meta = { expiresAt: subscription.endDate };
    return next(err);
  }

  // 8. Attach subscription info to req for downstream use
  req.subscription = {
    endDate:       subscription.endDate,
    daysRemaining: Math.ceil((effectiveEnd - new Date()) / (1000 * 60 * 60 * 24)),
  };

  next();
});

export default checkSubscription;
