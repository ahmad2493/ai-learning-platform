import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Platform, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AI_DASHBOARD_URL } from '../utils/apiConfig';
import Sidebar from './SidebarComponent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * AccuracySpeedometer - Custom semi-circular gauge for Accuracy Score
 */
const AccuracySpeedometer = ({ value, label, subtext, color, theme }) => {
  // Reduced size slightly to prevent cutting from edges
  const size = SCREEN_WIDTH * 0.4;
  
  // Opacity for light mode to keep needle visible
  const fillColor = theme.dark ? color : color + '88'; 
  
  const pieData = [
    { value: value, color: fillColor },
    { value: 100 - value, color: theme.inputBorder + '30' },
  ];

  // Rotation for the needle: -90deg (0%) to 90deg (100%)
  const needleRotation = (value / 100) * 180 - 90;
  
  // High contrast needle color
  const needleColor = theme.dark ? '#FFFFFF' : '#1A1A1A';

  return (
    <View style={[styles.gaugeCard, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
      <View style={styles.speedoContainer}>
        <View style={styles.pieWrapper}>
            <PieChart
                semiCircle
                radius={size / 2}
                innerRadius={size / 3}
                data={pieData}
                innerCircleColor={theme.surface}
            />
        </View>
        
        <View style={[styles.needleWrapper, { transform: [{ rotate: `${needleRotation}deg` }] }]}>
            <View style={[styles.needle, { backgroundColor: needleColor }]} />
        </View>
        <View style={[styles.needleCenter, { backgroundColor: needleColor }]} />

        <View style={[styles.speedoBadge, { backgroundColor: theme.dark ? theme.primary : needleColor }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 10 }}>{value}%</Text>
        </View>
      </View>

      <View style={styles.gaugeTextContainer}>
        <Text style={[styles.gaugeTitle, { color: theme.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.gaugeSub, { color: theme.textSecondary }]} numberOfLines={1}>{subtext}</Text>
      </View>
    </View>
  );
};

/**
 * PerformanceGauge - Circular donut for Average Score
 */
const PerformanceGauge = ({ value, label, subtext, color, theme }) => {
  // Sized to match speedometer width
  const size = SCREEN_WIDTH * 0.3; 
  const data = [
    { value: value, color: color, gradientColor: color + 'BB', showGradient: true },
    { value: 100 - value, color: theme.inputBorder + '30' }
  ];

  return (
    <View style={[styles.gaugeCard, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
      <View style={styles.donutContainer}>
        <PieChart
            donut
            radius={size / 2}
            innerRadius={size / 3}
            innerCircleColor={theme.surface}
            data={data}
            centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
                <Text style={[styles.gaugePercent, { color: theme.text, fontSize: 16 }]}>{value}%</Text>
            </View>
            )}
        />
      </View>
      <View style={styles.gaugeTextContainer}>
        <Text style={[styles.gaugeTitle, { color: theme.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.gaugeSub, { color: theme.textSecondary }]} numberOfLines={1}>{subtext}</Text>
      </View>
    </View>
  );
};

export default function StudentDashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, userToken, isLoading: authLoading } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const userId = user?._id || user?.id || user?.userId;

  const fetchDashboardData = useCallback(async (isRefreshing = false) => {
    if (!userId) return;
    if (!isRefreshing) setLoading(true);
    
    try {
      const response = await fetch(`${AI_DASHBOARD_URL}/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const result = await response.json();
      
      if (response.ok && result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, userToken]);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchDashboardData();
    }
  }, [userId, authLoading, fetchDashboardData]);

  if (loading || authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Calculated values for UI
  const totalMcqs = data?.total_mcqs_seen || 0;
  const correctMcqs = data?.total_mcqs_correct || 0;
  const incorrectMcqs = Math.max(0, totalMcqs - correctMcqs);
  const successRate = totalMcqs > 0 ? Math.round((correctMcqs / totalMcqs) * 100) : 0;
  const incorrectRate = totalMcqs > 0 ? 100 - successRate : 0;

  const testsGenerated = data?.total_tests_generated || 0;
  const testsAttempted = data?.total_tests_attempted || 0;
  const testsExpired = data?.total_tests_expired || 0;
  const testsPending = Math.max(0, testsGenerated - testsAttempted - testsExpired);

  const progressCircleData = [
    { value: data?.overall_progress || 0, color: theme.primary, gradientColor: theme.primary + 'AA', showGradient: true },
    { value: 100 - (data?.overall_progress || 0), color: theme.inputBorder + '40' }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrapper}>
        {/* App Header */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.inputBorder }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="book" size={32} color={theme.primary} style={styles.logo} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah</Text>
          </View>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu" size={30} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} colors={[theme.primary]} />}
        >
          {/* Dashboard Titles */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.mainTitle, { color: theme.text }]}>Student Dashboard</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Welcome back, {user?.name || 'Student'}!</Text>
          </View>

          {/* 1. Feature Banner (Theme Green) */}
          <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.bannerCard} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Think Outside the box with AI</Text>
              <Text style={styles.bannerText}>Your personalized RAG based platform for generating tests, evaluations, and intelligent study support.</Text>
            </View>
            <Ionicons name="bulb-outline" size={55} color="white" />
          </LinearGradient>

          {/* 2. Mastery & Streak Split Row */}
          <View style={styles.statsRow}>
            {/* Left: Course Mastery Card */}
            <View style={[styles.statCardSmall, { backgroundColor: theme.surface }]}>
              <PieChart
                donut
                radius={40}
                innerRadius={30}
                innerCircleColor={theme.surface}
                data={progressCircleData}
                centerLabelComponent={() => (
                  <Text style={[styles.pulsePercentSmall, { color: theme.text }]}>{Math.round(data?.overall_progress || 0)}%</Text>
                )}
              />
              <View style={styles.statCardText}>
                <Text style={[styles.statTitleSmall, { color: theme.text }]}>Course Mastery</Text>
                <Text style={[styles.statSubSmall, { color: theme.textSecondary }]}>{totalMcqs} MCQs Done</Text>
              </View>
            </View>
            
            {/* Right: Streak Card */}
            <View style={[styles.statCardSmall, { backgroundColor: theme.surface }]}>
               <Text style={[styles.streakBig, { color: theme.primary }]}>{data?.streak || 0}</Text>
               <Ionicons name="flame" size={36} color="#F97316" />
               <Text style={[styles.statTitleSmall, { color: theme.text, marginTop: 5 }]}>Day Streak</Text>
            </View>
          </View>

          {/* 3. MCQ Stats (Muted Sage Style) */}
          <View style={[styles.card, { backgroundColor: '#79A8A2' }]}>
            <View style={styles.cardHeaderRow}>
               <Text style={styles.whiteHeading}>Multiple Choice Questions</Text>
               <View style={styles.badgeWhite}><Text style={styles.badgeTextDark}>total: {totalMcqs}</Text></View>
            </View>
            
            <View style={styles.mcqGrid}>
              <View style={styles.transparentStatBox}>
                <Text style={styles.bigStatNumber}>{(correctMcqs).toString().padStart(2, '0')}</Text>
                <Text style={styles.statSubLabel}>CORRECT</Text>
              </View>
              <View style={styles.transparentStatBox}>
                <Text style={styles.bigStatNumber}>{(incorrectMcqs).toString().padStart(2, '0')}</Text>
                <Text style={styles.statSubLabel}>INCORRECT</Text>
              </View>
            </View>

            <View style={styles.progressBarSection}>
              <View style={styles.fullBarBackground}>
                <View style={[styles.barFill, { flex: successRate || 1, backgroundColor: '#10B981' }]} />
                <View style={[styles.barEmpty, { flex: incorrectRate || 1, backgroundColor: '#EF4444' }]} />
              </View>
              <View style={styles.rateLabels}>
                 <Text style={styles.rateText}>{successRate}% success rate</Text>
                 <Text style={styles.rateText}>{incorrectRate}% revision needed</Text>
              </View>
            </View>
          </View>

          {/* 4. Test Summary (Dark Green Style) */}
          <View style={[styles.card, { backgroundColor: '#004D40' }]}>
            <View style={styles.cardHeaderRow}>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="document-text-outline" size={22} color="white" />
                  <Text style={[styles.whiteHeading, {marginLeft: 10}]}>Test Summary</Text>
               </View>
               <View style={styles.badgeWhite}><Text style={styles.badgeTextDark}>{testsGenerated} generated</Text></View>
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValBig}>{testsAttempted}</Text>

                <Text style={styles.summaryLabelSmall}><Ionicons name="checkmark-circle" size={18} color="#4CAF50"/> ATTEMPTED</Text>
                <View style={styles.accentLineGreen} />
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValBig}>{testsExpired}</Text>
                <Text style={styles.summaryLabelSmall}><Ionicons name="alert-circle" size={14} color="#FF5252"/> EXPIRED</Text>
                <View style={styles.accentLineRed} />
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValBig}>{testsPending}</Text>
                <Text style={styles.summaryLabelSmall}><Ionicons name="time" size={14} color="#FFD740"/> PENDING</Text>
                <View style={styles.accentLineYellow} />
              </View>
            </View>

          </View>

          {/* 5. Gauges Grid (Side by Side) */}
          <View style={styles.gaugesGrid}>
            <AccuracySpeedometer 
              value={Math.round(data?.accuracy_percentage || 0)} 
              label="Accuracy Score" 
              subtext={`${correctMcqs}/${totalMcqs} Correct`}
              color={theme.primary} 
              theme={theme} 
            />
            <PerformanceGauge 
              value={Math.round(data?.average_score || 0)} 
              label="Average Score" 
              subtext={`Across ${testsAttempted} Tests`}
              color="#F59E0B" 
              theme={theme} 
            />
          </View>

        </ScrollView>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} activeScreen="StudentDashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    contentWrapper: { flex: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    logo: { marginRight: 10 },
    headerTitle: { fontSize: 26, fontWeight: 'bold' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 18, paddingBottom: 60 },
    welcomeSection: { marginBottom: 20, marginLeft: 5 },
    mainTitle: { fontSize: 30, fontWeight: '900' },
    subtitle: { fontSize: 18, fontWeight: '500' },
    bannerCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, padding: 25, marginBottom: 20, elevation: 5 },
    bannerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    bannerText: { fontSize: 14, color: 'rgba(255,255,255,0.95)', lineHeight: 22 },
    
    // Split Pulse Styles
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCardSmall: { flex: 1, borderRadius: 25, padding: 20, marginHorizontal: 5, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    statCardText: { alignItems: 'center', marginTop: 10 },
    statTitleSmall: { fontSize: 15, fontWeight: 'bold' },
    statSubSmall: { fontSize: 12, marginTop: 2 },
    streakBig: { fontSize: 36, fontWeight: '900' },
    pulsePercentSmall: { fontSize: 16, fontWeight: 'bold' },

    card: { borderRadius: 25, padding: 22, marginBottom: 20, elevation: 3 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    whiteHeading: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    badgeWhite: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    badgeTextDark: { color: '#333', fontWeight: 'bold', fontSize: 12 },
    mcqGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25 },
    transparentStatBox: { alignItems: 'center' },
    bigStatNumber: { fontSize: 44, fontWeight: '900', color: 'white' },
    statSubLabel: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', marginTop: 5 },
    progressBarSection: { marginTop: 5 },
    fullBarBackground: { height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
    barFill: { height: '100%' },
    barEmpty: { height: '100%' },
    rateLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    rateText: { fontSize: 12, fontWeight: 'bold', color: 'white' },
    summaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValBig: { fontSize: 36, fontWeight: 'bold', color: 'white' },
    summaryLabelSmall: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', marginTop: 5 },
    accentLineGreen: { height: 4, width: '40%', backgroundColor: '#4CAF50', marginTop: 8, borderRadius: 2 },
    accentLineRed: { height: 4, width: '40%', backgroundColor: '#FF5252', marginTop: 8, borderRadius: 2 },
    accentLineYellow: { height: 4, width: '40%', backgroundColor: '#FFD740', marginTop: 8, borderRadius: 2 },
    indicatorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
    indicatorItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    indicatorText: { fontSize: 11, fontWeight: 'bold', color: 'white' },
    
    // Gauges
    gaugesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    gaugeCard: { width: '48%', borderRadius: 25, padding: 12, alignItems: 'center', elevation: 3, borderWidth: 1, height: 195 },
    gaugePercent: { fontWeight: 'bold' },
    gaugeTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
    gaugeSub: { fontSize: 10, fontWeight: '500', marginTop: 4, textAlign: 'center' },
    gaugeTextContainer: { width: '100%', alignItems: 'center', marginTop: 5 },

    // Speedometer Specific
    speedoContainer: { height: 90, width: '100%', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
    pieWrapper: { position: 'absolute', bottom: -5 },
    needleWrapper: { position: 'absolute', bottom: 10, width: 2, height: 40, alignItems: 'center', justifyContent: 'flex-start' },
    needle: { width: 3, height: 35, borderRadius: 2 },
    needleCenter: { position: 'absolute', bottom: 0, width: 10, height: 10, borderRadius: 5, zIndex: 10 },
    speedoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, position: 'absolute', bottom: 5, zIndex: 20 },

    // Donut Specific
    donutContainer: { height: 100, justifyContent: 'center', alignItems: 'center' }
});
