const express = require('express');
const router = express.Router();
const { getProgress } = require('../controllers/ProgressController');

router.get('/:user_id', getProgress);

module.exports = router;
