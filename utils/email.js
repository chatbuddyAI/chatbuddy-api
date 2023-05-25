const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
	constructor({ user, options = {} }) {
		this.to = user.email;
		this.options = options;
		this.firstName = user.name == null ? '' : user.name.split(' ')[0];
		this.from = `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`;
	}

	newTransport() {
		if (process.env.NODE_ENV === 'production') {
			// prod emails
			return true;
		}

		if (process.env.NODE_ENV === 'staging') {
			return nodemailer.createTransport({
				service: process.env.MAIL_SERVICE,
				host: process.env.MAIL_HOST,
				port: process.env.MAIL_PORT,
				secure: true,
				auth: {
					user: process.env.MAIL_USERNAME,
					pass: process.env.MAIL_PASSWORD,
				},
			});
		}

		// dev / local
		return nodemailer.createTransport({
			host: process.env.MAIL_HOST,
			port: process.env.MAIL_PORT,
			auth: {
				user: process.env.MAIL_USERNAME,
				pass: process.env.MAIL_PASSWORD,
			},
		});
	}

	async send(template, subject) {
		// render html

		const html = pug.renderFile(
			`${__dirname}/../views/emails/${template}.pug`,
			{
				firstName: this.firstName,
				subject,
				options: this.options,
			}
		);

		const mailOptions = {
			from: this.from,
			to: this.to,
			subject,
			html,
			text: htmlToText.convert(html),
		};

		await this.newTransport().sendMail(mailOptions);
	}

	async sendWelcome() {
		await this.send('welcome', 'Welcome to ChatBuddy');
	}

	async sendVerificationOtp() {
		await this.send('otp', 'Verify Your Email');
	}

	async sendEmailVerificationSuccessful() {
		await this.send('emailVerified', 'Email Verified!');
	}

	async sendResetPassword() {
		await this.send('resetPassword', 'Reset Password');
	}

	async sendResetPasswordOtp() {
		await this.send('resetPasswordOtp', 'Reset Password');
	}

	async sendResetPasswordComplete() {
		await this.send('resetPasswordComplete', 'Password Reset Complete');
	}
};
