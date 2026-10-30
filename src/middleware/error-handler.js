const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled application error: %s | Stack: %s', message, err.stack);

  if (req.originalUrl.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('json')) || req.xhr) {
    return res.status(statusCode).json({
      success: false,
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR'
    });
  }

  try {
    return res.status(statusCode).render('error.html', { message });
  } catch (renderErr) {
    return res.status(statusCode).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - Seshachala Fee Management</title>
          <style>body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }</style>
        </head>
        <body>
          <h2>Application Error (${statusCode})</h2>
          <p>${message}</p>
          <a href="/login" style="color: #0d6efd; text-decoration: none;">Return to Login</a>
        </body>
      </html>
    `);
  }
}

module.exports = errorHandler;
