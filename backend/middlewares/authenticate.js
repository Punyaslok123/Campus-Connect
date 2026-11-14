/**
 * middlewares/authenticate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the JWT access token from the Authorization header.
 * On success: attaches req.user = { _id, role, collegeId, departmentId } and calls next().
 * On failure: throws UnauthorizedError (caught by errorHandler).
 *
 * Token source: Authorization: Bearer <token>
 *
 * For deptAdmin tokens that pre-date the departmentId claim, falls back to a
 * single DB lookup so existing sessions aren't broken.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jwt                          from 'jsonwebtoken';
import { verifyAccessToken }        from '../utils/token.js';
import { UnauthorizedError }        from '../utils/AppError.js';
import { asyncHandler }             from '../utils/asyncHandler.js';
import { User }                     from '../models/index.js';

/**
 * authenticate middleware
 * Attaches req.user = { _id, role, collegeId, departmentId }
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided. Please log in.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Malformed authorization header.');
  }

  // 2. Verify and decode
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Session expired. Please log in again.');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token. Please log in again.');
    }
    throw new UnauthorizedError('Token verification failed.');
  }

  // 3. Attach identity.
  //    Always read departmentId + collegeId from DB for dept-scoped roles so that
  //    stale JWT claims (issued before department assignment or before a fix) never
  //    cause missing-department bugs. One extra lean query per request for these roles.
  const DEPT_SCOPED_ROLES = ['deptAdmin', 'student', 'faculty'];
  let departmentId = decoded.departmentId ?? null;
  let collegeId    = decoded.collegeId    ?? null;

  let assignedSubjects = null;

  if (DEPT_SCOPED_ROLES.includes(decoded.role)) {
    const dbUser = await User.findById(decoded.sub)
      .select('departmentId collegeId assignedSubjects')
      .lean();
    if (dbUser?.departmentId) departmentId    = dbUser.departmentId.toString();
    if (dbUser?.collegeId)    collegeId       = dbUser.collegeId.toString();
    if (decoded.role === 'faculty') assignedSubjects = dbUser?.assignedSubjects ?? [];
  }

  req.user = {
    _id:              decoded.sub,
    role:             decoded.role,
    collegeId:        collegeId,
    departmentId:     departmentId,
    assignedSubjects: assignedSubjects,
  };

  next();
});

export default authenticate;
