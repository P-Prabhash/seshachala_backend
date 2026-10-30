const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/fee-collection', paymentController.getFeeCollection);
router.get('/fee-collection/collect', paymentController.getCollectFee);
router.post('/fee-collection/collect', paymentController.postCollectFee);

router.get('/payments', paymentController.getPaymentsOverview);
router.get('/payments/:module_type', paymentController.getPaymentModuleRecords);
router.get('/payments/:module_type/add', paymentController.getPaymentModuleAdd);
router.post('/payments/:module_type/add', paymentController.postPaymentModuleAdd);
router.get('/payments/:module_type/export.csv', paymentController.getPaymentModuleExport);
router.get('/payments/:module_type/print', paymentController.getPaymentModulePrint);
router.get('/payments/:module_type/:record_id', paymentController.getPaymentModuleView);
router.post('/payments/:module_type/:record_id/delete', paymentController.postPaymentModuleDelete);

module.exports = router;
