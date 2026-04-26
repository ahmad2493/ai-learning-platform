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
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';
import Dropdown from '../components/Dropdown';
import MathView from '../components/MathView';
import { AI_BASE_URL } from '../utils/apiConfig';

// --- Data for Dropdowns ---
const CHAPTERS_DATA = {
  'Physics': [
    { label: 'Chapter 1: Physical Quantities and Measurement', value: '1' },
    { label: 'Chapter 2: Kinematics', value: '2' },
    { label: 'Chapter 3: Dynamics', value: '3' },
    { label: 'Chapter 4: Turning Effect of Forces', value: '4' },
    { label: 'Chapter 5: Gravitation', value: '5' },
    { label: 'Chapter 6: Work and Energy', value: '6' },
    { label: 'Chapter 7: Properties of Matter', value: '7' },
    { label: 'Chapter 8: Thermal Properties of Matter', value: '8' },
    { label: 'Chapter 9: Transfer of Heat', value: '9' },
  ],
};

const TOPICS_DATA = {
  '1': [
    { label: '1.1 Introduction to Physics', value: '1.1' },
    { label: '1.2 Physical Quantities', value: '1.2' },
    { label: '1.3 International System of Units', value: '1.3' },
    { label: '1.4 Prefixes', value: '1.4' },
    { label: '1.5 Scientific Notation', value: '1.5' },
    { label: '1.6 Measuring Instruments', value: '1.6' },
    { label: '1.7 Significant Figures', value: '1.7' },
  ],
  '2': [
    { label: '2.1 Rest and Motion', value: '2.1' },
    { label: '2.2 Types of Motion', value: '2.2' },
    { label: '2.3 Scalars and Vectors', value: '2.3' },
    { label: '2.4 Terms Associated with Motion', value: '2.4' },
    { label: '2.5 Graphical Analysis of Motion', value: '2.5' },
    { label: '2.6 Equations of Motion', value: '2.6' },
    { label: '2.7 Motion of Freely Falling Bodies', value: '2.7' },
  ],
  '3': [
    { label: '3.1 Force, Inertia and Momentum', value: '3.1' },
    { label: '3.2 Newtons Laws of Motion', value: '3.2' },
    { label: '3.3 Friction', value: '3.3' },
    { label: '3.4 Uniform Circular Motion', value: '3.4' },
  ],
  '4': [
    { label: '4.1 Parallel Forces', value: '4.1' },
    { label: '4.2 Addition of Forces', value: '4.2' },
    { label: '4.3 Resolution of Forces', value: '4.3' },
    { label: '4.4 Torque or Moment of a Force', value: '4.4' },
    { label: '4.5 Principle of Moments', value: '4.5' },
    { label: '4.6 Centre of Mass', value: '4.6' },
    { label: '4.7 Centre of Gravity', value: '4.7' },
    { label: '4.8 Couple', value: '4.8' },
    { label: '4.9 Equilibrium', value: '4.9' },
  ],
  '5': [
    { label: '5.1 The Law of Gravitation', value: '5.1' },
    { label: '5.2 Mass of the Earth', value: '5.2' },
    { label: '5.3 Variation of g with Altitude', value: '5.3' },
    { label: '5.4 Artificial Satellites', value: '5.4' },
  ],
  '6': [
    { label: '6.1 Work', value: '6.1' },
    { label: '6.2 Energy', value: '6.2' },
    { label: '6.3 Kinetic Energy', value: '6.3' },
    { label: '6.4 Potential Energy', value: '6.4' },
    { label: '6.5 Forms of Energy', value: '6.5' },
    { label: '6.6 Interconversion of Energy', value: '6.6' },
    { label: '6.7 Major Sources of Energy', value: '6.7' },
    { label: '6.8 Efficiency', value: '6.8' },
    { label: '6.9 Power', value: '6.9' },
  ],
  '7': [
    { label: '7.1 Kinetic Molecular Model', value: '7.1' },
    { label: '7.2 Density', value: '7.2' },
    { label: '7.3 Pressure', value: '7.3' },
    { label: '7.4 Atmospheric Pressure', value: '7.4' },
    { label: '7.5 Pressure in Liquids', value: '7.5' },
    { label: '7.6 Archimedes Principle', value: '7.6' },
    { label: '7.7 Principle of Floatation', value: '7.7' },
    { label: '7.8 Elasticity', value: '7.8' },
    { label: '7.9 Hookes Law', value: '7.9' },
  ],
  '8': [
    { label: '8.1 Temperature and Heat', value: '8.1' },
    { label: '8.2 Thermometer', value: '8.2' },
    { label: '8.3 Specific Heat Capacity', value: '8.3' },
    { label: '8.4 Latent Heat of Fusion', value: '8.4' },
    { label: '8.5 Latent Heat of Vaporization', value: '8.5' },
    { label: '8.6 Evaporation', value: '8.6' },
    { label: '8.7 Thermal Expansion', value: '8.7' },
  ],
  '9': [
    { label: '9.1 Transfer of Heat', value: '9.1' },
    { label: '9.2 Conduction', value: '9.2' },
    { label: '9.3 Convection', value: '9.3' },
    { label: '9.4 Radiation', value: '9.4' },
    { label: '9.5 Consequences of Radiation', value: '9.5' },
  ],
};

const YEARS = Array.from({ length: 11 }, (_, i) => ({ label: (2024 - i).toString(), value: (2024 - i).toString() }));

const BOARD_MAPPING = {
  'Lahore': 'LHR',
  'Multan': 'MLN',
  'Rawalpindi': 'RWP',
  'Sahiwal': 'SWL',
  'Sargodha': 'SGD',
  'Dera Ghazi Khan': 'DGK',
  'Bahawalpur': 'BWP',
  'Gujranwala': 'GRW',
  'Faisalabad': 'FSD'
};

const BOARDS = Object.keys(BOARD_MAPPING).map(b => ({ label: b, value: b }));


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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);

  const PAGE_SIZE = 5;

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  // --- Helper Functions ---

  /**
   * Renders content that may contain images (markdown format) or math expressions.
   * Uses MathView (KaTeX) for text and equations, and Expo Image for images.
   */
  const renderContentWithImages = (text, textStyle) => {
    if (!text) return null;

    // Flatten style to get color and fontSize
    const flattenedStyle = Array.isArray(textStyle) ? Object.assign({}, ...textStyle) : textStyle;
    const color = flattenedStyle?.color || theme.text;
    const fontSize = flattenedStyle?.fontSize || 16;

    // Pre-process: convert markdown bold to HTML bold for the MathView WebView
    let processedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Split logic for: Images markdown ![]()
    const parts = processedText.split(/(!\[\]\(.*?\))/g);

    return parts.map((part, i) => {
      // 1. Handle Images
      const imageMatch = part.match(/!\[\]\((.*?)\)/);
      if (imageMatch) {
        return (
          <Image
            key={i}
            source={{ uri: imageMatch[1] }}
            style={{ width: '100%', height: 250, borderRadius: 10, marginVertical: 12 }}
            contentFit="contain"
          />
        );
      }

      // 2. Handle Text and Math (using MathView)
      if (!part.trim()) return null;

      return (
        <MathView
          key={i}
          content={part}
          color={color}
          fontSize={fontSize}
        />
      );
    });
  };

  const chapterOptions = useMemo(() => CHAPTERS_DATA[subject] || [], [subject]);
  const topicOptions = useMemo(() => chapter ? (TOPICS_DATA[chapter] || []) : [], [chapter]);

  const handleClear = () => {
    setChapter(null);
    setTopic(null);
    setYear(null);
    setBoard(null);
    setResults(null);
    setTotal(0);
    setOffset(0);
    setError(null);
  };

  const buildPayload = (currentOffset) => {
    const payload = {
      chapter_no: parseInt(chapter),
      n_questions: 100,
      offset: currentOffset,
      page_size: PAGE_SIZE,
    };
    if (topic) payload.topic_numbers = [topic];
    if (board) payload.boards = [BOARD_MAPPING[board] || board];
    if (year) payload.years = [parseInt(year)];
    return payload;
  };

  const handleSearch = async () => {
    if (!chapter) {
      Alert.alert("Chapter Required", "Please select a chapter to find specific past paper questions.");
      return;
    }
    setIsLoading(true);
    setResults(null);
    setTotal(0);
    setOffset(0);
    setError(null);
    try {
      const response = await fetch(`${AI_BASE_URL}/past-papers/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(0)),
      });
      const data = await response.json();
      if (response.ok && data.questions) {
        setResults(data.questions);
        setTotal(data.total || 0);
        setOffset(PAGE_SIZE);
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

  const handleLoadMore = async () => {
    if (isLoadingMore || offset >= total) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`${AI_BASE_URL}/past-papers/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(offset)),
      });
      const data = await response.json();
      if (response.ok && data.questions) {
        setResults(prev => [...prev, ...data.questions]);
        setOffset(prev => prev + PAGE_SIZE);
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setIsLoadingMore(false);
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
                      setTopic(null);
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
              ) : results && Array.isArray(results) && results.length > 0 ? (
                <View>
                  {results.map((item, index) => {
                    const rawQuestion = item.question || item.question_text || "";
                    const rawAnswer   = item.answer   || item.answer_text   || "";
                    const options = item.options || [];

                    const hasMeaningfulAnswer = rawAnswer.trim().length > 1 &&
                                               rawAnswer.trim() !== "..." &&
                                               rawAnswer.trim() !== rawQuestion.trim();

                    return (
                      <View key={index} style={{ borderBottomColor: theme.background, borderBottomWidth: index === results.length - 1 ? 0 : 2, paddingBottom: 20, marginBottom: 20 }}>


                         <View style={{ marginBottom: 10 }}>
                            {renderContentWithImages(`**Q${index + 1}:** ${rawQuestion}`, [styles.resultsText, {color: theme.text, fontWeight: 'bold', fontSize: 17}])}
                         </View>

                         {options.length > 0 && (
                           <View style={{ marginTop: 10, marginLeft: 10 }}>
                             {options.map((opt, i) => (
                               <View key={i} style={{ marginBottom: 6 }}>
                                 {renderContentWithImages(opt, [styles.resultsText, {color: theme.text, fontSize: 15}])}
                               </View>
                             ))}
                           </View>
                         )}

                         {hasMeaningfulAnswer && (
                           <View style={{ marginTop: 12, backgroundColor: theme.background, padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: theme.primary }}>
                              <Text style={[styles.resultsText, {color: theme.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 6}]}>EXPLANATION / ANSWER:</Text>
                              <View>
                                {renderContentWithImages(rawAnswer, [styles.resultsText, {color: theme.text, lineHeight: 22}])}
                              </View>
                           </View>
                         )}
                      </View>
                    );
                  })}

                  {offset < total && (
                    <TouchableOpacity
                      onPress={handleLoadMore}
                      disabled={isLoadingMore}
                      style={{ alignItems: 'center', paddingVertical: 16, marginTop: 8, borderRadius: 12, backgroundColor: theme.primary + '15', borderWidth: 1, borderColor: theme.primary + '40' }}
                    >
                      {isLoadingMore ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 15 }}>
                          Load More
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                </View>
              ) : results && Array.isArray(results) && results.length === 0 ? (
                <View style={styles.centered}>
                  <Ionicons name="search-outline" size={60} color={theme.textSecondary} />
                  <Text style={[styles.noResultsTitle, {color: theme.text}]}>No Questions Found</Text>
                  <Text style={[styles.noResultsSubtitle, {color: theme.textSecondary}]}>Try adjusting your filters (Topic, Year, Board).</Text>
                </View>
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="folder-open-outline" size={60} color={theme.textSecondary} />
                  <Text style={[styles.noResultsTitle, {color: theme.text}]}>Search Past Papers</Text>
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
        minHeight: 200, 
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
