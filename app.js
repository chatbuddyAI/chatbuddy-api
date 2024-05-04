const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');
const hpp = require('hpp');
const httpContext = require('express-http-context');

const helloWorldRouter = require('./routes/helloWorld');
const globalErrorHandler = require('./exceptions/handler');

const userRouter = require('./routes/userRoutes');
const chatRouter = require('./routes/chatRoutes');
const messageRouter = require('./routes/messageRoutes');
const subscriptionRouter = require('./routes/subscriptionRoutes');
const paystackWebhookRouter = require('./routes/paystackWebhookRoutes');
const otpRouter = require('./routes/otpRoutes');

const { assignUniqueRequestLogId, attachLogger } = require('./utils/Logger');
const AppError = require('./utils/appError');
const connectToDatabase = require('./utils/connectToDatabase');
const cronJobs = require('./cron');

console.log(`You are in ${process.env.NODE_ENV} environment.`);

console.log('Connecting to database.');
connectToDatabase().then(() => {
	console.log('Scheduling cron operations');
	cronJobs.start();
});

const app = express();

app.use(httpContext.middleware);

//Set security http headers
app.use(helmet());

// Development Logging
if (
	process.env.NODE_ENV === 'development' ||
	process.env.NODE_ENV === 'staging'
) {
	app.use(morgan('dev')); // prints the request info
}

// Limits number of request from an IP
// const limiter = rateLimit({
// 	max: 200, // no of request
// 	windowMs: 60 * 60 * 1000, // reset time in milliseconds (1 hour)
// 	message: 'Too many requests from this IP, please try again in an hour!',
// });

// Applying the limiter to only api routes
// app.use('/api', limiter);

app.use(cors());

// Body Parser, allows a post body to be added to the request object
app.use(express.json());

//Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution (duplicate parameters)
app.use(
	hpp({
		whitelist: [
			// mention parameter values allowed to have duplicate value here
		],
	})
);

// Serving static files
app.use(express.static(`${__dirname}/public`));

app.use(assignUniqueRequestLogId);

app.use(attachLogger);

//Routes
app.use('/api/v1/helloWorld', helloWorldRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/paystack', paystackWebhookRouter);
app.use('/api/v1/otp', otpRouter);

// Catching routes not found in the server
app.all('*', (req, res, next) => {
	const error = new AppError(
		`Cant't find ${req.originalUrl} on this server!`,
		404
	);
	next(error);
});

app.use(globalErrorHandler);

module.exports = app;
