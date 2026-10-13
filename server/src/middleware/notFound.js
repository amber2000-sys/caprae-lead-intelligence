import { ApiError } from '../utils/ApiError.js';

export function notFound(req, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export default function notFoundHandler(req, res, next) {
  notFound(req, next);
}
