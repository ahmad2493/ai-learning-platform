/**
 * Test Result Screen
 * Displays the final score and detailed feedback for MCQs, Short, and Long questions.
 * Updated: Fixed short questions display for Board mode (object structure).
 * Author: Momna Butt (BCSF22M021)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

export default function TestResultScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { test, userAnswers, score } = route.params;

  // Helper to render short questions regardless of structure (array or object)
  const renderShortQuestionsReview = () => {
    const sq = test.short_questions;
    if (!sq) return null;

    // CASE 1: Flat Array (Custom Mode)
    if (Array.isArray(sq)) {
      if (sq.length === 0) return null;
      return (
        <View style={styles.resultSection}>
          <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section B: Short Questions</Text>
          {sq.map((q, index) => (
            <View key={`sq-${index}`} style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.qNumber, { color: theme.primary, marginBottom: 5 }]}>Question {index + 1}</Text>
              <Text style={[styles.qText, { color: theme.text }]}>{q.question}</Text>
              <View style={styles.marksFooter}>
                <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>Standard Marks: 2</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // CASE 2: Object with Q2, Q3, Q4 keys (Board Mode)
    const keys = Object.keys(sq).filter(k => Array.isArray(sq[k]) && sq[k].length > 0).sort();
    if (keys.length === 0) return null;

    return (
      <View style={styles.resultSection}>
        <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section B: Short Questions</Text>
        {keys.map((groupKey) => (
          <View key={groupKey} style={{ marginBottom: 20 }}>
            <Text style={[styles.groupTitleReview, { color: theme.text, backgroundColor: theme.primary + '10' }]}>
              {groupKey.replace('Q', 'Question ')}
            </Text>
            {sq[groupKey].map((q, index) => (
              <View key={`${groupKey}-${index}`} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qNumber, { color: theme.primary, marginBottom: 5 }]}>({index + 1})</Text>
                <Text style={[styles.qText, { color: theme.text }]}>{q.question}</Text>
                <View style={styles.marksFooter}>
                  <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>Standard Marks: 2</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Test Result</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: theme.primary, elevation: 5 }]}>
          <Ionicons name="trophy-outline" size={60} color="white" />
          <Text style={styles.scoreTitle}>Test Summary</Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>MCQ Score</Text>
              <Text style={styles.scoreValue}>{score.correct} / {score.total}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Percentage</Text>
              <Text style={styles.scoreValue}>{score.percentage}%</Text>
            </View>
          </View>
        </View>

        {/* Detailed Feedback Header */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 22, textAlign: 'center', marginVertical: 10 }]}>Detailed Review</Text>
        
        {/* Section A: MCQs */}
        {test.mcqs.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section A: MCQs</Text>
            {test.mcqs.map((q, index) => {
              const userAnswer = userAnswers[q.question_number];
              const isCorrect = userAnswer?.toString().toLowerCase() === q.correct_option?.toString().toLowerCase();

              return (
                <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                  <View style={styles.qHeader}>
                    <Text style={[styles.qNumber, { color: theme.primary }]}>Question {index + 1}</Text>
                    <Ionicons 
                      name={isCorrect ? "checkmark-circle" : "close-circle"} 
                      size={24} 
                      color={isCorrect ? "#4CAF50" : theme.error} 
                    />
                  </View>
                  
                  <Text style={[styles.qText, { color: theme.text }]}>{q.question}</Text>
                  
                  <View style={styles.optionsContainer}>
                    {Object.entries(q.options).map(([key, val]) => {
                      const isCorrectOption = key.toLowerCase() === q.correct_option?.toLowerCase();
                      const isUserSelection = key.toLowerCase() === userAnswer?.toLowerCase();

                      let optionStyle = { borderColor: theme.inputBorder };
                      let textStyle = { color: theme.text };

                      if (isCorrectOption) {
                        optionStyle = { borderColor: "#4CAF50", backgroundColor: "#4CAF5015" };
                        textStyle = { color: "#2E7D32", fontWeight: 'bold' };
                      } else if (isUserSelection && !isCorrect) {
                        optionStyle = { borderColor: theme.error, backgroundColor: theme.error + '15' };
                        textStyle = { color: theme.error, fontWeight: 'bold' };
                      }

                      return (
                        <View key={key} style={[styles.option, optionStyle]}>
                          <Text style={textStyle}>{key.toUpperCase()}. {val}</Text>
                          {isCorrectOption && <Ionicons name="checkmark" size={16} color="#4CAF50" />}
                          {isUserSelection && !isCorrect && <Ionicons name="close" size={16} color={theme.error} />}
                        </View>
                      );
                    })}
                  </View>

                  {!isCorrect && (
                    <View style={[styles.explanation, { backgroundColor: theme.primary + '10' }]}>
                      <Text style={[styles.explanationText, { color: theme.primary }]}>
                        <Text style={{ fontWeight: 'bold' }}>Correct Answer:</Text> {q.correct_option?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Section B: Short Questions */}
        {renderShortQuestionsReview()}

        {/* Section C: Long Questions */}
        {test.long_questions && test.long_questions.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section C: Long Questions</Text>
            {test.long_questions.map((q, index) => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qNumber, { color: theme.primary, marginBottom: 10 }]}>Question {index + 1}</Text>
                
                <View style={styles.longPart}>
                  <Text style={[styles.partText, { color: theme.text }]}>(a) {q.part_a.question}</Text>
                  <Text style={[styles.marksLabel, { color: theme.textSecondary, textAlign: 'right' }]}>[{q.part_a.marks} Marks]</Text>
                </View>

                <View style={[styles.longPart, { marginTop: 15 }]}>
                  <Text style={[styles.partText, { color: theme.text }]}>(b) {q.part_b.question}</Text>
                  <Text style={[styles.marksLabel, { color: theme.textSecondary, textAlign: 'right' }]}>[{q.part_b.marks} Marks]</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.exitBtn, { backgroundColor: theme.primary }]} 
          onPress={() => navigation.navigate('StudentDashboard')}
        >
          <Text style={styles.exitBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  scoreCard: { 
    padding: 30, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginBottom: 30 
  },
  scoreTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginVertical: 15 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  scoreItem: { alignItems: 'center', paddingHorizontal: 20 },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 5 },
  scoreValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  resultSection: { marginBottom: 30 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 20 },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textDecorationLine: 'underline' },
  card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  qNumber: { fontSize: 14, fontWeight: 'bold' },
  qText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  optionsContainer: { gap: 8 },
  option: { 
    padding: 12, 
    borderWidth: 1, 
    borderRadius: 8, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  explanation: { marginTop: 15, padding: 10, borderRadius: 8 },
  explanationText: { fontSize: 14 },
  marksFooter: { borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 10, paddingTop: 5 },
  marksLabel: { fontSize: 12, fontStyle: 'italic' },
  longPart: { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#F0F0F0' },
  partText: { fontSize: 15, lineHeight: 22 },
  exitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  exitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  groupTitleReview: { fontSize: 16, fontWeight: 'bold', padding: 8, borderRadius: 5, marginBottom: 10 },
});
