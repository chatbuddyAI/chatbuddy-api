const User = require('../models/userModel');

const resetFreeDailyMessageCount = async () => {
	// Reset the freeDailyMessageCount field for all users
	await User.updateMany({}, { freeDailyMessageCount: 0 });
	console.log('Daily freeDailyMessageCount reset completed.');
};

module.exports = resetFreeDailyMessageCount;
