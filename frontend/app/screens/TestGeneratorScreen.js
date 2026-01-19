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

export default function TestGeneratorScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [testType, setTestType] = useState('structured'); // 'structured' or 'prompt'
  const [questionTypes, setQuestionTypes] = useState({ mcqs: true, short: false, long: false });
  const [difficulty, setDifficulty] = useState('medium');

  const [subject, setSubject] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [topic, setTopic] = useState(null);
  const [numQuestions, setNumQuestions] = useState(null);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const renderRecentTests = () => {
    const recentTests = [
      { id: 1, title: 'Physics: Newtons Law', details: '15 MCQS | Medium', time: '2 hours ago' },
      { id: 2, title: 'Chemistry: Periodic table', details: '10 MCQS, 5SQs | Hard', time: 'yesterday' },
      { id: 3, title: 'Mathematics: Algebra', details: '20 MCQS | Easy', time: '3 days ago' },
    ];

    return recentTests.map(test => (
        <View key={test.id} style={[styles.recentTestCard, {backgroundColor: theme.surface}]}>
            <View style={{flex: 1}}>
                <Text style={[styles.recentTestTitle, {color: theme.text}]}>{test.title}</Text>
                <Text style={[styles.recentTestDetails, {color: theme.textSecondary}]}>{test.details}</Text>
                <Text style={[styles.recentTestTime, {color: theme.textSecondary}]}>Generated {test.time}</Text>
            </View>
            <View style={styles.recentTestActions}>
                <TouchableOpacity><Ionicons name="eye-outline" size={24} color={theme.primary} /></TouchableOpacity>
                <TouchableOpacity><Ionicons name="download-outline" size={24} color={theme.primary} /></TouchableOpacity>
                <TouchableOpacity><Ionicons name="refresh-outline" size={24} color={theme.primary} /></TouchableOpacity>
            </View>
        </View>
    ));
  }

  const Checkbox = ({ label, value, onValueChange }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onValueChange}>
        <Ionicons name={value ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} />
        <Text style={[styles.checkboxLabel, {color: theme.text}]}>{label}</Text>
    </TouchableOpacity>
  );

  const RadioButton = ({ label, value, selected, onSelect }) => (
    <TouchableOpacity style={styles.radioButtonContainer} onPress={onSelect}>
        <Ionicons name={value === selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.primary} />
        <Text style={[styles.radioLabel, {color: theme.text}]}>{label}</Text>
    </TouchableOpacity>
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.mainTitle, { color: theme.text }]}>Test Generator</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Create customized tests for any subject and topic</Text>

             <View style={[styles.searchContainer, {backgroundColor: theme.surface}]}>
                <Ionicons name="search-outline" size={22} color="#888" />
                <TextInput style={{flex:1, marginLeft: 10, color: theme.text}} placeholder="Search for topics, chapters..." placeholderTextColor="#888"/>
                 <Ionicons name="notifications-outline" size={22} color="red" />
            </View>

            <View style={[styles.mainCard, {backgroundColor: theme.primary}]}>
                <View style={{flex: 1}}>
                    <Text style={styles.mainCardTitle}>Generate custom tests in seconds</Text>
                    <Text style={styles.mainCardText}>Create personalized tests for any subject, chapter, or topic with AI-powered question generation.</Text>
                </View>
                <Ionicons name="document-text-outline" size={40} color="#FFFFFF"/>
            </View>

            <View style={styles.toggleContainer}>
                <TouchableOpacity 
                    style={[styles.toggleButton, testType === 'structured' && styles.activeButton, {backgroundColor: testType === 'structured' ? theme.primary : theme.surface}] } 
                    onPress={() => setTestType('structured')}>
                    <Text style={[styles.toggleText, testType === 'structured' && styles.activeText, {color: testType === 'structured' ? 'white': theme.text}]}>Structured</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.toggleButton, testType === 'prompt' && styles.activeButton, {backgroundColor: testType === 'prompt' ? theme.primary : theme.surface}]} 
                    onPress={() => setTestType('prompt')}>
                    <Text style={[styles.toggleText, testType === 'prompt' && styles.activeText, {color: testType === 'prompt' ? 'white': theme.text}]}>Prompt-Based</Text>
                </TouchableOpacity>
            </View>

            {testType === 'structured' ? (
                <View style={[styles.generatorContainer, {backgroundColor: theme.surface}]}>
                    <Text style={[styles.generatorTitle, {color: theme.text}]}>Structured Test Generator</Text>
                    <Text style={styles.label}>Subject</Text>
                    <Dropdown options={["Mathematics", "Physics", "Chemistry"]} selectedValue={subject} onValueChange={setSubject} placeholder="Select a subject" theme={theme} />
                    <Text style={styles.label}>Chapter</Text>
                    <Dropdown options={["Chapter 1", "Chapter 2", "Chapter 3"]} selectedValue={chapter} onValueChange={setChapter} placeholder="Select a chapter" theme={theme} />
                    <Text style={styles.label}>Topic</Text>
                    <Dropdown options={["Topic 1", "Topic 2", "Topic 3"]} selectedValue={topic} onValueChange={setTopic} placeholder="Select a topic" theme={theme} />
                    <Text style={styles.label}>Sub Topic (optional)</Text>
                    <TextInput style={styles.textInput} placeholder="e.g. Applications, formulas, examples..." placeholderTextColor="#888"/>
                    <Text style={styles.label}>Question Types</Text>
                    <Checkbox label="Multiple Choice (MCQs)" value={questionTypes.mcqs} onValueChange={() => setQuestionTypes({...questionTypes, mcqs: !questionTypes.mcqs})} />
                    <Checkbox label="Short Questions" value={questionTypes.short} onValueChange={() => setQuestionTypes({...questionTypes, short: !questionTypes.short})} />
                    <Checkbox label="Long Questions" value={questionTypes.long} onValueChange={() => setQuestionTypes({...questionTypes, long: !questionTypes.long})} />
                    <Text style={styles.label}>No of Questions</Text>
                    <Dropdown options={["5", "10", "15", "20"]} selectedValue={numQuestions} onValueChange={setNumQuestions} placeholder="Select number of questions" theme={theme} />
                    <Text style={styles.label}>Difficulty Level</Text>
                    <RadioButton label="Low" value="low" selected={difficulty} onSelect={() => setDifficulty('low')} />
                    <RadioButton label="Medium" value="medium" selected={difficulty} onSelect={() => setDifficulty('medium')} />
                    <RadioButton label="Hard" value="hard" selected={difficulty} onSelect={() => setDifficulty('hard')} />
                </View>
            ) : (
                <View style={[styles.generatorContainer, {backgroundColor: theme.surface}]}>
                    <Text style={[styles.generatorTitle, {color: theme.text}]}>Prompt-Based Generator</Text>
                    <Text style={[styles.promptLabel, {color: theme.textSecondary}]}>Describe Your Test</Text>
                    <TextInput
                        style={[styles.promptInput, {borderColor: theme.hairline, color: theme.text}]}
                        placeholder="e.g., Mathematics calculus integration with 20 MCQs at easy difficulty level"
                        placeholderTextColor="#888"
                        multiline
                    />
                </View>
            )}

            <TouchableOpacity style={[styles.generateButton, {backgroundColor: theme.primary}]}>
                <Ionicons name="flash-outline" size={24} color="white" />
                <Text style={styles.generateButtonText}>Generate Test</Text>
            </TouchableOpacity>


            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Recent Tests</Text>
            {renderRecentTests()}

        </ScrollView>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="TestGenerator" />
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
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        padding: 15,
        alignItems: 'center',
    },
    activeButton: {},
    toggleText: {
        fontWeight: 'bold',
        fontSize: 16
    },
    activeText: {
        color: 'white'
    },
    generatorContainer: {
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    generatorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    promptLabel: {
        fontSize: 14,
        marginBottom: 5
    },
    promptInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        textAlignVertical: 'top',
        minHeight: 100,
        fontSize: 16,
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        padding: 15,
    },
    generateButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    recentTestCard: {
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center'
    },
    recentTestTitle: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    recentTestDetails: {
        fontSize: 14,
        marginTop: 4
    },
    recentTestTime: {
        fontSize: 12,
        marginTop: 8
    },
    recentTestActions: {
        flexDirection: 'row',
        gap: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 15,
        marginBottom: 15,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    checkboxLabel: {
        marginLeft: 10,
        fontSize: 16,
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    radioLabel: {
        marginLeft: 10,
        fontSize: 16,
    }
});