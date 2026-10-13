import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, isProduction } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import notFoundHandler from './middleware/notFound.js';

export function createApp() {
  const app = express();

  // Behind a proxy the rate limiter needs the real client IP, not the hop.
  app.set('trust proxy', 1);

  // Security headers. CSP is left off because this API serves JSON only and the
  // frontend is a separate origin with its own policy — enabling it here would
  // be decoration, not protection.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Explicit origin allow-list rather than `*`: the browser is the only client,
  // and we know exactly which origin it will be.
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser callers (curl, tests) send no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      exposedHeaders: ['Content-Disposition', 'X-Export-Row-Count'],
    })
  );

  // 1 MB cap: the largest legitimate body is a bulk export selection.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (!isProduction) app.use(morgan('dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, error: { message: 'Too many requests. Please slow down.' } },
    })
  );

  app.use('/api', routes);

  app.get('/', (req, res) =>
    res.json({
      success: true,
      data: { name: 'Caprae Lead Intelligence API', version: '1.0.0', docs: '/api/health' },
    })
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
