/**
 * Test Result Screen
 * Optimized: Uses SmartMathText with better LaTeX detection to avoid unnecessary WebViews.
 * Fixed: Replaced 'div' with 'View' and fixed layout height issues.
 * Author: Momna Butt (BCSF22M021)
 */

import React, { memo } from 'react';
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
import MathView from '../components/MathView';

// --- Optimized Components ---

const SmartMathText = memo(({ content, color, fontSize, style }) => {
  if (!content) return null;
  
  // Only use MathView if it contains actual LaTeX delimiters
  const hasLatex = /[\$]|\\\(|\\\[|\\begin\{/.test(content);
  
  if (!hasLatex) {
    // Handle Markdown bold **text** by splitting and styling
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return (
      <Text style={[{ color, fontSize }, style]}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={i} style={{ fontWeight: 'bold' }}>
                {part.replace(/\*\*/g, '')}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  }
  
  return <MathView content={content} color={color} fontSize={fontSize} />;
});

const ResultMCQCard = memo(({ q, index, userAnswer, theme }) => {
  const isCorrect = userAnswer?.toString().toLowerCase() === q.correct_option?.toString().toLowerCase();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.qHeader}>
        <Text style={[styles.qNumber, { color: theme.primary }]}>Question {index + 1}</Text>
        <Ionicons 
          name={isCorrect ? "checkmark-circle" : "close-circle"} 
          size={24} 
          color={isCorrect ? "#4CAF50" : theme.error} 
        />
      </View>
      
      <SmartMathText 
        content={q.question} 
        color={theme.text} 
        fontSize={16} 
      />
      
      <View style={styles.optionsContainer}>
        {Object.entries(q.options).map(([key, val]) => {
          const isCorrectOption = key.toLowerCase() === q.correct_option?.toLowerCase();
          const isUserSelection = key.toLowerCase() === userAnswer?.toLowerCase();

          let optionStyle = { borderColor: theme.inputBorder };
          let textColor = theme.text;

          if (isCorrectOption) {
            optionStyle = { borderColor: "#4CAF50", backgroundColor: "#4CAF5015" };
            textColor = "#2E7D32";
          } else if (isUserSelection && !isCorrect) {
            optionStyle = { borderColor: theme.error, backgroundColor: theme.error + '15' };
            textColor = theme.error;
          }

          return (
            <View key={key} style={[styles.option, optionStyle]}>
              <View style={{ flex: 1 }}>
                <SmartMathText 
                  content={`**${key.toUpperCase()}.** ${val}`} 
                  color={textColor} 
                  fontSize={15} 
                />
              </View>
              {isCorrectOption && <Ionicons name="checkmark" size={16} color="#4CAF50" style={{ marginLeft: 5 }} />}
              {isUserSelection && !isCorrect && <Ionicons name="close" size={16} color={theme.error} style={{ marginLeft: 5 }} />}
            </View>
          );
        })}
      </View>

      {!isCorrect && (
        <View style={[styles.explanation, { backgroundColor: theme.primary + '10' }]}>
          <SmartMathText 
            content={`**Correct Answer:** ${q.correct_option?.toUpperCase()}`} 
            color={theme.primary} 
            fontSize={14} 
          />
        </View>
      )}
    </View>
  );
});

export default function TestResultScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { test, userAnswers, score } = route.params;

  const renderShortQuestionsReview = () => {
    const sq = test.short_questions;
    if (!sq) return null;

    if (Array.isArray(sq)) {
      if (sq.length === 0) return null;
      return (
        <View style={styles.resultSection}>
          <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section B: Short Questions</Text>
          {sq.map((q, index) => (
            <View key={`sq-${index}`} style={[styles.card, { backgroundColor: theme.surface }]}>
              <SmartMathText 
                content={`**Q${index + 1}.** ${q.question}`} 
                color={theme.text} 
                fontSize={16} 
              />
              <View style={styles.marksFooter}>
                <Text style={[styles.marksLabel, { color: theme.textSecondary }]}>Standard Marks: 2</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

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
                <SmartMathText 
                  content={`**(${index + 1})** ${q.question}`} 
                  color={theme.text} 
                  fontSize={16} 
                />
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
      <View style={[styles.header, { borderBottomColor: theme.inputBorder, alignItems: 'center' }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Test Result</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} removeClippedSubviews={true}>
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

        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 22, textAlign: 'center', marginVertical: 10 }]}>Detailed Review</Text>
        
        {test.mcqs.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section A: MCQs</Text>
            {test.mcqs.map((q, index) => (
              <ResultMCQCard 
                key={q.question_number}
                q={q}
                index={index}
                userAnswer={userAnswers[q.question_number]}
                theme={theme}
              />
            ))}
          </View>
        )}

        {renderShortQuestionsReview()}

        {test.long_questions && test.long_questions.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Section C: Long Questions</Text>
            {test.long_questions.map((q, index) => (
              <View key={q.question_number} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.qNumber, { color: theme.primary, marginBottom: 10 }]}>Question {index + 1}</Text>
                
                <View style={styles.longPart}>
                  <SmartMathText 
                    content={`**(a)** ${q.part_a.question}`} 
                    color={theme.text} 
                    fontSize={15} 
                  />
                  <Text style={[styles.marksLabel, { color: theme.textSecondary, textAlign: 'right', marginTop: 5 }]}>[{q.part_a.marks} Marks]</Text>
                </View>

                <View style={[styles.longPart, { marginTop: 15 }]}>
                  <SmartMathText 
                    content={`**(b)** ${q.part_b.question}`} 
                    color={theme.text} 
                    fontSize={15} 
                  />
                  <Text style={[styles.marksLabel, { color: theme.textSecondary, textAlign: 'right', marginTop: 5 }]}>[{q.part_b.marks} Marks]</Text>
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
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  scoreCard: { padding: 30, borderRadius: 20, alignItems: 'center', marginBottom: 30 },
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
  optionsContainer: { gap: 8, marginTop: 10 },
  option: { padding: 12, borderWidth: 1, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  explanation: { marginTop: 15, padding: 10, borderRadius: 8 },
  marksFooter: { borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 10, paddingTop: 5 },
  marksLabel: { fontSize: 12, fontStyle: 'italic' },
  longPart: { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#F0F0F0' },
  exitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  exitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  groupTitleReview: { fontSize: 16, fontWeight: 'bold', padding: 8, borderRadius: 5, marginBottom: 10 },
});
