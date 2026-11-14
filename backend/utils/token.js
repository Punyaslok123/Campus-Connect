/**
 * utils/token.js
 * ─────────────────────────────────────────────────────────────────────────────
 * JWT access + refresh token utilities.
 *
 * Access token:  short-lived (15min), carries identity payload
 * Refresh token: long-lived (7d), used only to issue new access tokens
 *
 * Refresh tokens are stored HASHED in the User document (refreshToken field).
 * The raw token is only ever held by the client in an httpOnly cookie.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jwt    from 'jsonwebtoken';
import crypto from 'crypto';

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES  = '15m',
  JWT_REFRESH_EXPIRES = '7d',
  NODE_ENV,
} = process.env;

// ── Access Token ─────────────────────────────────────────────────────────────

/**
 * Sign a short-lived access token.
 * Payload is minimal — only what the auth middleware needs per request.
 */
export const signAccessToken = (payload) => {
  if (!JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not set');
  return jwt.sign(
    {
      sub:          payload.userId,
      role:         payload.role,
      collegeId:    payload.collegeId    ?? null,
      departmentId: payload.departmentId ?? null,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES }
  );
};

/**
 * Verify and decode an access token.
 * Throws jwt.JsonWebTokenError / TokenExpiredError on failure.
 */
export const verifyAccessToken = (token) => {
  if (!JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not set');
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

// ── Refresh Token ─────────────────────────────────────────────────────────────

/**
 * Sign a long-lived refresh token.
 * Only carries the userId — no role/college (those may change between refreshes).
 */
export const signRefreshToken = (userId) => {
  if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not set');
  return jwt.sign(
    { sub: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
};

/**
 * Verify and decode a refresh token.
 */
export const verifyRefreshToken = (token) => {
  if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not set');
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

// ── Refresh Token Hashing ─────────────────────────────────────────────────────

/**
 * Hash a refresh token for safe storage in DB.
 * We store the hash — the raw token is only ever in the client cookie.
 */
export const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ── Cookie Helpers ────────────────────────────────────────────────────────────

export const REFRESH_COOKIE_NAME = 'cc_refresh_token';

export const refreshCookieOptions = {
  httpOnly: true,
  secure:   NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,   // 7 days in ms
  path:     '/api/auth',               // scoped — only sent to auth routes
};

/**
 * Attach the refresh token as an httpOnly cookie.
 */
export const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
};

/**
 * Clear the refresh token cookie (on logout).
 */
export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
};
