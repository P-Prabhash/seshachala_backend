function authenticate(req, res, next) {
  if (req.session && req.session.user_id) {
    return next();
  }

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED'
    });
  }

  const loginUrl = `/login?next=${encodeURIComponent(req.originalUrl)}`;
  res.redirect(loginUrl);
}

module.exports = authenticate;
