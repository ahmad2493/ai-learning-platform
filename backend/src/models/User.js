const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
    {
        user_id: {type: String, required: true, unique: true},
        role_id: {type: String, required: true},
        role_name: {type: String, required: true},
        name: {type: String, required: true},
        cnic: {type: String, required: true, unique: true},
        email: {type: String, required: true, unique: true},
        contact_no: {type: String, required: true},
        password: {type: String, required: true},
        gender: {type: String, required: true},
        dob: {type: Date, required: true},
        address: {type: String, required: true},
        status: {type: String, required: true},
        profile_photo_url: {type: String, required: true},
        // Password reset fields
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date },
        // Google OAuth
        googleId: { type: String },
        twoFactorEnabled: { type: Boolean, default: false },
        created_at: {type: Date, required: true, default: Date.now},
        updated_at: {type: Date, required: true, default: Date.now}
    }
)
module.exports = mongoose.model('User', userSchema);
