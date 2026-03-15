/**
 * Chat Model - Mongoose schema for chat sessions
 * Author: Momina (BCSF22M021)
 */
const mongoose = require('mongoose');

// Schema for figures/images returned by the AI
const figureSchema = new mongoose.Schema({
  figure_number: String,
  caption: String,
  urls: [String]
});

// A schema for a single message within a chat
const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  figures: [figureSchema], // ADDED: to store images from AI
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// A schema for an entire chat session
const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  messages: [messageSchema], // An array of messages
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// update the 'updatedAt' field before saving
chatSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
