const { Configuration, OpenAIApi } = require('openai');
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/apiResponder');
const { HTTP_OK, HTTP_NOT_FOUND } = require('../utils/responseStatus');
const {
	getToken,
	truncatePrompt,
	CHAT_BUDDY_TOKEN_CAP,
} = require('../utils/tokenizer');

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const truncateMessage = (msg) => {
	const words = msg.split(' ');
	let shortMessage = '';
	let i = 0;
	do {
		shortMessage += `${words[i]} `;
		i++;
	} while (i < 5 && i < words.length);
	return `${shortMessage}`;
};

exports.sendNewMessage = catchAsync(async (req, res, next) => {
	// Get the message that the user sent
	const userMessage = req.body.message;

	//TODO: Do a moderation check of the message with OpenAi's moderation endpoint

	const chat = await Chat.create({
		user: req.user.id,
		title: truncateMessage(userMessage),
	});

	// Create a new message document for the user's message
	await Message.create({
		chat: chat._id,
		sender: 'user',
		message: userMessage,
	});

	// Determine the prompt for the OpenAI API call. If there is a last prompt,
	// add the user message to it, otherwise use the user message as the prompt
	let prompt = chat.lastPrompt
		? `${chat.lastPrompt}\n\n${userMessage}\n`
		: `${userMessage}\n`;

	// checks if number of token is above 2000 and if it is, we proceed to remove the topmost 500 tokens and return the truncated string
	if (getToken(prompt) >= CHAT_BUDDY_TOKEN_CAP) {
		prompt = truncatePrompt(prompt);
	}

	// Call the OpenAI API to generate a response
	const response = await openai.createCompletion({
		prompt: prompt,
		model: 'text-davinci-003',
		temperature: 1,
		max_tokens: 256,
	});

	// Get the chatbot's response
	const chatbotMessage = response.data.choices[0].text;

	// Create a new message document for the chatbot's response
	let chatbotResponse = await Message.create({
		chat: chat._id,
		sender: 'chatbot',
		message: chatbotMessage,
		isBotReply: true,
	});

	let query = Message.find({ _id: chatbotResponse._id });
	// populate options replaces the user id referenced in the chat collection with the user document
	const popOptions = ['chat'];
	if (popOptions) query = query.populate(popOptions);

	chatbotResponse = await query;

	// Update the chat document with the new last prompt and total tokens used
	chat.lastPrompt = `${prompt}${chatbotMessage}`;
	chat.total_tokens = response.data.usage.total_tokens;
	await chat.save({ validateBeforeSave: false });

	// Return the chatbot response
	successResponse({
		response: res,
		message: 'New message sent and new chat created successfully',
		code: HTTP_OK,
		data: chatbotResponse,
	});
});

exports.sendMessageInChat = catchAsync(async (req, res, next) => {
	// Find the chat using the uuid and user id provided in the request
	const chat = await Chat.findOne({ uuid: req.params.chat, user: req.user.id });

	// If no chat was found with the provided information
	if (!chat) {
		// Return an error indicating that no chat was found
		return next(
			new AppError(
				'No chat found with that ID or the chat does not belong to the user',
				HTTP_NOT_FOUND
			)
		);
	}

	//check if chat is a group
	//if chat is a group, check if user sending message belongs in the group

	// Get the message that the user sent
	const userMessage = req.body.message;

	// Create a new message document for the user's message
	await Message.create({
		chat: chat._id,
		sender: 'user',
		message: userMessage,
	});

	// Determine the prompt for the OpenAI API call. If there is a last prompt,
	// add the user message to it, otherwise use the user message as the prompt
	const prompt = chat.lastPrompt
		? `${chat.lastPrompt}\n\n${userMessage}\n`
		: `${userMessage}\n`;

	// Call the OpenAI API to generate a response
	const response = await openai.createCompletion({
		prompt: prompt,
		model: 'text-davinci-003',
		temperature: 1,
		max_tokens: 256,
	});

	// Get the chatbot's response
	const chatbotMessage = response.data.choices[0].text;

	// Create a new message document for the chatbot's response
	const chatbotResponse = await Message.create({
		chat: chat._id,
		sender: 'chatbot',
		message: chatbotMessage,
		isBotReply: true,
	});

	// Update the chat document with the new last prompt and total tokens used
	// Also a check to see if tokens used in chat is above 1000. if so lastPrompt is emptied which is equivalent to the chatbot forgetting about previous questions
	chat.lastPrompt =
		response.data.usage.total_tokens >= 1000
			? ''
			: `${prompt}${chatbotMessage}`;
	chat.total_tokens =
		response.data.usage.total_tokens >= 1000
			? 0
			: response.data.usage.total_tokens;
	await chat.save({ validateBeforeSave: false });

	console.log(chat.total_tokens);
	// Return the chatbot response

	successResponse({
		response: res,
		message: 'Message sent in chat successfully',
		code: HTTP_OK,
		data: chatbotResponse,
	});
});

exports.getAllChatMessages = catchAsync(async (req, res, next) => {
	const chat = await Chat.findOne({ uuid: req.params.chat, user: req.user.id });
	// If no chat was found with the provided information
	if (!chat) {
		// Return an error indicating that no chat was found
		return next(
			new AppError(
				'No chat found with that ID or the chat does not belong to the user',
				HTTP_NOT_FOUND
			)
		);
	}

	const features = new APIFeatures(Message.find({ chat: chat._id }), req.query)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const messages = await features.query;

	successResponse({
		response: res,
		message: 'Retrived all messages in user chat successfully',
		code: HTTP_OK,
		data: messages,
	});
});
