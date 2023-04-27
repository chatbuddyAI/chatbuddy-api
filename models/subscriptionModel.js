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
		subscriptionId: {
			type: String,
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
			type: Date,
			required: true,
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
