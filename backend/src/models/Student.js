/**
 * Student Model - Student Schema Definition
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines student-specific data schema
 * - Links to base User model via user_id reference
 * - Stores academic information (grade, board)
 * - Manages guardian contact information
 * - Tracks registration date and preferences
 */

const mongoose = require('mongoose');
const Student= new mongoose.Schema(
    {
        student_id : {type: String, required: true, unique: true},
        user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        grade : {type: Number, required: true},
        bio:{type: String, default: ''},
        board : {type: String, required: true},
        personal_preferences : {type: String, required: true},
        registration_date : {type: Date, required: true, default: Date.now},
        guardian_name : {type: String, required: true},
        guardian_contact_no : {type: String, required: true}
    }
)
module.exports = mongoose.model('Student', Student);