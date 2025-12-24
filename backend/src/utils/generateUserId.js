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
