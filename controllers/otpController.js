const { body, validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { HTTP_BAD_REQUEST } = require('../utils/responseStatus');
const Otp = require('../models/otpModel');
const Email = require('../utils/email');
const { successResponse } = require('../utils/apiResponder');
const { OtpTypes } = require('../utils/enums');

function generateOtp() {
	// Implement your OTP generation logic here
	// This can be a simple random number or a more complex algorithm
	// Example:
	const min = 1000;
	const max = 9999;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.sendEmailOtp = catchAsync(async (req, res, next) => {
	const { email } = req.user;

	// check if email is already verified
	if (req.user.hasVerifiedEmail())
		return next(new AppError('User email already verified', HTTP_BAD_REQUEST));
	// check if they are try to resend the otp (if the already have an otp in the db)
	const otpRecord = await Otp.findOne({
		email,
		type: OtpTypes.EMAIL_VERIFICATION,
	});

	if (otpRecord) {
		//// check if it has been a minute since the last request

		if (!otpRecord.hasPassedOneMinute()) {
			//// if it hasn't, tell them to wait befor retrying
			return next(
				new AppError('Please wait before retrying.', HTTP_BAD_REQUEST)
			);
		}
		//// if it has, delete the current otp
		await otpRecord.deleteOne();
	}

	// generate otp
	const otp = generateOtp();

	// send otp to user email

	await new Email({
		user: req.user,
		options: { otp },
	}).sendVerificationOtp();

	// store otp in otp db table
	await Otp.create({
		email,
		otp,
		type: OtpTypes.EMAIL_VERIFICATION,
	});

	// return success
	return successResponse({
		response: res,
		message: `OTP sent to your email <${email}>`,
	});
});

exports.verifyEmailOtp = [
	body('otp').isString().withMessage('OTP is a required string'),
	catchAsync(async (req, res, next) => {
		// verify valid email format
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new AppError(errors.array()[0].msg, HTTP_BAD_REQUEST));
		}

		if (req.user.hasVerifiedEmail())
			return next(
				new AppError('User email already verified', HTTP_BAD_REQUEST)
			);

		const { otp } = req.body;

		const otpRecord = await Otp.findOne({
			email: req.user.email,
			type: OtpTypes.EMAIL_VERIFICATION,
		});
		// verify otp, this will also fail if no otp is found
		if (!otpRecord || !(await otpRecord.isValid(otp))) {
			return next(
				new AppError(
					'The OTP is either incorrect or expired, try again!',
					HTTP_BAD_REQUEST
				)
			);
		}

		// mark email as verified
		req.user.markEmailAsVerified();
		await req.user.save({ validateBeforeSave: false });

		await new Email({ user: req.user }).sendEmailVerificationSuccessful();

		await otpRecord.deleteOne();

		// return success
		return successResponse({
			response: res,
			message: `Email verified successfully`,
			data: req.user,
		});
	}),
];
