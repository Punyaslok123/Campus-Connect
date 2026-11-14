/**
 * modules/auth/auth.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication business logic.
 * No req/res objects — pure data in, data out.
 * All DB interaction goes through Mongoose models.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto                               from 'crypto';
import { User, College, AuditLog,
         AUDIT_ACTIONS }                    from '../../models/index.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
}                                           from '../../utils/token.js';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
}                                           from '../../utils/AppError.js';

// ── register ──────────────────────────────────────────────────────────────────

/**
 * Register a new user under a college tenant.
 * Role defaults to 'student'. Owner + collegeAdmin cannot self-register.
 */
export const registerUser = async ({
  firstName,
  lastName,
  email,
  password,
  collegeDomain,
  role         = 'student',
  departmentId = null,
  semester     = null,
  rollNumber   = null,
  ipAddress,
}) => {
  // 1. Resolve college from domain slug
  const college = await College.findOne({ domain: collegeDomain, status: 'active' }).lean();
  if (!college) {
    throw new NotFoundError(`No active college found for domain: ${collegeDomain}`);
  }

  // 2. Prevent self-registration of privileged roles
  const SELF_REGISTER_ALLOWED = ['student', 'faculty', 'alumni'];
  if (!SELF_REGISTER_ALLOWED.includes(role)) {
    throw new ForbiddenError(`Role '${role}' cannot self-register. Contact your administrator.`);
  }

  // 3. Check email uniqueness within this college
  const existingUser = await User.findOne({ email, collegeId: college._id }).lean();
  if (existingUser) {
    throw new ConflictError(`An account with email '${email}' already exists at this college.`);
  }

  // 4. Create user — password hashed by pre-save hook in User model
  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash: password,   // model pre-save hook handles hashing
    role,
    collegeId:    college._id,
    departmentId: departmentId ?? null,
    semester:     role === 'student' ? (semester ?? null) : null,
    rollNumber:   rollNumber ?? null,
    isVerified:   false,      // Dept Admin must verify
  });

  // 5. Audit log
  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_CREATED,
    collegeId:       college._id,
    performedBy:     user._id,
    performedByRole: role,
    targetId:        user._id,
    targetModel:     'User',
    metadata:        { email, role },
    ipAddress,
  });

  return { user: user.toSafeObject(), college: { name: college.name, domain: college.domain } };
};

// ── login ─────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user and return access + refresh tokens.
 */
export const loginUser = async ({ email, password, collegeDomain, ipAddress }) => {
  // 1. Resolve college
  const college = await College.findOne({ domain: collegeDomain }).lean();
  if (!college) {
    throw new UnauthorizedError('Invalid credentials.');  // Don't reveal reason
  }

  // 2. Find user — select passwordHash explicitly (it has select: false)
  const user = await User.findOne({
    email,
    collegeId: college._id,
  }).select('+passwordHash +refreshToken');

  if (!user) {
    // Log failed attempt before throwing
    await AuditLog.record({
      action:      AUDIT_ACTIONS.USER_LOGIN_FAILED,
      collegeId:   college._id,
      metadata:    { email, reason: 'user_not_found' },
      ipAddress,
    });
    throw new UnauthorizedError('Invalid credentials.');
  }

  // 3. Check account status
  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated. Contact your administrator.');
  }

  // 4. For non-owner, non-collegeAdmin: must be verified by dept admin
  const VERIFICATION_EXEMPT = ['owner', 'collegeAdmin', 'deptAdmin'];
  if (!VERIFICATION_EXEMPT.includes(user.role) && !user.isVerified) {
    throw new ForbiddenError('Your account is pending verification by your department administrator.');
  }

  // 5. Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await AuditLog.record({
      action:      AUDIT_ACTIONS.USER_LOGIN_FAILED,
      collegeId:   college._id,
      performedBy: user._id,
      metadata:    { email, reason: 'wrong_password' },
      ipAddress,
    });
    throw new UnauthorizedError('Invalid credentials.');
  }

  // 6. Issue tokens
  const tokenPayload = {
    userId:       user._id.toString(),
    role:         user.role,
    collegeId:    user.collegeId?.toString()    ?? null,
    departmentId: user.departmentId?.toString() ?? null,
  };

  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(user._id.toString());

  // 7. Store hashed refresh token + update lastLoginAt
  user.refreshToken = hashRefreshToken(refreshToken);
  user.lastLoginAt  = new Date();
  await user.save({ validateBeforeSave: false });

  // 8. Audit log
  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_LOGIN,
    collegeId:       college._id,
    performedBy:     user._id,
    performedByRole: user.role,
    targetId:        user._id,
    targetModel:     'User',
    ipAddress,
  });

  // 9. Return user with populated college branding so frontend has logo/coverImage immediately
  const populatedUser = await User.findById(user._id)
    .populate('collegeId', 'name domain logo coverImage contactEmail address')
    .populate('departmentId', 'name code')
    .lean({ virtuals: true });

  const { passwordHash: _ph, refreshToken: _rt, ...safeUser } = populatedUser;

  return {
    accessToken,
    refreshToken,
    user: safeUser,
  };
};

// ── registerCollege ───────────────────────────────────────────────────────────

/**
 * Self-service college + admin registration.
 * Creates the College tenant and the first collegeAdmin in one transaction.
 * Issues tokens immediately so the admin is logged in after registration.
 * College status starts as 'inactive' — activated once subscription is paid.
 */
export const registerCollege = async ({
  collegeName,
  collegeDomain,
  contactEmail,
  address,
  adminFirstName,
  adminLastName,
  adminEmail,
  adminPassword,
  ipAddress,
}) => {
  // 1. Domain must be globally unique
  const domainTaken = await College.findOne({ domain: collegeDomain }).lean();
  if (domainTaken) {
    throw new ConflictError(`The domain '${collegeDomain}' is already in use. Choose another.`);
  }

  // 2. Create college (inactive until subscription is activated)
  const college = await College.create({
    name:         collegeName,
    domain:       collegeDomain,
    contactEmail: contactEmail || adminEmail,
    address:      address || null,
    status:       'inactive',
  });

  // 3. Create admin (auto-verified, no dept required for collegeAdmin)
  let admin;
  try {
    admin = await User.create({
      firstName:    adminFirstName,
      lastName:     adminLastName,
      email:        adminEmail,
      passwordHash: adminPassword,
      role:         'collegeAdmin',
      collegeId:    college._id,
      isVerified:   true,
      isActive:     true,
    });
  } catch (err) {
    // Roll back college if admin creation fails (e.g. duplicate email)
    await College.findByIdAndDelete(college._id);
    if (err.code === 11000) {
      throw new ConflictError(`Email '${adminEmail}' is already registered at this college.`);
    }
    throw err;
  }

  // 4. Audit logs
  await AuditLog.record({
    action:          AUDIT_ACTIONS.COLLEGE_CREATED,
    collegeId:       college._id,
    performedBy:     admin._id,
    performedByRole: 'collegeAdmin',
    targetId:        college._id,
    targetModel:     'College',
    metadata:        { collegeName, collegeDomain },
    ipAddress,
  });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_CREATED,
    collegeId:       college._id,
    performedBy:     admin._id,
    performedByRole: 'collegeAdmin',
    targetId:        admin._id,
    targetModel:     'User',
    metadata:        { email: adminEmail, role: 'collegeAdmin' },
    ipAddress,
  });

  // 5. Issue tokens — log them in immediately so they land on billing
  const tokenPayload = {
    userId:    admin._id.toString(),
    role:      'collegeAdmin',
    collegeId: college._id.toString(),
  };

  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(admin._id.toString());

  admin.refreshToken = hashRefreshToken(refreshToken);
  admin.lastLoginAt  = new Date();
  await admin.save({ validateBeforeSave: false });

  const populatedAdmin = await User.findById(admin._id)
    .populate('collegeId', 'name domain logo coverImage contactEmail address')
    .lean({ virtuals: true });

  const { passwordHash: _ph, refreshToken: _rt, ...safeAdmin } = populatedAdmin;

  return {
    accessToken,
    refreshToken,
    user:    safeAdmin,
    college: { name: college.name, domain: college.domain },
  };
};

// ── loginOwner ────────────────────────────────────────────────────────────────

/**
 * Authenticate the SaaS platform owner.
 * Owner has no collegeId — skip college resolution entirely.
 */
export const loginOwner = async ({ email, password, ipAddress }) => {
  // 1. Find owner by email (role-scoped, no college filter)
  const user = await User.findOne({ email, role: 'owner' }).select('+passwordHash +refreshToken');

  if (!user) {
    throw new UnauthorizedError('Invalid credentials.');
  }

  // 2. Check account status
  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated.');
  }

  // 3. Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await AuditLog.record({
      action:      AUDIT_ACTIONS.USER_LOGIN_FAILED,
      collegeId:   null,
      performedBy: user._id,
      metadata:    { email, reason: 'wrong_password' },
      ipAddress,
    });
    throw new UnauthorizedError('Invalid credentials.');
  }

  // 4. Issue tokens
  const tokenPayload = {
    userId:    user._id.toString(),
    role:      'owner',
    collegeId: null,
  };

  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(user._id.toString());

  // 5. Store hashed refresh token + update lastLoginAt
  user.refreshToken = hashRefreshToken(refreshToken);
  user.lastLoginAt  = new Date();
  await user.save({ validateBeforeSave: false });

  // 6. Audit log (no collegeId — cross-tenant action)
  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_LOGIN,
    collegeId:       null,
    performedBy:     user._id,
    performedByRole: 'owner',
    targetId:        user._id,
    targetModel:     'User',
    ipAddress,
  });

  return {
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  };
};

// ── refreshAccessToken ────────────────────────────────────────────────────────

/**
 * Verify a refresh token cookie and issue a new access token.
 */
export const refreshAccessToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token not provided.');
  }

  // 1. Verify token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token. Please log in again.');
  }

  // 2. Find user and compare hashed token
  const user = await User.findById(decoded.sub)
    .select('+refreshToken')
    .lean();

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or deactivated.');
  }

  const hashedIncoming = hashRefreshToken(rawRefreshToken);
  if (user.refreshToken !== hashedIncoming) {
    // Possible token reuse attack — log and reject
    console.warn(`[Auth] Refresh token mismatch for user ${user._id}. Possible reuse attack.`);
    throw new UnauthorizedError('Refresh token mismatch. Please log in again.');
  }

  // 3. Issue new access token (rotate refresh token for extra security)
  const newAccessToken  = signAccessToken({
    userId:       user._id.toString(),
    role:         user.role,
    collegeId:    user.collegeId?.toString()    ?? null,
    departmentId: user.departmentId?.toString() ?? null,
  });
  const newRefreshToken = signRefreshToken(user._id.toString());

  // 4. Store new hashed refresh token
  await User.findByIdAndUpdate(user._id, {
    refreshToken: hashRefreshToken(newRefreshToken),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ── logout ────────────────────────────────────────────────────────────────────

/**
 * Invalidate the user's refresh token in the DB.
 */
export const logoutUser = async (userId, ipAddress) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { refreshToken: null } },
    { new: false }
  );

  if (user) {
    await AuditLog.record({
      action:          AUDIT_ACTIONS.USER_LOGOUT,
      collegeId:       user.collegeId,
      performedBy:     user._id,
      performedByRole: user.role,
      targetId:        user._id,
      targetModel:     'User',
      ipAddress,
    });
  }
};
