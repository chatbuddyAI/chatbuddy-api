const { promisify } = require('util');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');
const { successResponse } = require('../utils/apiResponder');
const {
	HTTP_OK,
	HTTP_BAD_REQUEST,
	HTTP_UNAUTHORIZED,
	HTTP_FORBIDDEN,
	HTTP_NOT_FOUND,
	HTTP_INTERNAL_SERVER_ERROR,
} = require('../utils/responseStatus');
const Email = require('../utils/email');

const createSingedToken = (id) =>
	jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});

const createSendToken = catchAsync(async (user, statusCode, res) => {
	const token = createSingedToken(user._id);
	const cookieOptions = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
	};
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

	res.cookie('jwt', token, cookieOptions);

	// Remove password from output
	user.password = undefined;

	successResponse({
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

exports.register = catchAsync(async (req, res, next) => {
	const newUser = await User.create({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
	});

	await new Email({
		user: newUser,
		options: {
			fullname: newUser.name,
		},
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
					'Subscribe now and get one month free trial',
					HTTP_UNAUTHORIZED
				)
			);

		return next(
			new AppError(
				'Subscribe to continue enjoying conversations with your chatbuddy',
				HTTP_UNAUTHORIZED
			)
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

exports.forgotPassword = catchAsync(async (req, res, next) => {
	const { email } = req.body;
	// get user from email
	const user = await User.findOne({ email });

	if (!user) {
		return next(
			new AppError('There is no user with this email address', HTTP_NOT_FOUND)
		);
	}
	// gemerate a token
	const resetToken = user.createPasswordResetToken();
	await user.save({ validateBeforeSave: false });

	// send to user email
	const resetUrl = `${req.protocol}://${req.get(
		'host'
	)}/api/v1/users/resetPassword/${resetToken}`;

	const message = `Forgot your password? Submit a PATCH request with your new password and 
	passwordConfirm to: ${resetUrl}.\nIf you didn't forget your password, kindly ignore this email.`;
	try {
		await sendEmail({
			email: user.email,
			subject: 'Your password reset token (Valid for 10 minutes)',
			message,
		});

		successResponse({
			response: res,
			message: 'Password reset token sent to email',
			code: HTTP_OK,
		});
	} catch (err) {
		user.decomissionPasswordResetToken();
		await user.save({ validateBeforeSave: false });

		return next(
			new AppError(
				'There was an error sending the email, try again later!',
				HTTP_INTERNAL_SERVER_ERROR
			)
		);
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// hash the token to to compare it with the one stored in the db
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	// Get user based on token and if token is not expired
	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() },
	});

	// if user is not found fail with invalid token
	if (!user) {
		return next(new AppError('Invalid or Expired Token', HTTP_FORBIDDEN));
	}

	// update password
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;

	// remove password reset token and expires field from the db
	// set them to undefined
	user.decomissionPasswordResetToken(); // a userModel instance method

	//save the modifications
	await user.save();

	// Log user in
	const token = createSingedToken(user._id);

	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// send success response
	successResponse({
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
});

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
	successResponse({
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
