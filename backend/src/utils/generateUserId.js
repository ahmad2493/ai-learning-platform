/**
 * User ID Generator - Unique ID Generation Utility
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Generates unique sequential user IDs (USR000001, USR000002, etc.)
 * - Uses MongoDB counter collection for atomic increments
 * - Ensures no duplicate user IDs across the system
 */

const Counter = require('../models/Counter');

const generateUserId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'user_id' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `USR${String(counter.value).padStart(6, '0')}`;
};

module.exports = generateUserId;
