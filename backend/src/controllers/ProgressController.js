const Progress = require('../models/Progress');

const K = 20;

const CHAPTER_TOPIC_COUNTS = {
  "1": 13, "2": 13, "3": 10, "4": 13,
  "5": 8,  "6": 9,  "7": 5,  "8": 11, "9": 6,
};

function calcTopicProgress(mcqs_seen, mcqs_correct) {
  if (mcqs_seen === 0) return 0;
  const raw_score  = mcqs_correct / mcqs_seen;
  const confidence = mcqs_seen / (mcqs_seen + K);
  return raw_score * confidence * 100;
}

function getEffectiveStreak(doc) {
  if (!doc || !doc.last_updated) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = new Date(doc.last_updated);
  last.setHours(0, 0, 0, 0);

  const diff_days = Math.round((today - last) / (1000 * 60 * 60 * 24));

  if (diff_days <= 1) return doc.streak || 0;  // today or yesterday — streak intact
  return 0;                                     // missed a day — streak broken
}

async function updateProgress(user_id, mcqs) {
  try {
    let doc = await Progress.findOne({ user_id });
    if (!doc) doc = new Progress({ user_id, chapters: {}, streak: 0 });

    // ── Update topic counts from submitted MCQs ──────────────────
    for (const mcq of mcqs) {
      const { chapter_number, chapter_name, topic_number, topic_name, correct_option, student_answer } = mcq;
      if (!topic_number) continue;
      const ch_key  = String(chapter_number);
      const top_key = String(topic_number).replace(/\./g, '_');
      const is_correct = student_answer && student_answer.toLowerCase() === correct_option.toLowerCase();

      if (!doc.chapters.has(ch_key)) {
        doc.chapters.set(ch_key, {
          chapter_name, total_topics: CHAPTER_TOPIC_COUNTS[ch_key] || 0,
          progress: 0, mcqs_seen: 0, mcqs_correct: 0, topics: new Map(),
        });
      }
      const chapter = doc.chapters.get(ch_key);
      chapter.total_topics = CHAPTER_TOPIC_COUNTS[ch_key] || 0;

      if (!chapter.topics.has(top_key)) {
        chapter.topics.set(top_key, { topic_name: topic_name || top_key, mcqs_seen: 0, mcqs_correct: 0, progress: 0 });
      }
      const topic = chapter.topics.get(top_key);
      topic.mcqs_seen    += 1;
      topic.mcqs_correct += is_correct ? 1 : 0;
      topic.progress      = calcTopicProgress(topic.mcqs_seen, topic.mcqs_correct);
      chapter.topics.set(top_key, topic);
      doc.chapters.set(ch_key, chapter);
    }

    // ── Recalculate chapter and overall progress ─────────────────
    let total_seen = 0, total_correct = 0;
    for (const [ch_key, chapter] of doc.chapters) {
      let ch_seen = 0, ch_correct = 0, weighted_performance_sum = 0, weight_sum = 0;
      for (const [, topic] of chapter.topics) {
        ch_seen    += topic.mcqs_seen;
        ch_correct += topic.mcqs_correct;
        weighted_performance_sum += topic.progress * topic.mcqs_seen;
        weight_sum               += topic.mcqs_seen;
      }
      chapter.mcqs_seen    = ch_seen;
      chapter.mcqs_correct = ch_correct;
      const touched_topics = chapter.topics.size;
      const total_topics   = CHAPTER_TOPIC_COUNTS[ch_key] || touched_topics;
      const coverage       = total_topics > 0 ? touched_topics / total_topics : 0;
      const weighted_perf  = weight_sum > 0 ? weighted_performance_sum / weight_sum : 0;
      chapter.progress = weighted_perf * coverage;
      doc.chapters.set(ch_key, chapter);
      total_seen    += ch_seen;
      total_correct += ch_correct;
    }

    let overall_sum = 0, overall_weight = 0;
    for (const [, chapter] of doc.chapters) {
      overall_sum    += chapter.progress * chapter.mcqs_seen;
      overall_weight += chapter.mcqs_seen;
    }

    doc.total_mcqs_seen    = total_seen;
    doc.total_mcqs_correct = total_correct;
    doc.overall_progress   = overall_weight > 0 ? overall_sum / overall_weight : 0;

    // ── Streak calculation (before updating last_updated) ────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last = new Date(doc.last_updated);
    last.setHours(0, 0, 0, 0);

    const diff_days = Math.round((today - last) / (1000 * 60 * 60 * 24));

    if (diff_days === 0) {
      // Already submitted today — keep streak as is
    } else if (diff_days === 1) {
      // Submitted yesterday — continue streak
      doc.streak = (doc.streak || 0) + 1;
    } else {
      // Missed one or more days — reset to 1 (today counts)
      doc.streak = 1;
    }

    doc.last_updated = new Date();
    doc.markModified('chapters');
    await doc.save();

    console.log(`[PROGRESS UPDATED] user_id=${user_id} overall=${doc.overall_progress.toFixed(1)}% streak=${doc.streak}`);

  } catch (err) {
    console.error('[PROGRESS UPDATE ERROR]', err);
  }
}

async function getProgress(req, res) {
  try {
    const { user_id } = req.params;
    const doc = await Progress.findOne({ user_id });

    if (!doc) {
      return res.status(200).json({ success: true, message: 'No tests submitted yet.', data: null });
    }

    // Return effective streak — may differ from stored value if student missed a day
    const response = doc.toObject();
    response.streak = getEffectiveStreak(doc);

    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('[GET PROGRESS ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { updateProgress, getProgress, getEffectiveStreak };