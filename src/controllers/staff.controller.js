const staffService = require('../services/staff.service');
const asyncHandler = require('../utils/async-handler');

const getStaff = asyncHandler(async (req, res) => {
  const search = (req.query.q || '').trim();
  const status = (req.query.status || '').trim().toLowerCase();

  const { rows, stats } = await staffService.getStaffList({ search, status });

  res.render('staff/index.html', {
    rows,
    stats,
    search,
    status,
    add_open: req.query.add === '1'
  });
});

const getAddStaff = asyncHandler(async (req, res) => {
  res.render('staff/form.html', { staff: {}, editing: false });
});

const postAddStaff = asyncHandler(async (req, res) => {
  try {
    await staffService.createStaff(req.body);
    req.flash('success', 'Staff account created successfully.');
    return res.redirect('/staff');
  } catch (error) {
    req.flash('error', error.message || 'Unable to create staff.');
    return res.render('staff/form.html', { staff: req.body, editing: false });
  }
});

const getStaffView = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  const staff = await staffService.getStaffById(staffId);
  res.render('staff/view.html', { staff });
});

const getEditStaff = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  const staff = await staffService.getStaffById(staffId);
  res.render('staff/form.html', { staff, editing: true });
});

const postEditStaff = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  try {
    await staffService.updateStaff(staffId, req.body);
    req.flash('success', 'Staff account updated successfully.');
    return res.redirect(`/staff/${staffId}`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to update staff.');
    const staff = await staffService.getStaffById(staffId);
    return res.render('staff/form.html', { staff: { ...staff, ...req.body }, editing: true });
  }
});

const getStaffPermissions = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  const staff = await staffService.getStaffById(staffId);
  res.render('staff/permissions.html', { staff });
});

const postStaffPermissions = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  const accessRole = (req.body.access_role || 'Staff').trim();
  try {
    await staffService.updatePermissions(staffId, accessRole);
    req.flash('success', `Access role changed to ${accessRole}.`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to change permissions.');
  }
  res.redirect(`/staff/${staffId}/permissions`);
});

const postToggleStaff = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  try {
    const { name, newStatus } = await staffService.toggleStatus(staffId);
    req.flash('success', `${name} is now ${newStatus.toLowerCase()}.`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to toggle staff status.');
  }
  res.redirect(req.get('Referrer') || '/staff');
});

const postDeleteStaff = asyncHandler(async (req, res) => {
  const staffId = parseInt(req.params.staff_id, 10);
  try {
    await staffService.deleteStaff(staffId);
    req.flash('success', 'Staff account deleted.');
  } catch (error) {
    req.flash('error', error.message || 'Unable to delete staff account.');
  }
  res.redirect('/staff');
});

module.exports = {
  getStaff,
  getAddStaff,
  postAddStaff,
  getStaffView,
  getEditStaff,
  postEditStaff,
  getStaffPermissions,
  postStaffPermissions,
  postToggleStaff,
  postDeleteStaff
};
