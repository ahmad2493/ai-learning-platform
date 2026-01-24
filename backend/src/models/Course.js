/**
 * Course Model - Course Schema Definition
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines course data structure
 * - Stores course metadata (name, description, code)
 * - Links courses to classes and subjects
 * - Tracks course creation timestamps
 */

const mongoose = require('mongoose');
const CourseSchema = new mongoose.Schema(
    {
        course_id : {type: String, required: true, unique: true},
        class_name : {type: String, required: true},
        subject_name : {type: String, required: true},
        course_description : {type: String, required: true},
        course_code : {type: String, required: true},
        created_at : {type: Date, required: true, default: Date.now},
    }
)
module.exports = mongoose.model('Course', CourseSchema);