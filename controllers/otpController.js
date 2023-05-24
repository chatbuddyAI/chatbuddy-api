const { body, validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { HTTP_BAD_REQUEST } = require('../utils/responseStatus');
const User = require('../models/userModel');
const Otp = require('../models/otpModel');

function generateOtp() {
	// Implement your OTP generation logic here
	// This can be a simple random number or a more complex algorithm
	// Example:
	const min = 1000;
	const max = 9999;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.sendEmailOtp = [
	body('email').isEmail().withMessage('Please provide a valid email address'),
	catchAsync(async (req, res, next) => {
		// verify valid email format
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new AppError(errors.array()[0].msg, HTTP_BAD_REQUEST));
		}

		const { email } = req.body;
		// check if user exists
		const user = await User.findOne({ email: email });

		if (!user) {
			return next(
				new AppError('User does not exist on our system', HTTP_BAD_REQUEST)
			);
		}
		// check if email is already verified
		if (user.hasVerifiedEmail())
			return next(
				new AppError('User email already verified', HTTP_BAD_REQUEST)
			);
		// check if they are try to resend the otp (if the already have an otp in the db)
		const userOtpRecord = await Otp.findOne({ email });
		if (userOtpRecord) {
			//// check if it has been a minute since the last request
			if (!userOtpRecord.hasPassedOneMinute) {
				//// if it hasn't, tell them to wait befor retrying
				return next(
					new AppError('Please wait before retrying.', HTTP_BAD_REQUEST)
				);
			}
			//// if it has, delete the current otp
			await Otp.deleteOne({ email });
		}

		// generate otp
		// const otp = generateOtp();

		// send otp to user email
		// store otp in otp db table

		// return success
	}),
];
