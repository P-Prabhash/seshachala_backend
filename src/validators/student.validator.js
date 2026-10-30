const { body } = require('express-validator');

const studentValidator = [
  body('admission_no').trim().notEmpty().withMessage('Admission number is required.'),
  body('name').trim().notEmpty().withMessage('Student name is required.'),
  body('category').trim().isIn(['Convener', 'Management']).withMessage('Invalid student category.'),
  body('aadhaar_number').optional({ checkFalsy: true }).isLength({ min: 12, max: 12 }).isNumeric().withMessage('Aadhaar number must contain exactly 12 digits.')
];

module.exports = {
  studentValidator
};
