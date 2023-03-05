const Chat = require('../models/chatModel');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const Message = require('../models/messageModel');
const { successResponse } = require('../utils/apiResponder');
const {
	HTTP_OK,
	HTTP_NOT_FOUND,
	HTTP_NO_CONTENT,
} = require('../utils/responseStatus');

/**
 * This function creates a new object based on the given 'obj' and filters out any fields that are not specified as 'allowedFields'.
 *
 * @param {*} obj: The original object which is required to be filtered.
 * @param  {...any} allowedFields: The fields which should remain in the new object. This
 * @returns  {*} It returns a new filtered object.
 */
const filteredObject = (obj, ...allowedFields) => {
	const newObj = {};
	Object.keys(obj).forEach((el) => {
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});
	return newObj;
};

const isArrayEmpty = (arr) => Array.isArray(arr) && arr.length <= 0;

exports.createChat = catchAsync(async (req, res, next) => {
	// get id of the authenticated user from the "protect" middleware
	req.body.user = req.user.id;

	const filteredBody = filteredObject(req.body, 'title', 'user', 'type');

	// eslint-disable-next-line no-unused-expressions
	if (filteredBody.type === 'group') filteredBody.members = [filteredBody.user];

	const chat = await Chat.create(filteredBody);

	res.status(201).json({
		status: 'success',
		data: {
			chat: chat,
		},
	});
	successResponse({
		response: res,
		message: 'New message sent and new chat created successfully',
		code: HTTP_OK,
		data: chat,
	});
});

exports.getAllChats = catchAsync(async (req, res, next) => {
	// execute query
	console.log(req.query);
	const features = new APIFeatures(Chat.find({ user: req.user.id }), req.query)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	// .select('-lastPrompt') makes sure that the lastPrompt field is not returned with the result
	const chats = await features.query.select('-lastPrompt');

	successResponse({
		response: res,
		message: 'Retrieved all chats successfully',
		code: HTTP_OK,
		data: chats,
	});
});

exports.getChat = catchAsync(async (req, res, next) => {
	let query = Chat.find({ uuid: req.params.uuid, user: req.user.id });
	// populate options replaces the user id referenced in the chat collection with the user document
	const popOptions = ['members'];
	if (popOptions) query = query.populate(popOptions);

	const chat = await query;

	if (isArrayEmpty(chat)) {
		return next(new AppError('No chat found with that ID', HTTP_NOT_FOUND));
	}
	res.status(200).json({
		status: 'success',
		data: {
			data: chat,
		},
	});

	successResponse({
		response: res,
		message: 'Retrieved chat successfully',
		code: HTTP_OK,
		data: chat,
	});
});

exports.updateChat = catchAsync(async (req, res, next) => {
	let chat = await Chat.find({ uuid: req.params.uuid, user: req.user.id });

	if (isArrayEmpty(chat)) {
		return next(new AppError('No chat found with that ID', HTTP_NOT_FOUND));
	}

	const filteredBody = filteredObject(req.body, 'title');

	await Chat.updateOne(
		{ uuid: req.params.uuid, user: req.user.id },
		filteredBody,
		{ new: true, runValidators: true }
	);

	chat = await Chat.find({ uuid: req.params.uuid, user: req.user.id });

	res.status(200).json({
		status: 'success',
		data: {
			data: chat,
		},
	});

	successResponse({
		response: res,
		message: 'Updated chat successfully',
		code: HTTP_OK,
		data: chat,
	});
});

exports.deleteChat = catchAsync(async (req, res, next) => {
	let chat = await Chat.find({ uuid: req.params.uuid, user: req.user.id });

	if (isArrayEmpty(chat)) {
		return next(new AppError('No chat found with that ID', HTTP_NOT_FOUND));
	}

	await Message.deleteMany({ chat: chat._id });

	chat = await Chat.deleteOne({ uuid: req.params.uuid, user: req.user.id });

	successResponse({
		response: res,
		message: 'Deleted chat successfully',
		code: HTTP_NO_CONTENT,
		data: chat,
	});
});
