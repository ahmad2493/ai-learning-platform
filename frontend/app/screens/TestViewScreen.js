/**
 * Test View Screen - Interactive Test Interface
 * Fixed: Submit button logic to require all MCQs to be attempted.
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { AI_SUBMIT_TEST_URL } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';

export default function TestViewScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { userToken } = useAuth();
  
  const incomingData = route.params?.generatedTest || {};
  const finalData = incomingData.data || incomingData;

  const test = {
    _id: finalData._id || finalData.id || finalData.test_id || null,
    test_details: finalData.test_details || { 
        mode: "custom", 
        duration_minutes: 30, 
        expires_at: new Date(Date.now() + 30 * 60000).toISOString() 
    },
    mcqs: finalData.mcqs || [],
    short_questions: finalData.short_questions || [],
    long_questions: finalData.long_questions || []
  };

  const [userAnswers, setUserAnswers] = useState({}); 
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [finalScore, setFinalScore] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

  const isSubmittingRef = useRef(false);

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const hasMcqs = test.mcqs && test.mcqs.length > 0;
  const isReadMode = !hasMcqs;

  const calculateLocalScore = useCallback(() => {
    let correct = 0;
    test.mcqs.forEach(q => {
      const uAns = userAnswers[q.question_number]?.toString().toLowerCase();
      const cAns = q.correct_option?.toString().toLowerCase();
      if (uAns && uAns === cAns) correct++;
    });
    return {
      correct,
      total: test.mcqs.length,
      percentage: test.mcqs.length > 0 ? ((correct / test.mcqs.length) * 100).toFixed(1) : 0
    };
  }, [test.mcqs, userAnswers]);

  const handleSubmit = useCallback(async (isAutoExpiry = false) => {
    if (isSubmitted || loading || isReadMode || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      if (!test._id) {
        const localScore = calculateLocalScore();
        setFinalScore(localScore);
        setIsSubmitted(true);
        showAlert("Demo Mode", "This test wasn't saved. Results shown are local only.", "info");
        return;
      }

      const response = await fetch(`${AI_SUBMIT_TEST_URL}/${test._id}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${userToken}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ mcq_answers: userAnswers })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setFinalScore(result.score);
        setIsSubmitted(true);
        showAlert(
            isAutoExpiry ? "Auto-Submitted" : "Success", 
            isAutoExpiry ? "Time ended. Progress saved." : "Test submitted successfully!", 
            "success", 
            () => { navigation.navigate('TestResult', { test, userAnswers, score: result.score }); }
        );
      } else {
        showAlert("Submission Error", result.message || "Failed to save test.", "error");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      showAlert("Network Error", "Could not connect to server.", "error");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [isSubmitted, loading, isReadMode, test, userAnswers, userToken, calculateLocalScore, navigation]);

  const handleConfirmSubmit = () => {
    showAlert(
      "Confirm Submission",
      "Are you sure you want to submit your test? You won't be able to change your answers after this.",
      "confirm",
      () => handleSubmit(false)
    );
  };

  useEffect(() => {
    if (isSubmitted || isReadMode) return;
    const interval = setInterval(() => {
      const expiry = new Date(test.test_details.expires_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
      if (diff === 0 && !isSubmitted && !loading && !isSubmittingRef.current) {
        clearInterval(interval);
        handleSubmit(true); // Auto-submit on timer expiry
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [test.test_details.expires_at, isSubmitted, loading, isReadMode, handleSubmit]);

  const allAttempted = hasMcqs && test.mcqs.every(q => userAnswers[q.question_number] !== undefined);
  const canSubmit = hasMcqs && !isSubmitted && !loading && allAttempted;

  // Helper to render short questions regardless of structure (array or object)
  const renderShortQuestions = () => {
    const sq = test.short_questions;
    if (!sq) return null;

    // CASE 1: Flat Array (Custom Mode)
    if (Array.isArray(sq)) {
      if (sq.length === 0) return null;
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section B: Short Questions</Text>
          {sq.map((q, index) => (
            <View key={`sq-${index}`} style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.qText, { color: theme.text }]}>Q{index + 1}. {q.question}</Text>
              <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>[Marks: 2]</Text>
            </View>
          ))}
        </View>
      );
    }

    // CASE 2: Object with Q2, Q3, Q4 keys (Board Mode)
    const keys = Object.keys(sq).filter(k => Array.isArray(sq[k]) && sq[k].length > 0).sort();
    if (keys.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section B: Short Questions</Text>
        {keys.map((groupKey) => (
          <View key={groupKey} style={{ marginBottom: 20 }}>
            <Text style={[styles.groupTitle, { color: theme.text, backgroundColor: theme.primary + '10' }]}>
              {groupKey.replace('Q', 'Question ')}
            </Text>
            {sq[groupKey].map((q, index) => (
              <View key={`${groupKey}-${index}`} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qText, { color: theme.text }]}>({index + 1}) {q.question}</Text>
                <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>[Marks: 2]</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomAlert 
        visible={alertConfig.visible} 
        title={alertConfig.title} 
        message={alertConfig.message} 
        type={alertConfig.type} 
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })} 
        onConfirm={alertConfig.onConfirm} 
      />

      <View style={[styles.header, { borderBottomColor: theme.inputBorder, backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah Exam</Text>
          <View style={[styles.timerBadge, { backgroundColor: timeLeft <= 0 ? theme.error + '20' : theme.primary + '20' }]}>
            <Ionicons name="time-outline" size={18} color={timeLeft <= 0 ? theme.error : theme.primary} />
            <Text style={[styles.timerText, { color: timeLeft <= 0 ? theme.error : theme.primary }]}>
                {isSubmitted ? "DONE" : (timeLeft <= 0 ? "00:00" : `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.testTitle, { color: theme.text }]}>Physics - {test.test_details.mode?.toUpperCase()} TEST</Text>

        {isSubmitted && finalScore && (
          <View style={[styles.scoreCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
            <Text style={[styles.scoreTitle, { color: theme.primary }]}>Quick Result Summary</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: theme.text }]}>{finalScore.correct} / {finalScore.total}</Text>
                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Correct</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: theme.text }]}>{finalScore.percentage}%</Text>
                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Percentage</Text>
              </View>
            </View>
          </View>
        )}

        {/* MCQs Section */}
        {test.mcqs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section A: MCQs</Text>
            {test.mcqs.map((q, index) => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qText, { color: theme.text }]}>{index + 1}. {q.question}</Text>
                {Object.entries(q.options).map(([key, val]) => {
                  const isSelected = userAnswers[q.question_number] === key;
                  const isCorrect = q.correct_option?.toLowerCase() === key.toLowerCase();
                  
                  let optionStyle = { borderColor: theme.inputBorder };
                  if (isSubmitted) {
                    if (isCorrect) optionStyle = { borderColor: '#4CAF50', backgroundColor: '#4CAF5015' };
                    else if (isSelected) optionStyle = { borderColor: theme.error, backgroundColor: theme.error + '15' };
                  } else if (isSelected) {
                    optionStyle = { borderColor: theme.primary, backgroundColor: theme.primary + '10' };
                  }

                  return (
                    <TouchableOpacity key={key} onPress={() => !isSubmitted && setUserAnswers({...userAnswers, [q.question_number]: key})} disabled={isSubmitted} style={[styles.option, optionStyle]}>
                        <Text style={{ color: theme.text }}>{key.toUpperCase()}. {val}</Text>
                        {isSubmitted && isCorrect && <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Short Questions Section */}
        {renderShortQuestions()}

        {/* Long Questions Section */}
        {test.long_questions && test.long_questions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section C: Long Questions</Text>
            {test.long_questions.map((q, index) => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qText, { color: theme.text, marginBottom: 10 }]}>Q{test.test_details.mode === 'board' ? index + 5 : index + 1}.</Text>
                <View style={styles.longPart}>
                  <Text style={[styles.partText, { color: theme.text }]}> (a) {q.part_a.question}</Text>
                  <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>[Marks: {q.part_a.marks}]</Text>
                </View>
                <View style={[styles.longPart, { marginTop: 10 }]}>
                  <Text style={[styles.partText, { color: theme.text }]}> (b) {q.part_b.question}</Text>
                  <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>[Marks: {q.part_b.marks}]</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!isSubmitted && hasMcqs && (
          <TouchableOpacity 
            disabled={!canSubmit} 
            style={[styles.submitBtn, { backgroundColor: canSubmit ? theme.primary : theme.textSecondary }]} 
            onPress={handleConfirmSubmit}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Submit</Text>}
          </TouchableOpacity>
        )}

        {isReadMode && !isSubmitted && (
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        )}

        {isSubmitted && (
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('TestResult', { test, userAnswers, score: finalScore })}>
            <Text style={styles.btnText}>View Detailed Review</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, gap: 5 },
  timerText: { fontSize: 14, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  testTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 30 },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textDecorationLine: 'underline' },
  card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  qText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  option: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  longPart: { borderLeftWidth: 2, borderLeftColor: '#EEE', paddingLeft: 10 },
  partText: { fontSize: 15, flex: 1 },
  marksLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 4, textAlign: 'right' },
  submitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, minHeight: 60, justifyContent: 'center', marginBottom: 30 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  scoreCard: { padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  scoreTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-around' },
  scoreItem: { alignItems: 'center' },
  scoreLabel: { fontSize: 12 },
  scoreValue: { fontSize: 22, fontWeight: 'bold' },
  groupTitle: { fontSize: 16, fontWeight: 'bold', padding: 8, borderRadius: 5, marginBottom: 10 },
});
