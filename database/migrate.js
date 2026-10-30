const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/env');
const logger = require('../src/utils/logger');

async function migrate() {
  const isStatusOnly = process.argv.includes('--status');

  logger.info(`Connecting to MySQL host at ${config.db.host}:${config.db.port}...`);

  // First connect to MySQL without selecting a database so we can ensure the DB exists
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${config.db.database}\``);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await connection.query('SELECT migration_name FROM schema_migrations');
    const executedMigrations = new Set(rows.map(r => r.migration_name));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (isStatusOnly) {
      console.log('\n--- Migration Status ---');
      files.forEach(file => {
        const status = executedMigrations.has(file) ? 'EXECUTED' : 'PENDING';
        console.log(`[${status}] ${file}`);
      });
      console.log('------------------------\n');
      return;
    }

    let appliedCount = 0;
    for (const file of files) {
      if (!executedMigrations.has(file)) {
        logger.info(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await connection.beginTransaction();
        try {
          await connection.query(sql);
          await connection.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
          await connection.commit();
          logger.info(`Successfully applied migration: ${file}`);
          appliedCount++;
        } catch (error) {
          await connection.rollback();
          logger.error(`Migration failed on ${file}: %s`, error.message);
          throw error;
        }
      }
    }

    if (appliedCount === 0) {
      logger.info('Database schema is up to date. No pending migrations.');
    } else {
      logger.info(`Successfully executed ${appliedCount} migration(s).`);
    }

  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch(error => {
    logger.error('Migration failed: %s', error.stack || error.message);
    process.exit(1);
  });
}

module.exports = migrate;
