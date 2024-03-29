const User = require('../models/userModel');
const Email = require('../utils/email');

const checkIfFreeTrailIsExpiredAndUpdateSubscription = async () => {
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Calculate the date 30 days ago
	const filter = {
		freeTrialStartDate: { $lte: thirtyDaysAgo },
		isSubscribed: true,
		hasUsedFreeTrial: false,
	};
	const update = {
		$set: { isSubscribed: false, hasUsedFreeTrial: true },
	};
	const options = { multi: true, validateBeforeSave: false };

	const result = await User.updateMany(filter, update, options);
	console.log(`${result.nModified} user(s) updated for free trial expiration.`);

	const users = await User.find(filter);

	const emailPromises = users.map((user) =>
		new Email({
			user: user,
			options: {
				fullname: user.name,
			},
		}).sendFreeTrialExpired()
	);

	await Promise.all(emailPromises);

	console.log(
		`Free trial expiration emails sent to ${emailPromises.length} user(s).`
	);
};

// const activateFreeTrial = async (user) => {
// 	// Set the free trial status and expiration date
// 	user.freeTrialStartDate = Date.now();
// 	user.hasUsedFreeTrial = false;
// 	user.isSubscribed = true;
// 	// Save the updated user document
// 	await user.save();

// 	// Send email notification about the free trial activation
// 	await new Email({
// 		user: user,
// 		options: {
// 			fullname: user.name,
// 		},
// 	}).sendFreeTrialActivated();
// };

module.exports = checkIfFreeTrailIsExpiredAndUpdateSubscription;
