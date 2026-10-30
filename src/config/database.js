const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true
});

async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info(`Successfully connected to MySQL database: ${config.db.database} at ${config.db.host}:${config.db.port}`);
    return true;
  } catch (error) {
    logger.error('MySQL database connection error: %s', error.message);
    throw error;
  }
}

async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('Database query error: %s | SQL: %s', error.message, sql);
    throw error;
  }
}

async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Database transaction failed and rolled back: %s', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  checkConnection,
  query,
  transaction
};
