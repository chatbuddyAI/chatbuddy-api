/* eslint-disable strict */

'use strict';

const serverless = require('serverless-http');
const app = require('./app');

exports.initializeApi = serverless(app);
