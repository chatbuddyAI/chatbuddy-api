const express = require('express');
const helloWorldController = require('../controllers/helloWorldController');

const router = express.Router();

router.route('/').get(helloWorldController.helloWord);
router.route('/west').get(helloWorldController.helloWestWord);

module.exports = router;
