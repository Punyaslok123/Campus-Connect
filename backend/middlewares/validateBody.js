/**
 * middlewares/validateBody.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a set of express-validator validation chains and throws a
 * ValidationError if any fail. This keeps all validation logic in
 * per-module validator files and out of controllers.
 *
 * Usage in route:
 *   import { registerValidator } from './auth.validator.js';
 *   router.post('/register', validateBody(registerValidator), authController.register);
 *
 * Usage in validator file:
 *   import { body } from 'express-validator';
 *   export const registerValidator = [
 *     body('email').isEmail().withMessage('Valid email required'),
 *     body('password').isLength({ min: 8 }).withMessage('Min 8 characters'),
 *   ];
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { validationResult } from 'express-validator';
import { ValidationError }  from '../utils/AppError.js';
import { asyncHandler }     from '../utils/asyncHandler.js';

/**
 * Runs the provided validation chains, then checks results.
 * If validation fails, throws ValidationError with all field errors.
 *
 * @param {import('express-validator').ValidationChain[]} validations
 * @returns {import('express').RequestHandler}
 */
const validateBody = (validations) =>
  asyncHandler(async (req, res, next) => {
    // Run all validation chains in parallel
    await Promise.all(validations.map(v => v.run(req)));

    const result = validationResult(req);
    if (result.isEmpty()) return next();

    // Map errors to a clean array of { field, message } objects
    const errors = result.array({ onlyFirstError: true }).map(err => ({
      field:   err.type === 'field' ? err.path : '_body',
      message: err.msg,
      value:   err.type === 'field' ? err.value : undefined,
    }));

    throw new ValidationError('Request validation failed', errors);
  });

export default validateBody;
