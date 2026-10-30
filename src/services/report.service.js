const { query } = require('../config/database');

const REPORT_DEFINITIONS = {
  'collection-summary': 'Collection Summary',
  'daily-collection': 'Daily Collection',
  'monthly-collection': 'Monthly Collection',
  'course-wise': 'Course Wise',
  'student-wise': 'Student Wise',
  'pending-fees': 'Pending Fees',
  'payment-mode': 'Payment Mode',
  'discount': 'Discount Report',
  'receipt-report': 'Receipt Report',
  'due-date': 'Due Date Report'
};

class ReportService {
  async getDashboardStats(filters = {}) {
    const conditions = ['s.active = 1'];
    const params = [];

    if (filters.category) {
      conditions.push('LOWER(TRIM(COALESCE(s.category, ""))) = LOWER(?)');
      params.push(filters.category);
    }
    if (filters.year) {
      conditions.push('TRIM(COALESCE(s.year_sem, "")) = ?');
      params.push(filters.year);
    }

    const whereSql = conditions.join(' AND ');

    const [rows] = await query(`
      SELECT COUNT(*) AS total_students,
             COALESCE(SUM(s.total_fee), 0) AS total_fee,
             COALESCE(SUM(COALESCE(paid.amount, 0)), 0) AS collected,
             COALESCE(SUM(GREATEST(s.total_fee - COALESCE(paid.amount, 0), 0)), 0) AS pending
      FROM students s
      LEFT JOIN (SELECT student_id, SUM(amount) AS amount FROM payments GROUP BY student_id) paid
          ON paid.student_id = s.id
      WHERE ${whereSql}
    `, params);

    const todayStr = new Date().toISOString().slice(0, 10);
    const [todayRow] = await query(`
      SELECT COALESCE(SUM(p.amount), 0) AS amount FROM payments p
      JOIN students s ON s.id = p.student_id
      WHERE ${whereSql} AND DATE(p.payment_date) = DATE(?)
    `, [...params, todayStr]);

    const monthStr = new Date().toISOString().slice(0, 7);
    const [monthRow] = await query(`
      SELECT COALESCE(SUM(p.amount), 0) AS amount FROM payments p
      JOIN students s ON s.id = p.student_id
      WHERE ${whereSql} AND DATE_FORMAT(p.payment_date, '%Y-%m') = ?
    `, [...params, monthStr]);

    return {
      total_students: parseInt(rows.total_students || 0, 10),
      total_fee: parseFloat(rows.total_fee || 0),
      collected: parseFloat(rows.collected || 0),
      pending: parseFloat(rows.pending || 0),
      today: parseFloat(todayRow.amount || 0),
      month: parseFloat(monthRow.amount || 0),
      overdue: null
    };
  }

  async buildReportPayload(reportType, filters = {}, args = {}) {
    if (!REPORT_DEFINITIONS[reportType]) return null;

    const stats = await this.getDashboardStats(filters);
    let rows = [];
    let columns = [];
    let message = '';

    const conditions = ['s.active = 1'];
    const params = [];
    if (filters.category) {
      conditions.push('LOWER(TRIM(COALESCE(s.category, ""))) = LOWER(?)');
      params.push(filters.category);
    }
    if (filters.year) {
      conditions.push('TRIM(COALESCE(s.year_sem, "")) = ?');
      params.push(filters.year);
    }
    const whereSql = conditions.join(' AND ');

    if (['student-wise', 'pending-fees'].includes(reportType)) {
      let extraWhere = whereSql;
      if (args.q) {
        extraWhere += ' AND (s.name LIKE ? OR s.admission_no LIKE ? OR s.mobile LIKE ?)';
        const like = `%${args.q.trim()}%`;
        params.push(like, like, like);
      }
      if (reportType === 'pending-fees') {
        extraWhere += ' AND s.total_fee > COALESCE(paid.amount, 0)';
      }
      rows = await query(`
        SELECT s.admission_no, s.name, s.course, s.year_sem, s.category,
               s.total_fee, COALESCE(paid.amount, 0) AS paid,
               GREATEST(s.total_fee - COALESCE(paid.amount, 0), 0) AS balance
        FROM students s
        LEFT JOIN (SELECT student_id, SUM(amount) AS amount FROM payments GROUP BY student_id) paid
            ON paid.student_id = s.id
        WHERE ${extraWhere}
        ORDER BY s.name
      `, params);
      columns = [
        ['admission_no', 'Admission No.'], ['name', 'Student'],
        ['course', 'Course'], ['year_sem', 'Year'],
        ['total_fee', 'Total Fee'], ['paid', 'Paid'], ['balance', 'Balance']
      ];
    } else if (reportType === 'course-wise') {
      rows = await query(`
        SELECT s.course, COUNT(*) AS students, COALESCE(SUM(s.total_fee), 0) AS total_fee,
               COALESCE(SUM(COALESCE(paid.amount, 0)), 0) AS collected,
               COALESCE(SUM(GREATEST(s.total_fee - COALESCE(paid.amount, 0), 0)), 0) AS pending
        FROM students s
        LEFT JOIN (SELECT student_id, SUM(amount) AS amount FROM payments GROUP BY student_id) paid
            ON paid.student_id = s.id
        WHERE ${whereSql} GROUP BY s.course ORDER BY s.course
      `, params);
      columns = [['course', 'Course'], ['students', 'Students'], ['total_fee', 'Total Fee'], ['collected', 'Collected'], ['pending', 'Pending']];
    } else if (reportType === 'payment-mode') {
      rows = await query(`
        SELECT COALESCE(p.payment_mode, 'Other') AS payment_mode,
               COUNT(*) AS transactions, COALESCE(SUM(p.amount), 0) AS amount
        FROM payments p JOIN students s ON s.id = p.student_id
        WHERE ${whereSql} GROUP BY p.payment_mode ORDER BY amount DESC
      `, params);
      columns = [['payment_mode', 'Payment Mode'], ['transactions', 'Transactions'], ['amount', 'Collected']];
    } else if (reportType === 'monthly-collection') {
      rows = await query(`
        SELECT DATE_FORMAT(p.payment_date, '%Y-%m') AS month,
               COUNT(*) AS transactions, COALESCE(SUM(p.amount), 0) AS amount
        FROM payments p JOIN students s ON s.id = p.student_id
        WHERE ${whereSql} AND p.payment_date IS NOT NULL
        GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m') ORDER BY month DESC
      `, params);
      columns = [['month', 'Month'], ['transactions', 'Transactions'], ['amount', 'Collected']];
    } else if (['daily-collection', 'receipt-report'].includes(reportType)) {
      let extraWhere = whereSql;
      if (reportType === 'daily-collection') {
        const reportDate = (args.date || new Date().toISOString().slice(0, 10)).trim();
        extraWhere += ' AND DATE(p.payment_date) = DATE(?)';
        params.push(reportDate);
        message = `Collection on ${reportDate}`;
      }
      rows = await query(`
        SELECT p.receipt_no, p.payment_date, p.amount, p.payment_mode,
               s.name AS student_name, s.admission_no, s.course
        FROM payments p JOIN students s ON s.id = p.student_id
        WHERE ${extraWhere} ORDER BY p.payment_date DESC, p.id DESC
      `, params);
      columns = [['receipt_no', 'Receipt No.'], ['payment_date', 'Date'], ['admission_no', 'Admission No.'], ['student_name', 'Student'], ['course', 'Course'], ['payment_mode', 'Mode'], ['amount', 'Amount']];
    } else if (reportType === 'collection-summary') {
      rows = [
        { metric: 'Total Students', value: stats.total_students },
        { metric: 'Total Fee', value: stats.total_fee },
        { metric: 'Total Collected', value: stats.collected },
        { metric: 'Pending Fee', value: stats.pending },
        { metric: "Today's Collection", value: stats.today },
        { metric: 'This Month Collection', value: stats.month }
      ];
      columns = [['metric', 'Report Item'], ['value', 'Value']];
    } else if (reportType === 'discount') {
      message = 'Discounts are not currently stored in the payment or student records, so this report has no discount amounts to display.';
    } else if (reportType === 'due-date') {
      message = 'This database does not currently store installment due dates. Overdue balances cannot be calculated until a due-date schedule is added.';
    }

    return {
      title: REPORT_DEFINITIONS[reportType],
      rows,
      columns,
      message,
      stats,
      report_type: reportType,
      search: (args.q || '').trim(),
      report_date: (args.date || new Date().toISOString().slice(0, 10)).trim()
    };
  }
}

module.exports = new ReportService();
