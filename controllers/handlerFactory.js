const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const {
	HTTP_NO_CONTENT,
	HTTP_OK,
	HTTP_CREATED,
	HTTP_NOT_FOUND,
} = require('../utils/responseStatus');
const { successResponse } = require('../utils/apiResponder');

exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndDelete(req.params.id);
		if (!doc) {
			return next(
				new AppError('No document found with that ID', HTTP_NOT_FOUND)
			);
		}

		successResponse({
			response: res,
			message: 'Delete successfully',
			code: HTTP_NO_CONTENT,
		});
	});

exports.updateOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});

		if (!doc) {
			return next(
				new AppError('No document found with that ID', HTTP_NOT_FOUND)
			);
		}

		successResponse({
			response: res,
			message: 'Updated successfully',
			code: HTTP_OK,
			data: doc,
		});
	});

exports.createOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.create(req.body);

		successResponse({
			response: res,
			message: 'Created successfully',
			code: HTTP_CREATED,
			data: doc,
		});
	});

exports.getOne = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		let query = Model.findById(req.params.id);

		if (popOptions) query = query.populate(popOptions);

		const doc = await query;

		if (!doc) {
			return next(
				new AppError('No document found with that ID', HTTP_NOT_FOUND)
			);
		}

		successResponse({
			response: res,
			message: 'Retrieved successfully',
			code: HTTP_OK,
			data: doc,
		});
	});

exports.getAll = (Model) =>
	catchAsync(async (req, res, next) => {
		// execute query
		const features = new APIFeatures(Model.find(), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();

		const doc = await features.query;
		// const doc = await query;

		successResponse({
			response: res,
			message: 'Retrieved all successfully',
			code: HTTP_OK,
			data: doc,
		});
	});
