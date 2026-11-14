/**
 * middlewares/checkRole.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-Based Access Control middleware factory.
 * Must run AFTER authenticate (requires req.user to be set).
 *
 * Usage:
 *   router.delete('/:id', authenticate, checkRole(['faculty', 'deptAdmin']), handler);
 *
 *   // Owner-only route:
 *   router.get('/colleges', authenticate, checkRole(['owner']), handler);
 *
 *   // Multi-role route:
 *   router.get('/events', authenticate, checkRole(['student', 'faculty', 'alumni']), handler);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';

// All valid roles — used to validate the allowedRoles argument at startup
const VALID_ROLES = ['owner', 'collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni'];

/**
 * Factory: returns a middleware that allows only the specified roles.
 * @param {string[]} allowedRoles - array of role strings
 * @returns {import('express').RequestHandler}
 */
const checkRole = (allowedRoles) => {
  // Dev-time validation: catch typos in role names during startup
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('checkRole: allowedRoles must be a non-empty array');
  }
  const invalid = allowedRoles.filter(r => !VALID_ROLES.includes(r));
  if (invalid.length > 0) {
    throw new Error(`checkRole: Invalid roles specified: ${invalid.join(', ')}`);
  }

  return (req, _res, next) => {
    // authenticate must have run first
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before role check.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}. ` +
          `Your role: ${req.user.role}.`
        )
      );
    }

    next();
  };
};

export default checkRole;
