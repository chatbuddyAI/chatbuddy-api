/* eslint-disable camelcase */
const { body, validationResult } = require('express-validator');
const PaystackService = require('../services/paystackService');
const { successResponse } = require('../utils/apiResponder');
const catchAsync = require('../utils/catchAsync');
const { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } = require('../utils/responseStatus');
const AppError = require('../utils/appError');
const Subscription = require('../models/subscriptionModel');

const paystack = new PaystackService();

exports.addPaymentMethod = [
	body('planCode').notEmpty().withMessage('Please provide a subscription plan'),
	catchAsync(async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new AppError(errors.array()[0].msg, HTTP_BAD_REQUEST));
		}

		const amountInKobo = 5000;

		const response = await paystack.initializeTransaction(
			req.user.email,
			amountInKobo,
			'addPaymentMethod',
			req.body.planCode
		);

		console.log(response);
		successResponse({
			response: res,
			message: 'Payment URL',
			data: response.data,
		});
	}),
];

exports.cancelSubscription = catchAsync(async (req, res, next) => {
	const subscription = await Subscription.findOne({ user: req.user._id });

	if (!subscription) {
		return next(
			new AppError('No Subcription found for this user', HTTP_NOT_FOUND)
		);
	}

	const response = await paystack.disableSubscription(
		subscription.subscriptionCode,
		subscription.emailToken
	);

	console.log(response);
	successResponse({
		response: res,
		message: response.message,
	});
});

exports.enableSubscription = catchAsync(async (req, res, next) => {
	const subscription = await Subscription.findOne({ user: req.user._id });

	if (!subscription) {
		return next(
			new AppError('No Subcription found for this user', HTTP_NOT_FOUND)
		);
	}

	const response = await paystack.enableSubscription(
		subscription.subscriptionCode,
		subscription.emailToken
	);

	console.log(response);
	successResponse({
		response: res,
		message: response.message,
	});
});

exports.updateSubscriptonCard = catchAsync(async (req, res, next) => {
	const subscription = await Subscription.findOne({ user: req.user._id });

	if (!subscription) {
		return next(
			new AppError('No Subcription found for this user', HTTP_NOT_FOUND)
		);
	}

	const response = await paystack.sendUpdateSubscriptionLink(
		subscription.subscriptionCode
	);

	console.log(response);
	successResponse({
		response: res,
		message: response.message,
	});
});

exports.getPlans = catchAsync(async (req, res, next) => {
	const response = await paystack.listActiveSubscriptionPlans();

	const { name, plan_code, interval, amount } = response.data;
	console.log(response);
	successResponse({
		response: res,
		message: response.message,
		data: {
			name,
			planCodw: plan_code,
			interval,
			amount,
		},
	});
});
