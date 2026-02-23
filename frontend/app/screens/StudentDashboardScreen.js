import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './SidebarComponent';

const dashboardData = {
  testsCompleted: 24,
  averageScore: 85,
  studyHours: 48,
  dayStreak: 12,
  subjectPerformance: [
    { subject: 'Mathematics', score: 80 },
    { subject: 'Physics', score: 90 },
    { subject: 'Computer', score: 75 },
  ],
  overallProgress: 70,
};

export default function StudentDashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const renderPerformanceBars = () => {
    return dashboardData.subjectPerformance.map((item, index) => (
      <View key={index} style={styles.barGroup}>
          <View style={[styles.bar, { height: item.score * 0.8, backgroundColor: '#D3E4CD' }]} />
          <View style={[styles.bar, { height: item.score, backgroundColor: theme.primary }]} />
          <View style={[styles.bar, { height: item.score * 0.7, backgroundColor: '#E8F0E5' }]} />
      </View>
    ));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={[styles.mainTitle, { color: theme.text }]}>Student Dashboard</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Welcome back, {user?.name || 'User'}!</Text>

            <View style={[styles.mainCard, {backgroundColor: theme.primary}]}>
                <View style={{flex: 1}}>
                    <Text style={styles.mainCardTitle}>Think Outside the box with AI</Text>
                    <Text style={styles.mainCardText}>Your personalized RAG based platform for generating tests, evaluations, and intelligent study support.</Text>
                </View>
                <Ionicons name="bulb-outline" size={40} color="#FFFFFF"/>
            </View>

            <View style={styles.statsRow}>
                <View style={[styles.statCard, {backgroundColor: theme.surface}]}><Text style={[styles.statNumber, {color: theme.text}]}>24</Text><Text style={[styles.statLabel, {color: theme.textSecondary}]}>Tests Completed</Text></View>
                <View style={[styles.statCard, {backgroundColor: theme.surface}]}><Text style={[styles.statNumber, {color: theme.text}]}>85%</Text><Text style={[styles.statLabel, {color: theme.textSecondary}]}>Average Score</Text></View>
            </View>
            <View style={styles.statsRow}>
                <View style={[styles.statCard, {backgroundColor: '#79A8A2'}]}><Text style={styles.statNumberWhite}>48h</Text><Text style={styles.statLabelWhite}>Study Hours</Text></View>
                <View style={[styles.statCard, {backgroundColor: '#004D40'}]}><Text style={styles.statNumberWhite}>12 🔥</Text><Text style={styles.statLabelWhite}>Day Streak</Text></View>
            </View>

            <View style={[styles.card, {backgroundColor: theme.surface}]}>
                <Text style={[styles.cardTitle, {color: theme.text}]}>Subject Performance</Text>
                <View style={styles.barChartContainer}>{renderPerformanceBars()}</View>
            </View>
            
            <View style={[styles.card, {alignItems: 'center', backgroundColor: theme.surface}]}>
                 <Text style={[styles.cardTitle, {color: theme.text}]}>Overall Progress</Text>
                 <Text style={[styles.progressSubtitle, {color: theme.textSecondary}]}>You're making great progress! Keep it up</Text>
                 <View style={styles.progressCircle}>
                    <Text style={[styles.progressText, {color: theme.text}]}>70%</Text>
                    <Text style={[styles.progressLabel, {color: theme.textSecondary}]}>Mastery</Text>
                 </View>
            </View>

        </ScrollView>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="StudentDashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 25 : 0
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
    mainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 20, marginBottom: 20 },
    mainCardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    mainCardText: { fontSize: 14, color: 'white' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 15, padding: 20, marginHorizontal: 5, alignItems: 'center' },
    statNumber: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 14 },
    statNumberWhite: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    statLabelWhite: { fontSize: 14, color: '#E0E0E0' },
    card: { borderRadius: 15, padding: 20, marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', height: 100, alignItems: 'flex-end' },
    barGroup: { flexDirection: 'row', alignItems: 'flex-end', height: '100%' },
    bar: { width: 15, borderRadius: 5, marginHorizontal: 3 },
    progressSubtitle: { fontSize: 14, marginBottom: 20 },
    progressCircle: { width: 150, height: 150, borderRadius: 75, borderWidth: 10, borderColor: '#004D40', borderLeftColor: '#E8F0E5', borderTopColor: '#E8F0E5', transform: [{rotate: '45deg'}], alignItems: 'center', justifyContent: 'center' },
    progressText: { fontSize: 32, fontWeight: 'bold' },
    progressLabel: { fontSize: 14 },
});