import mongoose from 'mongoose';
import { env, EXPECTED_DB_NAME } from './env.js';

/**
 * Extract the database name from a MongoDB connection string.
 * Handles both mongodb:// and mongodb+srv:// forms, with or without a query string.
 */
export function databaseNameFromUri(uri) {
  const withoutQuery = uri.split('?')[0];
  const afterHost = withoutQuery.replace(/^mongodb(\+srv)?:\/\//, '');
  const slashIndex = afterHost.indexOf('/');
  if (slashIndex === -1) return '';
  return afterHost.slice(slashIndex + 1);
}

/**
 * Guard against writing to the wrong database.
 *
 * Every destructive operation in this project (currently only the seed script)
 * calls this first. It is deliberately a hard failure, not a warning: the cost
 * of a false positive is a one-line config fix, the cost of a false negative is
 * someone's other database.
 */
export function assertProjectDatabase(uri = env.mongoUri) {
  const dbName = databaseNameFromUri(uri);
  if (dbName !== EXPECTED_DB_NAME) {
    throw new Error(
      `Refusing to run against database "${dbName || '(none specified)'}". ` +
        `This project only operates on "${EXPECTED_DB_NAME}". ` +
        'Check MONGO_URI in server/.env.'
    );
  }
  return dbName;
}

export async function connectDatabase({ verifyDatabaseName = true } = {}) {
  if (verifyDatabaseName) assertProjectDatabase();

  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}
