const authService = require('../services/auth.service');
const asyncHandler = require('../utils/async-handler');

const getIndex = asyncHandler(async (req, res) => {
  if (req.session && req.session.user_id) {
    return res.redirect('/dashboard');
  }
  res.render('intro.html', { login_url: '/login?intro_done=1' });
});

const getLogin = asyncHandler(async (req, res) => {
  if (req.method === 'GET' && req.query.intro_done !== '1') {
    const loginArgs = { intro_done: 1 };
    const nextUrl = (req.query.next || '').trim();
    if (nextUrl) loginArgs.next = nextUrl;
    const queryString = new URLSearchParams(loginArgs).toString();
    return res.render('intro.html', { login_url: `/login?${queryString}` });
  }

  res.render('login/index.html');
});

const postLogin = asyncHandler(async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  try {
    const user = await authService.authenticateUser(username, password);

    req.session.regenerate((err) => {
      if (err) {
        req.flash('error', 'Session error. Please try again.');
        return res.redirect('/login');
      }

      req.session.user_id = user.id;
      req.session.username = user.username;
      req.session.full_name = user.full_name;
      req.session.role = user.role;

      let nextUrl = (req.query.next || '').trim();
      if (!nextUrl.startsWith('/') || nextUrl.startsWith('//')) {
        nextUrl = '/dashboard';
      }

      res.redirect(nextUrl);
    });
  } catch (error) {
    req.flash('error', error.message || 'Invalid username or password.');
    res.redirect('/login');
  }
});

const getLogout = asyncHandler(async (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = {
  getIndex,
  getLogin,
  postLogin,
  getLogout
};
