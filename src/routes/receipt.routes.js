const express = require('express');
const receiptController = require('../controllers/receipt.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/receipts', receiptController.getReceipts);
router.get('/receipts/outstanding', receiptController.getOutstandingFees);
router.get('/receipts/outstanding/:student_id/print', receiptController.getOutstandingFeePrint);
router.get('/receipt/:payment_id', receiptController.getReceiptById);

module.exports = router;
