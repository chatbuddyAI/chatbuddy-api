const express = require('express');
const otpController = require('../controllers/otpController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post('/send', otpController.sendEmailOtp);
router.post('/verify', otpController.verifyEmailOtp);

module.exports = router;
