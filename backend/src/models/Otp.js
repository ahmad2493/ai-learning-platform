// const mongoose = require('mongoose');

// const otpSchema = new mongoose.Schema({
//     user_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     email: {
//         type: String,
//         required: true
//     },
//     otp: {
//         type: String,
//         required: true
//     },
//     otp_type: {
//         type: String,
//         enum: ['REGISTRATION', 'PASSWORD_RESET'],
//         required: true
//     },
//     is_used: {
//         type: Boolean,
//         default: false
//     },
//     expires_at: {
//         type: Date,
//         required: true
//     },
//     created_at: {
//         type: Date,
//         default: Date.now
//     }
// });

// // Auto-delete expired OTPs after 60 seconds
// otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// module.exports = mongoose.model('Otp', otpSchema);

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.Mixed,  // ✅ CHANGED from ObjectId to Mixed
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    otp_type: {
        type: String,
        enum: ['REGISTRATION', 'PASSWORD_RESET'],
        required: true
    },
    is_used: {
        type: Boolean,
        default: false
    },
    expires_at: {
        type: Date,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Auto-delete expired OTPs immediately after expiry
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);