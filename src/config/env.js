const path = require('path');
const systemPort = process.env.PORT;
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  port: parseInt(systemPort || process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'seshachala_fee_management',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
  },
  sessionSecret: process.env.SESSION_SECRET || 'seshachala-local-secret-change-me'
};

function validateEnv() {
  const missing = [];
  if (!config.db.host) missing.push('DB_HOST');
  if (!config.db.user) missing.push('DB_USER');
  if (!config.db.database) missing.push('DB_NAME');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

module.exports = config;
