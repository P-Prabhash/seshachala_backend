const paymentRepository = require('../repositories/payment.repository');
const studentRepository = require('../repositories/student.repository');
const AppError = require('../utils/app-error');

class ReceiptService {
  async getReceiptList(filters = {}) {
    const rows = await paymentRepository.findReceiptsList(filters);
    const totalReceipts = rows.length;
    const collected = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = rows
      .filter(r => (r.payment_date || '').slice(0, 10) === todayStr)
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return {
      rows,
      totalReceipts,
      collected,
      today
    };
  }

  async getReceiptById(paymentId) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw new AppError('Receipt not found.', 404);

    const paidToDate = await paymentRepository.getTotalPaidByStudent(payment.student_id);
    const totalFee = parseFloat(payment.total_fee || 0);
    const outstanding = Math.max(totalFee - paidToDate, 0);

    return {
      payment: {
        ...payment,
        paid_to_date: paidToDate,
        outstanding
      }
    };
  }

  async getOutstandingFees(search = '') {
    return await paymentRepository.findOutstandingStudents(search);
  }

  async getOutstandingFeeForStudent(studentId) {
    const student = await paymentRepository.findOutstandingStudentById(studentId);
    if (!student) throw new AppError('Student not found or no outstanding balance.', 404);
    return student;
  }
}

module.exports = new ReceiptService();
