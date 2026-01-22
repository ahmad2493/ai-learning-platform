/**
 * Counter Model - Sequential ID Counter Schema
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Maintains atomic counters for generating unique IDs
 * - Used for sequential user ID generation (USR000001, etc.)
 * - Ensures thread-safe ID increments
 */

// models/Counter.js
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', counterSchema);
