# ChatBuddy
 
![167-removebg-preview](https://github.com/chatbuddyAI/chatbuddy-api/assets/34938103/69114f00-1a58-4f56-a5ed-33cb62d86738)

ChatBuddy is a chat application that allows users to have conversational experiences with an AI chatbot. It is designed to make the interactions more engaging and personalized for the users. The chatbot utilizes the OpenAI GPT-3 language model to generate its responses. Users can start a new chat and send messages to the chatbot, which will respond in real-time based on the context of the conversation. The chat history is stored and can be reviewed by the user.

## Getting Started

To use the ChatBuddy API, follow these steps:

- Clone this repository to your local machine.
- Install the required dependencies by running npm install.
- Before running the application, make sure to create a `config.env` file in the root directory by duplicating the `config.env.example` file and renaming it to `config.env`. Then, fill in the required values for the environment variables.
  Here are the environment variables required for ChatBuddy API:

  ```makefile
      APP_NAME=ChatBuddy
      NODE_ENV=development
      PORT=7576

      DATABASE=
      DATABASE_LOCAL=mongodb://localhost:27017/chatbuddy
      DATABASE_USERNAME=
      DATABASE_PASSWORD=

      JWT_SECRET=generate-your-long-secret-text-and-put-it-here-it-is-required
      JWT_EXPIRES_IN =1d
      JWT_COOKIE_EXPIRES_IN=1

      MAIL_HOST=
      MAIL_PORT=
      MAIL_USERNAME=
      MAIL_PASSWORD=
      MAIL_FROM_ADDRESS=
      MAIL_FROM_NAME="${APP_NAME}"

      OPENAI_BASE_URL=https://api.openai.com
      OPENAI_API_KEY=
      OPENAI_ORG_ID=
      OPENAI_GPT_MODEL=gpt-3.5-turbo
      OPENAI_MODEL_TEMPERATURE=0.7

      PAYSTACK_PUBLIC_KEY=
      PAYSTACK_SECRET_KEY=
      PAYSTACK_BASE_URL=https://api.paystack.co
  ```

- Start the server by running npm start.
- The server should now be running on http://localhost:7576.

## API Endpoints

After running the project yon can find ChatBuddy API documentation here: [http://127.0.0.1:7576](http://127.0.0.1:7576).

## Error Handling

The ChatBuddy API handles errors by returning HTTP error codes and JSON error objects. All errors include a status code and a message field in the response body.

##Contributing

We welcome contributions from the community! To contribute to ChatBuddy, please follow these steps:

Fork the repository.

1. Create a new branch for your feature or bug fix:

```
git checkout -b my-new-feature
```

2. Make your changes and commit them:

```
git commit -m "Add my new feature"
```

3. Push your changes to your fork:

```
git push origin my-new-feature
```

4. Create a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
