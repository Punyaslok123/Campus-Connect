/**
 * modules/auth/auth.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth routes define ONLY: path, middleware chain, controller reference.
 * Zero business logic. checkSubscription is bypassed for all auth routes
 * via the RENEWAL_PATH_PATTERNS in checkSubscription middleware.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router }          from 'express';
import { asyncHandler }    from '../../utils/asyncHandler.js';
import authenticate        from '../../middlewares/authenticate.js';
import validateBody        from '../../middlewares/validateBody.js';
import { authLimiter }     from '../../middlewares/rateLimiter.js';
import * as authController from './auth.controller.js';
import {
  registerValidator,
  loginValidator,
  ownerLoginValidator,
  registerCollegeValidator,
}                          from './auth.validator.js';

const router = Router();

// ── Public routes (no auth required) ─────────────────────────────────────────

// GET /api/auth/colleges — list active colleges for registration dropdown
router.get('/colleges', asyncHandler(authController.listPublicColleges));

// GET /api/auth/colleges/:domain/departments — list departments for a college
router.get('/colleges/:domain/departments', asyncHandler(authController.listPublicDepartments));

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validateBody(registerValidator),
  asyncHandler(authController.register)
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validateBody(loginValidator),
  asyncHandler(authController.login)
);

// POST /api/auth/register-college — self-service college + admin registration
router.post(
  '/register-college',
  authLimiter,
  validateBody(registerCollegeValidator),
  asyncHandler(authController.registerCollege)
);

// POST /api/auth/owner-login — SaaS owner login (no collegeDomain required)
router.post(
  '/owner-login',
  authLimiter,
  validateBody(ownerLoginValidator),
  asyncHandler(authController.ownerLogin)
);

// POST /api/auth/refresh  — reads httpOnly cookie, no body validation needed
router.post(
  '/refresh',
  asyncHandler(authController.refresh)
);

// ── Protected routes ──────────────────────────────────────────────────────────

// POST /api/auth/logout
router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout)
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.me)
);

export default router;
