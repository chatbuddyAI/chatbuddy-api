const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const mongoose = require('mongoose');
const cronJobs = require('./cron');

process.on('uncaughtException', (err) => {
	console.log('UNCAUGHT EXCEPTION! Shutting down...');
	console.log(err.name, err.message);
	process.exit(1);
});

const app = require('./app');

mongoose.set('strictQuery', true);

const dbConnectionOptions = {
	development: process.env.DATABASE_LOCAL,
	mobile: process.env.DATABASE_LOCAL,
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

async function connectToDatabase() {
	try {
		await mongoose.connect(dbConnectionString);
		console.log('DB Connection Successful');
	} catch (error) {
		console.log('DB Connection Error:', error);
		process.exit(1);
	}
}
//TODO: (() => new Date().toLocaleString())() // use that to tell the time and dat tio chatbuddy
cronJobs.start();

const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
	console.log(`App is running on http://127.0.0.1:${port}`);
});

process.on('unhandledRejection', (err) => {
	console.log('UNHANDLED REJECTION! Shutting down...');
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});

connectToDatabase();
