const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');
const session = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const routes = require('./routes/index.routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');
const logger = require('./utils/logger');
const settingsRepository = require('./repositories/settings.repository');
const { query } = require('./config/database');

const app = express();

// Security and CORS middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts and CDN styles matching existing templates
}));
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, '../../seshachala_frontend/static')));

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(flash());

// Nunjucks template engine setup
const env = nunjucks.configure(path.join(__dirname, '../../seshachala_frontend/templates'), {
  autoescape: true,
  express: app,
  noCache: config.nodeEnv === 'development'
});

// Custom Nunjucks Filters
env.addFilter('tojson', (obj) => JSON.stringify(obj || {}));
env.addFilter('format', (val, spec) => {
  if (typeof val === 'number') {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val;
});

// Endpoint route mapper for Flask's url_for
function urlFor(endpoint, options = {}) {
  const { filename, ...params } = options;

  if (endpoint === 'static') {
    return `/static/${filename}`;
  }

  const endpointMap = {
    dashboard: '/dashboard',
    login: '/login',
    logout: '/logout',
    students: '/students',
    add_student: '/students/add',
    fee_collection: '/fee-collection',
    collect_fee: '/fee-collection/collect',
    add_payment: '/payments/add',
    payments: '/payments',
    receipts: '/receipts',
    outstanding_fees: '/receipts/outstanding',
    reports: '/reports',
    staff: '/staff',
    add_staff: '/staff/add',
    settings: '/settings',
    save_college_settings: '/settings/college',
    academic_settings: '/settings/academic',
    course_settings: '/settings/courses',
    download_database_backup: '/settings/backup/download',
    profile: '/profile',
    export_csv: '/reports/export.csv'
  };

  let basePath = endpointMap[endpoint];

  if (!basePath) {
    if (endpoint === 'receipt' && params.payment_id) {
      basePath = `/receipt/${params.payment_id}`;
      delete params.payment_id;
    } else if (endpoint === 'payment_module_index' && params.module_type) {
      basePath = `/payments/${params.module_type}/`;
      delete params.module_type;
    } else if (endpoint === 'payment_module_add' && params.module_type) {
      basePath = `/payments/${params.module_type}/add`;
      delete params.module_type;
    } else if (endpoint === 'payment_module_view' && params.module_type && params.record_id) {
      basePath = `/payments/${params.module_type}/${params.record_id}`;
      delete params.module_type;
      delete params.record_id;
    } else if (endpoint === 'report_detail' && params.report_type) {
      basePath = `/reports/${params.report_type}`;
      delete params.report_type;
    } else if (endpoint === 'staff_view' && params.staff_id) {
      basePath = `/staff/${params.staff_id}`;
      delete params.staff_id;
    } else if (endpoint === 'edit_staff' && params.staff_id) {
      basePath = `/staff/${params.staff_id}/edit`;
      delete params.staff_id;
    } else if (endpoint === 'staff_permissions' && params.staff_id) {
      basePath = `/staff/${params.staff_id}/permissions`;
      delete params.staff_id;
    } else if (endpoint === 'settings_section' && params.section) {
      basePath = `/settings/${params.section}`;
      delete params.section;
    } else {
      basePath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    }
  }

  const queryKeys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '');
  if (queryKeys.length > 0) {
    const searchParams = new URLSearchParams();
    queryKeys.forEach(k => searchParams.append(k, params[k]));
    basePath += `?${searchParams.toString()}`;
  }

  return basePath;
}

env.addGlobal('url_for', urlFor);

// Global template context middleware
app.use(async (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[API REQUEST] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });

  res.locals.url_for = urlFor;
  res.locals.get_flashed_messages = (options = {}) => {
    const flashMessages = req.flash();
    if (options.with_categories) {
      const result = [];
      Object.keys(flashMessages).forEach(category => {
        flashMessages[category].forEach(msg => {
          result.push([category === 'error' ? 'danger' : category, msg]);
        });
      });
      return result;
    }
    const all = [];
    Object.values(flashMessages).forEach(arr => all.push(...arr));
    return all;
  };

  res.locals.logged_user = req.session ? (req.session.full_name || 'Administrator') : 'Administrator';
  res.locals.logged_role = req.session ? (req.session.role || 'Admin') : 'Admin';
  res.locals.is_admin = req.session ? req.session.role === 'Admin' : false;
  res.locals.is_staff = req.session ? req.session.role === 'Staff' : false;
  res.locals.session = req.session || {};

  res.locals.request = {
    endpoint: req.path.replace(/^\//, '').replace(/\//g, '_') || 'dashboard',
    path: req.path,
    args: {
      get: (key) => req.query[key] || ''
    }
  };

  try {
    const college = await settingsRepository.getCollegeSettings();
    const appSettings = await settingsRepository.getAppSettings();
    const ayRows = await query('SELECT name FROM academic_years WHERE active=1 ORDER BY id DESC LIMIT 1');

    res.locals.college_settings = college;
    res.locals.app_settings = appSettings;
    res.locals.current_year = ayRows[0] ? ayRows[0].name : '2026–27';

    const logo = college.logo_path || '/static/images/logo.png';
    res.locals.college_logo_url = logo.startsWith('/') || logo.startsWith('http') ? logo : `/static/${logo}`;
  } catch (err) {
    res.locals.college_settings = {};
    res.locals.app_settings = {};
    res.locals.current_year = '2026–27';
    res.locals.college_logo_url = '/static/images/logo.png';
  }

  next();
});

// Register all application routes
app.use('/', routes);

// 404 and Error Handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
