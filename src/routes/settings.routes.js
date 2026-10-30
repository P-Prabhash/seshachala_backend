const express = require('express');
const settingsController = require('../controllers/settings.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);
router.use(authorize('Admin'));

router.get('/settings', settingsController.getSettings);
router.get('/settings/college', settingsController.getCollegeSettings);
router.post('/settings/college', settingsController.postCollegeSettings);
router.get('/settings/academic', settingsController.getAcademicSettings);
router.post('/settings/academic', settingsController.postAcademicSettings);
router.get('/settings/courses', settingsController.getCourseSettings);
router.post('/settings/courses', settingsController.postCourseSettings);
router.get('/settings/courses/:course_id/edit', settingsController.getEditCourse);
router.post('/settings/courses/:course_id/edit', settingsController.postEditCourse);
router.get('/settings/backup/download', settingsController.getDownloadBackup);
router.get('/settings/:section', settingsController.getSection);
router.post('/settings/:section', settingsController.postSection);

module.exports = router;
