const mongoose = require('mongoose');
const LearningOutcomesSchema = new mongoose.Schema(
    {
        clo_id : {type: String, required: true, unique: true},
        student_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true},
        course_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true},
        course_content_id : {type: mongoose.Schema.Types.ObjectId, ref: 'CourseContent', required: true},
        topic_review : {type: String, required: true},
        topic_progress : {type: Number, required: true},
        chapter_progress : {type: Number, required: true},
        chapter_review : {type: String, required: true},
        last_updated : {type: Date, required: true}
    }
)
module.exports = mongoose.model('LearningOutcomes', LearningOutcomesSchema);