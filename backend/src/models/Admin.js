const mongoose = require('mongoose');
const Admin = new mongoose.Schema(
    {
        admin_id : {type: String, required: true, unique: true},
        user_id : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        created_at : {type: Date, required: true, default: Date.now}
    }
)
module.exports = mongoose.model('Admin', Admin);