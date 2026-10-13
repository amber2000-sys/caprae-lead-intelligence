/**
 * Single response envelope for the whole API.
 *
 * Every endpoint returns either { success: true, data, ... } or
 * { success: false, error: { message } }, so the frontend has exactly one
 * shape to handle and one place to surface errors.
 */

export function sendSuccess(res, data, extra = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, ...extra });
}

export function sendPaginated(res, data, { page, limit, total }, extra = {}) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    ...extra,
  });
}

export function sendError(res, statusCode, message, details) {
  const body = { success: false, error: { message } };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}
