// routes/AdminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllStudents, suspendStudent, activateStudent } = require('../controllers/AdminController');

// fetch all students
router.get('/all_students', getAllStudents);

// suspend student
router.patch('/:id/suspend', suspendStudent);

// activate student
router.patch('/:id/activate', activateStudent);

module.exports = router;

