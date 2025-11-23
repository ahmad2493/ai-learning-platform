const mongoose = require('mongoose');
const TestQuestionBankSchema = new mongoose.Schema(
    {
        question_bank_id : {type: String, required: true, unique: true},
        test_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true},
        question_text : {type: String, required: true},
        options: {type: [String], required: true},
        correct_answer : {type: String, required: true},
        student_answer : {type: String, required: true},
        is_correct : {type: Boolean, required: true},
        explanation : {type: String, required: true},
        marks : {type: Number, required: true},
        created_at : {type: Date, required: true, default: Date.now},
        updated_at : {type: Date, required: true, default: Date.now}
    }
)
module.exports = mongoose.model('TestQuestionBank', TestQuestionBankSchema);