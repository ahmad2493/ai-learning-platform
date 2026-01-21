const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
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
      message: 'OTP sent to your email. Valid for 30 seconds.',
      data: {
        email: email,
        tempUserId: tempUserId, // Send this back to complete registration later
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
      profile_photo_url: 'default-avatar.png',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Generate Token
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You can now sign in.',
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role_name: user.role_name,
        },
        token,
      },
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification.',
      error: error.message
    });
  }
};

// ==================== LOGIN USER ====================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Generate JWT token
    const token = generateToken(user);

    // Return user data (exclude password)
    const userData = {
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
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
      message: 'OTP sent to your email address. Valid for 30 seconds.',
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

// ==================== RESET PASSWORD (NEW - WITH OTP) ====================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!email || !otp || !newPassword || !confirmPassword) {
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
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Verify OTP again for security
    const verification = await verifyOTP(email, otp, 'PASSWORD_RESET');

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find user
    const user = await User.findById(verification.userId);

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
      data: { user },
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
  forgotPassword: exports.forgotPassword,
  verifyResetOTP: exports.verifyResetOTP,
  resetPassword: exports.resetPassword,
  updatePassword: exports.updatePassword,
  getCurrentUser: exports.getCurrentUser
};