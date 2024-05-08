const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const { defaultLogger } = require('./utils/Logger');

const logger = defaultLogger();

process.on('uncaughtException', (err) => {
	logger.info('UNCAUGHT EXCEPTION! Shutting down...');
	logger.info(err.name, err.message);
	process.exit(1);
});

const app = require('./app');

//TODO: (() => new Date().toLocaleString())() // use that to tell the time and dat tio chatbuddy

const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
	logger.info(`App is running on http://127.0.0.1:${port}`);
});

process.on('unhandledRejection', (err) => {
	logger.info('UNHANDLED REJECTION! Shutting down...');
	logger.info(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});
