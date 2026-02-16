/**
 * Past Papers Screen - Past Papers Access
 * Author: Momna Butt (BCSF22M021)
 *
 * Functionality:
 * - Allows filtering past papers by subject, chapter, topic, year, and board
 * - Constructs a query and sends it to the past paper RAG service
 * - Displays AI-generated results, loading states, and errors
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';
import Dropdown from '../components/Dropdown';

// --- Data for Dropdowns ---
const CHAPTERS_DATA = {
  'Physics': [
    { label: 'Chapter 1: Physical Quantities and Measurements', value: '1' },
    { label: 'Chapter 2: Kinematics', value: '2' },
    { label: 'Chapter 3: Dynamics', value: '3' },
  ],
};

const TOPICS_DATA = {
  '1': [{ label: 'Topic 1.1: Introduction to Physics', value: '1.1' }, { label: 'Topic 1.2: Physical Quantities', value: '1.2' }],
  '2': [{ label: 'Topic 2.1: Rectilinear Motion', value: '2.1' }, { label: 'Topic 2.2: Projectile Motion', value: '2.2' }],
  '3': [{ label: 'Topic 3.1: Newton’s Laws', value: '3.1' }, { label: 'Topic 3.2: Friction', value: '3.2' }],
};

const YEARS = Array.from({ length: 10 }, (_, i) => ({ label: (2023 - i).toString(), value: (2023 - i).toString() }));
const BOARDS = [
  'Lahore', 'Multan', 'Rawalpindi', 'Sahiwal', 'Sargodha', 
  'Dera Ghazi Khan', 'Bahawalpur', 'Gujranwala', 'Faisalabad'
].map(b => ({ label: b, value: b }));


export default function PastPapersScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Filter states
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState(null);
  const [topic, setTopic] = useState(null);
  const [year, setYear] = useState(null);
  const [board, setBoard] = useState(null);

  // API states
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  // Memoized options for performance
  const chapterOptions = useMemo(() => CHAPTERS_DATA[subject] || [], [subject]);
  const topicOptions = useMemo(() => chapter ? (TOPICS_DATA[chapter] || []) : [], [chapter]);

  const handleClear = () => {
    setChapter(null);
    setTopic(null);
    setYear(null);
    setBoard(null);
    setResults(null);
    setError(null);
  };

  const handleSearch = async () => {
    if (!chapter && !topic && !year && !board) {
      Alert.alert("No Filters Selected", "Please select at least one filter to start a search.");
      return;
    }

    setIsLoading(true);
    setResults(null);
    setError(null);

    // Construct the query string
    let queryParts = ["Give me past paper questions"];
    if (chapter) {
      const chapterLabel = chapterOptions.find(c => c.value === chapter)?.label;
      queryParts.push(`from ${chapterLabel}`);
    }
    if (topic) {
      const topicLabel = topicOptions.find(t => t.value === topic)?.label;
      queryParts.push(`on the topic of ${topicLabel}`);
    }
    if (year) {
      queryParts.push(`that came in the year ${year}`);
    }
    if (board) {
      queryParts.push(`in the ${board} board`);
    }
    const finalQuery = queryParts.join(', ') + '.';

    try {
      const aiServiceUrl = 'https://darsgah-rag-epbjg9dka5hmexaj.uaenorth-01.azurewebsites.net/api/ask-pastpaper';
      const response = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQuery }),
      });

      const data = await response.json();

      if (response.ok && data.answer) {
        setResults(data.answer);
      } else {
        setError(data.error || 'Failed to get a valid response from the server.');
      }
    } catch (e) {
      console.error("Past paper request error:", e);
      setError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const findLabel = (options, value) => options.find(o => o.value === value)?.label || null;

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

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.mainTitle, { color: theme.text }]}>Past Papers</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Access past examination papers for practice</Text>

            <View style={[styles.filterContainer, {backgroundColor: theme.surface}]}>
                <Text style={[styles.filterTitle, {color: theme.text}]}>Filter Past Papers</Text>
                
                <Text style={styles.label}>Subject</Text>
                <Dropdown options={['Physics']} selectedValue={subject} onValueChange={() => {}} placeholder="Select a subject" theme={theme} disabled={true} />
                
                <Text style={styles.label}>Chapter</Text>
                <Dropdown 
                    options={chapterOptions.map(c => c.label)} 
                    selectedValue={findLabel(chapterOptions, chapter)}
                    onValueChange={(label) => {
                      const selectedValue = chapterOptions.find(c => c.label === label)?.value;
                      setChapter(selectedValue);
                      setTopic(null); // Reset topic when chapter changes
                    }}
                    placeholder="Select a chapter" theme={theme} 
                />
                
                <Text style={styles.label}>Topic</Text>
                <Dropdown 
                    options={topicOptions.map(t => t.label)} 
                    selectedValue={findLabel(topicOptions, topic)}
                    onValueChange={(label) => {
                      const selectedValue = topicOptions.find(t => t.label === label)?.value;
                      setTopic(selectedValue);
                    }}
                    placeholder="Select a topic" theme={theme} disabled={!chapter} 
                />

                <Text style={styles.label}>Year</Text>
                <Dropdown 
                    options={YEARS.map(y => y.label)} 
                    selectedValue={findLabel(YEARS, year)}
                    onValueChange={(label) => {
                      const selectedValue = YEARS.find(y => y.label === label)?.value;
                      setYear(selectedValue);
                    }}
                    placeholder="Select a year" 
                    theme={theme} 
                />

                <Text style={styles.label}>Board</Text>
                <Dropdown 
                    options={BOARDS.map(b => b.label)} 
                    selectedValue={findLabel(BOARDS, board)}
                    onValueChange={(label) => {
                      const selectedValue = BOARDS.find(b => b.label === label)?.value;
                      setBoard(selectedValue);
                    }}
                    placeholder="Select a board" 
                    theme={theme} 
                />
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleClear} style={[styles.filterButton, {backgroundColor: theme.surface}]}>
                    <Ionicons name="close-outline" size={24} color={theme.text} />
                    <Text style={[styles.filterButtonText, {color: theme.text}]}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSearch} style={[styles.filterButton, {backgroundColor: theme.primary}]} disabled={isLoading}>
                    <Ionicons name="search-outline" size={24} color="white" />
                    <Text style={[styles.filterButtonText, {color: 'white'}]}>Search</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.resultsContainer, {backgroundColor: theme.surface}]}>
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.primary} />
              ) : error ? (
                <View style={styles.centered}>
                  <Ionicons name="alert-circle-outline" size={60} color={theme.danger} />
                  <Text style={[styles.errorTitle, {color: theme.danger}]}>An Error Occurred</Text>
                  <Text style={[styles.errorSubtitle, {color: theme.textSecondary}]}>{error}</Text>
                </View>
              ) : results ? (
                <ScrollView><Text style={[styles.resultsText, {color: theme.text}]}>{results}</Text></ScrollView>
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="folder-open-outline" size={60} color={theme.textSecondary} />
                  <Text style={[styles.noResultsTitle, {color: theme.text}]}>No Papers Found</Text>
                  <Text style={[styles.noResultsSubtitle, {color: theme.textSecondary}]}>Use the filters above to find past paper questions</Text>
                </View>
              )}
            </View>

        </ScrollView>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="PastPapers" />
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
    filterContainer: {
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    filterTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    label: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 5,
    },
    filterButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 10
    },
    resultsContainer: {
        borderRadius: 15,
        padding: 20,
        minHeight: 200, // Increased height for results
        justifyContent: 'center',
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    noResultsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        color: '#444',
    },
    noResultsSubtitle: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        color: '#666',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    errorSubtitle: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    resultsText: {
      fontSize: 16,
      lineHeight: 24,
    },
});