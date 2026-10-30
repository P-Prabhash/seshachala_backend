function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user_id) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      return res.redirect('/login');
    }

    const userRole = req.session.role;
    if (!allowedRoles.includes(userRole)) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      req.flash('error', 'This module is available only to administrators.');
      return res.redirect('/dashboard');
    }

    next();
  };
}

module.exports = authorize;
