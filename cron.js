const cron = require('node-cron');
const checkIfFreeTrailIsExpiredAndUpdateSubscription = require('./cron-jobs/checkIfFreeTrailIsExpiredAndUpdateSubscription');
const resetFreeDailyMessageCount = require('./cron-jobs/resetFreeDailyMessageCount');

const start = () => {
	//12 AM Jobs
	cron.schedule('0 0 * * *', async () => {
		try {
			await checkIfFreeTrailIsExpiredAndUpdateSubscription();
			console.log(
				'Check expired subscriptions cron job executed successfully.'
			);
		} catch (error) {
			console.error(
				'An error occurred during free trial expiration check:',
				error
			);
		}

		try {
			await resetFreeDailyMessageCount();
			console.log(
				'Reset free daily message count cron job executed successfully.'
			);
		} catch (error) {
			console.error(
				'An error occurred during reset free daily message count:',
				error
			);
		}
	});
};

module.exports = { start };
