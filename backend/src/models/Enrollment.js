const mongoose = require('mongoose');
const EnrollmentSchema = new mongoose.Schema(
    {
        enrollment_id : {type: String, required: true, unique: true},
        course_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true},
        student_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true},
        status : {type: String, required: true},
        grade : {type: Number, required: true},
        enrollment_date : {type: Date, required: true},
        remarks : {type: String, required: true},
        created_at : {type: Date, required: true, default: Date.now},
        updated_at : {type: Date, required: true, default: Date.now}
    }
)
module.exports = mongoose.model('Enrollment', EnrollmentSchema);