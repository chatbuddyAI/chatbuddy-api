const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { createLogger, format, transports } = require('winston');
const { Logtail } = require('@logtail/node');
const { LogtailTransport } = require('@logtail/winston');

const hostname = os.hostname();

const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN || 'wrong_token');

require('winston-daily-rotate-file');

const { combine, timestamp, metadata, printf } = format;

let logTransports = [new transports.Console()];

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

function setLogChannelTransport() {
	switch (process.env.LOG_CHANNEL) {
		case 'logtail':
			logTransports = logTransports.concat([new LogtailTransport(logtail)]);
			break;
		case 'file':
			logTransports = logTransports.concat([
				new transports.DailyRotateFile({
					filename: 'chatbuddy-%DATE%.log',
					datePattern: 'DD-MM-YYYY',
					zippedArchive: true,
					dirname: process.env.LOG_PATH || '/logs/chatbuddy',
					maxSize: '20m',
					maxFiles: '14d',
				}),
			]);
			break;
		default:
			logTransports = logTransports.concat([
				new transports.DailyRotateFile({
					filename: 'chatbuddy-%DATE%.log',
					datePattern: 'DD-MM-YYYY',
					zippedArchive: true,
					dirname: process.env.LOG_PATH || '/logs/chatbuddy',
					maxSize: '20m',
					maxFiles: '14d',
				}),
				new LogtailTransport(logtail),
			]);
			break;
	}
}

function requestLogger(req) {
	setLogChannelTransport();
	return createLogger({
		level: process.env.LOG_LEVEL || 'info',
		format: customFormat,
		defaultMeta: {
			method: req.method,
			path: req.originalUrl,
			requestLogId: req.requestLogId,
			hostname: hostname,
			ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
		},
		transports: logTransports,
	});
}

function defaultLogger() {
	setLogChannelTransport();
	return createLogger({
		level: process.env.LOG_LEVEL || 'info',
		format: customFormat,
		defaultMeta: {
			hostname: hostname,
		},
		transports: logTransports,
	});
}

function assignUniqueRequestLogId(req, res, next) {
	req.requestLogId = uuidv4();
	next();
}

const attachLogger = (req, res, next) => {
	const reqlogger = requestLogger(req);

	// Log the incoming request
	reqlogger.info('Request received', { method: req.method, url: req.url });

	// Attach the logger to the request object for use in controllers
	req.logger = reqlogger;

	next();
};

module.exports = {
	defaultLogger,
	requestLogger,
	assignUniqueRequestLogId,
	attachLogger,
};
