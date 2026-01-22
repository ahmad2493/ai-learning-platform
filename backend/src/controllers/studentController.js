/**
 * Student Controller - Student Management Operations
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Handles student profile management (name, email, password changes)
 * - Manages student course enrollments
 * - Processes student test submissions and results
 * - Retrieves student dashboard data
 * - Validates student operations and permissions
 */

// controllers/StudentController.js
const mongoose = require('mongoose'); // ✅ ADDED - Required for ObjectId validation
const Student = require('../models/Student');
const User = require('../models/User');
const bcrypt = require('bcrypt');

/* Helper to fetch student + user */
async function fetchStudentWithUser(studentId) {
  return Student.findById(studentId).populate('user_id');
}

/* ============================================
   CHANGE NAME
   ============================================ */
async function changeName(req, res) {
  try {
    let { first_name, last_name } = req.body;
    first_name = first_name ? first_name.trim() : '';
    last_name = last_name ? last_name.trim() : '';

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'Both first name and last name are required.', data: {} });
    }

    const nameRegex = /^[A-Za-z]+$/;
    if (!nameRegex.test(first_name) || !nameRegex.test(last_name)) {
      return res.status(400).json({ success: false, message: 'Names can only contain alphabetic characters (A-Z).', data: {} });
    }

    const student = await fetchStudentWithUser(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.', data: {} });

    const user = student.user_id;
    if (!user) return res.status(500).json({ success: false, message: 'Linked user missing.', data: {} });

    const formatName = (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const newFirstName = formatName(first_name);
    const newLastName = formatName(last_name);

    if (user.first_name === newFirstName && user.last_name === newLastName) {
      return res.status(400).json({ success: false, message: 'Current name is already like this.', data: {} });
    }

    user.first_name = newFirstName;
    user.last_name = newLastName;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({ success: true, message: 'Name updated successfully.', data: student });
  } catch (error) {
    console.error('Error updating name:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating name.', data: {} });
  }
}

/* ============================================
   CHANGE EMAIL
   ============================================ */
async function changeEmail(req, res) {
  try {
    let { email } = req.body;
    email = email ? email.trim() : '';
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.', data: {} });

    if (/\s/.test(email)) {
      return res.status(400).json({ success: false, message: 'Email cannot contain spaces.', data: {} });
    }

    const atMatches = email.match(/@/g) || [];
    if (atMatches.length !== 1) {
      return res.status(400).json({ success: false, message: "Email must contain exactly one '@' symbol.", data: {} });
    }

    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart) {
      return res.status(400).json({ success: false, message: 'Invalid email format.', data: {} });
    }

    if (!/^[A-Za-z0-9._-]+$/.test(localPart)) {
      return res.status(400).json({ success: false, message: "Local part can only contain letters, numbers, '.', '_', and '-'.", data: {} });
    }

    const domainLabels = domainPart.split('.');
    if (domainLabels.length < 2) {
      return res.status(400).json({ success: false, message: 'Domain must contain a valid TLD (e.g., .com, .pk).', data: {} });
    }

    const invalidDomain = domainLabels.some(label => !/^[A-Za-z0-9-]+$/.test(label));
    if (invalidDomain) {
      return res.status(400).json({ success: false, message: 'Domain labels can only contain letters, numbers, and hyphens.', data: {} });
    }

    const student = await fetchStudentWithUser(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.', data: {} });

    const user = student.user_id;
    if (!user) return res.status(500).json({ success: false, message: 'Linked user missing.', data: {} });

    // check uniqueness
    const existing = await User.findOne({ email: email });
    if (existing && existing._id.toString() !== user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Email already in use by another account.', data: {} });
    }

    if (user.email === email) {
      return res.status(400).json({ success: false, message: 'Current email is already like this.', data: {} });
    }

    user.email = email;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({ success: true, message: 'Email updated successfully.', data: student });
  } catch (error) {
    console.error('Error updating email:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating email.', data: {} });
  }
}

/* ============================================
   SET PASSWORD
   ============================================ */
async function setPassword(req, res) {
  try {
    let { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required.', data: {} });

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.', data: {} });
    }

    const student = await fetchStudentWithUser(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.', data: {} });

    const user = student.user_id;
    if (!user) return res.status(500).json({ success: false, message: 'Linked user missing.', data: {} });

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({ success: true, message: 'Password set successfully.', data: {} });
  } catch (error) {
    console.error('Error setting password:', error);
    return res.status(500).json({ success: false, message: 'Server error while setting password.', data: {} });
  }
}

/* ============================================
   VERIFY PASSWORD
   ============================================ */
async function verifyPassword(req, res) {
  try {
    const { current_password } = req.body;
    if (!current_password) return res.status(400).json({ success: false, message: 'Current password is required.', data: {} });

    const student = await fetchStudentWithUser(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.', data: {} });

    const user = student.user_id;
    if (!user) return res.status(500).json({ success: false, message: 'Linked user missing.', data: {} });

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.', data: {} });
    }

    return res.status(200).json({ success: true, message: 'Password verified successfully.', data: {} });
  } catch (error) {
    console.error('Error verifying password:', error);
    return res.status(500).json({ success: false, message: 'Server error while verifying password.', data: {} });
  }
}

/* ============================================
   CHANGE PASSWORD
   ============================================ */
async function changePassword(req, res) {
  try {
    console.log("🔐 [CHANGE PASSWORD] Request parameters:", req.params);
    const { id } = req.params; // id is MongoDB ObjectId
    const { current_password, new_password, confirm_password } = req.body;

    console.log("🔐 [CHANGE PASSWORD] Entering changePassword...");

    // 1️⃣ Validate input
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
        data: {},
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
        data: {},
      });
    }

    if (new_password.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 5 characters long.',
        data: {},
      });
    }

    // 2️⃣ Find user by MongoDB _id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', data: {} });
    }

    console.log("✅ [CHANGE PASSWORD] User found:", user.email);

    // 3️⃣ Verify current password
    const isCorrect = await bcrypt.compare(current_password, user.password);
    if (!isCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
        data: {},
      });
    }

    console.log("✅ [CHANGE PASSWORD] Current password verified");

    // 4️⃣ Prevent reuse of old password
    const isSame = await bcrypt.compare(new_password, user.password);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be same as old password.',
        data: {},
      });
    }

    // 5️⃣ Hash new password and update
    const hashedPassword = await bcrypt.hash(new_password, 12);
    console.log("🔐 [CHANGE PASSWORD] Password hashed successfully");

    user.password = hashedPassword;
    user.updated_at = new Date();
    await user.save();

    console.log("✅ [CHANGE PASSWORD] Password changed successfully");

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      data: {},
    });

  } catch (error) {
    console.error('❌ [CHANGE PASSWORD] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while changing password.',
      data: {},
    });
  }
}

module.exports = {
  changeName,
  changeEmail,
  setPassword,
  verifyPassword,
  changePassword
};