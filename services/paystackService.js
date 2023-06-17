const axios = require('axios');

class PaystackService {
	constructor() {
		this.secretKey = process.env.PAYSTACK_SECRET_KEY;
	}

	async initializeTransaction(
		email,
		amountInKobo,
		transactionType,
		planCode,
		metadata = {}
	) {
		metadata.transaction_type = transactionType;
		metadata.plan_code = planCode;

		try {
			const response = await axios.post(
				`${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
				{
					email: email,
					amount: amountInKobo,
					metadata: metadata,
					plan: planCode,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async createSubscription({
		customerEmail,
		authorizationCode,
		planCode,
		startDate,
	}) {
		try {
			const response = await axios.post(
				`${process.env.PAYSTACK_BASE_URL}/subscription`,
				{
					customer: customerEmail,
					authorization: authorizationCode,
					plan: planCode,
					start_date: startDate,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async enableSubscription(subscriptionCode, emailToken) {
		try {
			const response = await axios.post(
				`${process.env.PAYSTACK_BASE_URL}/subscription/enable`,
				{
					code: subscriptionCode,
					token: emailToken,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async disableSubscription(subscriptionCode, emailToken) {
		try {
			const response = await axios.post(
				`${process.env.PAYSTACK_BASE_URL}/subscription/disable`,
				{
					code: subscriptionCode,
					token: emailToken,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async sendUpdateSubscriptionLink(subscriptionCode) {
		try {
			const response = await axios.post(
				`${process.env.PAYSTACK_BASE_URL}/subscription/${subscriptionCode}/manage/email`,
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async refundTransaction(reference) {
		try {
			const response = await axios.post(
				`${process.env.PAYSTACK_BASE_URL}/refund`,
				{
					transaction: reference,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async listActiveSubscriptionPlans() {
		try {
			const response = await axios.get(
				`${process.env.PAYSTACK_BASE_URL}/plan?status=active`,
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
}

module.exports = PaystackService;
