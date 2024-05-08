function test(req) {
	req.logger.info('Hello from the test function');
}

exports.helloWord = (req, res) => {
	// const logger = createRequestLogger(req);
	// logger.info('Hello from the helloWorlController');
	test(req);
	req.logger.info('Hello from the helloWorlController');
	// req.logger.verbose('Hello from the helloWorlController');
	// req.logger.warn('Hello from the helloWorlController');
	// req.logger.silly('Hello from the helloWorlController');
	// req.logger.error('Hello from the helloWorlController');
	res.status(200).json({
		message: 'Hello World!!!!',
	});
};

exports.helloWestWord = (req, res) => {
	// req.logger.info('Hello west world from the helloWorlController');
	res.status(200).json({
		message: 'Hello West World!!!!',
	});
};
