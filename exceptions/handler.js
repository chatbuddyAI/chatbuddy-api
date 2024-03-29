const { failureResponse } = require('../utils/apiResponder');
const AppError = require('../utils/appError');
const {
	HTTP_UNPROCESSABLE_ENTITY,
	HTTP_BAD_REQUEST,
	HTTP_INTERNAL_SERVER_ERROR,
} = require('../utils/responseStatus');

const handleCastErrorDB = (err) => {
	const message = `Invalid ${err.path}: ${err.value}`;
	return new AppError(message, HTTP_BAD_REQUEST);
};
const handleDuplicateFieldsErrorDB = (err) => {
	const message = `The ${
		Object.keys(err.keyValue)[0]
	} value already exist. Please use another value.`;
	return new AppError(message, HTTP_BAD_REQUEST);
};
const handleValidatorErrorDB = (err) => {
	const errors = Object.values(err.errors).map((el) => el.message);

	const message = `Invalid Input data. ${errors[0]}`;
	return new AppError(message, HTTP_UNPROCESSABLE_ENTITY);
};
const sendErrorDev = (error, res) => {
	failureResponse({
		response: res,
		message: error.message,
		code: error.statusCode,
		data: {
			error,
			stack: error.stack,
		},
	});
};

const sendErrorProd = (error, res) => {
	// Operatiional, trusted error: send message to client
	if (error.isOperational) {
		failureResponse({
			response: res,
			message: error.message,
			code: error.statusCode,
		});

		//Programming or other unknown error: dont't send leak error details
	} else {
		// Log error
		console.error('ERROR: ', error);

		//send generic message
		failureResponse({
			response: res,
			message:
				'Something went wrong! Try again. If it continues, contact support.',
			code: HTTP_INTERNAL_SERVER_ERROR,
		});
	}
};

module.exports = (error, req, res, next) => {
	error.statusCode = error.statusCode || 500;
	error.status = error.status || 'error';

	if (
		process.env.NODE_ENV === 'development' ||
		process.env.NODE_ENV === 'staging'
	) {
		sendErrorDev(error, res);
	} else if (process.env.NODE_ENV === 'production') {
		console.log(`This is the Error name ${error.name}`);
		// eslint-disable-next-line node/no-unsupported-features/es-syntax
		let err = { ...error };

		err.message = error.message;

		if (error.name === 'CastError') err = handleCastErrorDB(err);
		if (error.code === 11000) err = handleDuplicateFieldsErrorDB(err);
		if (error.name === 'ValidationError') err = handleValidatorErrorDB(err);

		sendErrorProd(err, res);
	}
};
