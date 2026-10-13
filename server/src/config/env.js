import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the server's own .env regardless of the directory the process was started from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * The only database this project is allowed to touch.
 *
 * The connection string is read exclusively from the environment — there is no
 * hard-coded fallback URI anywhere in this codebase. If MONGO_URI is missing we
 * fail loudly at boot rather than silently guessing at another instance, which
 * is how projects accidentally seed over a database that was not theirs.
 */
export const EXPECTED_DB_NAME = 'caprae_lead_intelligence';

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        'Copy server/.env.example to server/.env and set it before starting the server.'
    );
  }
  return value.trim();
}

export const env = {
  mongoUri: required('MONGO_URI'),
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === 'production';
