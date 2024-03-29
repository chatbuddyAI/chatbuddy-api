const mongoose = require('mongoose');
const validator = require('validator');

const invitationSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			validate: [validator.isEmail, 'Please enter a valid email address'],
			lowercase: true,
			trim: true,
		},
		chat: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Chat',
			required: true,
		},
		token: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		accepted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
