const express = require('express');
const contactController = require('../controllers/contact.controller');
const { contactValidator } = require('../validators/contact.validator');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/contact', contactValidator, validate, contactController.postContact);
router.get('/contact', contactController.getContacts);

module.exports = router;
