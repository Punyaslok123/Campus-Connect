/**
 * utils/pagination.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable pagination helper. Parses query params and returns Mongoose
 * skip/limit values plus a meta object for the response.
 *
 * Usage:
 *   const { skip, limit, meta } = paginate(req.query);
 *   const notes = await Note.find(filter).skip(skip).limit(limit);
 *   return sendSuccess(res, 200, 'Notes fetched', { notes, pagination: meta(total) });
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

/**
 * @param {object} query - req.query object
 * @returns {{ skip: number, limit: number, page: number, meta: (total: number) => object }}
 */
export const paginate = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page,  10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  const meta = (total) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  });

  return { skip, limit, page, meta };
};
