const User = require('../models/userModel');
const { successResponse } = require('../utils/apiResponder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
	HTTP_OK,
	HTTP_BAD_REQUEST,
	HTTP_NO_CONTENT,
} = require('../utils/responseStatus');
const factory = require('./handlerFactory');

const filteredObject = (obj, ...allowedFields) => {
	const newObj = {};
	Object.keys(obj).forEach((el) => {
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});
	return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
	// create errorif user posts password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(
			new AppError('This route is not for updating password', HTTP_BAD_REQUEST)
		);
	}

	// filter out unwanted fields
	const filteredBody = filteredObject(req.body, 'email', 'name');

	// update user document
	const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
		new: true,
		runValidators: true,
	});

	successResponse({
		response: res,
		message: 'Updated user successfully',
		code: HTTP_OK,
		data: updatedUser,
	});
});

exports.deleteMe = catchAsync(async (req, res, next) => {
	await User.findByIdAndUpdate(req.user.id, { active: false });

	res.status(204).json({
		status: 'success',
		data: null,
	});
	successResponse({
		response: res,
		message: 'Account deleted successfully',
		code: HTTP_NO_CONTENT,
	});
});

exports.createUser = (req, res) => {
	res.status(500).json({
		status: 'error',
		message: 'This route is not yet defined',
	});
};

exports.getMe = (req, res, next) => {
	req.params.id = req.user.id;
	next();
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
