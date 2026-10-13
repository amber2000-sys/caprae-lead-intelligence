import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/apiResponse.js';
import { isProduction } from '../config/env.js';

/**
 * Single exit point for every error in the API.
 *
 * Known, operational errors return their own message. Anything unrecognised
 * returns a generic one, because an unexpected exception's message is as likely
 * to contain a connection string as it is to help the caller.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 400, 'Validation failed', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, 400, `Invalid value for "${err.path}"`);
  }

  if (err?.code === 11000) {
    return sendError(res, 409, 'That record already exists');
  }

  // Unexpected: log the full error server-side, return nothing useful to an attacker.
  console.error('[unhandled]', err);
  return sendError(
    res,
    500,
    'Something went wrong. Please try again.',
    isProduction ? undefined : err.message
  );
}
