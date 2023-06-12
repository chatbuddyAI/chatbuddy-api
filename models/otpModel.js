const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const { OtpTypes } = require('../utils/enums');
const AppError = require('../utils/appError');
const { HTTP_UNAUTHORIZED } = require('../utils/responseStatus');

const otpSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
		},
		otp: {
			type: String,
			required: true,
		},
		expiresAt: {
			type: Date,
			default: () => moment().add(1, 'hour').toISOString(),
		},
		type: {
			type: String,
			enum: {
				values: [OtpTypes.EMAIL_VERIFICATION, OtpTypes.PASSWORD_RESET],
				message: 'Enter a valid user role (user,admin)',
			},
		},
	},
	{
		timestamps: true,
	}
);

otpSchema.pre('save', async function (next) {
	// encrypt the password save to the db
	this.otp = await bcrypt.hash(this.otp, 12);

	next();
});

otpSchema.methods.hasPassedOneMinute = function () {
	return moment().diff(this.createdAt, 'minutes') >= 1;
};

otpSchema.methods.checkIfUserCanVerifyThisOtp = async function (req, otpUser) {
	if (req.user.id !== otpUser._id) {
		throw new AppError(
			'You are not authorized to make this request',
			HTTP_UNAUTHORIZED
		);
	}
};

otpSchema.methods.isValid = async function (otp) {
	const isExpired = moment().isAfter(this.expiresAt);
	const isMatch = await bcrypt.compare(otp, this.otp);

	return !isExpired && isMatch;
};

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
