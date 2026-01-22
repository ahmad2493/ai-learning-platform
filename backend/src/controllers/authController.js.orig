const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Student = require('../models/Student'); // ✅ IMPORT STUDENT MODEL
const { generateToken } = require('../utils/jwt');
const { validateEmail } = require('../utils/validateEmail');
const generateUserId = require('../utils/generateUserId');
const { createOTP, verifyOTP } = require('../utils/otpHelper');
const { sendOTPEmail } = require('../utils/emailService');

// Email configuration (old method - kept for backward compatibility)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send password reset email (OLD METHOD - Not used anymore)
const sendResetPasswordEmail = async (email, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset - AI Learning Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ==================== REGISTER USER - STEP 1: SEND OTP ====================
exports.registerUser = async (req, res) => {
  try {
    let { email, password, name, confirmPassword } = req.body;

    // Normalize Input
    email = email ? email.trim().toLowerCase() : '';
    name = name ? name.trim() : '';

    // Required Fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Confirm password is required.',
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 5 characters long.',
      });
    }

    // Email Validation
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({
        success: false,
        message: emailError,
      });
    }

    // Uniqueness Check
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.',
      });
    }

    // Generate temporary user ID for OTP
    const tempUserId = crypto.randomBytes(16).toString('hex');

    // Generate and send OTP
    const otp = await createOTP(tempUserId, email, 'REGISTRATION');
    await sendOTPEmail(email, otp, 'REGISTRATION');

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Valid for 60 seconds.',
      data: {
        email: email,
        tempUserId: tempUserId,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message
    });
  }
};

// ✅ HELPER FUNCTION TO GENERATE STUDENT ID
const generateStudentId = async () => {
  const lastStudent = await Student.findOne().sort({ student_id: -1 });
  
  if (!lastStudent) {
    return 'STU001';
  }
  
  const lastNumber = parseInt(lastStudent.student_id.replace('STU', ''));
  const newNumber = lastNumber + 1;
  return `STU${String(newNumber).padStart(3, '0')}`;
};

// ==================== REGISTER USER - STEP 2: VERIFY OTP & CREATE ACCOUNT ====================
exports.verifyRegistrationOTP = async (req, res) => {
  try {
    let { email, otp, name, password, tempUserId } = req.body;

    // Normalize
    email = email ? email.trim().toLowerCase() : '';
    name = name ? name.trim() : '';

    // Validate inputs
    if (!email || !otp || !name || !password || !tempUserId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp, 'REGISTRATION');

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    // Check again if email is already registered (race condition check)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.',
      });
    }

    // Password Hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate User ID
    const user_id = await generateUserId();

    console.log('👤 [REGISTRATION] Creating user...');

    // Create User
    const user = await User.create({
      user_id,
      role_id: 'ROLE001',
      role_name: 'Student',
      name,
      email,
      password: hashedPassword,
      cnic: `TEMP-${user_id}`,
      contact_no: '0000000000',
      gender: 'Not Specified',
      dob: new Date('2000-01-01'),
      address: 'Not Provided',
      status: 'Active',
      profile_photo_url: null, // ✅ Changed from 'default-avatar.png' to null
      twoFactorEnabled: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('✅ [REGISTRATION] User created with _id:', user._id);

    // ✅ CREATE CORRESPONDING STUDENT RECORD
    try {
      const student_id = await generateStudentId();
      
      console.log('🎓 [REGISTRATION] Creating student record...');
      
      const student = await Student.create({
        student_id: student_id,
        user_id: user._id, // ✅ Link to User's MongoDB _id
        grade: 10, // Default grade
        bio: '', // Empty bio initially
        board: 'Not Specified', // Default board
        personal_preferences: 'Not Specified', // Default preferences
        registration_date: new Date(),
        guardian_name: 'Not Provided', // Default guardian name
        guardian_contact_no: '0000000000', // Default guardian contact
      });

      console.log('✅ [REGISTRATION] Student record created:', student.student_id);

    } catch (studentError) {
      console.error('❌ [REGISTRATION] Error creating student record:', studentError);
      // If student creation fails, delete the user to maintain data consistency
      await User.findByIdAndDelete(user._id);
      throw new Error('Failed to create student record');
    }

    // Generate Token
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You can now sign in.',
      data: {
        user: {
          _id: user._id.toString(),
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role_name: user.role_name,
        },
        token,
      },
    });

  } catch (error) {
    console.error('❌ [REGISTRATION] OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification.',
      error: error.message
    });
  }
};

// ==================== LOGIN USER (WITH 2FA SUPPORT) ====================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [LOGIN] Login attempt for:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ [LOGIN] Password verified');
    console.log('🔐 [LOGIN] 2FA Enabled:', user.twoFactorEnabled);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      console.log('📧 [LOGIN] 2FA is enabled, sending OTP...');
      
      // Generate and send OTP for 2FA
      const otp = await createOTP(user._id, email, 'TWO_FACTOR_LOGIN');
      await sendOTPEmail(email, otp, 'TWO_FACTOR_LOGIN');

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message: 'OTP sent to your email for two-factor authentication',
        data: {
          email: email,
          userId: user._id
        }
      });
    }

    // If 2FA is not enabled, proceed with normal login
    console.log('✅ [LOGIN] 2FA not enabled, logging in directly');

    // Generate JWT token
    const token = generateToken(user);

    // Return user data (exclude password)
    const userData = {
      _id: user._id.toString(),
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role_name: user.role_name,
      profile_photo_url: user.profile_photo_url
    };

    res.status(200).json({
      success: true,
      requiresTwoFactor: false,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('❌ [LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// ==================== VERIFY 2FA OTP FOR LOGIN ====================
exports.verifyTwoFactorOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔐 [2FA LOGIN] Verifying 2FA OTP for:', email);

    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp, 'TWO_FACTOR_LOGIN');

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    console.log('✅ [2FA LOGIN] OTP verified successfully');

    // Find user
    const user = await User.findById(verification.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user data (exclude password)
    const userData = {
      _id: user._id.toString(),
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role_name: user.role_name,
      profile_photo_url: user.profile_photo_url
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('❌ [2FA LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA OTP',
      error: error.message
    });
  }
};

// ==================== TOGGLE TWO-FACTOR AUTHENTICATION ====================
exports.toggleTwoFactor = async (req, res) => {
  try {
    const { userId, enabled } = req.body;

    console.log('🔐 [TOGGLE 2FA] Request:', { userId, enabled });

    if (!userId || enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'User ID and enabled status are required'
      });
    }

    // Find user by MongoDB _id
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update twoFactorEnabled field
    user.twoFactorEnabled = enabled;
    user.updated_at = new Date();
    await user.save();

    console.log('✅ [TOGGLE 2FA] Updated successfully:', enabled);

    res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('❌ [TOGGLE 2FA] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling two-factor authentication',
      error: error.message
    });
  }
};

// ==================== FORGOT PASSWORD (NEW - WITH OTP) ====================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate and save OTP
    const otp = await createOTP(user._id, email, 'PASSWORD_RESET');

    // Send OTP via email
    await sendOTPEmail(email, otp, 'PASSWORD_RESET');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address. Valid for 60 seconds.',
      email: email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: error.message
    });
  }
};

// ==================== VERIFY RESET OTP ====================
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp, 'PASSWORD_RESET');

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      userId: verification.userId
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
};

// ==================== RESET PASSWORD (FIXED - NO OTP RE-VERIFICATION) ====================
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password strength
    if (newPassword.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 5 characters long'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    user.updated_at = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

// ==================== UPDATE PASSWORD ====================
exports.updatePassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required.' 
    });
  }

  if (password.length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 5 characters long.',
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found." 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.updated_at = new Date();
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Password updated successfully." 
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An internal error occurred." 
    });
  }
};

// ==================== GET CURRENT USER ====================
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        user: {
          _id: user._id,
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role_name: user.role_name,
          profile_photo_url: user.profile_photo_url,
          twoFactorEnabled: user.twoFactorEnabled || false,
        }
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
    });
  }
};

module.exports = {
  registerUser: exports.registerUser,
  verifyRegistrationOTP: exports.verifyRegistrationOTP,
  loginUser: exports.loginUser,
  verifyTwoFactorOTP: exports.verifyTwoFactorOTP,
  toggleTwoFactor: exports.toggleTwoFactor,
  forgotPassword: exports.forgotPassword,
  verifyResetOTP: exports.verifyResetOTP,
  resetPassword: exports.resetPassword,
  updatePassword: exports.updatePassword,
  getCurrentUser: exports.getCurrentUser
};