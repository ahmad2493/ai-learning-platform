/**
 * Test Model - Test Schema Definition
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines test data structure
 * - Links tests to courses and students
 * - Tracks test chapters, topics, and marks
 * - Stores test status and creation date
 */

const mongoose = require('mongoose');
const TestSchema = new mongoose.Schema(
    {
        test_id : {type: String, required: true, unique: true},
        course_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true},
        student_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true},
        test_date : {type: Date, required: true, default: Date.now},
        chapter_nums : {type: [Number], required: true},
        chapter_names : {type: [String], required: true},
        topic_nums : {type: [Number], required: true},
        topic_names : {type: [String], required: true},
        status : {type: String, required: true},
        total_marks : {type: Number, required: true},
        obtained_marks : {type: Number, required: true},
        created_at : {type: Date, required: true, default: Date.now},
        updated_at : {type: Date, required: true, default: Date.now}
    }
)
module.exports = mongoose.model('Test', TestSchema);