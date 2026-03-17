/**
 * Test View Screen - Interactive Test Interface
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
  
  const test = route.params?.generatedTest || {
    _id: null,
    test_details: { mode: "custom", duration_minutes: 30, expires_at: new Date(Date.now() + 30 * 60000).toISOString() },
    mcqs: [], short_questions: [], long_questions: []
  };

  const [userAnswers, setUserAnswers] = useState({}); 
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [finalScore, setFinalScore] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  // Use a ref to track submission state to avoid closure issues in setInterval
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

    const mcqCount = test.mcqs.length;
    const attemptedCount = Object.keys(userAnswers).length;
    const isAllAttempted = mcqCount > 0 && attemptedCount === mcqCount;

    // Unify submission logic for both Scenario A and Scenario B
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const score = calculateLocalScore();
      
      if (!test._id) {
        // Handle Demo/Guest mode
        setFinalScore(score);
        setIsSubmitted(true);
        showAlert("Success", "Test submitted successfully (Demo Mode).", "success");
        return;
      }

      // Submit to backend in both scenarios
      const response = await fetch(`${AI_SUBMIT_TEST_URL}/${test._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({ mcq_answers: userAnswers })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setFinalScore(result.score);
        setIsSubmitted(true);

        // Scenario B: Incomplete & Late
        if (isAutoExpiry && !isAllAttempted) {
            showAlert(
                "Test Expired", 
                "Time ended before you could complete all questions.",
                "error", 
                () => { navigation.goBack(); }
            );
        } 
        // Scenario A: Complete & Late (or Manual Submit)
        else {
            showAlert(
                isAutoExpiry ? "Auto-Submitted" : "Success", 
                isAutoExpiry ? "All questions were completed and auto-submitted upon time expiry." : "Test submitted successfully!", 
                "success", 
                () => { navigation.navigate('TestResult', { test, userAnswers, score: result.score }); }
            );
        }
      } else {
        // If server says it expired (status: 'expired' returned from backend)
        if (result.status === 'expired') {
            setIsSubmitted(true);
            showAlert("Expired", result.message || "Test time has expired.", "error", () => navigation.goBack());
        } else {
            showAlert("Error", result.message || "Failed to submit.", "error");
        }
      }
    } catch (error) {
      console.error("Submit Error:", error);
      showAlert("Network Error", "Could not connect to server.", "error");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [isSubmitted, loading, isReadMode, test, userAnswers, userToken, calculateLocalScore, navigation]);

  // TIMER LOGIC
  useEffect(() => {
    if (isSubmitted || isReadMode) return;

    const interval = setInterval(() => {
      const expiry = new Date(test.test_details.expires_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      
      setTimeLeft(diff);

      if (diff === 0 && !isSubmitted && !loading && !isSubmittingRef.current) {
        clearInterval(interval);
        handleSubmit(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [test.test_details.expires_at, isSubmitted, loading, isReadMode, handleSubmit]);

  // Navigation Blocking
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmitted || isReadMode || timeLeft <= 0) return;
      e.preventDefault();
      showAlert('Exit Test?', 'Your progress will be lost but the timer will continue. You can return later if time remains.', 'confirm', () => navigation.dispatch(e.data.action));
    });
    return unsubscribe;
  }, [navigation, isSubmitted, timeLeft, isReadMode]);

  const allAttempted = hasMcqs && test.mcqs.every(q => userAnswers[q.question_number] !== undefined);
  const canSubmit = hasMcqs && allAttempted && timeLeft > 0 && !isSubmitted && !loading;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

        {/* Short & Long Questions (Static View) */}
        {!isSubmitted && (
          <TouchableOpacity disabled={!canSubmit} style={[styles.submitBtn, { backgroundColor: canSubmit ? theme.primary : theme.textSecondary }]} onPress={() => handleSubmit(false)}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>{allAttempted ? "Finish & Submit" : "Complete all MCQs to Submit"}</Text>}
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
  timerBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15, gap: 5 },
  readModeBadge: { padding: 8, paddingHorizontal: 12, borderRadius: 15 },
  timerText: { fontSize: 13, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  testTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
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
