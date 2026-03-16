/**
 * Test Result Screen
 * Displays the final score and detailed feedback for MCQs.
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Test Result</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: theme.primary, elevation: 5 }]}>
          <Ionicons name="trophy-outline" size={60} color="white" />
          <Text style={styles.scoreTitle}>Great Job!</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{score.correct} / {score.total}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Percentage</Text>
              <Text style={styles.scoreValue}>{score.percentage}%</Text>
            </View>
          </View>
        </View>

        {/* Detailed Feedback */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Detailed Review</Text>
        
        {test.mcqs.map((q) => {
          const userAnswer = userAnswers[q.question_number];
          // Robust case-insensitive comparison
          const isCorrect = userAnswer?.toString().toLowerCase() === q.correct_option?.toString().toLowerCase();

          return (
            <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.qHeader}>
                <Text style={[styles.qNumber, { color: theme.primary }]}>Question {q.question_number}</Text>
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
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
  exitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  exitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
