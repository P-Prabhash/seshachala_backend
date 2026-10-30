const { body } = require('express-validator');

const contactValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('message').trim().notEmpty().withMessage('Message is required.')
];

module.exports = {
  contactValidator
};
