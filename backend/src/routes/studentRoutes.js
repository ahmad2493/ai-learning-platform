/**
 * Student Routes - Student API Endpoints
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines student-related API routes
 * - Handles profile updates (name, email, password)
 * - Manages course enrollments and test submissions
 * - Provides student dashboard data endpoints
 */

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/StudentController');

// Profile updates
router.patch('/:id/name', studentController.changeName);
router.patch('/:id/email', studentController.changeEmail);
//router.patch('/:id/phone', studentController.changePhone);
//router.patch('/:id/address', studentController.changeAddress);

// Password management
router.patch('/:id/password/set', studentController.setPassword);
router.patch('/:id/password/verify', studentController.verifyPassword);
router.patch('/:id/password/change', studentController.changePassword);

module.exports = router;
