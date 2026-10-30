function notFound(req, res, next) {
  if (req.originalUrl.startsWith('/api/') || req.headers.accept === 'application/json') {
    return res.status(404).json({
      success: false,
      message: 'Requested endpoint or resource was not found.',
      code: 'NOT_FOUND'
    });
  }

  res.status(404).render('error.html', {
    message: 'Page Not Found (404)'
  });
}

module.exports = notFound;
