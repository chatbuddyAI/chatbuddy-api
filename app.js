const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// const nodemailer = require('nodemailer');
const helloWorldRouter = require('./routes/helloWorld');
const globalErrorHandler = require('./exceptions/handler');

const userRouter = require('./routes/userRoutes');
const chatRouter = require('./routes/chatRoutes');
const messageRouter = require('./routes/messageRoutes');
const subscriptionRouter = require('./routes/subscriptionRoutes');
const paystackWebhookRouter = require('./routes/paystackWebhookRoutes');

const AppError = require('./utils/appError');

const app = express();

//Set security http headers
app.use(helmet());

console.log(`You are in ${process.env.NODE_ENV} environment.`);

// Development Logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev')); // prints the request info
}

// Limits number of request from an IP
const limiter = rateLimit({
	max: 200, // no of request
	windowMs: 60 * 60 * 1000, // reset time in milliseconds (1 hour)
	message: 'Too many requests from this IP, please try again in an hour!',
});

// Applying the limiter to only api routes
app.use('/api', limiter);

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

// const transporter = nodemailer.createTransport({
// 	service: 'gmail',
// 	host: 'smtp.gmail.com',
// 	port: 465,
// 	secure: true,
// 	auth: {
// 		user: 'chatbuddyinc@gmail.com',
// 		pass: 'iveehzgxkglefpou',
// 	},
// });

// // Send an email
// const mailOptions = {
// 	from: 'no-reply@gmail.com',
// 	to: 'gabrielibenye@gmail.com',
// 	subject: 'This is a test email',
// 	text: 'This is the body of the email.',
// 	html: '<b>Hey there! </b><br> This is our first message sent with Nodemailer<br/>',
// };

// transporter.sendMail(mailOptions, function (err, info) {
// 	if (err) {
// 		console.log(err);
// 	} else {
// 		console.log(info);
// 	}
// });

// Serving static files
app.use(express.static(`${__dirname}/public`));

//Routes
app.use('/api/v1/helloWorld', helloWorldRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/paystack', paystackWebhookRouter);

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
