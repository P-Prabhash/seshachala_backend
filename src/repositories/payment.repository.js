const { query } = require('../config/database');

class PaymentRepository {
  async findById(id) {
    const rows = await query(
      `SELECT p.*, s.name, s.name AS student_name, s.admission_no, s.father_name, s.mobile,
              s.course, s.year_sem, s.total_fee,
              u.full_name AS collected_by_name
       FROM payments p
       JOIN students s ON s.id = p.student_id
       LEFT JOIN users u ON u.id = p.collected_by
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async create(paymentData) {
    const res = await query(
      `INSERT INTO payments
       (student_id, receipt_no, amount, payment_mode, payment_date, notes, collected_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentData.studentId,
        paymentData.receiptNo,
        paymentData.amount,
        paymentData.paymentMode,
        paymentData.paymentDate,
        paymentData.notes || null,
        paymentData.collectedBy || null
      ]
    );
    return res.insertId;
  }

  async getTotalPaidByStudent(studentId) {
    const rows = await query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE student_id = ?',
      [studentId]
    );
    return parseFloat(rows[0].total || 0);
  }

  async findByStudentId(studentId) {
    return await query(
      `SELECT p.id, p.amount, p.payment_mode, p.payment_date, p.notes, p.receipt_no
       FROM payments p
       WHERE p.student_id = ?
       ORDER BY p.payment_date DESC, p.id DESC`,
      [studentId]
    );
  }

  async findReceiptsList({ category = '', year = '' }) {
    const conditions = ['1=1'];
    const params = [];

    if (category) {
      conditions.push('TRIM(COALESCE(s.category, "")) = ?');
      params.push(category);
    }
    if (year) {
      conditions.push('TRIM(COALESCE(s.year_sem, "")) = ?');
      params.push(year);
    }

    const whereSql = conditions.join(' AND ');

    return await query(
      `SELECT p.id, p.receipt_no, p.amount, p.payment_mode, p.payment_date,
              s.id AS student_id, s.name AS student_name, s.admission_no,
              s.course, s.year_sem, s.category,
              u.full_name AS collected_by_name
       FROM payments p
       JOIN students s ON s.id = p.student_id
       LEFT JOIN users u ON u.id = p.collected_by
       WHERE ${whereSql}
       ORDER BY p.payment_date DESC, p.id DESC`,
      params
    );
  }

  async findOutstandingStudents(search = '') {
    const conditions = ['s.active = 1'];
    const params = [];

    if (search) {
      const like = `%${search}%`;
      conditions.push('(s.name LIKE ? OR s.admission_no LIKE ? OR s.mobile LIKE ?)');
      params.push(like, like, like);
    }

    const whereSql = conditions.join(' AND ');

    return await query(
      `SELECT s.id, s.name, s.admission_no, s.mobile, s.course,
              s.year_sem, s.category, s.total_fee,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0) AS paid,
              GREATEST(s.total_fee - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0), 0) AS balance
       FROM students s
       WHERE ${whereSql}
         AND s.total_fee > COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0)
       ORDER BY balance DESC, s.name ASC`,
      params
    );
  }

  async findOutstandingStudentById(studentId) {
    const rows = await query(
      `SELECT s.id, s.name, s.admission_no, s.mobile, s.course,
              s.year_sem, s.category, s.total_fee,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0) AS paid,
              GREATEST(s.total_fee - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0), 0) AS balance
       FROM students s
       WHERE s.id = ? AND s.active = 1`,
      [studentId]
    );
    return rows[0] || null;
  }

  // Caution Deposits Repository methods
  async findCautionSummary() {
    const [caution] = await query(
      `SELECT COUNT(*) AS records,
              COUNT(DISTINCT student_id) AS students,
              COALESCE(SUM(amount), 0) AS amount
       FROM caution_deposits`
    );
    const [refund] = await query(
      `SELECT COUNT(*) AS records,
              COUNT(DISTINCT student_id) AS students,
              COALESCE(SUM(amount), 0) AS amount
       FROM refunds`
    );
    const cautionAmount = parseFloat(caution.amount || 0);
    const refundAmount = parseFloat(refund.amount || 0);
    return {
      caution: {
        records: parseInt(caution.records || 0, 10),
        students: parseInt(caution.students || 0, 10),
        amount: cautionAmount,
        balance: Math.max(cautionAmount - refundAmount, 0)
      },
      refund: {
        records: parseInt(refund.records || 0, 10),
        students: parseInt(refund.students || 0, 10),
        amount: refundAmount
      }
    };
  }

  async findModuleRows(moduleType, filters = {}) {
    const table = moduleType === 'refund' ? 'refunds' : 'caution_deposits';
    const dateCol = moduleType === 'refund' ? 'refund_date' : 'deposit_date';
    const conditions = ['1=1'];
    const params = [];

    if (filters.q) {
      const like = `%${filters.q.trim()}%`;
      conditions.push('(s.name LIKE ? OR s.admission_no LIKE ? OR r.receipt_no LIKE ?)');
      params.push(like, like, like);
    }
    if (filters.mode && ['Cash', 'UPI', 'Card', 'Check'].includes(filters.mode)) {
      conditions.push('r.payment_mode = ?');
      params.push(filters.mode);
    }
    if (filters.from) {
      conditions.push(`DATE(r.${dateCol}) >= DATE(?)`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`DATE(r.${dateCol}) <= DATE(?)`);
      params.push(filters.to);
    }

    return await query(
      `SELECT r.id, r.student_id, r.receipt_no, r.amount,
              r.payment_mode, r.${dateCol} AS record_date,
              r.notes, s.name AS student_name, s.admission_no,
              s.course AS course_name
       FROM ${table} r
       JOIN students s ON s.id = r.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.${dateCol} DESC, r.id DESC`,
      params
    );
  }

  async createModuleRecord(moduleType, data) {
    const table = moduleType === 'refund' ? 'refunds' : 'caution_deposits';
    const dateCol = moduleType === 'refund' ? 'refund_date' : 'deposit_date';

    const res = await query(
      `INSERT INTO ${table}
       (student_id, receipt_no, amount, payment_mode, reference, ${dateCol}, notes, collected_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.studentId,
        data.receiptNo,
        data.amount,
        data.paymentMode,
        data.reference || null,
        data.recordDate,
        data.notes || null,
        data.collectedBy || null
      ]
    );
    return res.insertId;
  }

  async findModuleRecordById(moduleType, id) {
    const table = moduleType === 'refund' ? 'refunds' : 'caution_deposits';
    const dateCol = moduleType === 'refund' ? 'refund_date' : 'deposit_date';

    const rows = await query(
      `SELECT r.*, r.${dateCol} AS record_date,
              s.name AS student_name, s.admission_no, s.course AS course_name,
              s.year_sem, u.full_name AS collected_by_name
       FROM ${table} r
       JOIN students s ON s.id = r.student_id
       LEFT JOIN users u ON u.id = r.collected_by
       WHERE r.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async deleteModuleRecord(moduleType, id) {
    const table = moduleType === 'refund' ? 'refunds' : 'caution_deposits';
    await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  async getCautionBalance(studentId) {
    const [dep] = await query(
      'SELECT COALESCE(SUM(amount), 0) AS deposited FROM caution_deposits WHERE student_id = ?',
      [studentId]
    );
    const [ref] = await query(
      'SELECT COALESCE(SUM(amount), 0) AS refunded FROM refunds WHERE student_id = ?',
      [studentId]
    );
    const deposited = parseFloat(dep.deposited || 0);
    const refunded = parseFloat(ref.refunded || 0);
    return Math.max(deposited - refunded, 0);
  }
}

module.exports = new PaymentRepository();
