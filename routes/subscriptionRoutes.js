const express = require('express');
const authController = require('../controllers/authController');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

router.use(authController.protect);

router.route('/').get(subscriptionController.getSubscription);
router.route('/subscribe').post(subscriptionController.addPaymentMethod);
router.route('/cancel').post(subscriptionController.cancelSubscription);
router.route('/enable').post(subscriptionController.enableSubscription);
router.route('/update-card').post(subscriptionController.updateSubscriptonCard);
router.route('/plans').get(subscriptionController.getPlans);
router.route('/card').get(subscriptionController.getSubscriptionCard);
router
	.route('/is-user-subscribed')
	.post(subscriptionController.isUserSubscribed);

module.exports = router;
