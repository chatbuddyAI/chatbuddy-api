const express = require('express');
const paystackWebhookController = require('../controllers/paystackWebhookController');

const router = express.Router();

router.route('/webhook').post(paystackWebhookController.webhook);

module.exports = router;
