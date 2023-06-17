const cron = require('node-cron');
const checkIfFreeTrailIsExpiredAndUpdateSubscription = require('./cron-jobs/checkIfFreeTrailIsExpiredAndUpdateSubscription');

const start = () => {
	// Schedule the cron job to run every midnight
	cron.schedule('0 0 * * *', async () => {
		try {
			await checkIfFreeTrailIsExpiredAndUpdateSubscription();
			console.log('Cron job executed successfully.');
		} catch (error) {
			console.error('Cron job execution failed:', error);
		}
	});
};

module.exports = { start };
