/**
 * Profile Routes - Profile API Endpoints
 * Author: Muhammad Abubakar (BCSF22M006)
 *
 * Functionality:
 * - Defines profile-related API routes
 * - Handles profile retrieval and updates
 * - Manages profile picture uploads with file validation
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadProfile');
const { updateProfile, getProfile } = require('../controllers/ProfileController');
const { authenticateToken } = require('../middleware/auth');

// GET profile data
router.get('/:id', authenticateToken, getProfile);

// UPDATE profile data (with optional image upload)
router.patch('/:id', authenticateToken, upload.single('profile_picture'), updateProfile);

module.exports = router;