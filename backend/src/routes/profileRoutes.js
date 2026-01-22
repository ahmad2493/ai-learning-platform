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

// GET profile data
router.get('/:id', getProfile);

// UPDATE profile data (with optional image upload)
router.patch('/:id', upload.single('profile_picture'), updateProfile);

module.exports = router;