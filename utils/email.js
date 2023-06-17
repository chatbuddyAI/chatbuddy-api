const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

const transporterOptions = {
	production: {
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		auth: {
			user: process.env.MAIL_USERNAME,
			pass: process.env.MAIL_PASSWORD,
		},
	},
	staging: {
		service: process.env.MAIL_SERVICE,
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		auth: {
			user: process.env.MAIL_USERNAME,
			pass: process.env.MAIL_PASSWORD,
		},
	},
	development: {
		service: process.env.MAIL_SERVICE,
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		auth: {
			user: process.env.MAIL_USERNAME,
			pass: process.env.MAIL_PASSWORD,
		},
	},
};

const transporter = nodemailer.createTransport(
	transporterOptions[process.env.NODE_ENV] || transporterOptions.development
);

module.exports = class Email {
	constructor({ user, options = {} }) {
		this.to = user.email;
		this.options = options;
		this.firstName = user.name ? user.name.split(' ')[0] : '';
		this.from = `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`;
		this.templates = {
			welcome: this.renderTemplate('welcome'),
			otp: this.renderTemplate('otp'),
			emailVerified: this.renderTemplate('emailVerified'),
			resetPassword: this.renderTemplate('resetPassword'),
			resetPasswordOtp: this.renderTemplate('resetPasswordOtp'),
			resetPasswordComplete: this.renderTemplate('resetPasswordComplete'),
		};
	}

	renderTemplate(template) {
		const templatePath = `${__dirname}/../views/emails/${template}.pug`;
		return pug.compileFile(templatePath);
	}

	async send(template, subject) {
		const templateFn = this.templates[template];
		if (!templateFn) {
			throw new Error(`Template "${template}" not found.`);
		}

		const html = templateFn({
			firstName: this.firstName,
			subject,
			options: this.options,
		});

		const mailOptions = {
			from: this.from,
			to: this.to,
			subject,
			html,
			text: htmlToText.convert(html),
		};

		await transporter.sendMail(mailOptions);
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

	async sendFreeTrialExpired() {
		await this.send('freeTrialExpired', 'Free trial Expried ');
	}
};
