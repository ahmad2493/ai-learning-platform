import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';
import Dropdown from '../components/Dropdown';

export default function PastPapersScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [subject, setSubject] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [topic, setTopic] = useState(null);

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
            <Text style={[styles.mainTitle, { color: theme.text }]}>Past Papers</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Access past examination papers for practice</Text>

             <View style={[styles.searchContainer, {backgroundColor: theme.surface}]}>
                <Ionicons name="search-outline" size={22} color="#888" />
                <TextInput style={{flex:1, marginLeft: 10, color: theme.text}} placeholder="Search for past papers..." placeholderTextColor="#888"/>
                 <Ionicons name="notifications-outline" size={22} color="red" />
            </View>

            <View style={[styles.mainCard, {backgroundColor: theme.primary}]}>
                <View style={{flex: 1}}>
                    <Text style={styles.mainCardTitle}>Practice with Past Papers</Text>
                    <Text style={styles.mainCardText}>Find past examination papers by subject, chapter, and topic to enhance your preparation.</Text>
                </View>
                <Ionicons name="documents-outline" size={40} color="#FFFFFF"/>
            </View>

            <View style={[styles.filterContainer, {backgroundColor: theme.surface}]}>
                <Text style={[styles.filterTitle, {color: theme.text}]}>Filter Past Papers</Text>
                <Text style={styles.label}>Subject</Text>
                <Dropdown options={["Mathematics", "Physics", "Chemistry"]} selectedValue={subject} onValueChange={setSubject} placeholder="Select a subject" theme={theme} />
                <Text style={styles.label}>Chapter</Text>
                <Dropdown options={["Chapter 1", "Chapter 2", "Chapter 3"]} selectedValue={chapter} onValueChange={setChapter} placeholder="Select a chapter" theme={theme} />
                <Text style={styles.label}>Topic</Text>
                <Dropdown options={["Topic 1", "Topic 2", "Topic 3"]} selectedValue={topic} onValueChange={setTopic} placeholder="Select a topic" theme={theme} />
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.filterButton, {backgroundColor: theme.surface}]}>
                    <Ionicons name="close-outline" size={24} color={theme.text} />
                    <Text style={[styles.filterButtonText, {color: theme.text}]}>Clear Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, {backgroundColor: theme.primary}]}>
                    <Ionicons name="search-outline" size={24} color="white" />
                    <Text style={[styles.filterButtonText, {color: 'white'}]}>Search</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.resultsContainer, {backgroundColor: theme.surface}]}>
                <Ionicons name="folder-open-outline" size={60} color={theme.textSecondary} />
                <Text style={[styles.noResultsTitle, {color: theme.text}]}>No Papers Found</Text>
                <Text style={[styles.noResultsSubtitle, {color: theme.textSecondary}]}>Try adjusting your filters to find more papers</Text>
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
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 15, marginBottom: 20 },
    mainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 20, marginBottom: 20 },
    mainCardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    mainCardText: { fontSize: 14, color: 'white' },
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
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
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
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noResultsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    noResultsSubtitle: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
});