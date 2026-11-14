/**
 * modules/auth/auth.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin controller layer. Extracts data from req, calls auth service,
 * sends standardised response. NO business logic here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as authService from './auth.service.js';
import { sendSuccess }  from '../../utils/response.js';
import { authLimiter }  from '../../middlewares/rateLimiter.js';
import {
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} from '../../utils/token.js';

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    collegeDomain,
    role,
    departmentId,
    semester,
    rollNumber,
  } = req.body;

  const result = await authService.registerUser({
    firstName,
    lastName,
    email,
    password,
    collegeDomain,
    role,
    departmentId,
    semester,
    rollNumber,
    ipAddress: req.ip,
  });

  authLimiter.resetKey(req.ip);

  return sendSuccess(
    res,
    201,
    'Registration successful. Your account is pending verification by your department administrator.',
    { user: result.user, college: result.college }
  );
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password, collegeDomain } = req.body;

  const { accessToken, refreshToken, user } = await authService.loginUser({
    email,
    password,
    collegeDomain,
    ipAddress: req.ip,
  });

  // Refresh token → httpOnly cookie (never in response body)
  setRefreshCookie(res, refreshToken);

  authLimiter.resetKey(req.ip);

  return sendSuccess(res, 200, 'Login successful', {
    accessToken,
    user,
  });
};

// ── POST /api/auth/register-college ──────────────────────────────────────────
export const registerCollege = async (req, res) => {
  const {
    collegeName, collegeDomain, contactEmail, address,
    adminFirstName, adminLastName, adminEmail, adminPassword,
  } = req.body;

  const result = await authService.registerCollege({
    collegeName, collegeDomain, contactEmail, address,
    adminFirstName, adminLastName, adminEmail, adminPassword,
    ipAddress: req.ip,
  });

  setRefreshCookie(res, result.refreshToken);

  authLimiter.resetKey(req.ip);

  return sendSuccess(res, 201,
    'College registered! Please subscribe to a plan to activate your platform.',
    { accessToken: result.accessToken, user: result.user, college: result.college }
  );
};

// ── POST /api/auth/owner-login ────────────────────────────────────────────────
export const ownerLogin = async (req, res) => {
  const { email, password } = req.body;

  const { accessToken, refreshToken, user } = await authService.loginOwner({
    email,
    password,
    ipAddress: req.ip,
  });

  setRefreshCookie(res, refreshToken);

  authLimiter.resetKey(req.ip);

  return sendSuccess(res, 200, 'Login successful', { accessToken, user });
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refresh = async (req, res) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  const { accessToken, refreshToken } = await authService.refreshAccessToken(rawRefreshToken);

  // Rotate cookie
  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, 200, 'Token refreshed', { accessToken });
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = async (req, res) => {
  await authService.logoutUser(req.user._id, req.ip);

  clearRefreshCookie(res);

  return sendSuccess(res, 200, 'Logged out successfully', null);
};

// ── GET /api/auth/colleges — public, for registration dropdown ───────────────
export const listPublicColleges = async (_req, res) => {
  const { College } = await import('../../models/index.js');
  const colleges = await College.find({ status: 'active' })
    .select('name domain')
    .sort({ name: 1 })
    .lean();
  return sendSuccess(res, 200, 'Colleges fetched', { colleges });
};

// ── GET /api/auth/colleges/:domain/departments — public, for registration ─────
export const listPublicDepartments = async (req, res) => {
  const { College, Department } = await import('../../models/index.js');
  const college = await College.findOne({ domain: req.params.domain, status: 'active' })
    .select('_id')
    .lean();
  if (!college) {
    const { NotFoundError } = await import('../../utils/AppError.js');
    throw new NotFoundError('College not found for this domain.');
  }
  const departments = await Department.find({ collegeId: college._id, isActive: { $ne: false } })
    .select('name code')
    .sort({ name: 1 })
    .lean();
  return sendSuccess(res, 200, 'Departments fetched', { departments });
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const me = async (req, res) => {
  // req.user is already attached by authenticate middleware
  // Load fresh data from DB to include latest profile info
  const { User } = await import('../../models/index.js');
  const user = await User.findById(req.user._id)
    .populate('collegeId', 'name domain logo coverImage contactEmail address')
    .populate('departmentId', 'name code')
    .lean({ virtuals: true });

  if (!user) {
    const { NotFoundError } = await import('../../utils/AppError.js');
    throw new NotFoundError('User not found');
  }

  return sendSuccess(res, 200, 'User profile fetched', { user });
};
