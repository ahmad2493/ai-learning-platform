const mongoose = require('mongoose');
const Test = require('../models/Test');
const { updateProgress } = require('./ProgressController');

async function submitTest(req, res) {
  try {
    const { test_id } = req.params;
    const { mcq_answers } = req.body;
    if (!mongoose.Types.ObjectId.isValid(test_id)) {
      return res.status(400).json({ success: false, message: 'Invalid test_id.' });
    }
    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });
    if (test.status === 'attempted') return res.status(400).json({ success: false, message: 'Test already submitted.' });
    if (test.status === 'expired') return res.status(400).json({ success: false, message: 'Test has expired.' });
    const now = new Date();
    const expires_at = new Date(test.test_details.expires_at);
    if (now > expires_at) {
      test.status = 'expired';
      await test.save();
      return res.status(400).json({ success: false, message: 'Deadline crossed. Test marked as expired.' });
    }
    let correct_count = 0;
    const updated_mcqs = test.mcqs.map(mcq => {
      const answer = mcq_answers?.[String(mcq.question_number)] || null;
      const is_correct = answer && answer.toLowerCase() === mcq.correct_option.toLowerCase();
      if (is_correct) correct_count++;
      return { ...mcq.toObject(), student_answer: answer };
    });
    test.mcqs = updated_mcqs;
    test.status = 'attempted';
    test.submitted_at = now;
    await test.save();
    await updateProgress(test.user_id, updated_mcqs);
    const total = test.mcqs.length;
    console.log(`[TEST SUBMITTED] test_id=${test_id} score=${correct_count}/${total}`);
    return res.status(200).json({
      success: true,
      message: 'Test submitted successfully.',
      score: { correct: correct_count, total, percentage: total > 0 ? ((correct_count / total) * 100).toFixed(1) : 0 },
    });
  } catch (err) {
    console.error('[SUBMIT TEST ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function saveTest(req, res) {
  try {
    const { user_id, test } = req.body;
    if (!user_id || !test) return res.status(400).json({ success: false, message: 'user_id and test are required.' });
    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ success: false, message: 'Invalid user_id format.' });
    const { test_details, mcqs, short_questions, long_questions } = test;
    if (!test_details) return res.status(400).json({ success: false, message: 'test_details missing from test object.' });
    const newTest = new Test({
      user_id, status: 'unattempted', submitted_at: null,
      test_details, mcqs: mcqs || [], short_questions: short_questions || [], long_questions: long_questions || [],
    });
    await newTest.save();
    console.log(`[TEST SAVED] test_id=${newTest._id} user_id=${user_id}`);
    return res.status(201).json({ success: true, message: 'Test saved successfully.', test_id: newTest._id.toString(), expires_at: test_details.expires_at });
  } catch (error) {
    console.error('[SAVE TEST ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error while saving test.' });
  }
}

async function getTest(req, res) {
  try {
    const { test_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(test_id)) return res.status(400).json({ success: false, message: 'Invalid test_id format.' });
    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });
    return res.status(200).json({ success: true, data: test });
  } catch (error) {
    console.error('[GET TEST ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching test.' });
  }
}

async function getTestHistory(req, res) {
  try {
    const { user_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ success: false, message: 'Invalid user_id format.' });
    const tests = await Test.find({ user_id }).select('_id status submitted_at created_at test_details').sort({ created_at: -1 });
    return res.status(200).json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    console.error('[GET TEST HISTORY ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching test history.' });
  }
}

module.exports = { saveTest, getTest, getTestHistory, submitTest };
