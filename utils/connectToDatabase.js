const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const dbConnectionOptions = {
	development: process.env.DATABASE_LOCAL,
	staging: process.env.DATABASE.replace(
		'<PASSWORD>',
		encodeURIComponent(process.env.DATABASE_PASSWORD)
	),
	production: process.env.DATABASE.replace(
		'<PASSWORD>',
		encodeURIComponent(process.env.DATABASE_PASSWORD)
	),
};

const environment = process.env.NODE_ENV || 'development';
const dbConnectionString = dbConnectionOptions[environment];

module.exports = async () => {
	try {
		await mongoose.connect(dbConnectionString);
		console.log('DB Connection Successful');
	} catch (error) {
		console.log('DB Connection Error:', error);
		process.exit(1);
	}
};
