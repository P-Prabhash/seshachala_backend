const receiptService = require('../services/receipt.service');
const asyncHandler = require('../utils/async-handler');

const getReceipts = asyncHandler(async (req, res) => {
  const category = (req.query.category || '').trim();
  const year = (req.query.year || '').trim();

  const data = await receiptService.getReceiptList({ category, year });

  res.render('receipts/index.html', {
    rows: data.rows,
    total_receipts: data.totalReceipts,
    collected: data.collected,
    today: data.today,
    outstanding: 0,
    categories: ['Convener', 'Management'],
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Old'],
    category_filter: category,
    year_filter: year
  });
});

const getOutstandingFees = asyncHandler(async (req, res) => {
  const search = (req.query.q || '').trim();
  const rows = await receiptService.getOutstandingFees(search);
  const totalOutstanding = rows.reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);

  res.render('receipts/outstanding.html', {
    rows,
    search,
    total_outstanding: totalOutstanding
  });
});

const getOutstandingFeePrint = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.student_id, 10);
  const student = await receiptService.getOutstandingFeeForStudent(studentId);

  res.render('receipts/outstanding_print.html', {
    student
  });
});

const getReceiptById = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.payment_id, 10);
  const { payment } = await receiptService.getReceiptById(paymentId);

  const fromReceipts = req.query.source === 'receipts';
  const returnUrl = fromReceipts ? '/receipts' : `/fee-collection/collect?student_id=${payment.student_id}`;

  if (fromReceipts) {
    return res.render('receipts/print.html', {
      payment,
      return_url: returnUrl,
      auto_print: req.query.auto_print === '1'
    });
  }

  res.render('fee-collection/receipt.html', {
    payment,
    return_url: returnUrl,
    auto_print: req.query.auto_print === '1'
  });
});

module.exports = {
  getReceipts,
  getOutstandingFees,
  getOutstandingFeePrint,
  getReceiptById
};
