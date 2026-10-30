const express = require('express');
const authController = require('../controllers/auth.controller');
const { loginValidator } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rate-limit');

const router = express.Router();

router.get('/', authController.getIndex);
router.get('/login', authController.getLogin);
router.post('/login', authLimiter, loginValidator, authController.postLogin);
router.get('/logout', authController.getLogout);

module.exports = router;
