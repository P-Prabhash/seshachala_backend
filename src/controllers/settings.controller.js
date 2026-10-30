const settingsService = require('../services/settings.service');
const settingsRepository = require('../repositories/settings.repository');
const asyncHandler = require('../utils/async-handler');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getCollegeSettings();
  const courses = await settingsService.getCourses();
  const years = await settingsService.getAcademicYears();

  res.render('settings/index.html', {
    settings,
    courses_count: courses.length,
    academic_years_count: years.length
  });
});

const getCollegeSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getCollegeSettings();
  res.render('settings/college.html', { settings });
});

const postCollegeSettings = asyncHandler(async (req, res) => {
  try {
    await settingsService.updateCollegeSettings(req.body);
    req.flash('success', 'College details updated.');
  } catch (error) {
    req.flash('error', error.message || 'Unable to update college settings.');
  }
  res.redirect('/settings/college');
});

const getAcademicSettings = asyncHandler(async (req, res) => {
  const years = await settingsService.getAcademicYears();
  res.render('settings/academic.html', { years });
});

const postAcademicSettings = asyncHandler(async (req, res) => {
  const action = req.body.action;
  const yearId = req.body.year_id ? parseInt(req.body.year_id, 10) : null;

  try {
    if (action === 'add') {
      await settingsService.addAcademicYear(req.body.name);
      req.flash('success', 'Academic year added.');
    } else if (action === 'activate' && yearId) {
      await settingsService.activateAcademicYear(yearId);
      req.flash('success', 'Active academic year updated.');
    } else if (action === 'delete' && yearId) {
      await settingsService.deleteAcademicYear(yearId);
      req.flash('success', 'Academic year deleted.');
    }
  } catch (error) {
    req.flash('error', error.message || 'Unable to update academic years.');
  }
  res.redirect('/settings/academic');
});

const getCourseSettings = asyncHandler(async (req, res) => {
  const courses = await settingsService.getCourses();
  res.render('settings/courses.html', { courses });
});

const postCourseSettings = asyncHandler(async (req, res) => {
  const action = req.body.action;
  const courseId = req.body.course_id ? parseInt(req.body.course_id, 10) : null;

  try {
    if (action === 'add') {
      await settingsService.addCourse(req.body.name, req.body.duration_years);
      req.flash('success', 'Course added and activated.');
    } else if (action === 'toggle' && courseId) {
      await settingsService.toggleCourse(courseId);
      req.flash('success', 'Course status updated.');
    } else if (action === 'delete' && courseId) {
      await settingsService.deleteCourse(courseId);
      req.flash('success', 'Course deleted.');
    }
  } catch (error) {
    req.flash('error', error.message || 'Unable to update courses.');
  }
  res.redirect('/settings/courses');
});

const getEditCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.course_id, 10);
  const course = await settingsRepository.getCourseById(courseId);
  if (!course) return res.status(404).send('Course not found');
  res.render('settings/course_form.html', { course });
});

const postEditCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.course_id, 10);
  try {
    await settingsService.updateCourse(courseId, req.body.name, req.body.duration_years);
    req.flash('success', 'Course updated.');
    return res.redirect('/settings/courses');
  } catch (error) {
    req.flash('error', error.message || 'Unable to update course.');
    const course = await settingsRepository.getCourseById(courseId);
    return res.render('settings/course_form.html', { course: { ...course, ...req.body } });
  }
});

const SETTINGS_FORM_FIELDS = {
  fees: {
    title: 'Fee Settings',
    description: 'Configure fee fields shown when adding or editing a student.',
    fields: [
      ['fee_types', 'Student Fee Fields (comma-separated)', 'textarea'],
      ['default_installments', 'Default Installments', 'number'],
      ['late_fee_amount', 'Late Fee Amount (₹)', 'number'],
      ['max_discount_percent', 'Maximum Discount (%)', 'number']
    ],
    note: 'Each label becomes a selectable fee field in Add Student and Edit Student. Only selected amounts are included in the student’s total fee.'
  },
  receipt: {
    title: 'Receipt Settings',
    description: 'Configure receipt labels and numbering for generated receipts.',
    fields: [
      ['receipt_prefix', 'Receipt Prefix', 'text'],
      ['receipt_header', 'Receipt Header', 'text'],
      ['receipt_footer', 'Receipt Footer', 'textarea'],
      ['signature_label', 'Signature Label', 'text'],
      ['receipt_logo_path', 'Logo Path', 'text']
    ],
    note: 'The receipt prefix applies to automatically generated tuition receipt numbers. Manually entered receipt numbers remain unchanged.'
  }
};

const getSection = asyncHandler(async (req, res) => {
  const section = req.params.section;

  if (section === 'permissions') return res.render('settings/permissions.html');
  if (section === 'backup') return res.render('settings/backup.html', { database_path: 'seshachala_fee_management' });

  const appSettings = await settingsRepository.getAppSettings();

  if (section === 'payment') {
    const modes = ['Cash', 'UPI', 'Card', 'Check'];
    const configured = appSettings.payment_modes || 'Cash,UPI,Card,Check';
    const enabledModes = configured.split(',').map(s => s.trim());

    return res.render('settings/payment.html', {
      enabled_modes: enabledModes,
      modes
    });
  }

  const config = SETTINGS_FORM_FIELDS[section];
  if (!config) return res.status(404).send('Section not found');

  const values = {};
  config.fields.forEach(([key]) => {
    values[key] = appSettings[key] || '';
  });

  res.render('settings/config.html', {
    ...config,
    values,
    section
  });
});

const postSection = asyncHandler(async (req, res) => {
  const section = req.params.section;
  try {
    await settingsService.saveConfigSection(section, req.body);
    req.flash('success', `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved.`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to save settings.');
  }
  res.redirect(`/settings/${section}`);
});

const getDownloadBackup = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="database-backup-${new Date().toISOString().slice(0, 10)}.sql"`);
  res.send('-- Seshachala Fee Management Database Backup Placeholder\n-- Use MySQL Workbench or mysqldump for full binary/schema dump.\n');
});

module.exports = {
  getSettings,
  getCollegeSettings,
  postCollegeSettings,
  getAcademicSettings,
  postAcademicSettings,
  getCourseSettings,
  postCourseSettings,
  getEditCourse,
  postEditCourse,
  getSection,
  postSection,
  getDownloadBackup
};
