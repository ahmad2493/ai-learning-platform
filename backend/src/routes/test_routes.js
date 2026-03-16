const express = require('express');
const router = express.Router();
const { saveTest, getTest, getTestHistory, submitTest, getDashboard } = require('../controllers/TestController');

router.post('/save', saveTest);
router.post('/:test_id/submit', submitTest);
router.get('/dashboard/:user_id', getDashboard);
router.get('/history/:user_id', getTestHistory);
router.get('/:test_id', getTest);


module.exports = router;