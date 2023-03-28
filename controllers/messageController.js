const {
	Configuration,
	OpenAIApi,
	ChatCompletionResponseMessageRoleEnum,
} = require('openai');
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/apiResponder');
const {
	HTTP_OK,
	HTTP_NOT_FOUND,
	HTTP_NOT_ACCEPTABLE,
} = require('../utils/responseStatus');
const { getTokens, CHAT_BUDDY_TOKEN_CAP } = require('../utils/tokenizer');
const ChatRequestMessage = require('../models/ChatRequestMessageModel');

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const CHAT_BOT_KNOWLEDGE = [
	{
		role: ChatCompletionResponseMessageRoleEnum.System,
		content: 'You are a helpful conversational chatbot, your name is ChatBuddy',
	},
	{
		role: ChatCompletionResponseMessageRoleEnum.User,
		content: 'What is ChatBuddy?',
	},
	{
		role: ChatCompletionResponseMessageRoleEnum.Assistant,
		content:
			'ChatBuddy is a chat application that allows users to have conversational experiences with an AI chatbot. It is designed to make the interactions more engaging and personalized for the users. The chatbot utilizes the OpenAI GPT-3 language model to generate its responses. Users can start a new chat and send messages to the chatbot, which will respond in real-time based on the context of the conversation.',
	},
];
const truncateMessage = (msg) => {
	const words = msg.split(' ');
	let shortMessage = '';
	let i = 0;
	do {
		shortMessage += `${words[i]} `;
		i++;
	} while (i < 5 && i < words.length);
	return `${shortMessage.trim()}`;
};

const deleteOldMessagesDueToTokenMaxedOut = async (prompts, tokenCount) => {
	const deletePromises = [];

	while (tokenCount >= CHAT_BUDDY_TOKEN_CAP && prompts.length) {
		const removedMessage = prompts.shift();
		const deletePromise = ChatRequestMessage.deleteOne({
			role: removedMessage.role,
			content: removedMessage.content,
			name: removedMessage.name,
		});

		deletePromises.push(deletePromise);
		tokenCount -= getTokens(removedMessage.content);
	}

	await Promise.all(deletePromises);
};

const getPrompts = async (chatId) => {
	const prompts = await ChatRequestMessage.aggregate([
		{
			$match: {
				chat: chatId,
			},
		},
		{
			$project: {
				_id: 0,
				role: 1,
				content: 1,
				name: 1,
			},
		},
	]);

	let tokenCount = 0;

	prompts.forEach((msg) => {
		const tokens = getTokens(msg.content);
		tokenCount += tokens;
	});

	await deleteOldMessagesDueToTokenMaxedOut(prompts, tokenCount);

	return prompts;
};

const newChatMessageAndModerationCheck = async (req, next) => {
	// Get the message that the user sent
	const userMessage = req.body.message;

	//a moderation check of the message with OpenAi's moderation endpoint
	const moderation = await openai.createModeration({
		input: userMessage,
	});

	if (moderation.data.results[0].flagged) {
		return next(
			new AppError(
				'Your message was flagged as inappropriate',
				HTTP_NOT_ACCEPTABLE
			)
		);
	}

	let chat = new Chat();

	if (req.params.chat) {
		//*******************if is send in chat *********************/

		// Find the chat using the uuid and user id provided in the request
		chat = await Chat.findOne({
			uuid: req.params.chat,
			user: req.user.id,
		});
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

		//*******************if is send in chat *******************/
	} else {
		//*******************if is new chat *********************/
		console.log('new chat');

		chat = await Chat.create({
			user: req.user.id,
			title: truncateMessage(userMessage),
		});

		//*******************if is new chat *********************/
	}

	await ChatRequestMessage.create({
		chat: chat._id,
		role: ChatCompletionResponseMessageRoleEnum.User,
		content: userMessage,
	});

	// Create a new message document for the user's message
	await Message.create({
		chat: chat._id,
		sender: 'user',
		message: userMessage,
	});

	return chat;
};

const generateChatbotResponseFromOpenAi = async (
	chatRequestMessage,
	chatId
) => {
	const responseMessage = await openai.createChatCompletion({
		model: process.env.OPENAI_GPT_MODEL,
		temperature: process.env.OPENAI_MODEL_TEMPERATURE,
		max_tokens: 256,
		top_p: 1,
		messages: chatRequestMessage,
	});

	// Get the chatbot's response
	const chatbotMessage = responseMessage.data.choices[0].message.content;

	// Create a new message document for the chatbot's response
	let chatbotResponse = await Message.create({
		chat: chatId,
		sender: 'chatbot',
		message: chatbotMessage,
		isBotReply: true,
	});

	chatbotResponse = Message.findById(chatbotResponse._id);

	// populate options replaces the user id referenced in the chat collection with the user document
	const popOptions = ['chat'];

	if (popOptions) chatbotResponse = chatbotResponse.populate(popOptions);

	return chatbotResponse;
};

exports.sendMessage = catchAsync(async (req, res, next) => {
	const chat = await newChatMessageAndModerationCheck(req, next);

	const prompts = await getPrompts(chat._id);

	const chatbotResponse = await generateChatbotResponseFromOpenAi(
		CHAT_BOT_KNOWLEDGE.concat(prompts),
		chat._id
	);
	// Return the chatbot response
	successResponse({
		response: res,
		message: 'New message sent and new chat created successfully',
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
