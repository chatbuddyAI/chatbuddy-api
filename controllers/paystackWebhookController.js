/* eslint-disable no-case-declarations */
const crypto = require('crypto');
// const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const Card = require('../models/cardModel');
const PaystackService = require('../services/paystackService');
const Subscription = require('../models/subscriptionModel');

const secret = process.env.PAYSTACK_SECRET_KEY;
const paystack = new PaystackService();

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
					// if user uses new card for the subscription then update their card on our database to the new one
					// this is so because paystack will be handling the updating card for subscription part - hope i understand this in the future {stressed emoji}
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
					`Refunding user:${user.email} the amount of ${
						event.data.amount / 100
					}`
				);

				await paystack.refundTransaction(event.data.reference);

				break;
			case 'subscription.create':
				console.log(`${event.event} event for user:${user.email}`);

				if (subscription) {
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
					break;
				}

				console.log(`Creating subscription for user:${user.email}`);
				await Subscription.create({
					user: user._id,
					planName: event.data.plan.name,
					planCode: event.data.plan.plan_code,
					subscriptionCode: event.data.subscription_code,
					subscriptionAmount: event.data.plan.amount,
					subscriptionInterval: event.data.plan.interval,
					status: event.data.status,
					nextPaymentDate: event.data.next_payment_date,
					emailToken: event.data.email_token,
				});

				console.log(`Setting isSubscribed to true for user:${user.email}`);
				user.isSubscribed = true;
				await user.save({ validateBeforeSave: false });

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
