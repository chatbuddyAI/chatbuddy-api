const { promisify } = require('util');
const { body, validationResult } = require('express-validator');
// const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/apiResponder');
const {
	HTTP_OK,
	HTTP_BAD_REQUEST,
	HTTP_UNAUTHORIZED,
	HTTP_FORBIDDEN,
	HTTP_NOT_FOUND,
} = require('../utils/responseStatus');
const Otp = require('../models/otpModel');
const { OtpTypes } = require('../utils/enums');
const Subscription = require('../models/subscriptionModel');
const Card = require('../models/cardModel');

const createSingedToken = (id) =>
	jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});

const createSendToken = catchAsync(async (user, statusCode, res) => {
	const token = createSingedToken(user._id);
	// const cookieOptions = {
	// 	expires: new Date(
	// 		Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
	// 	),
	// 	httpOnly: true,
	// };
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

	// res.cookie('jwt', token, cookieOptions);

	// Remove password from output
	user.password = undefined;

	return successResponse({
		response: res,
		message: 'User authenticated successfully',
		code: HTTP_OK,
		data: {
			user,
			token,
			expiresIn: decoded.exp,
		},
	});
});

function generateOtp() {
	// Implement your OTP generation logic here
	// This can be a simple random number or a more complex algorithm
	// Example:
	const min = 1000;
	const max = 9999;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.register = catchAsync(async (req, res, next) => {
	const { name, email, password, passwordConfirm } = req.body;

	const newUser = await User.create({
		name,
		email,
		freeTrialStartDate: Date.now(),
		password,
		passwordConfirm,
	});

	const subscriptionData = {
		user: newUser._id,
		planName: 'Free Trial',
		planCode: 'PLN_FrEeTrial1998',
		subscriptionCode: 'SUB_FrEeTrial1998',
		subscriptionAmount: '0',
		subscriptionInterval: 'monthly',
		status: 'free-trial',
		nextPaymentDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
		emailToken: 'freeTrial',
	};

	const cardData = {
		user: newUser._id,
		authorizationCode: 'ATH_FrEeTrial1998',
		cardType: 'Chatbuddy Free',
		last4: '2023',
		expMonth: '12',
		expYear: '2077',
		bin: '170623',
		bank: 'Chatbuddy Bank',
		signature: 'SIG_FrEeTrial1998',
		accountName: newUser.name,
		reference: 'REF_FrEeTrial1998',
	};

	await Promise.all([
		Subscription.create(subscriptionData),
		Card.create(cardData),
	]);

	const emailOptions = {
		fullname: newUser.name,
	};

	await new Email({
		user: newUser,
		options: emailOptions,
	}).sendWelcome();

	createSendToken(newUser, 201, res);
});

exports.login = [
	body('email').isEmail().withMessage('Please provide a valid email address'),
	body('password').notEmpty().withMessage('Please provide a password'),
	catchAsync(async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new AppError(errors.array()[0].msg, HTTP_BAD_REQUEST));
		}

		const { email, password } = req.body;

		const user = await User.findOne({ email: email }).select('+password');

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return next(new AppError('Invalid login details', HTTP_UNAUTHORIZED));
		}

		createSendToken(user, 200, res);
	}),
];

// exports.forgotPassword = catchAsync(async (req, res, next) => {
// 	const { email } = req.body;
// 	// get user from email
// 	const user = await User.findOne({ email });

// 	if (!user) {
// 		return next(
// 			new AppError('There is no user with this email address', HTTP_NOT_FOUND)
// 		);
// 	}
// 	// gemerate a token
// 	const resetToken = user.createPasswordResetToken();
// 	await user.save({ validateBeforeSave: false });

// 	// send to user email
// 	const resetUrl = `${req.protocol}://${req.get(
// 		'host'
// 	)}/api/v1/users/resetPassword/${resetToken}`;

// 	try {
// 		await new Email({
// 			user: user,
// 			options: { resetUrl },
// 		}).sendResetPassword();

// 		return successResponse({
// 			response: res,
// 			message: 'Password reset token sent to email',
// 			code: HTTP_OK,
// 		});
// 	} catch (err) {
// 		user.decomissionPasswordResetToken();
// 		await user.save({ validateBeforeSave: false });

// 		return next(
// 			new AppError(
// 				'There was an error sending the email, try again later!',
// 				HTTP_INTERNAL_SERVER_ERROR
// 			)
// 		);
// 	}
// });

// exports.resetPassword = catchAsync(async (req, res, next) => {
// 	// hash the token to to compare it with the one stored in the db
// 	const hashedToken = crypto
// 		.createHash('sha256')
// 		.update(req.params.token)
// 		.digest('hex');

// 	// Get user based on token and if token is not expired
// 	const user = await User.findOne({
// 		passwordResetToken: hashedToken,
// 		passwordResetExpires: { $gt: Date.now() },
// 	});

// 	// if user is not found fail with invalid token
// 	if (!user) {
// 		return next(new AppError('Invalid or Expired Token', HTTP_FORBIDDEN));
// 	}

// 	// update password
// 	user.password = req.body.password;
// 	user.passwordConfirm = req.body.passwordConfirm;

// 	// remove password reset token and expires field from the db
// 	// set them to undefined
// 	user.decomissionPasswordResetToken(); // a userModel instance method

// 	//save the modifications
// 	await user.save();

// 	// Log user in
// 	const token = createSingedToken(user._id);

// 	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

// 	// send success response
// 	return successResponse({
// 		response: res,
// 		message: 'Your password has been reset',
// 		code: HTTP_OK,
// 		data: {
// 			user,
// 			token,
// 			expiresIn: decoded.exp,
// 		},
// 	});
// 	// respond invalid token
// });

exports.updatePassword = catchAsync(async (req, res, next) => {
	// get user
	const user = await User.findById(req.user.id).select('+password');

	const currentPassword = req.body.currentPassword || 'wrong password';
	// check if old/current password correct
	if (!(await bcrypt.compare(currentPassword, user.password)))
		return next(new AppError('Incorrect current password', HTTP_UNAUTHORIZED));

	// update password
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	await user.save();

	// send new jwt token
	const token = createSingedToken(user._id);
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// send success response
	return successResponse({
		response: res,
		message: 'Your password has been changed',
		code: HTTP_OK,
		data: {
			user,
			token,
			expiresIn: decoded.exp,
		},
	});
});

exports.forgotPassword = [
	body('email').isEmail().withMessage('OTP is a required string'),
	catchAsync(async (req, res, next) => {
		const { email } = req.body;
		// get user from email
		const user = await User.findOne({ email });

		if (!user) {
			return next(
				new AppError('There is no user with this email address', HTTP_NOT_FOUND)
			);
		}

		const otpRecord = await Otp.findOne({
			email,
			type: OtpTypes.PASSWORD_RESET,
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
			user: user,
			options: { otp },
		}).sendResetPasswordOtp();

		// store otp in otp db table
		await Otp.create({
			email,
			otp,
			type: OtpTypes.PASSWORD_RESET,
		});

		// return success
		return successResponse({
			response: res,
			message: 'Password reset OTP sent to your email',
			data: email,
		});
	}),
];

exports.resetPassword = [
	body('otp').exists().withMessage('OTP is a required string'),
	body('email').isEmail().withMessage('Enter a valid email'),
	body('password').notEmpty().withMessage('Password is required'),
	body('passwordConfirm')
		.notEmpty()
		.withMessage('Password Confirm is required'),
	catchAsync(async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new AppError(errors.array()[0].msg, HTTP_BAD_REQUEST));
		}

		const { email, otp, password, passwordConfirm } = req.body;

		let user = await User.findOne({ email });

		if (!user) {
			return next(
				new AppError('There is no user with this email address', HTTP_NOT_FOUND)
			);
		}

		const otpRecord = await Otp.findOne({
			email,
			type: OtpTypes.PASSWORD_RESET,
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

		// update password
		user.password = password;
		user.passwordConfirm = passwordConfirm;

		//save the modifications
		await user.save();
		user = await User.findOne({ email }).select('-password');

		// Log user in
		const token = createSingedToken(user._id);

		const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

		await new Email({ user }).sendResetPasswordComplete();

		await otpRecord.deleteOne();

		// send success response
		return successResponse({
			response: res,
			message: 'Your password has been reset',
			code: HTTP_OK,
			data: {
				user,
				token,
				expiresIn: decoded.exp,
			},
		});
		// respond invalid token
	}),
];

/** MIDDLEWARES */

exports.protect = catchAsync(async (req, res, next) => {
	//get token and check if it exists
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
		// console.log(token);
	}

	if (!token) {
		return next(
			new AppError(
				'You are not logged in! Please login to get access',
				HTTP_UNAUTHORIZED
			)
		);
	}
	// verify the token
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
	//check if user exists
	const user = await User.findById(decoded.id);
	if (!user) {
		return next(
			new AppError(
				'The user belonging to this token does not exist anymore.',
				HTTP_UNAUTHORIZED
			)
		);
	}

	// check if user changed password aftr token was issued
	if (user.changedPasswordAfter(decoded.iat)) {
		return next(
			new AppError(
				'User recently changed password! Please login again.',
				HTTP_UNAUTHORIZED
			)
		);
	}

	// Grant access to protected route
	req.user = user;
	next();
});

exports.checkIfUserIsSubscribed = catchAsync(async (req, res, next) => {
	if (!req.user.isSubscribed) {
		if (!req.user.hasUsedFreeTrial)
			return next(
				new AppError(
					'Subscribe now and get one month free trial.\n Go to Settings > Manage Subscription',
					HTTP_UNAUTHORIZED
				)
			);

		return next(
			new AppError(
				'Subscribe to continue enjoying conversations with your chatbuddy.\n Go to Settings > Manage Subscription',
				HTTP_UNAUTHORIZED
			)
		);
	}
	next();
});

exports.checkIfUserHasVerifiedEmail = catchAsync(async (req, res, next) => {
	if (!req.user.hasVerifiedEmail()) {
		return next(
			new AppError('Verify your email to proceed', HTTP_UNAUTHORIZED)
		);
	}
	next();
});

exports.restrictedTo =
	(...roles) =>
	(req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(
				new AppError(
					'You do not have permission to perform this action.',
					HTTP_FORBIDDEN
				)
			);
		}
		next();
	};
