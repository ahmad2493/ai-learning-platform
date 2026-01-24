/**
 * CLO Performance Screen - Learning Outcomes Tracking
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Displays student learning outcomes (CLOs) performance
 * - Shows progress for topics and chapters
 * - Tracks student performance metrics
 * - Provides visual representation of learning progress
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const performanceData = {
  Physics: {
    overall: 45,
    chapters: [
      {
        title: 'Chapter 1: Mechanics',
        progress: 62,
        topics: [
          { name: 'Kinematics', description: 'Good understanding of basic concepts', progress: 78, tests: [75, 82] },
          { name: 'Dynamics', description: 'Needs more practice with Newton\'s laws', progress: 65, tests: [65] },
          { name: 'Work & Energy', description: 'Solid understanding of energy conservation', progress: 88, tests: [88] },
        ]
      },
      {
        title: 'Chapter 2: Thermodynamics',
        progress: 38,
        topics: [
          { name: 'Zeroth Law', description: 'Basic understanding of temperature', progress: 50, tests: [50] },
        ]
      }
    ]
  },
  Chemistry: {
    overall: 65,
    chapters: [
        {
            title: 'Chapter 1: Atomic Structure',
            progress: 75,
            topics: [
                { name: 'Subatomic Particles', description: 'Good grasp of protons, neutrons, and electrons', progress: 80, tests: [80] },
                { name: 'Isotopes', description: 'Understanding of isotopic notation', progress: 70, tests: [70] },
            ]
        },
    ]
  },
  Mathematics: {
    overall: 78,
    chapters: [
        {
            title: 'Chapter 1: Algebra',
            progress: 85,
            topics: [
                { name: 'Linear Equations', description: 'Excellent problem-solving skills', progress: 90, tests: [90] },
                { name: 'Quadratic Equations', description: 'Good understanding of the quadratic formula', progress: 80, tests: [80] },
            ]
        },
    ]
  }
};

const SubjectCard = ({ subject, data, theme }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }

    return (
        <View style={[styles.subjectCard, {backgroundColor: theme.surface}]}>
            <TouchableOpacity onPress={toggleExpand} style={styles.subjectHeader}>
                <Ionicons name={subject === 'Physics' ? "rocket-outline" : subject === 'Chemistry' ? "flask-outline" : "calculator-outline"} size={28} color={theme.primary} />
                <Text style={[styles.subjectTitle, {color: theme.text}]}>{subject}</Text>
                <View style={styles.overallProgress}>
                    <Text style={{color: theme.text}}>{data.overall}%</Text>
                    <Text style={{color: theme.textSecondary, fontSize: 12}}>overall</Text>
                </View>
                <Ionicons name={expanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            {expanded && (
                <View style={styles.detailsContainer}>
                    {data.chapters.map(chapter => (
                        <ChapterDetails key={chapter.title} chapter={chapter} theme={theme} />
                    ))}
                </View>
            )}
        </View>
    )
}

const ChapterDetails = ({ chapter, theme }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }

    return (
        <View style={styles.chapterContainer}>
            <TouchableOpacity onPress={toggleExpand} style={styles.chapterHeader}>
                <Ionicons name={expanded ? "chevron-down-outline" : "chevron-forward-outline"} size={20} color={theme.text} />
                <Text style={[styles.chapterTitle, {color: theme.text}]}>{chapter.title}</Text>
                <Text style={{color: theme.primary, fontWeight: 'bold'}}>{chapter.progress}%</Text>
            </TouchableOpacity>
            {expanded && chapter.topics.map(topic => (
                <View key={topic.name} style={styles.topicContainer}>
                    <Text style={[styles.topicName, {color: theme.text}]}>{topic.name}</Text>
                    <Text style={[styles.topicDescription, {color: theme.textSecondary}]}>{topic.description}</Text>
                    <View style={styles.testScores}>
                        {topic.tests.map((score, index) => (
                            <Text key={index} style={[styles.testScore, {color: theme.primary}]}>✓ Test {index + 1}: {score}%</Text>
                        ))}
                    </View>
                    <Text style={{color: theme.primary, fontWeight: 'bold', alignSelf: 'flex-end'}}>{topic.progress}%</Text>
                </View>
            ))}
        </View>
    )
}

export default function CloPerformanceScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrapper}>
        <View style={[styles.header, {backgroundColor: theme.background}]}>
            <View style={styles.headerLeft}>
                <Ionicons name="book" size={30} color={theme.primary} style={styles.logo} />
                <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah</Text>
            </View>
            <TouchableOpacity onPress={toggleSidebar}>
                <Ionicons name="menu" size={24} color={theme.primary} />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.mainTitle, { color: theme.text }]}>CLO Performance</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Track your Course Learning Outcomes Progress</Text>

             <View style={[styles.searchContainer, {backgroundColor: theme.surface}]}>
                <Ionicons name="search-outline" size={22} color="#888" />
                <TextInput style={{flex:1, marginLeft: 10, color: theme.text}} placeholder="Search for courses..." placeholderTextColor="#888"/>
                 <Ionicons name="notifications-outline" size={22} color="red" />
            </View>

            <View style={[styles.mainCard, {backgroundColor: theme.primary}]}>
                <View style={{flex: 1}}>
                    <Text style={styles.mainCardTitle}>Track your Learning Progress</Text>
                    <Text style={styles.mainCardText}>Monitor your performance across courses, chapters and topics to identify strengths and areas for improvements.</Text>
                </View>
                <Ionicons name="trending-up-outline" size={40} color="#FFFFFF"/>
            </View>

            {Object.entries(performanceData).map(([subject, data]) => (
                <SubjectCard key={subject} subject={subject} data={data} theme={theme}/>
            ))}

        </ScrollView>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="CloPerformance" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
    },
    contentWrapper: { flex: 1 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    scrollContent: { padding: 20, paddingBottom: 50 },
    mainTitle: { fontSize: 26, fontWeight: 'bold' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 15, marginBottom: 20 },
    mainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 20, marginBottom: 20 },
    mainCardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    mainCardText: { fontSize: 14, color: 'white' },
    subjectCard: {
        borderRadius: 15,
        marginBottom: 15,
        padding: 15,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    subjectTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
    },
    overallProgress: {
        alignItems: 'center'
    },
    detailsContainer: {
        paddingTop: 15,
        marginTop: 15,
        borderTopWidth: 1,
        borderColor: '#E0E0E0'
    },
    chapterContainer: {
        marginBottom: 10,
    },
    chapterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    chapterTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold'
    },
    topicContainer: {
        marginLeft: 30,
        marginBottom: 10,
        borderLeftWidth: 2,
        borderColor: '#E0E0E0',
        paddingLeft: 15,
    },
    topicName: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    topicDescription: {
        fontSize: 12,
        marginVertical: 4
    },
    testScores: {
        marginTop: 5,
    },
    testScore: {
        fontSize: 12,
    }
});