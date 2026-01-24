/**
 * Admin Controller - Administrative Operations
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Manages student accounts and profiles
 * - Handles course creation and management
 * - Processes admin-level operations
 * - Retrieves and updates student information
 * - Validates admin permissions
 */

// controllers/AdminController.js
const Student = require('../models/Student');
const User = require('../models/User');

/**
 * Get All Students (with user info)
 */

async function getAllStudents(req, res) {
  try {
    const students = await Student.find()
      .populate({
        path: 'user_id',
        select: 'user_id first_name last_name email contact_no status role_id role_name updated_at'
      });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found.',
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully.',
      data: students
    });
  } catch (error) {
    console.error('🔥 Error fetching students:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching students.',
      data: {}
    });
  }
}

/**
 * Suspend student (set user.status = 'inactive')
 */
async function suspendStudent(req, res) {
  try {
    const student = await Student.findById(req.params.id).populate('user_id');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.', data: {} });
    }

    const user = student.user_id;
    if (!user) {
      return res.status(500).json({ success: false, message: 'Linked user not found.', data: {} });
    }

    if (user.status === 'inactive') {
      return res.status(400).json({ success: false, message: 'Student is already inactive.', data: {} });
    }

    user.status = 'inactive';
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Student suspended successfully.',
      data: { student }
    });
  } catch (error) {
    console.error('🔥 Error suspending student:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while suspending student.',
      data: {}
    });
  }
}

/**
 * Activate student (set user.status = 'active')
 */
async function activateStudent(req, res) {
  try {
    const student = await Student.findById(req.params.id).populate('user_id');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.', data: {} });
    }

    const user = student.user_id;
    if (!user) {
      return res.status(500).json({ success: false, message: 'Linked user not found.', data: {} });
    }

    if (user.status === 'active') {
      return res.status(400).json({ success: false, message: 'Student is already active.', data: {} });
    }

    user.status = 'active';
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Student activated successfully.',
      data: { student }
    });
  } catch (error) {
    console.error('🔥 Error activating student:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while activating student.',
      data: {}
    });
  }
}

module.exports = {
  getAllStudents,
  suspendStudent,
  activateStudent
};
