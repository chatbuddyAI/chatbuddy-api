const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
	console.log('UNCAUGHT EXCEPTION! Shutting down...');
	console.log(err.name, err.message);
	process.exit(1);
});

const app = require('./app');

//TODO: (() => new Date().toLocaleString())() // use that to tell the time and dat tio chatbuddy

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
