const app = require('./app');
const config = require('./config/env');
const { checkConnection, pool } = require('./config/database');
const logger = require('./utils/logger');
const migrate = require('../database/migrate');
const seed = require('../database/seed');

async function startServer() {
  try {
    logger.info('Initializing Seshachala Fee Management Node.js Backend...');

    // Verify database connectivity
    await checkConnection();

    // Run pending schema migrations and seed default data
    try {
      await migrate();
      await seed();
    } catch (migErr) {
      logger.warn('Automated migration/seed notice: %s', migErr.message);
    }

    const server = app.listen(config.port, () => {
      logger.info(`=======================================================`);
      logger.info(` Seshachala Student Fee Management (Node.js + Express)`);
      logger.info(` Server running at: http://127.0.0.1:${config.port}`);
      logger.info(` Database: MySQL (${config.db.database} at ${config.db.host}:${config.db.port})`);
      logger.info(` Admin login : admin / admin123`);
      logger.info(` Staff login : staff / staff123`);
      logger.info(`=======================================================`);
    });

    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Closing HTTP server and database pool...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await pool.end();
          logger.info('MySQL pool connections closed safely.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during database pool shutdown: %s', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error('Server startup failed: %s', error.stack || error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
