/**
 * Wrap an async route handler so a rejected promise reaches the error
 * middleware instead of hanging the request.
 *
 * Express 5 does this natively; this project targets Express 4, where an
 * unhandled rejection in a handler is a silent timeout — the exact "silent
 * failure" the brief rules out.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
