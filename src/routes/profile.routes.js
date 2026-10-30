const express = require('express');
const profileController = require('../controllers/profile.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/profile', profileController.getProfile);
router.post('/profile/update', profileController.postProfileUpdate);

module.exports = router;
