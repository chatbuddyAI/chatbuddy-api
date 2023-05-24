const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
	{
		email: {
			required: true,
		},
		otp: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

otpSchema.methods.hasPassedOneMinute = function () {
	const createdAt = new Date(this.createdAt);
	const now = new Date();
	const timeDifference = now.getTime() - createdAt.getTime();
	const minutesPassed = Math.floor(timeDifference / 1000 / 60);

	return minutesPassed >= 1;
};

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
