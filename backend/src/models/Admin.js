/**
 * Admin Model - Administrator Schema
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines admin user schema
 * - Links to base User model via user_id reference
 * - Tracks admin creation timestamps
 */

const mongoose = require('mongoose');
const Admin = new mongoose.Schema(
    {
        admin_id : {type: String, required: true, unique: true},
        user_id : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        created_at : {type: Date, required: true, default: Date.now}
    }
)
module.exports = mongoose.model('Admin', Admin);