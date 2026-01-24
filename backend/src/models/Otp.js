/**
 * OTP Model - One-Time Password Schema
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Stores OTP codes for password reset and verification
 * - Tracks OTP expiration and usage status
 * - Links OTPs to users via user_id
 * - Supports different OTP types (password reset, registration)
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.Mixed,  // Supports both ObjectId and string
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
        enum: ['REGISTRATION', 'PASSWORD_RESET', 'TWO_FACTOR_LOGIN'], // ✅ ADDED TWO_FACTOR_LOGIN
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