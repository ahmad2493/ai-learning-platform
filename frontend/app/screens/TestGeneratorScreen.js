/**
 * Test Generator Screen - Refactored Multi-step Flow with Custom Alerts
 * Integrated with Real Test History & Single Test View API
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useReducer, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { AI_GENERATE_TEST_URL, AI_TEST_HISTORY_URL, AI_SUBMIT_TEST_URL } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import Sidebar from './SidebarComponent';
import CustomAlert from '../components/CustomAlert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

const SUBJECTS = [
  { id: '1', name: 'Physics', icon: 'flash' },
  { id: '2', name: 'Chemistry', icon: 'flask' },
  { id: '3', name: 'Mathematics', icon: 'calculator' },
  { id: '4', name: 'Biology', icon: 'leaf' },
];

const CONTENT_DATA = {
  '1': [
      {
        id: 'c1',
        title: 'Chapter 1: Physical Quantities and Measurements',
        topics: [
          { id: 't1.1', title: '1.1 Physical and Non-Physical Quantities' },
          { id: 't1.2', title: '1.2 Base and Derived Physical Quantities' },
          { id: 't1.3', title: '1.3 International System of Units' },
          { id: 't1.4', title: '1.4 Scientific Notation' },
          { id: 't1.5', title: '1.5 Length Measuring Instruments' },
          { id: 't1.6', title: '1.6 Mass Measuring Instruments' },
          { id: 't1.7', title: '1.7 Time Measuring Instruments' },
          { id: 't1.8', title: '1.8 Volume Measuring Instruments' },
          { id: 't1.9', title: '1.9 Errors in Measurements' },
          { id: 't1.10', title: '1.10 Uncertainty in Measurement' },
          { id: 't1.11', title: '1.11 Significant Figures' },
          { id: 't1.12', title: '1.12 Precision and Accuracy' },
          { id: 't1.13', title: '1.13 Rounding off the digits' },
        ]
      },
      {
        id: 'c2',
        title: 'Chapter 2: Kinematics',
        topics: [
          { id: 't2.1', title: '2.1 Scalars and Vectors' },
          { id: 't2.2', title: '2.2 Rest and Motion' },
          { id: 't2.3', title: '2.3 Types of Motion' },
          { id: 't2.4', title: '2.4 Distance and Displacement' },
          { id: 't2.5', title: '2.5 Speed and Velocity' },
          { id: 't2.6', title: '2.6 Acceleration' },
          { id: 't2.7', title: '2.7 Graphical Analysis of Motion' },
          { id: 't2.8', title: '2.8 Gradient of Distance-Time Graph' },
          { id: 't2.9', title: '2.9 Speed-Time Graph' },
          { id: 't2.10', title: '2.10 Gradient of Speed-Time Graph' },
          { id: 't2.11', title: '2.11 Area under Speed-Time Graph' },
          { id: 't2.12', title: '2.12 Solving Problems for Motion Under Gravity' },
          { id: 't2.13', title: '2.13 Free Fall Acceleration' },
        ]
      },
      {
        id: 'c3',
        title: 'Chapter 3: Dynamics',
        topics: [
          { id: 't3.1', title: '3.1 Concept of Force' },
          { id: 't3.2', title: '3.2 Fundamental Forces' },
          { id: 't3.3', title: '3.3 Forces in a Free-Body Diagram' },
          { id: 't3.4', title: '3.4 Newton’s Law of Motion' },
          { id: 't3.5', title: '3.5 Limitations of Newton’s Law of Motion' },
          { id: 't3.6', title: '3.6 Mass and Weight' },
          { id: 't3.7', title: '3.7 Mechanical and Electronic Balances' },
          { id: 't3.8', title: '3.8 Friction' },
          { id: 't3.9', title: '3.9 Momentum and Impulse' },
          { id: 't3.10', title: '3.10 Principle of Conservation of Momentum' },
        ]
      },
      {
        id: 'c4',
        title: 'Chapter 4: Turning Effect of Force',
        topics: [
          { id: 't4.1', title: '4.1 Like and Unlike Parallel Forces' },
          { id: 't4.2', title: '4.2 Addition of Forces' },
          { id: 't4.3', title: '4.3 Turning Effect of Force' },
          { id: 't4.4', title: '4.4 Resolution of Vectors' },
          { id: 't4.5', title: '4.5 Determination of a Force from its Perpendicular components' },
          { id: 't4.6', title: '4.6 Principle of Moments' },
          { id: 't4.7', title: '4.7 Centre of Gravity and Centre of Mass' },
          { id: 't4.8', title: '4.8 Equilibrium' },
          { id: 't4.9', title: '4.9 Conditions of Equilibrium' },
          { id: 't4.10', title: '4.10 States of Equilibrium' },
          { id: 't4.11', title: '4.11 Improvement of Stability' },
          { id: 't4.12', title: '4.12 Application of Stability in Real Life' },
          { id: 't4.13', title: '4.13 Centripetal Force' },
        ]
      },
      {
        id: 'c5',
        title: 'Chapter 5: Work, Energy and Power',
        topics: [
          { id: 't5.1', title: '5.1 Work' },
          { id: 't5.2', title: '5.2 Energy' },
          { id: 't5.3', title: '5.3 Conservation of Energy' },
          { id: 't5.4', title: '5.4 Sources of Energy' },
          { id: 't5.5', title: '5.5 Renewable and Non-Renewable Sources' },
          { id: 't5.6', title: '5.6 The Advantages and Disadvantages of Methods of Energy Production' },
          { id: 't5.7', title: '5.7 Power' },
          { id: 't5.8', title: '5.8 Efficiency' },
        ]
      },
      {
        id: 'c6',
        title: 'Chapter 6: Mechanical Properties of Matter',
        topics: [
          { id: 't6.1', title: '6.1 Deformation of Solids' },
          { id: 't6.2', title: '6.2 Hooke’s Law' },
          { id: 't6.3', title: '6.3 Density' },
          { id: 't6.4', title: '6.4 Pressure' },
          { id: 't6.5', title: '6.5 Pressure in Liquids' },
          { id: 't6.6', title: '6.6 Atmospheric Pressure' },
          { id: 't6.7', title: '6.7 Measurement of Atmospheric Pressure' },
          { id: 't6.8', title: '6.8 Measurement of Pressure by Manometer' },
          { id: 't6.9', title: '6.9 Pascal’s Law' },
        ]
      },
      {
        id: 'c7',
        title: 'Chapter 7: Thermal Properties of Matter',
        topics: [
          { id: 't7.1', title: '7.1 Kinetic Molecular Theory of Matter' },
          { id: 't7.2', title: '7.2 Temperature and Heat' },
          { id: 't7.3', title: '7.3 Thermometers' },
          { id: 't7.4', title: '7.4 Sensitivity, Range and Linearity of Thermometers' },
          { id: 't7.5', title: '7.5 Structure of Liquid in Glass Thermometer' },
        ]
      },
      {
        id: 'c8',
        title: 'Chapter 8: Magnetism',
        topics: [
          { id: 't8.1', title: '8.1 Magnetic Materials' },
          { id: 't8.2', title: '8.2 Properties of Magnets' },
          { id: 't8.3', title: '8.3 Induced Magnetism' },
          { id: 't8.4', title: '8.4 Temporary and Permanent Magnets' },
          { id: 't8.5', title: '8.5 Magnetic Fields' },
          { id: 't8.6', title: '8.6 Uses of Permanent Magnets' },
          { id: 't8.7', title: '8.7 Electromagnets' },
          { id: 't8.8', title: '8.8 Domain Theory of Magnetism' },
          { id: 't8.9', title: '8.9 Magnetisation and Demagnetisation' },
          { id: 't8.10', title: '8.10 Applications of Magnets in Recording Technology' },
          { id: 't8.11', title: '8.11 Soft Iron as Magnetic Shield' },
        ]
      },
      {
        id: 'c9',
        title: 'Chapter 9: Nature of Science',
        topics: [
          { id: 't9.1', title: '9.1 Scope of Physics' },
          { id: 't9.2', title: '9.2 Branches of Physics' },
          { id: 't9.3', title: '9.3 Interdisciplinary Nature of Physics' },
          { id: 't9.4', title: '9.4 Interdisciplinary Research' },
          { id: 't9.5', title: '9.5 Scientific Method' },
          { id: 't9.6', title: '9.6 Scientific Base of Technologies and Engineering' },
        ]
      }
  ],
};

const initialState = {
  step: 0,
  selectedSubject: null,
  selectedContent: {},
  pattern: null,
  customConfig: {
    mcqs: { selected: false, quantity: 10 },
    short: { selected: false, quantity: 5 },
    long: { selected: false, quantity: 2 },
  },
  loading: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.payload };
    case 'SELECT_SUBJECT': return { ...state, selectedSubject: action.payload, step: 1 };
    case 'TOGGLE_TOPIC': {
      const { chapterId, topicId } = action.payload;
      const currentTopics = state.selectedContent[chapterId] || [];
      const newTopics = currentTopics.includes(topicId) ? currentTopics.filter(id => id !== topicId) : [...currentTopics, topicId];
      return { ...state, selectedContent: { ...state.selectedContent, [chapterId]: newTopics } };
    }
    case 'TOGGLE_CHAPTER': {
      const { chapterId, allTopicIds } = action.payload;
      const isSelected = state.selectedContent[chapterId]?.length === allTopicIds.length;
      return { ...state, selectedContent: { ...state.selectedContent, [chapterId]: isSelected ? [] : [...allTopicIds] } };
    }
    case 'SET_PATTERN': return { ...state, pattern: action.payload };
    case 'UPDATE_CUSTOM_CONFIG': {
      const { key, payload } = action;
      let { quantity, selected } = payload;
      
      const currentConfig = state.customConfig[key];
      const nextSelected = selected !== undefined ? selected : currentConfig.selected;
      let nextQty = quantity !== undefined ? quantity : currentConfig.quantity;

      if (selected === true && nextQty === 0) nextQty = 1;

      if (key === 'mcqs' || key === 'short') {
        nextQty = Math.max(0, Math.min(20, nextQty));
      } else if (key === 'long') {
        nextQty = Math.max(0, Math.min(4, nextQty));
      }

      return {
        ...state,
        customConfig: {
          ...state.customConfig,
          [key]: { ...currentConfig, selected: nextSelected, quantity: nextQty }
        }
      };
    }
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'RESET': return initialState;
    default: return state;
  }
}

const Checkbox = ({ selected, onPress, label, theme }) => (
  <TouchableOpacity style={styles.checkboxRow} onPress={onPress}>
    <Ionicons name={selected ? "checkbox" : "square-outline"} size={22} color={theme.primary} />
    {label && <Text style={[styles.checkboxLabel, { color: theme.text }]}>{label}</Text>}
  </TouchableOpacity>
);

const ChapterItem = ({ chapter, state, dispatch, theme }) => {
  const [expanded, setExpanded] = useState(false);
  const selectedTopics = state.selectedContent[chapter.id] || [];
  const isAllSelected = selectedTopics.length === chapter.topics.length;
  return (
    <View style={styles.chapterContainer}>
      <View style={styles.chapterHeader}>
        <Checkbox selected={isAllSelected} onPress={() => dispatch({ type: 'TOGGLE_CHAPTER', payload: { chapterId: chapter.id, allTopicIds: chapter.topics.map(t => t.id) } })} theme={theme} />
        <TouchableOpacity style={{ flex: 1, marginLeft: 10 }} onPress={() => setExpanded(!expanded)}>
          <Text style={[styles.chapterTitle, { color: theme.text }]}>{chapter.title}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} /></TouchableOpacity>
      </View>
      {expanded && (
        <View style={styles.topicsList}>
          {chapter.topics.map(topic => (
            <View key={topic.id} style={styles.topicRow}>
              <Checkbox selected={selectedTopics.includes(topic.id)} onPress={() => dispatch({ type: 'TOGGLE_TOPIC', payload: { chapterId: chapter.id, topicId: topic.id } })} label={topic.title} theme={theme} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default function TestGeneratorScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, userToken } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'error' });

  const fetchHistory = useCallback(async () => {
    const userId = user?._id || user?.userId || user?.id;
    if (!userId) return;
    try {
      const response = await fetch(`${AI_TEST_HISTORY_URL}/${userId}`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      const result = await response.json();
      if (response.ok && result.success) setHistory(result.data);
    } catch (error) { console.error("❌ [HISTORY] Error:", error); }
    finally { setHistoryLoading(false); setRefreshing(false); }
  }, [user, userToken]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const showAlert = (title, message, type = 'error', onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const navigateWithDemo = () => {
    setAlertConfig({ ...alertConfig, visible: false });
    const demoData = {
      test_details: { mode: "custom", duration_minutes: 30, expires_at: new Date(Date.now() + 30 * 60000).toISOString() },
      mcqs: [
        { question_number: 1, question: "Which is a base quantity?", options: { a: "Velocity", b: "Length", c: "Force", d: "Area" }, correct_option: "b" },
        { question_number: 2, question: "The study of motion without considering its cause is:", options: { a: "Dynamics", b: "Kinematics", c: "Statics", d: "Mechanics" }, correct_option: "b" },
      ],
      short_questions: [{ question_number: 3, question: "Define scientific notation with an example." }],
      long_questions: [{ question_number: 4, part_a: { marks: 4, question: "Describe characteristics of gravitational force." }, part_b: { marks: 5, question: "A body weighs 20N. Find its mass." } }]
    };
    navigation.navigate('TestViewScreen', { generatedTest: demoData });
    dispatch({ type: 'RESET' });
    slideAnim.setValue(0);
  };

  const handleViewTest = async (testId, currentStatus, expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const isExpiredLocally = currentStatus === 'unattempted' && now > expires;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${AI_SUBMIT_TEST_URL}/${testId}`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      const result = await response.json();
      if (response.ok && result.success) {
        const fullTest = result.data;
        if (fullTest.status === 'attempted' || isExpiredLocally || fullTest.status === 'expired') {
          const userAnswers = {};
          let correct = 0;
          fullTest.mcqs.forEach(q => {
            if (q.student_answer) userAnswers[q.question_number] = q.student_answer;
            if (q.student_answer?.toLowerCase() === q.correct_option?.toLowerCase()) correct++;
          });
          const score = { 
            correct, 
            total: fullTest.mcqs.length, 
            percentage: fullTest.mcqs.length > 0 ? ((correct / fullTest.mcqs.length) * 100).toFixed(1) : 0 
          };
          navigation.navigate('TestResult', { test: fullTest, userAnswers, score });
        } else {
          navigation.navigate('TestViewScreen', { generatedTest: fullTest });
        }
      } else { showAlert("Error", "Failed to fetch test details."); }
    } catch (error) { showAlert("Error", "Network error."); }
    finally { dispatch({ type: 'SET_LOADING', payload: false }); }
  };

  const handleGenerateTest = async () => {
    if (state.loading) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const full_chapters = [];
      const topic_selections = [];
      Object.keys(state.selectedContent).forEach(chId => {
        const selectedTopicIds = state.selectedContent[chId];
        const chapterData = CONTENT_DATA['1']?.find(c => c.id === chId);
        if (chapterData) {
          if (selectedTopicIds.length === chapterData.topics.length) {
            full_chapters.push(parseInt(chId.replace('c', '')));
          } else {
            selectedTopicIds.forEach(tId => {
              const topicData = chapterData.topics.find(t => t.id === tId);
              if (topicData) {
                topic_selections.push({
                  chapter: parseInt(chId.replace('c', '')),
                  topic_number: topicData.title.split(' ')[0],
                  topic_name: topicData.title.split(' ').slice(1).join(' '),
                  chapter_name: chapterData.title.split(': ')[1]
                });
              }
            });
          }
        }
      });
      const payload = {
        mode: state.pattern,
        mcq_count: state.pattern === 'board' ? 0 : (state.customConfig.mcqs.selected ? state.customConfig.mcqs.quantity : 0),
        short_count: state.pattern === 'board' ? 0 : (state.customConfig.short.selected ? state.customConfig.short.quantity : 0),
        long_count: state.pattern === 'board' ? 0 : (state.customConfig.long.selected ? state.customConfig.long.quantity : 0),
        full_chapters: full_chapters,
        topic_selections: topic_selections
      };
      const response = await fetch(AI_GENERATE_TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        navigation.navigate('TestViewScreen', { generatedTest: result });
        dispatch({ type: 'RESET' });
        slideAnim.setValue(0);
        fetchHistory();
      } else { showAlert("Generation Failed", result.error || "AI service error.", "confirm", navigateWithDemo); }
    } catch (error) { showAlert("Connection Error", "Cannot reach server. Use sample data instead?", "confirm", navigateWithDemo); }
    finally { dispatch({ type: 'SET_LOADING', payload: false }); }
  };

  const renderHistoryItem = ({ item }) => {
    const now = new Date();
    const expiresAt = new Date(item.test_details.expires_at);
    const isExpired = item.status === 'unattempted' && now > expiresAt;
    const displayStatus = isExpired ? 'expired' : item.status;

    let title = "Physics Test";
    const { selected_chapters, selected_topics } = item.test_details;
    if (selected_chapters?.length > 0) {
        const names = selected_chapters.map(c => c.chapter_name.split(':').pop().trim());
        title = selected_chapters.length === 1 ? `Full Chapter: ${names[0]}` : `Chapters: ${names.join(', ')}`;
    } else if (selected_topics?.length > 0) {
        const names = selected_topics.map(t => t.topic_name);
        title = names.length > 2 ? `Topics: ${names.slice(0, 2).join(', ')}...` : `Topics: ${names.join(', ')}`;
    }

    const stats = [];
    if (item.test_details.mcq_count > 0) stats.push(`${item.test_details.mcq_count} MCQs`);
    if (item.test_details.short_count > 0) stats.push(`${item.test_details.short_count} SQs`);
    if (item.test_details.long_count > 0) stats.push(`${item.test_details.long_count} LQs`);
    const details = stats.join(' | ') + ` | ${item.test_details.mode.toUpperCase()}`;
    const date = new Date(item.created_at).toLocaleDateString();
    const statusColor = displayStatus === 'attempted' ? '#4CAF50' : displayStatus === 'expired' ? '#F44336' : '#FF9800';

    return (
      <TouchableOpacity 
        style={[styles.recentCard, { backgroundColor: theme.surface }]}
        onPress={() => handleViewTest(item._id, item.status, item.test_details.expires_at)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
             <Text style={[styles.recentDetails, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>{details}</Text>
             <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', marginLeft: 10 }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{displayStatus.toUpperCase()}</Text>
             </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={[styles.recentTime, { color: theme.textSecondary }]}>{date}</Text>
            <Ionicons name={displayStatus === 'attempted' || displayStatus === 'expired' ? "eye-outline" : "play-outline"} size={20} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isContentSelected = Object.values(state.selectedContent).some(topics => topics.length > 0);
  const isAtLeastOneTypeSelected = (state.customConfig.mcqs.selected && state.customConfig.mcqs.quantity > 0) || 
                                   (state.customConfig.short.selected && state.customConfig.short.quantity > 0) || 
                                   (state.customConfig.long.selected && state.customConfig.long.quantity > 0);
  const isGenerateEnabled = state.pattern === 'board' || (state.pattern === 'custom' && isAtLeastOneTypeSelected);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrapper}>
        <View style={[styles.header, {backgroundColor: theme.background}]}>
          <View style={styles.headerLeft}>
            <Ionicons name="book" size={30} color={theme.primary} style={styles.logo} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah</Text>
          </View>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}><Ionicons name="menu" size={24} color={theme.primary} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchHistory} colors={[theme.primary]} />}>
          <Text style={[styles.mainTitle, { color: theme.text }]}>Test Generator</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Create customized tests based on 9th Punjab board Physics Curriculum </Text>
          
          <View style={[styles.mainCard, {backgroundColor: theme.primary}]}>
            <View style={{flex: 1}}>
                <Text style={styles.mainCardTitle}>Generate Physics board pattern oriented and custom tests in seconds</Text>
                <Text style={styles.mainCardText}>AI-powered test generation including MCQs, Short Questions and Long Questions for any chapter or topic.</Text>
            </View>
            <Ionicons name="document-text-outline" size={40} color="#FFFFFF" />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Available Subject</Text>
          
          {/* Featured Physics Card */}
          <TouchableOpacity 
            style={[styles.featuredCard, { backgroundColor: theme.surface, borderColor: theme.primary, borderWidth: 1 }]} 
            onPress={() => dispatch({ type: 'SELECT_SUBJECT', payload: SUBJECTS[0] })}
          >
            <View style={styles.featuredContent}>
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="flash" size={32} color={theme.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={[styles.featuredSubjectName, { color: theme.text }]}>Physics</Text>
                    <Text style={[styles.featuredSubjectDetails, { color: theme.textSecondary }]}>9th Class - Punjab Board</Text>
                </View>
                <View style={[styles.activeGenerateBtn, { backgroundColor: theme.primary }]}>
                    <Text style={styles.activeGenerateBtnText}>Generate</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                </View>
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 25, marginBottom: 15, fontSize: 16 }]}>Coming Soon</Text>
          <View style={styles.comingSoonRow}>
            {SUBJECTS.slice(1).map(item => (
                <View key={item.id} style={[styles.disabledCard, { backgroundColor: theme.surface }]}>
                    <Ionicons name={item.icon} size={24} color={theme.textSecondary} />
                    <Text style={[styles.disabledText, { color: theme.textSecondary }]}>{item.name}</Text>
                </View>
            ))}
          </View>

          <View style={styles.historyHeader}><Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Tests</Text></View>
          {historyLoading ? <ActivityIndicator size="small" color={theme.primary} /> : history.length > 0 ? history.map(item => <View key={item._id}>{renderHistoryItem({ item })}</View>) : <View style={styles.emptyHistory}><Text style={{ color: theme.textSecondary }}>No test history found.</Text></View>}
        </ScrollView>
      </View>
      <Modal visible={state.step > 0} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={[styles.stepCard, { backgroundColor: theme.surface }]}>
                <Animated.View style={[styles.animatedContainer, { transform: [{ translateX: slideAnim }] }]}>
                    <View style={styles.stepPage}>
                        <Text style={[styles.stepHeader, { color: theme.text }]}>Select Content</Text>
                        <ScrollView style={styles.contentScroll}>{CONTENT_DATA[state.selectedSubject?.id]?.map(chapter => <ChapterItem key={chapter.id} chapter={chapter} state={state} dispatch={dispatch} theme={theme} />)}</ScrollView>
                        <View style={styles.stepFooter}>
                            <TouchableOpacity style={[styles.backBtn, { borderColor: theme.primary }]} onPress={() => dispatch({ type: 'SET_STEP', payload: 0 })}><Text style={{ color: theme.primary }}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity disabled={!isContentSelected} style={[styles.nextBtn, { backgroundColor: isContentSelected ? theme.primary : theme.textSecondary }]} onPress={() => Animated.timing(slideAnim, { toValue: -CARD_WIDTH, duration: 300, useNativeDriver: true }).start(() => dispatch({ type: 'SET_STEP', payload: 2 }))}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.stepPage}>
                        <Text style={[styles.stepHeader, { color: theme.text }]}>Test Pattern</Text>
                        <ScrollView style={styles.contentScroll}>
                            <TouchableOpacity style={styles.radioRow} onPress={() => dispatch({ type: 'SET_PATTERN', payload: 'board' })}><Ionicons name={state.pattern === 'board' ? "radio-button-on" : "radio-button-off"} size={22} color={theme.primary} /><Text style={[styles.radioLabel, { color: theme.text }]}>Board Pattern</Text></TouchableOpacity>
                            {state.pattern === 'board' && (
                                <View style={[styles.patternInfo, { backgroundColor: theme.background }]}>
                                    <Text style={[styles.patternTitle, { color: theme.primary }]}>Punjab Board 9th Physics Pattern:</Text>
                                    <Text style={{ color: theme.text }}>Total Marks: 60 | Time: 2 Hours</Text>
                                    <Text style={{ color: theme.text }}>Section A: 12 MCQs | Section B: 15 Short Qs | Section C: 2 Long Qs</Text>
                                </View>
                            )}
                            <TouchableOpacity style={styles.radioRow} onPress={() => dispatch({ type: 'SET_PATTERN', payload: 'custom' })}><Ionicons name={state.pattern === 'custom' ? "radio-button-on" : "radio-button-off"} size={22} color={theme.primary} /><Text style={[styles.radioLabel, { color: theme.text }]}>Customized</Text></TouchableOpacity>
                            {state.pattern === 'custom' && (
                                <View style={styles.customOptions}>
                                    {['mcqs', 'short', 'long'].map(type => (
                                        <View key={type} style={styles.customRow}>
                                            <Checkbox selected={state.customConfig[type].selected} onPress={() => dispatch({ type: 'UPDATE_CUSTOM_CONFIG', key: type, payload: { selected: !state.customConfig[type].selected } })} label={type.toUpperCase()} theme={theme} />
                                            {state.customConfig[type].selected && (
                                                <View style={{alignItems: 'center'}}>
                                                    <TextInput style={[styles.qtyInput, { color: theme.text, borderColor: theme.primary }]} keyboardType="numeric" value={state.customConfig[type].quantity.toString()} onChangeText={(val) => dispatch({ type: 'UPDATE_CUSTOM_CONFIG', key: type, payload: { quantity: parseInt(val) || 0 } })} />
                                                    <Text style={{fontSize: 10, color: theme.textSecondary}}>Limit: {type === 'long' ? '4' : '20'}</Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                        <View style={styles.stepFooter}>
                            <TouchableOpacity style={[styles.backBtn, { borderColor: theme.primary }]} onPress={() => Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => dispatch({ type: 'SET_STEP', payload: 1 }))}><Text style={{ color: theme.primary }}>Back</Text></TouchableOpacity>
                            <TouchableOpacity disabled={!isGenerateEnabled || state.loading} style={[styles.nextBtn, { backgroundColor: isGenerateEnabled ? theme.primary : theme.textSecondary }]} onPress={handleGenerateTest}>{state.loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Generate</Text>}</TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </View>
      </Modal>
      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig({ ...alertConfig, visible: false })} onConfirm={alertConfig.onConfirm} />
      <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} activeScreen="TestGenerator" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { marginRight: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  mainTitle: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginBottom: 20 },
  mainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 20, marginBottom: 25 },
  mainCardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  mainCardText: { fontSize: 14, color: 'white' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  featuredCard: { borderRadius: 15, padding: 15, elevation: 4, marginBottom: 10 },
  featuredContent: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { padding: 10, borderRadius: 12 },
  featuredSubjectName: { fontSize: 18, fontWeight: 'bold' },
  featuredSubjectDetails: { fontSize: 12, marginTop: 2 },
  activeGenerateBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, gap: 5 },
  activeGenerateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  comingSoonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  disabledCard: { width: '31%', borderRadius: 12, padding: 15, alignItems: 'center', opacity: 0.6, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  disabledText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  recentCard: { padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  recentTitle: { fontSize: 15, fontWeight: 'bold' },
  recentDetails: { fontSize: 13 },
  recentTime: { fontSize: 11, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  emptyHistory: { padding: 20, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  stepCard: { width: CARD_WIDTH, height: '75%', borderRadius: 20, overflow: 'hidden' },
  animatedContainer: { flexDirection: 'row', width: CARD_WIDTH * 2, height: '100%' },
  stepPage: { width: CARD_WIDTH, height: '100%', padding: 20 },
  stepHeader: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  contentScroll: { flex: 1 },
  chapterContainer: { marginBottom: 15 },
  chapterHeader: { flexDirection: 'row', alignItems: 'center' },
  chapterTitle: { fontSize: 16, fontWeight: '600' },
  topicsList: { marginLeft: 30, marginTop: 5 },
  topicRow: { marginVertical: 5 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { marginLeft: 10, fontSize: 14 },
  stepFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  backBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, borderWidth: 1 },
  nextBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, minWidth: 140, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  radioLabel: { fontSize: 16, fontWeight: '600', marginLeft: 10 },
  patternInfo: { padding: 15, borderRadius: 10, marginVertical: 10 },
  patternTitle: { fontWeight: 'bold', marginBottom: 5 },
  customOptions: { paddingLeft: 30 },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  qtyInput: { borderWidth: 1, borderRadius: 5, padding: 5, width: 60, textAlign: 'center' },
});
