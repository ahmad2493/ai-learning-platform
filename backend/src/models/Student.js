const mongoose = require('mongoose');
const Student= new mongoose.Schema(
    {
        student_id : {type: String, required: true, unique: true},
        user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        grade : {type: Number, required: true},
        board : {type: String, required: true},
        personal_preferences : {type: String, required: true},
        registration_date : {type: Date, required: true, default: Date.now},
        guardian_name : {type: String, required: true},
        guardian_contact_no : {type: String, required: true}
    }
)
module.exports = mongoose.model('Student', Student);