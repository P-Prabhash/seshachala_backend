const express = require('express');
const reportController = require('../controllers/report.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/reports', reportController.getReports);
router.get('/reports/export.csv', reportController.getGeneralReportExport);
router.get('/reports/:report_type', reportController.getReportDetail);
router.get('/reports/:report_type/export.csv', reportController.getReportExport);

module.exports = router;
