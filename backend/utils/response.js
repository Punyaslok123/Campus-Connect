/**
 * utils/response.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardised API response helpers.
 * Every response from every controller goes through one of these two functions.
 * Shape is always: { success, message, data, error }
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Send a successful response.
 * @param {Response} res   - Express response object
 * @param {number}   code  - HTTP status code (default 200)
 * @param {string}   message
 * @param {*}        data  - payload (object, array, null)
 */
export const sendSuccess = (res, code = 200, message = 'Success', data = null) => {
  return res.status(code).json({
    success: true,
    message,
    data,
    error: null,
  });
};

/**
 * Send an error response.
 * Called by errorHandler — controllers should throw AppError instead.
 * @param {Response} res
 * @param {number}   code
 * @param {string}   message
 * @param {*}        error  - error detail (null in production for 5xx)
 */
export const sendError = (res, code = 500, message = 'An error occurred', error = null) => {
  return res.status(code).json({
    success: false,
    message,
    data: null,
    error,
  });
};
