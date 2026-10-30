const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(e => e.msg).join(', ');
    if (req.originalUrl.startsWith('/api/') || req.headers.accept === 'application/json') {
      return res.status(400).json({
        success: false,
        message,
        errors: errors.array()
      });
    }
    req.flash('error', message);
    return res.redirect(req.header('Referer') || '/dashboard');
  }
  next();
}

module.exports = validate;
