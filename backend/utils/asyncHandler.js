/**
 * utils/asyncHandler.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps async route handlers to forward errors to next(err) automatically.
 * Without this, unhandled async rejections bypass Express error handling.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }));
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
