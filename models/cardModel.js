const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		authorizationCode: {
			type: String,
			required: true,
		},
		cardType: {
			type: String,
			required: true,
		},
		bin: {
			type: String,
			required: true,
		},
		last4: {
			type: String,
			required: true,
		},
		expMonth: {
			type: String,
			required: true,
		},
		expYear: {
			type: String,
			required: true,
		},
		bank: {
			type: String,
			required: true,
		},
		signature: {
			type: String,
			required: true,
		},
		accountName: {
			type: String,
		},
		reference: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
