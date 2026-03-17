/**
 * CLO Performance Screen - Learning Outcomes Tracking
 * Integrated with Progress API
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AI_PROGRESS_URL } from '../utils/apiConfig';
import Sidebar from './SidebarComponent';
import CustomAlert from '../components/CustomAlert';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ChapterDetails = ({ chapterId, chapterData, theme }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }

    const topics = Object.entries(chapterData.topics || {});

    return (
        <View style={styles.chapterContainer}>
            <TouchableOpacity onPress={toggleExpand} style={styles.chapterHeader}>
                <Ionicons name={expanded ? "chevron-down-outline" : "chevron-forward-outline"} size={20} color={theme.text} />
                <Text style={[styles.chapterTitle, {color: theme.text}]}>
                    Chapter {chapterId}: {chapterData.chapter_name}
                </Text>
                <Text style={{color: theme.primary, fontWeight: 'bold'}}>{Math.round(chapterData.progress || 0)}%</Text>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.topicsWrapper}>
                    {topics.length > 0 ? topics.map(([topicId, topic]) => (
                        <View key={topicId} style={styles.topicContainer}>
                            <View style={styles.topicHeader}>
                                <Text style={[styles.topicName, {color: theme.text}]}>{topic.topic_name}</Text>
                                <Text style={{color: theme.primary, fontWeight: 'bold'}}>{Math.round(topic.progress || 0)}%</Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, { backgroundColor: theme.primary, width: `${Math.min(100, topic.progress || 0)}%` }]} />
                            </View>
                            <Text style={[styles.topicStats, {color: theme.textSecondary}]}>
                                MCQs: {topic.mcqs_correct}/{topic.mcqs_seen} Correct
                            </Text>
                        </View>
                    )) : (
                        <Text style={[styles.noDataText, {color: theme.textSecondary}]}>No topics attempted yet.</Text>
                    )}
                </View>
            )}
        </View>
    )
}

export default function CloPerformanceScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, userToken, isLoading: authLoading } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine the ID from the user object
  const currentUserId = user?._id || user?.id || user?.userId;

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'error' });

  const fetchProgress = useCallback(async (isRefreshing = false) => {
    if (!currentUserId) {
        setLoading(false);
        setRefreshing(false);
        return;
    }

    if (!isRefreshing) setLoading(true);

    try {
      console.log(`📊 [CLO] Calling API: ${AI_PROGRESS_URL}/${currentUserId}`);
      const response = await fetch(`${AI_PROGRESS_URL}/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setProgressData(result.data);
      } else {
        if (response.status === 404) {
            setProgressData({ overall_progress: 0, total_mcqs_seen: 0, total_mcqs_correct: 0, chapters: {} });
        } else {
            setAlertConfig({
                visible: true,
                title: 'Data Load Failed',
                message: result.message || 'Could not fetch your performance data.',
                type: 'error'
            });
        }
      }
    } catch (error) {
      console.error("❌ [CLO] Network Error:", error);
      setAlertConfig({
          visible: true,
          title: 'Network Error',
          message: 'Unable to connect to the performance service.',
          type: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, userToken]);

  useEffect(() => {
    if (!authLoading && currentUserId) {
        fetchProgress();
    } else if (!authLoading && !currentUserId) {
        setLoading(false);
    }
  }, [fetchProgress, authLoading, currentUserId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProgress(true);
  };

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const chapters = progressData?.chapters ? Object.entries(progressData.chapters) : [];
  const filteredChapters = chapters.filter(([id, data]) =>
    data.chapter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.includes(searchQuery)
  );

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

        <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        >
            {/* LOGGED IN USER DEBUG HEADER */}
            <View style={[styles.userDebugCard, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
                <View style={styles.userDebugRow}>
                    <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
                    <Text style={[styles.userDebugLabel, { color: theme.text }]}>
                        Logged in as: <Text style={{fontWeight: 'bold'}}>{user?.name || 'Unknown User'}</Text>
                    </Text>
                </View>
                <Text style={[styles.userDebugId, { color: theme.textSecondary }]}>
                    User ID: {currentUserId || 'ID NOT FOUND'}
                </Text>
            </View>

            <Text style={[styles.mainTitle, { color: theme.text }]}>Performance</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Track your Course Learning Outcomes Progress</Text>

             <View style={[styles.searchContainer, {backgroundColor: theme.surface}]}>
                <Ionicons name="search-outline" size={22} color="#888" />
                <TextInput
                    style={{flex:1, marginLeft: 10, color: theme.text}}
                    placeholder="Search chapters..."
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {(loading || authLoading) ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{marginTop: 15, color: theme.textSecondary}}>Syncing your progress...</Text>
                </View>
            ) : progressData ? (
                <>
                    <View style={[styles.mainCard, {backgroundColor: theme.primary}]}>
                        <View style={{flex: 1}}>
                            <Text style={styles.mainCardTitle}>Overall Progress: {Math.round(progressData.overall_progress || 0)}%</Text>
                            <Text style={styles.mainCardText}>
                                Correct: {progressData.total_mcqs_correct || 0} / {progressData.total_mcqs_seen || 0} MCQs
                            </Text>
                        </View>
                        <View style={styles.overallBadge}>
                             <Ionicons name="trending-up-outline" size={32} color="#FFFFFF"/>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Learning History</Text>
                    <View style={[styles.subjectCard, {backgroundColor: theme.surface}]}>
                        {filteredChapters.length > 0 ? filteredChapters.map(([id, data]) => (
                            <ChapterDetails key={id} chapterId={id} chapterData={data} theme={theme} />
                        )) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="analytics-outline" size={48} color={theme.textSecondary} />
                                <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                                    {searchQuery ? "No matching chapters found." : "Take a test to see your performance breakdown!"}
                                </Text>
                            </View>
                        )}
                    </View>
                </>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} />
                    <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                        {!currentUserId ? "Authentication error: User ID missing." : "No performance records found."}
                    </Text>
                    <TouchableOpacity style={[styles.retryBtn, {backgroundColor: theme.primary}]} onPress={() => fetchProgress()}>
                        <Text style={{color: 'white', fontWeight: 'bold'}}>Reload Data</Text>
                    </TouchableOpacity>
                </View>
            )}

        </ScrollView>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="CloPerformance" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    logo: { marginRight: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    scrollContent: { padding: 20, paddingBottom: 50 },
    userDebugCard: { padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1 },
    userDebugRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    userDebugLabel: { fontSize: 14 },
    userDebugId: { fontSize: 11, marginLeft: 28, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    mainTitle: { fontSize: 26, fontWeight: 'bold' },
    subtitle: { fontSize: 16, marginBottom: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 15, marginBottom: 20 },
    mainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 20, marginBottom: 25 },
    mainCardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    mainCardText: { fontSize: 14, color: 'white', opacity: 0.9 },
    overallBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 5 },
    subjectCard: { borderRadius: 15, padding: 15, elevation: 2 },
    chapterContainer: { marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 10 },
    chapterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    chapterTitle: { flex: 1, fontSize: 15, fontWeight: 'bold' },
    topicsWrapper: { marginTop: 15, paddingLeft: 10 },
    topicContainer: { marginBottom: 15, paddingLeft: 15, borderLeftWidth: 2, borderColor: '#E0E0E0' },
    topicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    topicName: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 10 },
    progressBarContainer: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginVertical: 8, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 3 },
    topicStats: { fontSize: 12 },
    centerContainer: { height: 300, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    emptyText: { textAlign: 'center', marginTop: 15, fontSize: 16 },
    noDataText: { fontStyle: 'italic', fontSize: 13, padding: 10 },
    retryBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 10 }
});