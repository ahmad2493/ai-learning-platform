const Progress = require('./src/models/Progress');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-learning-platform').then(async () => {
  try {
    const result = await Progress.updateMany({}, { $set: { overall_progress: 0 } });
    console.log('Fixed:', result.modifiedCount, 'documents');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
});
