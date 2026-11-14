/**
 * middlewares/errorHandler.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized error handler — the single exit point for all errors.
 * Must be registered LAST in app.js (after all routes).
 *
 * Handles:
 *   - AppError subclasses (operational errors thrown from services/controllers)
 *   - Mongoose ValidationError   → 400
 *   - Mongoose CastError         → 400 (invalid ObjectId)
 *   - Mongoose duplicate key     → 409
 *   - JWT errors                 → 401 (also handled in authenticate, belt+suspenders)
 *   - Multer errors              → 400
 *   - Unknown programmer errors  → 500 (details hidden in production)
 *
 * All responses follow the standard shape:
 *   { success: false, message, data: null, error: { code, details? } }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import jwt      from 'jsonwebtoken';
import multer   from 'multer';
import { AppError, ValidationError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';

const { NODE_ENV } = process.env;
const isDev = NODE_ENV === 'development';

// ── Error normalisers ─────────────────────────────────────────────────────────

/** Mongoose document validation failed (schema-level validators) */
const handleMongooseValidationError = (err) => {
  const fields   = Object.values(err.errors).map(e => ({
    field:   e.path,
    message: e.message,
  }));
  const message = `Validation failed: ${fields.map(f => f.message).join('; ')}`;
  const error   = new ValidationError(message, fields);
  return error;
};

/** Mongoose CastError — usually invalid ObjectId in URL param */
const handleMongooseCastError = (err) => {
  const error   = new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400, 'INVALID_FIELD');
  return error;
};

/** MongoDB duplicate key error (unique index violation) */
const handleDuplicateKeyError = (err) => {
  const field   = Object.keys(err.keyValue ?? {})[0] ?? 'field';
  const value   = err.keyValue?.[field];
  const message = `A record with ${field} '${value}' already exists.`;
  return new AppError(message, 409, 'DUPLICATE_KEY');
};

/** JWT errors (belt-and-suspenders — authenticate also handles these) */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED');

/** Multer file upload errors */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File size exceeds the allowed limit.', 400, 'FILE_TOO_LARGE');
  }
  return new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_ERROR');
};

// ── Main error handler ────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Always log the full error server-side
  console.error(`[ErrorHandler] ${req.method} ${req.originalUrl}`, {
    message:    err.message,
    statusCode: err.statusCode,
    stack:      isDev ? err.stack : undefined,
  });

  // ── Normalise known error types ──────────────────────────────────────────

  let error = err;

  // Mongoose schema validation
  if (err instanceof mongoose.Error.ValidationError) {
    error = handleMongooseValidationError(err);
  }

  // Mongoose bad ObjectId
  else if (err instanceof mongoose.Error.CastError) {
    error = handleMongooseCastError(err);
  }

  // MongoDB duplicate key (error code 11000)
  else if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // JWT
  else if (err instanceof jwt.JsonWebTokenError) {
    error = handleJWTError();
  }
  else if (err instanceof jwt.TokenExpiredError) {
    error = handleJWTExpiredError();
  }

  // Multer
  else if (err instanceof multer.MulterError) {
    error = handleMulterError(err);
  }

  // ── Determine status code ────────────────────────────────────────────────
  const statusCode = error.statusCode ?? 500;

  // ── Build error detail object ────────────────────────────────────────────
  // In production: hide internals for 5xx errors
  let errorDetail = null;

  if (error.isOperational) {
    errorDetail = {
      code:    error.errorCode ?? 'ERROR',
      ...(error.errors   && { details: error.errors }),   // field-level validation errors
      ...(error.meta     && { meta:    error.meta    }),   // extra context (e.g. expiresAt)
    };
  } else if (isDev) {
    // Programmer/unexpected errors — show full detail in dev only
    errorDetail = {
      code:    'INTERNAL_ERROR',
      details: error.message,
      stack:   error.stack,
    };
  } else {
    errorDetail = { code: 'INTERNAL_ERROR' };
  }

  // ── Send response ────────────────────────────────────────────────────────
  return sendError(
    res,
    statusCode,
    error.isOperational ? error.message : 'An unexpected error occurred. Please try again.',
    errorDetail
  );
};

export default errorHandler;
