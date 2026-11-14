/**
 * middlewares/mongoSanitize.js
 * ─────────────────────────────────────────────────────────────────────────────
 * NoSQL injection prevention via express-mongo-sanitize.
 *
 * ATTACK VECTOR:
 *   Without sanitization, a malicious request body like:
 *     { "email": { "$gt": "" }, "password": { "$gt": "" } }
 *   can bypass Mongoose query filters and return all documents.
 *
 *   Mongo operators starting with '$' or containing '.' in key names
 *   are the primary injection vectors.
 *
 * WHAT THIS DOES:
 *   Strips any keys containing '$' or '.' from req.body, req.params, req.query.
 *   This is a defence-in-depth layer — Mongoose schema validation catches most
 *   of these already, but sanitization runs BEFORE schema validation.
 *
 * ADDITIONAL HARDENING in this file:
 *   - HPP (HTTP Parameter Pollution) prevention: collapses duplicate query params
 *   - Custom sanitize log in development for audit visibility
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoSanitize from 'express-mongo-sanitize';
import hpp           from 'hpp';

const { NODE_ENV } = process.env;

// ── express-mongo-sanitize ────────────────────────────────────────────────────

/**
 * Primary NoSQL injection sanitizer.
 *
 * replaceWith option: replace prohibited chars with '_' instead of removing
 * them entirely — this makes injection attempts visible in logs rather than
 * silently dropping fields (easier to detect attack patterns).
 */
export const noSqlSanitizer = mongoSanitize({
  replaceWith:    '_',        // replace $ with _ (keeps structure, blocks injection)
  allowDots:      false,      // also strip dot notation keys
  onSanitize: ({ req, key }) => {
    // Log sanitisation events — potential attack indicator
    console.warn(
      `[Security] NoSQL injection attempt sanitized. ` +
      `Key: "${key}" | IP: ${req.ip} | Path: ${req.originalUrl}`
    );
  },
});

// ── HPP (HTTP Parameter Pollution) ───────────────────────────────────────────

/**
 * Prevent HPP attacks: e.g. ?role=student&role=owner
 * Without this, Express treats role as an array ['student', 'owner'].
 * With HPP, it takes the LAST value (configurable).
 *
 * Whitelist: params that legitimately accept arrays (e.g. tags[]=a&tags[]=b)
 */
export const hppProtection = hpp({
  whitelist: [
    'tags',          // Note tags filter accepts multiple values
    'semester',      // Could filter multiple semesters
    'sort',          // Sort field array
  ],
});

// ── Combined export: both sanitizers as an array ─────────────────────────────
// Usage in app.js:  app.use(sanitizeMiddlewares);
export const sanitizeMiddlewares = [noSqlSanitizer, hppProtection];
