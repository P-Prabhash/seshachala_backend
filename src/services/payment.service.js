const paymentRepository = require('../repositories/payment.repository');
const studentRepository = require('../repositories/student.repository');
const settingsRepository = require('../repositories/settings.repository');
const { query } = require('../config/database');
const AppError = require('../utils/app-error');

class PaymentService {
  async getEnabledPaymentModes() {
    const appSettings = await settingsRepository.getAppSettings();
    const configured = appSettings.payment_modes || 'Cash,UPI,Card,Check';
    const allowed = ['Cash', 'UPI', 'Card', 'Check'];
    const activeSet = new Set(configured.split(',').map(s => s.trim()));
    return allowed.filter(mode => activeSet.has(mode));
  }

  async recordFeeCollection(formData, userId) {
    const studentId = parseInt(formData.student_id, 10);
    const amount = parseFloat(formData.amount || 0);

    if (!studentId) throw new AppError('Please select a student before recording a payment.', 400);
    if (isNaN(amount) || amount <= 0) throw new AppError('Amount must be greater than zero.', 400);

    const student = await studentRepository.findById(studentId);
    if (!student) throw new AppError('Student not found.', 404);

    const paidFee = await paymentRepository.getTotalPaidByStudent(studentId);
    const totalFee = parseFloat(student.total_fee || 0);
    const balance = Math.max(totalFee - paidFee, 0);

    if (amount > balance) {
      throw new AppError(`Amount cannot exceed the outstanding balance of ₹${balance.toFixed(2)}.`, 400);
    }

    const enabledModes = await this.getEnabledPaymentModes();
    const paymentMode = formData.payment_mode || 'Cash';
    if (!enabledModes.includes(paymentMode)) {
      throw new AppError('Please select a valid payment mode.', 400);
    }

    let receiptNo = (formData.receipt_number || '').trim();
    if (!receiptNo) {
      const appSettings = await settingsRepository.getAppSettings();
      const prefix = (appSettings.receipt_prefix || 'SCP').trim() || 'SCP';
      receiptNo = `${prefix}-${Date.now()}`;
    }

    const paidAt = formData.paid_at ? formData.paid_at.trim() : '';
    let paymentDate;
    if (paidAt) {
      paymentDate = new Date(paidAt).toISOString().slice(0, 19).replace('T', ' ');
    } else {
      paymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    let notes = '';
    if (paymentMode === 'UPI') {
      const ref = (formData.upi_transaction_id || '').trim();
      if (!ref) throw new AppError('Enter the UPI transaction ID.', 400);
      notes = `UPI Transaction ID: ${ref}`;
    } else if (paymentMode === 'Card') {
      const cardNum = (formData.card_number || '').replace(/\D/g, '');
      const ref = (formData.transaction_ref || '').trim();
      if (cardNum.length < 4 || !ref) throw new AppError('Enter the card number and transaction/reference number.', 400);
      notes = `Card ending ${cardNum.slice(-4)}; Reference: ${ref}`;
    } else if (paymentMode === 'Check') {
      const checkNo = (formData.check_number || '').trim();
      const bankName = (formData.bank_name || '').trim();
      const bankBranch = (formData.bank_branch || '').trim();
      if (!checkNo || !bankName || !bankBranch) throw new AppError('Enter the cheque number, bank name, and branch.', 400);
      notes = `Cheque: ${checkNo}; Bank: ${bankName}; Branch: ${bankBranch}`;
    }

    const paymentId = await paymentRepository.create({
      studentId,
      receiptNo,
      amount,
      paymentMode,
      paymentDate,
      notes,
      collectedBy: userId
    });

    return paymentId;
  }

  async getFeeCollectionData(queryData) {
    const search = (queryData.search || '').trim();
    const courseId = parseInt(queryData.course_id || '0', 10);
    const modeFilter = (queryData.payment_mode || '').trim();
    const dateFrom = (queryData.date_from || '').trim();
    const dateTo = (queryData.date_to || '').trim();
    const categoryFilter = (queryData.category || '').trim();
    const yearFilter = (queryData.year || '').trim();

    const courses = await settingsRepository.getActiveCourses();
    let courseFilterName = '';
    for (const c of courses) {
      if (c.id === courseId) {
        courseFilterName = c.name;
        break;
      }
    }

    const conditions = ['1=1'];
    const params = [];

    if (search) {
      const like = `%${search}%`;
      conditions.push('(s.name LIKE ? OR s.admission_no LIKE ? OR s.mobile LIKE ? OR p.receipt_no LIKE ? OR s.course LIKE ?)');
      params.push(like, like, like, like, like);
    }
    if (courseFilterName) {
      conditions.push('s.course = ?');
      params.push(courseFilterName);
    }
    if (categoryFilter) {
      conditions.push('s.category = ?');
      params.push(categoryFilter);
    }
    if (yearFilter) {
      conditions.push('s.year_sem = ?');
      params.push(yearFilter);
    }
    if (modeFilter) {
      conditions.push('LOWER(p.payment_mode) = LOWER(?)');
      params.push(modeFilter);
    }
    if (dateFrom) {
      conditions.push('DATE(p.payment_date) >= DATE(?)');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('DATE(p.payment_date) <= DATE(?)');
      params.push(dateTo);
    }

    const whereSql = conditions.join(' AND ');

    const [summary] = await query(`
      SELECT
        COALESCE(SUM(p.amount), 0) AS collected,
        COUNT(p.id) AS transactions,
        COUNT(DISTINCT p.student_id) AS students
      FROM payments p
      INNER JOIN students s ON s.id = p.student_id
      WHERE ${whereSql}
    `, params);

    const payments = await query(`
      SELECT
        p.id, p.student_id, p.amount, p.payment_mode, p.payment_date, p.receipt_no, p.notes,
        s.name AS student_name, s.admission_no, s.course AS course_name, s.year_sem,
        u.full_name AS collected_by_name
      FROM payments p
      INNER JOIN students s ON s.id = p.student_id
      LEFT JOIN users u ON u.id = p.collected_by
      WHERE ${whereSql}
      ORDER BY p.payment_date DESC, p.id DESC
      LIMIT 100
    `, params);

    return {
      payments,
      courses,
      collected: parseFloat(summary.collected || 0),
      transactions: parseInt(summary.transactions || 0, 10),
      studentsCollected: parseInt(summary.students || 0, 10),
      pending: 0,
      search,
      courseFilter: courseId,
      modeFilter,
      dateFrom,
      dateTo,
      categoryFilter,
      yearFilter
    };
  }
}

module.exports = new PaymentService();
