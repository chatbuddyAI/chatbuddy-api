const express = require('express');
const messageController = require('../controllers/messageController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post('/', messageController.sendMessage);

router
	.route('/:chat')
	.get(messageController.getAllChatMessages)
	.post(authController.checkIfUserIsSubscribed, messageController.sendMessage);

module.exports = router;
