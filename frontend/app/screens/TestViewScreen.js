/**
 * Test View Screen - Interactive Test Interface
 * Integrated with Team API Response Format & Strict Validation
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

export default function TestViewScreen({ navigation, route }) {
  const { theme } = useTheme();
  
  // REAL API DATA (from route) or TEMPORARY TESTING DATA (if teammate is offline)
  const test = route.params?.generatedTest || {
    test_details: {
      mode: "custom",
      duration_minutes: 30, // Testing: 30 minutes
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(), // Mock expiry
    },
    mcqs: [
      { 
        question_number: 1, 
        question: "Is this a test question?", 
        options: { a: "Yes", b: "No", c: "Maybe", d: "Not sure" }, 
        correct_option: "a" 
      }
    ],
    short_questions: [],
    long_questions: []
  };

  const [userAnswers, setUserAnswers] = useState({}); // { question_number: "a" }
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds

  // 1. BACKGROUND-SAFE TIMER LOGIC
  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = new Date(test.test_details.expires_at).getTime();
      const now = new Date().getTime();
      const difference = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(difference);

      if (difference === 0 && !isSubmitted) {
        // Auto-submit if time expires
        handleSubmit();
      }
    };

    calculateTimeLeft(); // Initial calculation
    const timerId = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timerId);
  }, [test.test_details.expires_at, isSubmitted]);

  // 2. NAVIGATION BLOCKING
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmitted || timeLeft <= 0) return;

      e.preventDefault();
      Alert.alert(
        'Discard Test?',
        'Progress will be lost if you leave now.',
        [
          { text: "Stay", style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isSubmitted, timeLeft]);

  // 3. VALIDATION CHECKS
  const isTimeOver = timeLeft <= 0;
  const hasMcqs = test.mcqs?.length > 0;
  const allAttempted = test.mcqs.every(q => userAnswers[q.question_number] !== undefined);
  
  // Submit is enabled ONLY if: mcqs exist AND all are answered AND time remains
  const canSubmit = hasMcqs && allAttempted && !isTimeOver && !isSubmitted;

  const handleSelectOption = (qNum, optionKey) => {
    if (isSubmitted || isTimeOver) return;
    setUserAnswers(prev => ({ ...prev, [qNum]: optionKey }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    Alert.alert("Test Completed", "Your responses have been recorded.");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sticky Timer Header */}
      <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah Exam</Text>
          <View style={[styles.timerBadge, { backgroundColor: isTimeOver ? theme.error + '20' : theme.primary + '20' }]}>
            <Ionicons name="time-outline" size={18} color={isTimeOver ? theme.error : theme.primary} />
            <Text style={[styles.timerText, { color: isTimeOver ? theme.error : theme.primary }]}>
              {isTimeOver ? "00:00" : formatTime(timeLeft)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.testTitle, { color: theme.text }]}>Physics - {test.test_details.mode.toUpperCase()} TEST</Text>

        {/* MCQs Section */}
        {hasMcqs && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Section I: MCQs</Text>
            {test.mcqs.map((q) => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qText, { color: theme.text }]}>{q.question_number}. {q.question}</Text>
                {Object.entries(q.options).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleSelectOption(q.question_number, key)}
                    disabled={isSubmitted || isTimeOver}
                    style={[
                      styles.option,
                      { borderColor: theme.inputBorder },
                      userAnswers[q.question_number] === key && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                    ]}
                  >
                    <Text style={{ color: theme.text }}>{key.toUpperCase()}. {val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Subjective Sections */}
        {test.short_questions?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Section II: Short Questions</Text>
            {test.short_questions.map(q => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.text }}>{q.question_number}. {q.question}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SUBMIT BUTTON LOGIC */}
        {hasMcqs && !isSubmitted && (
          <TouchableOpacity 
            disabled={!canSubmit}
            style={[styles.submitBtn, { backgroundColor: canSubmit ? theme.primary : theme.textSecondary }]} 
            onPress={handleSubmit}
          >
            <Text style={styles.btnText}>
              {allAttempted ? "Finish & Submit" : "Complete all MCQs to Submit"}
            </Text>
          </TouchableOpacity>
        )}

        {isSubmitted && (
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('StudentDashboard')}>
            <Text style={styles.btnText}>Exit Exam</Text>
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
  timerText: { fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  testTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  qText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  option: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  submitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
