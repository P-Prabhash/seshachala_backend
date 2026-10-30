const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const contactRoutes = require('./contact.routes');
const dashboardRoutes = require('./dashboard.routes');
const studentRoutes = require('./student.routes');
const paymentRoutes = require('./payment.routes');
const receiptRoutes = require('./receipt.routes');
const reportRoutes = require('./report.routes');
const staffRoutes = require('./staff.routes');
const settingsRoutes = require('./settings.routes');
const profileRoutes = require('./profile.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/api', contactRoutes);
router.use('/', authRoutes);
router.use('/', dashboardRoutes);
router.use('/', studentRoutes);
router.use('/', paymentRoutes);
router.use('/', receiptRoutes);
router.use('/', reportRoutes);
router.use('/', staffRoutes);
router.use('/', settingsRoutes);
router.use('/', profileRoutes);

module.exports = router;
