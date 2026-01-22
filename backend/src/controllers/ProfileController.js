/**
 * Profile Controller - User Profile Management
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Handles user profile retrieval and updates
 * - Manages profile picture uploads to S3
 * - Updates user and student profile information
 * - Validates profile data and permissions
 */

const User = require('../models/User');
const Student = require('../models/Student');

// ✅ GET PROFILE
async function getProfile(req, res) {
  try {
    const userId = req.params.id;

    console.log('📥 [PROFILE GET] Fetching profile for userId:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find student record using user._id
    const student = await Student.findOne({ user_id: user._id });

    console.log('📥 [PROFILE GET] Student record:', student ? 'Found' : 'Not found');

    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        profile_photo_url: user.profile_photo_url,
        bio: student ? student.bio : '',
        // You can add more student fields here if needed
        grade: student ? student.grade : null,
        board: student ? student.board : null,
      }
    });

  } catch (err) {
    console.error('❌ [PROFILE GET] Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}

// ✅ UPDATE PROFILE
async function updateProfile(req, res) {
  try {
    const { name, bio, removeImage } = req.body;
    const userId = req.params.id;

    console.log('📥 [PROFILE UPDATE] Request:', { userId, name, bio, hasFile: !!req.file, removeImage });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Update user name if provided
    if (name) {
      user.name = name.trim();
      console.log('✅ [PROFILE UPDATE] Name updated to:', user.name);
    }

    // Update profile picture if uploaded
    if (req.file) {
      console.log('📸 [PROFILE UPDATE] File uploaded to S3:', req.file.location);
      user.profile_photo_url = req.file.location;
    }

    // Remove profile picture if requested
    if (removeImage === 'true') {
      user.profile_photo_url = null;
      console.log('🗑️ [PROFILE UPDATE] Profile picture removed');
    }

    user.updated_at = new Date();
    await user.save();

    console.log('✅ [PROFILE UPDATE] User saved successfully');

    // ✅ UPDATE OR CREATE STUDENT RECORD
    let student = await Student.findOne({ user_id: user._id });

    if (!student) {
      console.log('⚠️ [PROFILE UPDATE] No student record found, creating one...');
      
      // Generate student ID
      const lastStudent = await Student.findOne().sort({ student_id: -1 });
      let newStudentId = 'STU001';
      
      if (lastStudent) {
        const lastNumber = parseInt(lastStudent.student_id.replace('STU', ''));
        newStudentId = `STU${String(lastNumber + 1).padStart(3, '0')}`;
      }

      // Create new student record
      student = await Student.create({
        student_id: newStudentId,
        user_id: user._id,
        grade: 10,
        bio: bio || '',
        board: 'Not Specified',
        personal_preferences: 'Not Specified',
        registration_date: new Date(),
        guardian_name: 'Not Provided',
        guardian_contact_no: '0000000000',
      });

      console.log('✅ [PROFILE UPDATE] Student record created:', student.student_id);
    } else {
      // Update existing student record
      if (bio !== undefined) {
        student.bio = bio;
        await student.save();
        console.log('✅ [PROFILE UPDATE] Bio updated:', bio);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: user.name,
        email: user.email,
        profile_photo_url: user.profile_photo_url,
        bio: student.bio
      }
    });

  } catch (err) {
    console.error('❌ [PROFILE UPDATE] Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: err.message 
    });
  }
}

module.exports = { updateProfile, getProfile };