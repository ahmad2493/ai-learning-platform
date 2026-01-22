const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadProfile');
const { updateProfile, getProfile } = require('../controllers/ProfileController');

// GET profile data
router.get('/:id', getProfile);

// UPDATE profile data (with optional image upload)
router.patch('/:id', upload.single('profile_picture'), updateProfile);

module.exports = router;