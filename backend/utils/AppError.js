/**
 * utils/AppError.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed error classes. Throw these from services/controllers — the central
 * errorHandler middleware catches them and formats the response correctly.
 *
 * Usage:
 *   throw new NotFoundError('Note not found');
 *   throw new ForbiddenError('You cannot delete this note');
 *   throw new ValidationError('Invalid email format');
 * ─────────────────────────────────────────────────────────────────────────────
 */

export class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.name        = this.constructor.name;
    this.statusCode  = statusCode;
    this.errorCode   = errorCode;    // machine-readable code for frontend
    this.isOperational = true;       // distinguish from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 — bad input, malformed request
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;  // array of field-level errors from express-validator
  }
}

// 401 — unauthenticated
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// 403 — authenticated but not allowed
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

// 403 — subscription-specific gate
export class SubscriptionError extends AppError {
  constructor(message = 'Subscription expired. Please renew.') {
    super(message, 402, 'SUBSCRIPTION_EXPIRED');
  }
}

// 404
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

// 409 — duplicate / conflict
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// 429 — rate limit (also handled by express-rate-limit directly)
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// 500 — generic server error (don't expose internals)
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
