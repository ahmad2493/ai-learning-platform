/**
 * CLO Performance Screen - Learning Outcomes Tracking
 * Updated: Fully synchronized PieChart indicators across all components
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AI_PROGRESS_URL } from '../utils/apiConfig';
import Sidebar from './SidebarComponent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ALL_CHAPTERS = [
    { id: '1', name: 'Physical Quantities and Measurements', topics: ['1.1 Physical and Non-Physical Quantities', '1.2 Base and Derived Physical Quantities', '1.3 International System of Units', '1.4 Scientific Notation', '1.5 Length Measuring Instruments', '1.6 Mass Measuring Instruments', '1.7 Time Measuring Instruments', '1.8 Volume Measuring Instruments', '1.9 Errors in Measurements', '1.10 Uncertainty in Measurement', '1.11 Significant Figures', '1.12 Precision and Accuracy', '1.13 Rounding off the digits'] },
    { id: '2', name: 'Kinematics', topics: ['2.1 Scalars and Vectors', '2.2 Rest and Motion', '2.3 Types of Motion', '2.4 Distance and Displacement', '2.5 Speed and Velocity', '2.6 Acceleration', '2.7 Graphical Analysis of Motion', '2.8 Gradient of Distance-Time Graph', '2.9 Speed-Time Graph', '2.10 Gradient of Speed-Time Graph', '2.11 Area under Speed-Time Graph', '2.12 Solving Problems for Motion Under Gravity', '2.13 Free Fall Acceleration'] },
    { id: '3', name: 'Dynamics', topics: ['3.1 Concept of Force', '3.2 Fundamental Forces', '3.3 Forces in a Free-Body Diagram', '3.4 Newton’s Law of Motion', '3.5 Limitations of Newton’s Law of Motion', '3.6 Mass and Weight', '3.7 Mechanical and Electronic Balances', '3.8 Friction', '3.9 Momentum and Impulse', '3.10 Principle of Conservation of Momentum'] },
    { id: '4', name: 'Turning Effect of Force', topics: ['4.1 Like and Unlike Parallel Forces', '4.2 Addition of Forces', '4.3 Turning Effect of Force', '4.4 Resolution of Vectors', '4.5 Determination of a Force from its Perpendicular components', '4.6 Principle of Moments', '4.7 Centre of Gravity and Centre of Mass', '4.8 Equilibrium', '4.9 Conditions of Equilibrium', '4.10 States of Equilibrium', '4.11 Improvement of Stability', '4.12 Application of Stability in Real Life', '4.13 Centripetal Force'] },
    { id: '5', name: 'Work, Energy and Power', topics: ['5.1 Work', '5.2 Energy', '5.3 Conservation of Energy', '5.4 Sources of Energy', '5.5 Renewable and Non-Renewable Sources', '5.6 The Advantages and Disadvantages of Methods of Energy Production', '5.7 Power', '5.8 Efficiency'] },
    { id: '6', name: 'Mechanical Properties of Matter', topics: ['6.1 Deformation of Solids', '6.2 Hooke’s Law', '6.3 Density', '6.4 Pressure', '6.5 Pressure in Liquids', '6.6 Atmospheric Pressure', '6.7 Measurement of Atmospheric Pressure', '6.8 Measurement of Pressure by Manometer', '6.9 Pascal’s Law'] },
    { id: '7', name: 'Thermal Properties of Matter', topics: ['7.1 Kinetic Molecular Theory of Matter', '7.2 Temperature and Heat', '7.3 Thermometers', '7.4 Sensitivity, Range and Linearity of Thermometers', '7.5 Structure of Liquid in Glass Thermometer'] },
    { id: '8', name: 'Magnetism', topics: ['8.1 Magnetic Materials', '8.2 Properties of Magnets', '8.3 Induced Magnetism', '8.4 Temporary and Permanent Magnets', '8.5 Magnetic Fields', '8.6 Uses of Permanent Magnets', '8.7 Electromagnets', '8.8 Domain Theory of Magnetism', '8.9 Magnetisation and Demagematisation', '8.10 Applications of Magnets in Recording Technology', '8.11 Soft Iron as Magnetic Shield'] },
    { id: '9', name: 'Nature of Science', topics: ['9.1 Scope of Physics', '9.2 Branches of Physics', '9.3 Interdisciplinary Nature of Physics', '9.4 Interdisciplinary Research', '9.5 Scientific Method', '9.6 Scientific Base of Technologies and Engineering'] }
];

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1'];

const pickMetric = (...values) => {
    for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return 0;
};

const AnimatedProgressCircle = ({ progress, size = 52, theme, isHero = false }) => {
    const safeProgress = Math.max(0, Math.min(100, progress || 0));
    
    const chartData = [
        { 
            value: safeProgress, 
            color: isHero ? '#FFFFFF' : '#FF9800', 
            gradientColor: isHero ? '#F0F0F0' : '#FFB74D',
            showGradient: true 
        },
        { 
            value: 100 - safeProgress, 
            color: isHero ? 'rgba(255,255,255,0.2)' : theme.inputBorder + '20' 
        }
    ];

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <PieChart
                data={chartData}
                donut
                radius={size / 2}
                innerRadius={(size / 2) * 0.72}
                innerCircleColor={isHero ? theme.primary : theme.surface}
                isAnimated
                animationDuration={1000}
                centerLabelComponent={() => (
                    <Text style={[
                        styles.circleText, 
                        { 
                            color: isHero ? 'white' : theme.text, 
                            fontSize: size * 0.25,
                            fontWeight: 'bold' 
                        }
                    ]}>
                        {Math.round(safeProgress)}%
                    </Text>
                )}
            />
        </View>
    );
};

const TopicRow = ({ topicName, chapterId, progressData, theme }) => {
    const topicKey = topicName.split(' ')[0].replace(/\./g, '_');
    const topicStats = progressData?.chapters?.[chapterId]?.topics?.[topicKey] || { progress: 0, score: 0, mcqs_correct: 0, mcqs_seen: 0 };
    const topicProgress = pickMetric(topicStats.progress, topicStats.score);

    return (
        <View style={[styles.topicRow, { borderBottomColor: theme.inputBorder + '20' }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.topicName, { color: theme.text }]}>{topicName}</Text>
                <Text style={[styles.topicStats, { color: theme.textSecondary }]}>
                    {topicStats.mcqs_seen > 0 ? `${topicStats.mcqs_correct}/${topicStats.mcqs_seen} Correct` : 'Not Practised Yet'}
                </Text>
            </View>
            <AnimatedProgressCircle progress={topicProgress} size={42} theme={theme} />
        </View>
    );
};

const ChapterCard = ({ chapter, progressData, theme }) => {
    const [expanded, setExpanded] = useState(false);
    const chProgress = progressData?.chapters?.[chapter.id] || { progress: 0, performance: 0, mcqs_seen: 0, mcqs_correct: 0 };
    const chapterProgress = pickMetric(chProgress.progress, chProgress.performance);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={[styles.chapterCard, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
            <TouchableOpacity onPress={toggleExpand} style={styles.chapterHeader}>
                <View style={[styles.chBadge, { backgroundColor: theme.primary + '10' }]}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>{chapter.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.chapterTitle, { color: theme.text }]} numberOfLines={1}>{chapter.name}</Text>
                    <Text style={[styles.chapterSub, { color: theme.textSecondary }]}>
                        {chapter.topics.length} Outcomes • {chProgress.mcqs_seen > 0 ? `${chProgress.mcqs_correct}/${chProgress.mcqs_seen} Answered` : '0 Answered'}
                    </Text>
                </View>
                <AnimatedProgressCircle progress={chapterProgress} size={52} theme={theme} />
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.topicsList}>
                    {chapter.topics.map((topic, index) => (
                        <TopicRow key={index} topicName={topic} chapterId={chapter.id} progressData={progressData} theme={theme} />
                    ))}
                </View>
            )}
        </View>
    );
};

export default function CloPerformanceScreen({ navigation }) {
    const { theme } = useTheme();
    const { user, userToken, isLoading: authLoading } = useAuth();
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [progressData, setProgressData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const currentUserId = user?._id || user?.id || user?.userId;

    const fetchProgress = useCallback(async (isRefreshing = false) => {
        if (!currentUserId) return;
        if (!isRefreshing) setLoading(true);
        try {
            console.log(`📡 [CLO] Fetching progress for UID: ${currentUserId}`);
            const response = await fetch(`${AI_PROGRESS_URL}/${currentUserId}`, {
                headers: { 'Authorization': `Bearer ${userToken}`, 'Accept': 'application/json' }
            });
            const result = await response.json();
            console.log("✅ [CLO] Backend Result:", JSON.stringify(result).substring(0, 200) + "...");
            
            if (response.ok && result.success && result.data) {
                setProgressData(result.data);
            } else {
                setProgressData({ overall_progress: 0, chapters: {}, total_mcqs_seen: 0 });
            }
        } catch (error) {
            console.error("❌ [CLO] Error:", error);
            setProgressData({ overall_progress: 0, chapters: {}, total_mcqs_seen: 0 });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentUserId, userToken]);

    useEffect(() => {
        if (!authLoading && currentUserId) fetchProgress();
    }, [fetchProgress, authLoading, currentUserId]);

    const filteredChapters = ALL_CHAPTERS.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const overallProgress = pickMetric(progressData?.overall_progress, progressData?.overall_performance);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.contentWrapper}>
                <View style={[styles.header, {backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: theme.inputBorder}]}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="book" size={30} color={theme.primary} style={styles.logo} />
                        <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSidebarVisible(true)}><Ionicons name="menu" size={24} color={theme.primary} /></TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProgress(true)} colors={[theme.primary]} />}>
                    <Text style={[styles.mainTitle, { color: theme.text }]}>Course Learning Outcomes</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Track your progress across all course learning outcomes including all chapters and topics</Text>

                    {loading || authLoading ? (
                        <View style={styles.centerContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
                    ) : (
                        <>
                            <LinearGradient colors={[theme.primary, theme.primary + 'CC']} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.heroLabel}>TOTAL MASTERY</Text>
                                    <Text style={styles.heroValue}>{Math.round(overallProgress)}%</Text>
                                    <Text style={styles.debugStats}>
                                        {progressData?.total_mcqs_seen || 0} Questions Attempted
                                    </Text>
                                </View>
                                <AnimatedProgressCircle progress={overallProgress} size={85} theme={theme} isHero={true} />
                            </LinearGradient>



                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Chapter Wise Analysis</Text>
                            {filteredChapters.map(chapter => (<ChapterCard key={chapter.id} chapter={chapter} progressData={progressData} theme={theme} />))}
                        </>
                    )}
                </ScrollView>
            </View>
            <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} activeScreen="CloPerformance" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentWrapper: { flex: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    logo: { marginRight: 10 },
    scrollContent: { padding: 20 },
    mainTitle: { fontSize: 26, fontWeight: 'bold' },
    subtitle: { fontSize: 15, marginBottom: 20 },
    circleWrapper: { justifyContent: 'center', alignItems: 'center' },
    circleText: { fontWeight: 'bold' },
    heroCard: { borderRadius: 25, padding: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 5 },
    heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    heroValue: { color: 'white', fontSize: 48, fontWeight: '900' },
    debugStats: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 5, fontWeight: '500' },
    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1, marginBottom: 25, marginTop: 5 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 5 },
    chapterCard: { borderRadius: 22, marginBottom: 15, padding: 18, borderWidth: 1, elevation: 1 },
    chapterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    chBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    chapterTitle: { fontSize: 16, fontWeight: 'bold' },
    chapterSub: { fontSize: 11, marginTop: 2 },
    topicsList: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 5 },
    topicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    topicName: { fontSize: 14, fontWeight: '600' },
    topicStats: { fontSize: 10, marginTop: 2 },
    centerContainer: { height: 400, justifyContent: 'center', alignItems: 'center' },
});
