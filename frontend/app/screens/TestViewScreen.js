/**
 * Test View Screen - Interactive Test Interface
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  
  const test = route.params?.generatedTest || {
    test_id: null,
    test_details: { mode: "custom", duration_minutes: 30, expires_at: new Date(Date.now() + 30 * 60000).toISOString() },
    mcqs: [], short_questions: [], long_questions: []
  };

  const [userAnswers, setUserAnswers] = useState({}); 
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [finalScore, setFinalScore] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  // Check if there are any MCQs
  const hasMcqs = test.mcqs && test.mcqs.length > 0;
  // If no MCQs, it's essentially a "Read Mode" test
  const isReadMode = !hasMcqs;

  // Function to calculate local score (needed for expiry and demo)
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

  const handleSubmit = async (isAutoExpiry = false) => {
    if (isSubmitted || loading || isReadMode) return;

    // If auto-expired and nothing was attempted, don't hit the server to save performance
    const score = calculateLocalScore();
    const attemptedCount = Object.keys(userAnswers).length;

    if (isAutoExpiry && attemptedCount === 0) {
        setFinalScore(score);
        setIsSubmitted(true);
        showAlert("Time's Up!", "The test duration ended. Since no questions were attempted, it won't affect your performance.", "info");
        return;
    }

    if (!test.test_id) {
      setFinalScore(score);
      setIsSubmitted(true);
      showAlert("Test Completed", "Marking complete. Check your results!", "success", () => {
        navigation.navigate('TestResult', { test, userAnswers, score });
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AI_SUBMIT_TEST_URL}/${test.test_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({ mcq_answers: userAnswers })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setFinalScore(result.score);
        setIsSubmitted(true);
        if (!isAutoExpiry) {
            showAlert("Success", "Test submitted successfully!", "success", () => {
                navigation.navigate('TestResult', { test, userAnswers, score: result.score });
            });
        } else {
            showAlert("Time's Up!", "Test auto-submitted due to time limit.", "error");
        }
      } else {
        showAlert("Submission Failed", result.message || "Failed to submit.", "error");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      showAlert("Network Error", "Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 1. TIMER LOGIC
  useEffect(() => {
    if (isSubmitted || isReadMode) return;

    const calculateTimeLeft = () => {
      const expiry = new Date(test.test_details.expires_at).getTime();
      const now = new Date().getTime();
      const difference = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(difference);

      if (difference === 0 && !isSubmitted && !loading) {
        handleSubmit(true);
      }
    };

    calculateTimeLeft();
    const timerId = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, [test.test_details.expires_at, isSubmitted, loading, isReadMode, handleSubmit]);

  // 2. NAVIGATION BLOCKING
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmitted || isReadMode || (hasMcqs && timeLeft <= 0)) return;
      e.preventDefault();
      showAlert('Discard Test?', 'Progress will be lost if you leave now.', 'confirm', () => navigation.dispatch(e.data.action));
    });
    return unsubscribe;
  }, [navigation, isSubmitted, timeLeft, isReadMode, hasMcqs]);

  const allAttempted = hasMcqs && test.mcqs.every(q => userAnswers[q.question_number] !== undefined);
  const canSubmit = hasMcqs && allAttempted && timeLeft > 0 && !isSubmitted && !loading;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to check if Short Questions exist
  const hasShortQs = test.short_questions && (
    Array.isArray(test.short_questions) ? test.short_questions.length > 0 : Object.keys(test.short_questions).length > 0
  );

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
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah Exam</Text>
          
          {!isReadMode ? (
            <View style={[styles.timerBadge, { backgroundColor: timeLeft <= 0 ? theme.error + '20' : theme.primary + '20' }]}>
                <Ionicons name="time-outline" size={18} color={timeLeft <= 0 ? theme.error : theme.primary} />
                <Text style={[styles.timerText, { color: timeLeft <= 0 ? theme.error : theme.primary }]}>
                {isSubmitted ? "FINISHED" : (timeLeft <= 0 ? "00:00" : formatTime(timeLeft))}
                </Text>
            </View>
          ) : (
            <View style={[styles.readModeBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>READ ONLY</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.testTitle, { color: theme.text }]}>Physics - {test.test_details.mode?.toUpperCase()} TEST</Text>

        {isSubmitted && finalScore && hasMcqs && (
          <View style={[styles.scoreCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
            <Text style={[styles.scoreTitle, { color: theme.primary }]}>Quick Result Summary</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Correct</Text>
                <Text style={[styles.scoreValue, { color: theme.text }]}>{finalScore.correct} / {finalScore.total}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Percentage</Text>
                <Text style={[styles.scoreValue, { color: theme.text }]}>{finalScore.percentage}%</Text>
              </View>
            </View>
          </View>
        )}

        {hasMcqs && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Section I: MCQs (1 Mark Each)</Text>
            {test.mcqs.map((q) => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qText, { color: theme.text }]}>{q.question_number}. {q.question}</Text>
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
                    <TouchableOpacity key={key} onPress={() => !isSubmitted && timeLeft > 0 && setUserAnswers({...userAnswers, [q.question_number]: key})} disabled={isSubmitted || timeLeft <= 0} style={[styles.option, optionStyle]}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={{ color: theme.text }}>{key.toUpperCase()}. {val}</Text>
                        {isSubmitted && isCorrect && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />}
                        {isSubmitted && isSelected && !isCorrect && <Ionicons name="close-circle" size={18} color={theme.error} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {hasShortQs && (
          <View style={styles.section}>
             <Text style={[styles.sectionTitle, { color: theme.primary }]}>Section II: Short Questions</Text>
             {Array.isArray(test.short_questions) ? test.short_questions.map(q => (
               <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}><Text style={{ color: theme.text }}>{q.question_number}. {q.question}</Text></View>
             )) : Object.keys(test.short_questions).map(key => (
               <View key={key} style={{marginBottom: 10}}>
                 <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>Q {key.replace('Q','')}</Text>
                 {test.short_questions[key].map(q => (
                   <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}><Text style={{ color: theme.text }}>({q.question_number}) {q.question}</Text></View>
                 ))}
               </View>
             ))}
          </View>
        )}

        {test.long_questions?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Section III: Long Questions</Text>
            {test.long_questions.map(q => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qText, { color: theme.text }]}>Question {q.question_number}</Text>
                <Text style={{ color: theme.textSecondary }}>(a) {q.part_a.question}</Text>
                <Text style={{ color: theme.textSecondary, marginTop: 5 }}>(b) {q.part_b.question}</Text>
              </View>
            ))}
          </View>
        )}

        {!isReadMode && !isSubmitted && (
          <TouchableOpacity disabled={!canSubmit} style={[styles.submitBtn, { backgroundColor: canSubmit ? theme.primary : theme.textSecondary }]} onPress={() => handleSubmit(false)}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>{allAttempted ? "Finish & Submit" : "Complete all MCQs to Submit"}</Text>}
          </TouchableOpacity>
        )}

        {(isSubmitted || isReadMode) && (
          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: theme.primary }]} 
            onPress={() => isReadMode ? navigation.goBack() : navigation.navigate('TestResult', { test, userAnswers, score: finalScore })}
          >
            <Text style={styles.btnText}>{isReadMode ? "Back to History" : "View Detailed Review"}</Text>
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
  timerBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15, gap: 5 },
  readModeBadge: { padding: 8, paddingHorizontal: 12, borderRadius: 15 },
  timerText: { fontSize: 13, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  testTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  subSectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  qText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  option: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  submitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, minHeight: 60, justifyContent: 'center', marginBottom: 30 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  scoreCard: { padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  scoreTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-around' },
  scoreItem: { alignItems: 'center' },
  scoreLabel: { fontSize: 12, marginBottom: 5 },
  scoreValue: { fontSize: 20, fontWeight: 'bold' },
});
