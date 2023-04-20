/* eslint-disable no-case-declarations */
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const Card = require('../models/cardModel');
const PaystackService = require('../services/paystackService');
const Subscription = require('../models/subscriptionModel');

const secret = process.env.PAYSTACK_SECRET_KEY;
const paystack = new PaystackService();

exports.webhook = catchAsync(async (req, res, next) => {
	//validate event
	const hash = crypto
		.createHmac('sha512', secret)
		.update(JSON.stringify(req.body))
		.digest('hex');
	if (hash !== req.headers['x-paystack-signature']) process.exit();
	res.send(200);

	// Retrieve the request's body
	const event = req.body;
	const user = await User.findOne({ email: event.data.customer.email });
	const subscription = await Subscription.findOne({ user: user._id });
	const cardData = {
		user: user._id,
		authorizationCode: event.data.authorization.authorization_code,
		cardType: event.data.authorization.card_type,
		last4: event.data.authorization.last4,
		expMonth: event.data.authorization.exp_month,
		expYear: event.data.authorization.exp_year,
		bin: event.data.authorization.bin,
		bank: event.data.authorization.bank,
		signature: event.data.authorization.signature,
		accountName: event.data.authorization.account_name,
		reference: event.data.reference,
	};
	const subscriptionData = {
		user: user._id,
		planName: event.data.plan.name,
		planCode: event.data.plan.plan_code,
		subscriptionCode: event.data.subscription_code,
		subscriptionAmount: event.data.plan.amount,
		subscriptionInterval: event.data.plan.monthly,
		status: event.data.status,
		nextPaymentDate: event.data.next_payment_date,
		emailToken: event.data.email_token,
	};

	// Do something with the event
	// console.log(event);

	switch (event.event) {
		case 'charge.success':
			// Save authorized card details to the database
			console.log(`Charge Success Event for user:${user.email}`);

			if (
				!(
					event.data.metadata.transaction_type &&
					event.data.metadata.transaction_type === 'addPaymentMethod'
				)
			) {
				console.log('Transaction type is not addPaymentMethod');

				const card = Card.findOne({
					user: user._id,
					last4: event.data.authorization.last4,
					expMonth: event.data.authorization.exp_month,
					expYear: event.data.authorization.exp_year,
					bin: event.data.authorization.bin,
				});

				if (!card) {
					console.log(`Updating card details for user:${user.email}`);

					Card.updateOne({ user: user._id }, cardData);
				}
				break;
			}
			console.log(`Saving card for user:${user.email}`);

			// If card does not exist create the card
			await Card.create(cardData);

			if (!user.hasUsedFreeTrial) {
				console.log(
					`Subscribing and starting free trial for user:${user.email}`
				);

				await paystack.createSubscription({
					customerEmail: event.data.customer.email,
					authorizationCode: event.data.authorization.authorization_code,
					planCode: event.data.metadata.plan_code,
					startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				});

				user.hasUsedFreeTrial = true;
				await user.save({ validateBeforeSave: false });
			}
			console.log(
				`Refunding user:${user.email} the amount of ${event.data.amount / 100}`
			);

			await paystack.refundTransaction(event.data.reference);

			break;
		case 'subscription.create':
			console.log(`Creating subscription for user:${user.email}`);

			if (subscription) {
				await Subscription.updateOne({ user: user._id }, subscriptionData);
				break;
			}

			await Subscription.create(subscriptionData);

			user.isSubscribed = true;
			await user.save({ validateBeforeSave: false });

			break;

		case 'subscription.disable':
			console.log(`Disabled subscription for user:${user.email}`);

			await Subscription.updateOne({ user: user._id }, subscriptionData);

			user.isSubscribed = false;
			await user.save({ validateBeforeSave: false });

			break;
		case 'subscription.not_renew':
			console.log(`Cancelled subscription for user:${user.email}`);

			await Subscription.updateOne({ user: user._id }, subscriptionData);

			break;

		default:
			break;
	}
});
