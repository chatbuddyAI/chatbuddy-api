const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		planName: {
			type: String,
			required: true,
		},
		planCode: {
			type: String,
			required: true,
		},
		subscriptionCode: {
			type: String,
			required: true,
		},
		subscriptionAmount: {
			type: Number,
			required: true,
		},
		subscriptionInterval: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			required: true,
		},
		nextPaymentDate: {
			type: String,
		},
		emailToken: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
