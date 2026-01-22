/**
 * Course Content Model - Course Material Schema
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines course content structure (chapters, topics)
 * - Links content to courses via course_id reference
 * - Organizes content by chapter and topic numbers
 * - Tracks content creation timestamps
 */

const mongoose = require('mongoose');
const CourseContentSchema = new mongoose.Schema(
    {
        course_content_id : {type: String, required: true, unique: true},
        course_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true},
        chapter_no : {type: Number, required: true},
        chapter_name : {type: String, required: true},
        topic_no : {type: Number, required: true},
        topic_names : {type: [String], required: true},
        created_at : {type: Date, required: true, default: Date.now}
    }
)

module.exports = mongoose.model('CourseContent', CourseContentSchema);