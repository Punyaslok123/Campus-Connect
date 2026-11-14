/**
 * modules/subscription/subscription.routes.js
 *
 * All subscription routes are exempt from checkSubscription (renewal paths).
 */

import { Router }                from 'express';
import { asyncHandler }          from '../../utils/asyncHandler.js';
import authenticate              from '../../middlewares/authenticate.js';
import checkRole                 from '../../middlewares/checkRole.js';
import validateBody              from '../../middlewares/validateBody.js';
import * as ctrl                 from './subscription.controller.js';
import {
  createOrderValidator,
  verifyPaymentValidator,
  createPlanValidator,
  updatePlanValidator,
}                                from './subscription.validator.js';

const router = Router();

// ── Public: plans list (no auth required — used by homepage) ──────────────────
// GET /api/subscription/plans/public — only active plans, no auth
router.get('/plans/public', asyncHandler(ctrl.listPlansPublic));

router.use(authenticate);

// ── Plans (readable by all authenticated users; write = Owner only) ────────────

// GET /api/subscription/plans — College Admin sees active plans; Owner sees all
router.get('/plans',
  asyncHandler(ctrl.listPlans)
);

// POST /api/subscription/plans — Owner creates a new plan
router.post('/plans',
  checkRole(['owner']),
  validateBody(createPlanValidator),
  asyncHandler(ctrl.createPlan)
);

// PUT /api/subscription/plans/:key — Owner updates plan details / pricing
router.put('/plans/:key',
  checkRole(['owner']),
  validateBody(updatePlanValidator),
  asyncHandler(ctrl.updatePlan)
);

// DELETE /api/subscription/plans/:key — Owner deactivates a plan
router.delete('/plans/:key',
  checkRole(['owner']),
  asyncHandler(ctrl.deletePlan)
);

// ── College Admin: purchase flow ──────────────────────────────────────────────

// POST /api/subscription/create-order
router.post('/create-order',
  checkRole(['collegeAdmin']),
  validateBody(createOrderValidator),
  asyncHandler(ctrl.createOrder)
);

// POST /api/subscription/verify-payment
router.post('/verify-payment',
  checkRole(['collegeAdmin']),
  validateBody(verifyPaymentValidator),
  asyncHandler(ctrl.verifyPayment)
);

// GET /api/subscription/status
router.get('/status',
  checkRole(['collegeAdmin', 'owner']),
  asyncHandler(ctrl.getStatus)
);

// GET /api/subscription/history
router.get('/history',
  checkRole(['collegeAdmin', 'owner']),
  asyncHandler(ctrl.getHistory)
);

export default router;
