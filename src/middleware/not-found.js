function notFound(req, res, next) {
  if (req.originalUrl.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('json')) || req.xhr) {
    return res.status(404).json({
      success: false,
      message: 'Requested endpoint or resource was not found.',
      code: 'NOT_FOUND'
    });
  }

  try {
    return res.status(404).render('error.html', {
      message: 'Page Not Found (404)'
    });
  } catch (renderErr) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>404 Not Found - Seshachala Fee Management</title>
          <style>body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }</style>
        </head>
        <body>
          <h2>404 - Page Not Found</h2>
          <p>The requested URL was not found on this server.</p>
          <a href="/login" style="color: #0d6efd; text-decoration: none;">Return to Login</a>
        </body>
      </html>
    `);
  }
}

module.exports = notFound;
