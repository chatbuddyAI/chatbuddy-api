const express = require('express');
const authController = require('../controllers/authController');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

router.use(authController.protect);

router.route('/subscribe').post(subscriptionController.addPaymentMethod);
router.route('/cancel').post(subscriptionController.cancelSubscription);
router.route('/enable').post(subscriptionController.enableSubscription);
router.route('/update-card').post(subscriptionController.enableSubscription);

module.exports = router;
