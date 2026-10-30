const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled application error: %s | Stack: %s', message, err.stack);

  if (req.originalUrl.startsWith('/api/') || req.headers.accept === 'application/json') {
    return res.status(statusCode).json({
      success: false,
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR'
    });
  }

  res.status(statusCode).render('error.html', {
    message
  });
}

module.exports = errorHandler;
