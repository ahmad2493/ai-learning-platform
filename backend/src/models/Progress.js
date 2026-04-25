const mongoose = require("mongoose");

const TopicProgressSchema = new mongoose.Schema({
  topic_name:   { type: String, default: "" },
  mcqs_seen:    { type: Number, default: 0 },
  mcqs_correct: { type: Number, default: 0 },
  score:        { type: Number, default: 0 },
  // score = accuracy × confidence × 100
  // accuracy   = correct / seen
  // confidence = seen / (seen + K)  where K = 20
}, { _id: false });

const ChapterProgressSchema = new mongoose.Schema({
  chapter_name:  { type: String, default: "" },
  total_topics:  { type: Number, default: 0 },
  mcqs_seen:     { type: Number, default: 0 },
  mcqs_correct:  { type: Number, default: 0 },
  performance:   { type: Number, default: 0 },
  // performance = avg of tested topic scores
  // "when tested, how well did the student do in this chapter?"
  // untested topics are absent — not zero
  preparation:   { type: Number, default: 0 },
  // preparation = performance × (tested_topics / total_topics)
  // "how ready is the student for this full chapter?"
  // penalizes for untested topics
  topics:        { type: Map, of: TopicProgressSchema, default: {} },
}, { _id: false });

const ProgressSchema = new mongoose.Schema({
  user_id:             { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  total_mcqs_seen:     { type: Number, default: 0 },
  total_mcqs_correct:  { type: Number, default: 0 },
  overall_performance: { type: Number, default: 0 },
  // overall_performance = weighted avg of chapter performance scores
  // "when tested across all chapters, how well is the student doing?"
  // untested chapters are absent — not zero
  overall_preparation: { type: Number, default: 0 },
  // overall_preparation = weighted avg of chapter preparation scores
  // "how ready is the student for the full exam?"
  // chapters with poor coverage pull this down
  streak:              { type: Number, default: 0 },
  chapters:            { type: Map, of: ChapterProgressSchema, default: {} },
  last_updated:        { type: Date, default: Date.now },
});

module.exports = mongoose.model("Progress", ProgressSchema);