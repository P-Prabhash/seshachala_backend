const { body } = require('express-validator');

const paymentValidator = [
  body('student_id').notEmpty().withMessage('Please select a student.'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero.'),
  body('payment_mode').notEmpty().withMessage('Please select a valid payment mode.')
];

module.exports = {
  paymentValidator
};
