const Progress = require('../models/Progress');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const K = 20;
// Confidence threshold — higher K = harder to earn a high score.
// At 20 MCQs  → confidence = 20/(20+20) = 0.50
// At 40 MCQs  → confidence = 40/(40+20) = 0.67
// At 60 MCQs  → confidence = 60/(60+20) = 0.75
// At 100 MCQs → confidence = 100/(100+20) = 0.83

const CHAPTER_TOPIC_COUNTS = {
  "1": 13, "2": 13, "3": 10, "4": 13,
  "5": 8,  "6": 9,  "7": 5,  "8": 11, "9": 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — TOPIC SCORE
//
// topic_score = accuracy × confidence × 100
//
//   accuracy   = correct / seen
//   confidence = seen / (seen + K)
//
// Examples (K = 20):
//   1  MCQ,  1  correct → 1.00 × 0.05 × 100 =  4.8
//   4  MCQs, 4  correct → 1.00 × 0.17 × 100 = 16.7
//   10 MCQs, 10 correct → 1.00 × 0.33 × 100 = 33.3
//   20 MCQs, 20 correct → 1.00 × 0.50 × 100 = 50.0
//   40 MCQs, 40 correct → 1.00 × 0.67 × 100 = 66.7
//   60 MCQs, 60 correct → 1.00 × 0.75 × 100 = 75.0
//   20 MCQs, 16 correct → 0.80 × 0.50 × 100 = 40.0
// ─────────────────────────────────────────────────────────────────────────────

function calcTopicScore(mcqs_seen, mcqs_correct) {
  if (mcqs_seen === 0) return 0;
  const accuracy   = mcqs_correct / mcqs_seen;
  const confidence = mcqs_seen / (mcqs_seen + K);
  return accuracy * confidence * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — CHAPTER PERFORMANCE & PREPARATION
//
//   performance = avg of tested topic scores
//              → untested topics are ABSENT, not zero
//              → honest: what we know so far
//
//   preparation = performance × (tested_topics / total_topics)
//              → penalizes for untested topics
//              → can only equal performance when full chapter is covered
// ─────────────────────────────────────────────────────────────────────────────

function calcChapterScores(topics_map, chapter_key) {
  if (!topics_map || topics_map.size === 0) {
    return { performance: 0, preparation: 0 };
  }

  const total_topics  = CHAPTER_TOPIC_COUNTS[chapter_key] || topics_map.size;
  const tested_topics = topics_map.size;

  let topic_score_sum = 0;
  for (const [, topic] of topics_map) {
    topic_score_sum += topic.score;
  }

  const avg_topic_score = topic_score_sum / tested_topics;
  const coverage        = tested_topics / total_topics;

  return {
    performance: avg_topic_score,
    preparation: avg_topic_score * coverage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — OVERALL PERFORMANCE & PREPARATION
//
//   overall_performance = weighted avg of chapter performance scores
//                       → weight = mcqs_seen per chapter
//                       → untested chapters are ABSENT, not zero
//
//   overall_preparation = weighted avg of chapter preparation scores
//                       → weight = mcqs_seen per chapter
//                       → chapters with poor coverage pull this down
// ─────────────────────────────────────────────────────────────────────────────

function calcOverallScores(chapters_map) {
  let perf_weighted_sum = 0;
  let prep_weighted_sum = 0;
  let total_weight      = 0;

  for (const [, chapter] of chapters_map) {
    perf_weighted_sum += chapter.performance * chapter.mcqs_seen;
    prep_weighted_sum += chapter.preparation * chapter.mcqs_seen;
    total_weight      += chapter.mcqs_seen;
  }

  if (total_weight === 0) return { performance: 0, preparation: 0 };

  return {
    performance: perf_weighted_sum / total_weight,
    preparation: prep_weighted_sum / total_weight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK HELPER
// ─────────────────────────────────────────────────────────────────────────────

function getEffectiveStreak(doc) {
  if (!doc || !doc.last_updated) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = new Date(doc.last_updated);
  last.setHours(0, 0, 0, 0);

  const diff_days = Math.round((today - last) / (1000 * 60 * 60 * 24));

  if (diff_days <= 1) return doc.streak || 0;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

async function updateProgress(user_id, mcqs) {
  try {
    let doc = await Progress.findOne({ user_id });
    if (!doc) doc = new Progress({ user_id, chapters: {}, streak: 0 });

    // ── Step 1: Update raw topic counts from submitted MCQs ──────────────────

    for (const mcq of mcqs) {
      const {
        chapter_number, chapter_name,
        topic_number,   topic_name,
        correct_option, student_answer,
      } = mcq;

      if (!topic_number) continue;

      const ch_key     = String(chapter_number);
      const top_key    = String(topic_number).replace(/\./g, '_');
      const is_correct = student_answer &&
                         student_answer.toLowerCase() === correct_option.toLowerCase();

      // Init chapter if seen for the first time
      if (!doc.chapters.has(ch_key)) {
        doc.chapters.set(ch_key, {
          chapter_name,
          total_topics: CHAPTER_TOPIC_COUNTS[ch_key] || 0,
          performance:  0,
          preparation:  0,
          mcqs_seen:    0,
          mcqs_correct: 0,
          topics:       {},
        });
      }

      const chapter        = doc.chapters.get(ch_key);
      chapter.total_topics = CHAPTER_TOPIC_COUNTS[ch_key] || 0;

      // Init topic if seen for the first time
      if (!chapter.topics.has(top_key)) {
        chapter.topics.set(top_key, {
          topic_name:   topic_name || top_key,
          mcqs_seen:    0,
          mcqs_correct: 0,
          score:        0,
        });
      }

      const topic        = chapter.topics.get(top_key);
      topic.mcqs_seen    += 1;
      topic.mcqs_correct += is_correct ? 1 : 0;

      chapter.topics.set(top_key, topic);
      doc.chapters.set(ch_key, chapter);
    }

    // ── Step 2: Recalculate bottom-up: topic → chapter → overall ─────────────

    let total_seen    = 0;
    let total_correct = 0;

    for (const [ch_key, chapter] of doc.chapters) {
      let ch_seen    = 0;
      let ch_correct = 0;

      // Recalculate every topic score
      for (const [top_key, topic] of chapter.topics) {
        topic.score = calcTopicScore(topic.mcqs_seen, topic.mcqs_correct);
        chapter.topics.set(top_key, topic);

        ch_seen    += topic.mcqs_seen;
        ch_correct += topic.mcqs_correct;
      }

      chapter.mcqs_seen    = ch_seen;
      chapter.mcqs_correct = ch_correct;

      // Chapter scores flow from topic scores
      const { performance, preparation } = calcChapterScores(chapter.topics, ch_key);
      chapter.performance = performance;
      chapter.preparation = preparation;

      doc.chapters.set(ch_key, chapter);

      total_seen    += ch_seen;
      total_correct += ch_correct;
    }

    // Overall scores flow from chapter scores
    doc.total_mcqs_seen    = total_seen;
    doc.total_mcqs_correct = total_correct;

    const { performance, preparation } = calcOverallScores(doc.chapters);
    doc.overall_performance = performance;
    doc.overall_preparation = preparation;

    // ── Step 3: Streak ───────────────────────────────────────────────────────

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last = new Date(doc.last_updated);
    last.setHours(0, 0, 0, 0);

    const diff_days = Math.round((today - last) / (1000 * 60 * 60 * 24));

    if (diff_days === 0) {
      if ((doc.streak || 0) === 0) doc.streak = 1;
    } else if (diff_days === 1) {
      doc.streak = (doc.streak || 0) + 1;
    } else {
      doc.streak = 1;
    }

    doc.last_updated = new Date();
    doc.markModified('chapters');
    await doc.save();

    console.log(
      `[PROGRESS UPDATED] user_id=${user_id} ` +
      `performance=${doc.overall_performance.toFixed(1)}% ` +
      `preparation=${doc.overall_preparation.toFixed(1)}% ` +
      `streak=${doc.streak}`
    );

  } catch (err) {
    console.error('[PROGRESS UPDATE ERROR]', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

async function getProgress(req, res) {
  try {
    const { user_id } = req.params;
    const doc = await Progress.findOne({ user_id });

    if (!doc) {
      return res.status(200).json({
        success: true,
        message: 'No tests submitted yet.',
        data:    null,
      });
    }

    const response  = JSON.parse(JSON.stringify(doc));
    response.streak = getEffectiveStreak(doc);

    return res.status(200).json({ success: true, data: response });

  } catch (err) {
    console.error('[GET PROGRESS ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { updateProgress, getProgress, getEffectiveStreak };