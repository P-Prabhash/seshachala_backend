const express = require('express');
const staffController = require('../controllers/staff.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);
router.use(authorize('Admin'));

router.get('/staff', staffController.getStaff);
router.get('/staff/add', staffController.getAddStaff);
router.post('/staff/add', staffController.postAddStaff);
router.get('/staff/:staff_id', staffController.getStaffView);
router.get('/staff/:staff_id/edit', staffController.getEditStaff);
router.post('/staff/:staff_id/edit', staffController.postEditStaff);
router.get('/staff/:staff_id/permissions', staffController.getStaffPermissions);
router.post('/staff/:staff_id/permissions', staffController.postStaffPermissions);
router.post('/staff/:staff_id/toggle', staffController.postToggleStaff);
router.post('/staff/:staff_id/delete', staffController.postDeleteStaff);

module.exports = router;
