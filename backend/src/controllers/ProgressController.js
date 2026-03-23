const Progress = require('../models/Progress');

const K = 20;

const CHAPTER_TOPIC_COUNTS = {
  "1": 13, "2": 13, "3": 10, "4": 13,
  "5": 8,  "6": 9,  "7": 5,  "8": 11, "9": 6,
};

function calcTopicProgress(mcqs_seen, mcqs_correct) {
  if (mcqs_seen === 0) return 0;
  const accuracy    = mcqs_correct / mcqs_seen;
  const data_weight = mcqs_seen / (mcqs_seen + K);
  return accuracy * accuracy * data_weight * 100;
}

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
        chapter.topics.set(top_key, {
          topic_name: topic_name || top_key,
          mcqs_seen: 0, mcqs_correct: 0, progress: 0,
        });
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
      let ch_seen = 0, ch_correct = 0;

      for (const [, topic] of chapter.topics) {
        ch_seen    += topic.mcqs_seen;
        ch_correct += topic.mcqs_correct;
      }

      chapter.mcqs_seen    = ch_seen;
      chapter.mcqs_correct = ch_correct;

      // Step 1 — accuracy of touched topics squared
      const touched_accuracy = ch_seen > 0 ? ch_correct / ch_seen : 0;

      // Step 2 — coverage penalty
      const touched_topics = chapter.topics.size;
      const total_topics   = CHAPTER_TOPIC_COUNTS[ch_key] || touched_topics;
      const coverage       = total_topics > 0 ? touched_topics / total_topics : 0;

      // Step 3 — reliability factor
      const MIN_RELIABLE = 10;
      let reliable_weight = 0;
      let total_weight    = 0;
      for (const [, topic] of chapter.topics) {
        const reliability = Math.min(topic.mcqs_seen / MIN_RELIABLE, 1);
        reliable_weight  += reliability * topic.mcqs_seen;
        total_weight     += topic.mcqs_seen;
      }
      const reliability_factor = total_weight > 0 ? reliable_weight / total_weight : 0;

      chapter.progress = touched_accuracy * touched_accuracy * coverage * reliability_factor * 100;
      doc.chapters.set(ch_key, chapter);

      total_seen    += ch_seen;
      total_correct += ch_correct;
    }

    // ── Overall progress ─────────────────────────────────────────
    let overall_sum = 0, overall_weight = 0;
    for (const [, chapter] of doc.chapters) {
      overall_sum    += chapter.progress * chapter.mcqs_seen;
      overall_weight += chapter.mcqs_seen;
    }

    doc.total_mcqs_seen    = total_seen;
    doc.total_mcqs_correct = total_correct;
    doc.overall_progress   = overall_weight > 0 ? overall_sum / overall_weight : 0;

    // ── Streak calculation ────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last = new Date(doc.last_updated);
    last.setHours(0, 0, 0, 0);

    const diff_days = Math.round((today - last) / (1000 * 60 * 60 * 24));

    if (diff_days === 0) {
      // already submitted today — keep streak
      if ((doc.streak || 0) === 0) {
        doc.streak = 1;
      }
    } else if (diff_days === 1) {
      // submitted yesterday — continue streak
      doc.streak = (doc.streak || 0) + 1;
    } else {
      // missed a day — reset to 1
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

    const response = JSON.parse(JSON.stringify(doc));
    response.streak = getEffectiveStreak(doc);

    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('[GET PROGRESS ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { updateProgress, getProgress, getEffectiveStreak };