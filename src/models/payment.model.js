class PaymentModel {
  constructor(data) {
    this.id = data.id;
    this.studentId = data.student_id;
    this.receiptNo = data.receipt_no;
    this.amount = parseFloat(data.amount || 0);
    this.paymentMode = data.payment_mode;
    this.paymentDate = data.payment_date;
    this.notes = data.notes;
    this.collectedBy = data.collected_by;
    this.createdAt = data.created_at;
  }
}

module.exports = PaymentModel;
