/**
 * Server entry point.
 *
 * Config, app and database are imported dynamically inside `start()` rather
 * than at the top of the file. Static imports are hoisted, so a configuration
 * error — the most likely first-run failure — would throw during module
 * evaluation and escape any try/catch, printing a stack trace instead of the
 * one-line fix the user actually needs.
 */

async function start() {
  let env;

  try {
    ({ env } = await import('./config/env.js'));
  } catch (error) {
    console.error('\n  Configuration error\n');
    console.error(`  ${error.message}\n`);
    console.error('  Fix: cp server/.env.example server/.env\n');
    process.exit(1);
  }

  try {
    const { connectDatabase } = await import('./config/db.js');
    const { createApp } = await import('./app.js');

    const connection = await connectDatabase();
    console.log(`[db] connected to "${connection.name}" at ${connection.host}:${connection.port}`);

    const app = createApp();
    const server = app.listen(env.port, () => {
      console.log(`[api] Caprae Lead Intelligence listening on http://localhost:${env.port}`);
      console.log(`[api] health check: http://localhost:${env.port}/api/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[api] ${signal} received, shutting down`);
      server.close(async () => {
        const mongoose = (await import('mongoose')).default;
        await mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('\n  Could not start the API\n');
    console.error(`  ${error.message}\n`);

    // The overwhelmingly common cause on a fresh machine is no local MongoDB.
    if (/ECONNREFUSED|ServerSelection/i.test(error.message)) {
      console.error('  Is MongoDB running?  brew services start mongodb-community\n');
    }
    process.exit(1);
  }
}

start();
