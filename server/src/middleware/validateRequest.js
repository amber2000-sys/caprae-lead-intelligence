import { ApiError } from '../utils/ApiError.js';

/**
 * Turn a validator result into a 400 with every problem listed at once.
 * Returning errors one at a time makes a form a guessing game.
 */
export function assertValid(result, message = 'Validation failed') {
  if (!result.valid) {
    throw ApiError.badRequest(message, result.errors);
  }
  return result.value;
}

/** Reject obviously oversized JSON bodies before they reach a controller. */
export function limitArraySize(field, max) {
  return (req, res, next) => {
    const value = req.body?.[field];
    if (Array.isArray(value) && value.length > max) {
      return next(ApiError.badRequest(`"${field}" accepts at most ${max} items (received ${value.length})`));
    }
    return next();
  };
}
