const { v4: uuidv4 } = require('uuid');
const { createLogger, format, transports } = require('winston');

require('winston-daily-rotate-file');

const { combine, timestamp, metadata, printf } = format;

const customFormat = combine(
	metadata(),
	timestamp(),
	printf(
		// eslint-disable-next-line no-shadow
		({ level, message, timestamp, metadata }) =>
			`${timestamp} - [${level
				.toUpperCase()
				.padEnd(5)}] Message: ${message} ${JSON.stringify(metadata)}`
	)
);

function assignUniqueRequestLogId(req, res, next) {
	req.requestLogId = uuidv4();
	next();
}

function createRequestLogger(req) {
	const logger = createLogger({
		level: process.env.LOG_LEVEL || 'info',
		format: customFormat,
		defaultMeta: {
			method: req.method,
			path: req.originalUrl,
			requestLogId: req.requestLogId,
			ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
		},
		transports: [
			new transports.DailyRotateFile({
				filename: 'chatbuddy-%DATE%.log',
				datePattern: 'DD-MM-YYYY',
				zippedArchive: true,
				dirname: process.env.LOG_PATH || '/logs/chatbuddy',
				maxSize: '20m',
				maxFiles: '14d',
			}),
		],
	});

	return logger;
}

const attachLogger = (req, res, next) => {
	const logger = createRequestLogger(req);

	// Log the incoming request
	logger.info('Request received', { method: req.method, url: req.url });

	// Attach the logger to the request object for use in controllers
	req.logger = logger;

	next();
};

module.exports = {
	createRequestLogger,
	assignUniqueRequestLogId,
	attachLogger,
};
