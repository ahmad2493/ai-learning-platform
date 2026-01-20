import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../utils/apiConfig";

export default function AiAssistantScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState({});

  useEffect(() => {
    const fetchChatHistory = async () => {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) return;

      try {
        const response = await fetch(`${BASE_URL}/chats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          // The backend should return data grouped by date
          setChatHistory(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      }
    };

    fetchChatHistory();
  }, []);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handleNewChat = () => {
    navigation.navigate("AiChat");
  };

  const renderChatHistory = () => {
    if (Object.keys(chatHistory).length === 0) {
      return <Text style={{color: theme.textSecondary, textAlign: 'center', marginTop: 20}}>No chat history yet.</Text>
    }

    return Object.keys(chatHistory).map((sectionTitle) => (
      <View key={sectionTitle} style={styles.historySection}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {sectionTitle}
        </Text>
        {chatHistory[sectionTitle].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.chatItem,
              {
                backgroundColor:
                  sectionTitle === "Today" ? "#DCE3D5" : theme.surface,
              },
            ]}
            onPress={() => navigation.navigate("AiChat", { chatId: item.id })}
          >
            <Ionicons name={item.icon || "chatbubble-ellipses-outline"} size={24} color={theme.text} />
            <View style={styles.chatTextContainer}>
              <Text style={[styles.chatTitle, { color: theme.text }]}>
                {item.title}
              </Text>
              <Text
                style={[styles.chatSubtitle, { color: theme.textSecondary }]}
              >
                {item.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>AI Assistant</Text>

            <TouchableOpacity onPress={toggleSidebar}>
                <Ionicons name="menu" size={24} color={theme.primary} />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.mainTitle, { color: theme.text }]}>
            AI Assistant
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Ask questions and get AI-powered explanations
          </Text>

          <View
            style={[styles.searchContainer, { backgroundColor: theme.surface }]}
          >
            <Ionicons
              name="search-outline"
              size={22}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search for topics, chapters..."
              style={[styles.searchInput, { color: theme.text }]}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.chatHistoryHeader}>
            <Text style={[styles.mainTitle, { color: theme.text }]}>
              Chat History
            </Text>
            <TouchableOpacity
              style={[styles.newChatButton, { backgroundColor: theme.primary }]}
              onPress={handleNewChat}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.newChatButtonText}>New Chat</Text>
            </TouchableOpacity>
          </View>

          {renderChatHistory()}
        </ScrollView>
      </View>
      <Sidebar
        isVisible={sidebarVisible}
        onClose={toggleSidebar}
        activeScreen="AiAssistant"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  contentWrapper: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 50 },
  mainTitle: { fontSize: 26, fontWeight: "bold" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 20 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  chatHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  newChatButton: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  newChatButtonText: { color: "white", fontWeight: "bold", marginLeft: 5 },
  historySection: { marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  chatTextContainer: { marginLeft: 15, flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: "bold" },
  chatSubtitle: { fontSize: 14, marginTop: 2 },
});
