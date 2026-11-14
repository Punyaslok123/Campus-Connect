/**
 * modules/subscription/subscription.controller.js
 */

import * as subscriptionService from './subscription.service.js';
import { sendSuccess }          from '../../utils/response.js';
import { paginate }             from '../../utils/pagination.js';

// ── College Admin: purchase flow ──────────────────────────────────────────────

// POST /api/subscription/create-order
export const createOrder = async (req, res) => {
  const { planType } = req.body;

  const order = await subscriptionService.createOrder({
    collegeId:   req.user.collegeId,
    planKey:     planType,          // planType from client = plan key in DB
    purchasedBy: req.user._id,
  });

  return sendSuccess(res, 201, 'Order created successfully', order);
};

// POST /api/subscription/verify-payment
export const verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planType } = req.body;

  const result = await subscriptionService.verifyPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    planKey:     planType,
    collegeId:   req.user.collegeId,
    purchasedBy: req.user._id,
    ipAddress:   req.ip,
  });

  return sendSuccess(res, 200, 'Payment verified. Subscription activated!', result);
};

// GET /api/subscription/status
export const getStatus = async (req, res) => {
  const collegeId = req.query.collegeId && req.user.role === 'owner'
    ? req.query.collegeId
    : req.user.collegeId;

  const status = await subscriptionService.getSubscriptionStatus(collegeId);
  return sendSuccess(res, 200, 'Subscription status fetched', status);
};

// GET /api/subscription/history
export const getHistory = async (req, res) => {
  const { skip, limit, meta } = paginate(req.query);

  const { subscriptions, total } = await subscriptionService.getSubscriptionHistory(
    req.user.collegeId,
    { skip, limit }
  );

  return sendSuccess(res, 200, 'Subscription history fetched', {
    subscriptions,
    pagination: meta(total),
  });
};

// ── Plans (public list + Owner CRUD) ──────────────────────────────────────────

// GET /api/subscription/plans/public (no auth — homepage)
export const listPlansPublic = async (_req, res) => {
  const plans = await subscriptionService.listPlans({ includeInactive: false });
  return sendSuccess(res, 200, 'Plans retrieved', { plans });
};

// GET /api/subscription/plans
export const listPlans = async (req, res) => {
  const includeInactive = req.user?.role === 'owner';
  const plans = await subscriptionService.listPlans({ includeInactive });
  return sendSuccess(res, 200, 'Plans retrieved', { plans });
};

// POST /api/subscription/plans  (Owner only)
export const createPlan = async (req, res) => {
  const { key, label, durationMonths, priceINR, highlight, sortOrder } = req.body;
  const plan = await subscriptionService.createPlan({ key, label, durationMonths, priceINR, highlight, sortOrder });
  return sendSuccess(res, 201, 'Plan created', { plan });
};

// PUT /api/subscription/plans/:key  (Owner only)
export const updatePlan = async (req, res) => {
  const plan = await subscriptionService.updatePlan(req.params.key, req.body);
  return sendSuccess(res, 200, 'Plan updated', { plan });
};

// DELETE /api/subscription/plans/:key  (Owner only — soft delete / deactivate)
export const deletePlan = async (req, res) => {
  const result = await subscriptionService.deletePlan(req.params.key);
  return sendSuccess(res, 200, 'Plan deactivated', result);
};
