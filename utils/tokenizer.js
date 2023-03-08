const { encode, decode } = require('gpt-3-encoder');

const OPENAI_TOKEN_CAP = 4092;
const CHAT_BUDDY_TOKEN_CAP = 2023;

/**
 * The getToken function takes a string message as input, encodes it into tokens using the imported encode function,
 * and returns the length of the resulting array.
 * @param {string} message
 * @returns number
 */
exports.getToken = (message) => encode(message).length;

/**
 * The truncatePrompt function takes a prompt string and an optional number of tokens to remove from it (noOfTokens).
 * The prompt is first encoded using the encode function, then noOfTokens is removed from the start of the encoded array (using the slice method).
 * Finally, the truncated encoded prompt is decoded back into text using the decode function and returned as a string.
 * @param {string} prompt
 * @param {number} noOfTokens
 * @returns string
 */
exports.truncatePrompt = (prompt, noOfTokens = 592) =>
	decode(
		encode(prompt).slice(noOfTokens) // remove top noOfTokens from prompt
	);

module.exports = { OPENAI_TOKEN_CAP, CHAT_BUDDY_TOKEN_CAP };
