const mongoose = require("mongoose");

const TopicProgressSchema = new mongoose.Schema({
  topic_name:    { type: String, default: "" },
  mcqs_seen:     { type: Number, default: 0 },
  mcqs_correct:  { type: Number, default: 0 },
  progress:      { type: Number, default: 0 },
}, { _id: false });

const ChapterProgressSchema = new mongoose.Schema({
  chapter_name:  { type: String, default: "" },
  total_topics:  { type: Number, default: 0 },
  progress:      { type: Number, default: 0 },
  mcqs_seen:     { type: Number, default: 0 },
  mcqs_correct:  { type: Number, default: 0 },
  topics:        { type: Map, of: TopicProgressSchema, default: {} },
}, { _id: false });

const ProgressSchema = new mongoose.Schema({
  user_id:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  overall_progress:   { type: Number, default: 0 },
  total_mcqs_seen:    { type: Number, default: 0 },
  total_mcqs_correct: { type: Number, default: 0 },
  chapters:           { type: Map, of: ChapterProgressSchema, default: {} },
  last_updated:       { type: Date, default: Date.now },
});

module.exports = mongoose.model("Progress", ProgressSchema);
