const paymentService = require('../services/payment.service');
const paymentRepository = require('../repositories/payment.repository');
const studentRepository = require('../repositories/student.repository');
const asyncHandler = require('../utils/async-handler');

const getFeeCollection = asyncHandler(async (req, res) => {
  const data = await paymentService.getFeeCollectionData(req.query);
  const paymentModes = await paymentService.getEnabledPaymentModes();

  res.render('fee-collection/index.html', {
    payments: data.payments,
    courses: data.courses,
    collected: data.collected,
    transactions: data.transactions,
    students_collected: data.studentsCollected,
    pending: data.pending,
    search: data.search,
    course_filter: data.courseFilter,
    mode_filter: data.modeFilter,
    date_from: data.dateFrom,
    date_to: data.dateTo,
    category_filter: data.categoryFilter,
    year_filter: data.yearFilter,
    valid_categories: ['Convener', 'Management'],
    valid_years: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Old'],
    payment_modes: paymentModes,
    active_filter_count: [data.search, data.courseFilter, data.modeFilter, data.dateFrom, data.dateTo, data.categoryFilter, data.yearFilter].filter(Boolean).length,
    filter_params: {
      search: data.search,
      course_id: data.courseFilter,
      payment_mode: data.modeFilter,
      date_from: data.dateFrom,
      date_to: data.dateTo
    }
  });
});

const getCollectFee = asyncHandler(async (req, res) => {
  const paymentModes = await paymentService.getEnabledPaymentModes();
  const studentCategory = (req.query.category || '').trim();
  const studentYear = (req.query.year || '').trim();
  let studentId = (req.query.student_id || '').trim();

  let student = null;
  let students = [];
  let paymentHistory = [];
  let totalFeeValue = 0.0;
  let paidFeeValue = 0.0;
  let balanceFeeValue = 0.0;
  let paymentSuccess = null;

  if (studentId) {
    student = await studentRepository.findById(parseInt(studentId, 10));
  } else if (studentCategory && studentYear) {
    students = await studentRepository.findAll({ category: studentCategory, year: studentYear });
  }

  if (student) {
    totalFeeValue = parseFloat(student.total_fee || 0);
    paidFeeValue = await paymentRepository.getTotalPaidByStudent(student.id);
    balanceFeeValue = Math.max(totalFeeValue - paidFeeValue, 0);

    paymentHistory = await paymentRepository.findByStudentId(student.id);

    const paymentSuccessId = req.query.payment_success ? parseInt(req.query.payment_success, 10) : null;
    if (paymentSuccessId) {
      const succ = await paymentRepository.findById(paymentSuccessId);
      if (succ) {
        paymentSuccess = {
          payment_id: succ.id,
          receipt_number: succ.receipt_no,
          amount: succ.amount,
          payment_mode: succ.payment_mode
        };
      }
    }
  }

  res.render('fee-collection/collect.html', {
    student,
    students,
    student_category: studentCategory,
    student_year: studentYear,
    total_fee_value: totalFeeValue,
    paid_fee_value: paidFeeValue,
    balance_fee_value: balanceFeeValue,
    payment_history: paymentHistory,
    payment_success: paymentSuccess,
    payment_modes: paymentModes,
    valid_categories: ['Convener', 'Management'],
    valid_years: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Old']
  });
});

const postCollectFee = asyncHandler(async (req, res) => {
  try {
    const paymentId = await paymentService.recordFeeCollection(req.body, req.session.user_id);
    const studentId = req.body.student_id;
    return res.redirect(`/fee-collection/collect?student_id=${studentId}&payment_success=${paymentId}`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to record payment.');
    return res.redirect(`/fee-collection/collect?student_id=${req.body.student_id || ''}`);
  }
});

const getPaymentsOverview = asyncHandler(async (req, res) => {
  const summary = await paymentRepository.findCautionSummary();
  res.render('payments/index.html', {
    caution: summary.caution,
    refund: summary.refund,
    view: req.query.view || 'caution'
  });
});

const getPaymentModuleRecords = asyncHandler(async (req, res) => {
  const moduleType = req.params.module_type; // 'caution' or 'refund'
  const config = {
    title: moduleType === 'refund' ? 'Refund' : 'Caution Deposit',
    plural: moduleType === 'refund' ? 'Refunds' : 'Caution Deposits',
    date_column: moduleType === 'refund' ? 'refund_date' : 'deposit_date'
  };

  const rows = await paymentRepository.findModuleRows(moduleType, req.query);
  const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const studentsCount = new Set(rows.map(r => r.student_id)).size;

  res.render('payments/records.html', {
    module_type: moduleType,
    config,
    rows,
    filters: req.query,
    total_amount: totalAmount,
    students_count: studentsCount
  });
});

const getPaymentModuleAdd = asyncHandler(async (req, res) => {
  const moduleType = req.params.module_type;
  const config = {
    title: moduleType === 'refund' ? 'Refund' : 'Caution Deposit',
    date_column: moduleType === 'refund' ? 'refund_date' : 'deposit_date'
  };
  const paymentModes = await paymentService.getEnabledPaymentModes();
  const students = await studentRepository.findAll({});

  for (const s of students) {
    s.available = await paymentRepository.getCautionBalance(s.id);
  }

  let successRecord = null;
  const successId = req.query.success ? parseInt(req.query.success, 10) : null;
  if (successId) {
    successRecord = await paymentRepository.findModuleRecordById(moduleType, successId);
  }

  res.render('payments/form.html', {
    module_type: moduleType,
    config,
    students,
    payment_modes: paymentModes,
    selected_student_id: req.query.student_id || '',
    success_record: successRecord,
    today: new Date().toISOString().slice(0, 10)
  });
});

const postPaymentModuleAdd = asyncHandler(async (req, res) => {
  const moduleType = req.params.module_type;
  const studentId = parseInt(req.body.student_id, 10);
  const amount = parseFloat(req.body.amount || '0');
  const paymentMode = (req.body.payment_mode || '').trim();
  const receiptNo = (req.body.receipt_no || '').trim();
  const recordDate = (req.body.record_date || '').trim() || new Date().toISOString().slice(0, 10);
  const notes = (req.body.notes || '').trim();

  try {
    if (amount <= 0) throw new Error('Amount must be greater than zero.');
    if (!receiptNo) throw new Error('Enter a receipt number.');

    if (moduleType === 'refund') {
      const available = await paymentRepository.getCautionBalance(studentId);
      if (amount > available) {
        throw new Error(`Refund cannot exceed the available caution deposit of ₹${available.toFixed(2)}.`);
      }
    }

    const recordId = await paymentRepository.createModuleRecord(moduleType, {
      studentId,
      receiptNo,
      amount,
      paymentMode,
      recordDate,
      notes,
      collectedBy: req.session.user_id
    });

    res.redirect(`/payments/${moduleType}/add?success=${recordId}`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to save record.');
    res.redirect(`/payments/${moduleType}/add`);
  }
});

const getPaymentModuleView = asyncHandler(async (req, res) => {
  const { module_type, record_id } = req.params;
  const record = await paymentRepository.findModuleRecordById(module_type, parseInt(record_id, 10));
  if (!record) return res.status(404).send('Record not found');

  const config = { title: module_type === 'refund' ? 'Refund' : 'Caution Deposit' };

  res.render('payments/view.html', {
    module_type,
    config,
    record,
    auto_print: req.query.auto_print === '1'
  });
});

const postPaymentModuleDelete = asyncHandler(async (req, res) => {
  const { module_type, record_id } = req.params;
  await paymentRepository.deleteModuleRecord(module_type, parseInt(record_id, 10));
  req.flash('success', 'Record deleted.');
  res.redirect(`/payments/${module_type}/`);
});

const getPaymentModuleExport = asyncHandler(async (req, res) => {
  const { module_type } = req.params;
  const rows = await paymentRepository.findModuleRows(module_type, req.query);

  let csv = 'Receipt No.,Admission No.,Student,Course,Amount,Payment Mode,Date,Notes\n';
  rows.forEach(r => {
    csv += `"${r.receipt_no}","${r.admission_no}","${r.student_name}","${r.course_name}",${r.amount},"${r.payment_mode}","${r.record_date}","${r.notes || ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${module_type}-records.csv"`);
  res.send(csv);
});

const getPaymentModulePrint = asyncHandler(async (req, res) => {
  const { module_type } = req.params;
  const config = { title: module_type === 'refund' ? 'Refund' : 'Caution Deposit' };
  const rows = await paymentRepository.findModuleRows(module_type, req.query);
  const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  res.render('payments/print.html', {
    config,
    rows,
    auto_print: req.query.pdf === '1',
    total_amount: totalAmount
  });
});

module.exports = {
  getFeeCollection,
  getCollectFee,
  postCollectFee,
  getPaymentsOverview,
  getPaymentModuleRecords,
  getPaymentModuleAdd,
  postPaymentModuleAdd,
  getPaymentModuleView,
  postPaymentModuleDelete,
  getPaymentModuleExport,
  getPaymentModulePrint
};
