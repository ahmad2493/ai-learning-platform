/**
 * Test Model
 * Author: Muhammad Abubakar (BCSF22M006)
 *
 * Represents one generated physics test attempt by a student.
 * Multiple documents can exist per user (one per test attempt).
 *
 * Status flow:
 *   unattempted → attempted  (student submits within expires_at)
 *   unattempted → expired    (expires_at passes without submission)
 *
 * MCQs only are machine-marked on submission.
 * Short and long questions are written on paper — no digital marking.
 */

const mongoose = require('mongoose');

// ── Option schema (a/b/c/d) ──────────────────────────────────────────────────
const OptionsSchema = new mongoose.Schema(
  {
    a: { type: String, default: '' },
    b: { type: String, default: '' },
    c: { type: String, default: '' },
    d: { type: String, default: '' },
  },
  { _id: false }
);

// ── Single MCQ ───────────────────────────────────────────────────────────────
const MCQSchema = new mongoose.Schema(
  {
    question_number:  { type: Number, required: true },
    chapter_number:   { type: Number, required: true },
    chapter_name:     { type: String, required: true },
    topic_number:     { type: String, default: null },
    topic_name:       { type: String, default: null },
    question:         { type: String, required: true },
    options:          { type: OptionsSchema, required: true },
    correct_option:   { type: String, required: true },   // stored for auto-marking
    student_answer:   { type: String, default: null },    // filled on submission
  },
  { _id: false }
);

// ── Short question ───────────────────────────────────────────────────────────
const ShortQuestionSchema = new mongoose.Schema(
  {
    question_number: { type: Number, required: true },
    question:        { type: String, required: true },
  },
  { _id: false }
);

// ── Long question part (a or b) ──────────────────────────────────────────────
const LongPartSchema = new mongoose.Schema(
  {
    marks:          { type: Number, required: true },
    type:           { type: String, required: true },   // "theory" | "numerical"
    chapter_number: { type: Number, required: true },
    chapter_name:   { type: String, required: true },
    question:       { type: String, required: true },
  },
  { _id: false }
);

// ── Long question ────────────────────────────────────────────────────────────
const LongQuestionSchema = new mongoose.Schema(
  {
    question_number: { type: Number, required: true },
    part_a:          { type: LongPartSchema, required: true },
    part_b:          { type: LongPartSchema, required: true },
  },
  { _id: false }
);

// ── Selected chapter (for test_details) ─────────────────────────────────────
const SelectedChapterSchema = new mongoose.Schema(
  {
    chapter_number: { type: Number, required: true },
    chapter_name:   { type: String, required: true },
    selection_type: { type: String, required: true },   // "full"
  },
  { _id: false }
);

// ── Selected topic (for test_details) ───────────────────────────────────────
const SelectedTopicSchema = new mongoose.Schema(
  {
    chapter_number: { type: Number, required: true },
    chapter_name:   { type: String, required: true },
    topic_number:   { type: String, required: true },
    topic_name:     { type: String, required: true },
    selection_type: { type: String, required: true },   // "partial"
  },
  { _id: false }
);

// ── Test details ─────────────────────────────────────────────────────────────
const TestDetailsSchema = new mongoose.Schema(
  {
    mode:              { type: String, required: true },   // "board" | "custom"
    duration_minutes:  { type: Number, required: true },
    generated_at:      { type: String, required: true },
    expires_at:        { type: String, required: true },
    selected_chapters: { type: [SelectedChapterSchema], default: [] },
    selected_topics:   { type: [SelectedTopicSchema],   default: [] },
    mcq_count:         { type: Number, required: true },
    short_count:       { type: Number, required: true },
    long_count:        { type: Number, required: true },
  },
  { _id: false }
);

// ── Main Test schema ─────────────────────────────────────────────────────────
const TestSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['unattempted', 'attempted', 'expired'],
      default: 'unattempted',
    },

    submitted_at: {
      type: Date,
      default: null,
    },

    test_details: {
      type: TestDetailsSchema,
      required: true,
    },

    // short_questions can be an array (custom mode) or object with Q2/Q3/Q4 keys (board mode).
    // Mixed type handles both shapes without losing data.
    mcqs:            { type: [MCQSchema], default: [] },
    short_questions: { type: mongoose.Schema.Types.Mixed, default: [] },
    long_questions:  { type: [LongQuestionSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Test', TestSchema);