const mongoose = require('mongoose');

const ChatRequestMessageSchema = new mongoose.Schema({
	chat: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Chat',
		required: true,
	},
	role: {
		type: String,
		enum: ['system', 'assistant', 'user'],
		required: [true, 'role is required to send message'],
	},
	content: {
		type: String,
		required: [true, 'content is required to send message'],
	},
	name: {
		type: String,
	},
});
const ChatRequestMessage = mongoose.model(
	'ChatRequestMessage',
	ChatRequestMessageSchema
);

module.exports = ChatRequestMessage;
