/* eslint-disable no-case-declarations */
const crypto = require('crypto');
// const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const Card = require('../models/cardModel');
// const PaystackService = require('../services/paystackService');
const Subscription = require('../models/subscriptionModel');

const secret = process.env.PAYSTACK_SECRET_KEY;
// const paystack = new PaystackService();

exports.webhook = async (req, res, next) => {
	//validate event
	const hash = crypto
		.createHmac('sha512', secret)
		.update(JSON.stringify(req.body))
		.digest('hex');
	if (hash !== req.headers['x-paystack-signature']) return;

	// Retrieve the request's body
	const event = req.body;
	res.sendStatus(200);

	try {
		const user = await User.findOne({ email: event.data.customer.email });
		const subscription = await Subscription.findOne({ user: user._id });
		// Do something with the event
		// console.log(event);

		switch (event.event) {
			case 'charge.success':
				console.log(`${event.event} event for user:${user.email}`);

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
				// Save authorized card details to the database

				console.log(`Saving card for user:${user.email}`);
				await Card.findOneAndUpdate(
					{
						user: user._id,
					},
					cardData,
					{ upsert: true }
				);
				console.log(`DONE Saving card for user:${user.email}`);

				break;
			case 'subscription.create':
				console.log(`${event.event} event for user:${user.email}`);

				const subscriptionData = {
					user: user._id,
					planName: event.data.plan.name,
					planCode: event.data.plan.plan_code,
					subscriptionCode: event.data.subscription_code,
					subscriptionAmount: event.data.plan.amount,
					subscriptionInterval: event.data.plan.interval,
					status: event.data.status,
					nextPaymentDate: event.data.next_payment_date,
					emailToken: event.data.email_token,
				};

				if (subscription) {
					console.log(`Updating subscription for user:${user.email}`);
					await Promise.all([
						Subscription.findOneAndUpdate(
							{ user: user._id },
							subscriptionData,
							{ upsert: true }
						),
						user.update({ isSubscribed: true }, { validateBeforeSave: false }),
					]);
				} else {
					console.log(`Creating subscription for user:${user.email}`);
					await Promise.all([
						Subscription.create(subscriptionData),
						user.update({ isSubscribed: true }, { validateBeforeSave: false }),
					]);
				}

				break;

			case 'subscription.disable':
				console.log(`${event.event} event for user:${user.email}`);

				console.log(`Updating subscription for user:${user.email}`);
				await Subscription.updateOne(
					{ user: user._id },
					{
						user: user._id,
						planName: event.data.plan.name,
						planCode: event.data.plan.plan_code,
						subscriptionCode: event.data.subscription_code,
						subscriptionAmount: event.data.plan.amount,
						subscriptionInterval: event.data.plan.interval,
						status: event.data.status,
						nextPaymentDate: event.data.next_payment_date,
						emailToken: event.data.email_token,
					}
				);

				console.log(`Setting isSubscribed to false for user:${user.email}`);
				user.isSubscribed = false;
				await user.save({ validateBeforeSave: false });

				break;
			case 'subscription.not_renew':
				console.log(`${event.event} event for user:${user.email}`);

				console.log(`Updating subscription for user:${user.email}`);
				await Subscription.updateOne(
					{ user: user._id },
					{
						user: user._id,
						planName: event.data.plan.name,
						planCode: event.data.plan.plan_code,
						subscriptionId: event.data.id,
						subscriptionCode: event.data.subscription_code,
						subscriptionAmount: event.data.plan.amount,
						subscriptionInterval: event.data.plan.interval,
						status: event.data.status,
						nextPaymentDate: event.data.next_payment_date,
						emailToken: event.data.email_token,
					}
				);

				break;

			default:
				break;
		}
	} catch (error) {
		console.log(error);
	}
};
