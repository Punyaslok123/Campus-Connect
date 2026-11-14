/**
 * middlewares/rateLimiter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tiered rate limiting using express-rate-limit.
 *
 * Limiters exported:
 *   globalLimiter      — 100 req/15min per IP (applied to all routes in app.js)
 *   authLimiter        — 10 req/15min per IP (login, register, password reset)
 *   uploadLimiter      — 20 req/hour per authenticated user (Cloudinary uploads)
 *   strictLimiter      — 5 req/15min per IP (password reset, webhook)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response.js';

// ── Shared error handler for all limiters ────────────────────────────────────
const rateLimitHandler = (req, res) => {
  sendError(
    res,
    429,
    'Too many requests. Please slow down and try again shortly.',
    {
      code:       'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    }
  );
};

// ── Key generators ────────────────────────────────────────────────────────────

/** Rate-limit by IP address */
const ipKeyGenerator = (req) => {
  // Trust proxy headers in production (X-Forwarded-For from load balancer)
  return req.ip;
};

/** Rate-limit by authenticated userId (falls back to IP for unauthenticated) */
const userKeyGenerator = (req) => {
  return req.user?._id?.toString() ?? req.ip;
};

// ── Limiters ──────────────────────────────────────────────────────────────────

/**
 * Global limiter — applied to all /api/* routes.
 * 100 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,   // 15 minutes
  max:              100,
  standardHeaders:  true,             // RateLimit-* headers in response
  legacyHeaders:    false,
  keyGenerator:     ipKeyGenerator,
  handler:          rateLimitHandler,
  skip:             (req) => req.user?.role === 'owner',  // Owner is exempt
});

/**
 * Auth limiter — login, register, password-reset routes.
 * 10 requests per 15 minutes per IP.
 * Strict to prevent brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    ipKeyGenerator,
  handler:         rateLimitHandler,
  message:         'Too many authentication attempts. Please try again in 15 minutes.',
});

/**
 * Upload limiter — Cloudinary upload routes.
 * 20 uploads per hour per authenticated user.
 */
export const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,   // 1 hour
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    userKeyGenerator,
  handler:         rateLimitHandler,
});

/**
 * Strict limiter — password reset, Razorpay webhook, sensitive admin actions.
 * 5 requests per 15 minutes per IP.
 */
export const strictLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    ipKeyGenerator,
  handler:         rateLimitHandler,
});
