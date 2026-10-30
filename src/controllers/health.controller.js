const { checkConnection } = require('../config/database');
const asyncHandler = require('../utils/async-handler');

const getHealthStatus = asyncHandler(async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const isDbConnected = await checkConnection();
    if (isDbConnected) dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'unavailable';
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DOWN',
    service: 'seshachala-fee-management',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

module.exports = {
  getHealthStatus
};
