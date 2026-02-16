/**
 * AI Assistant Screen - Manages and displays chat history
 * Author: Momna Butt (BCSF22M021)
 *
 * Functionality:
 * - Fetches and displays a list of saved chat sessions from local storage.
 * - Refreshes the list automatically when the screen is focused.
 * - Allows users to start a new chat or open an existing one.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from '@react-navigation/native'; // Import the hook

const CHATS_STORAGE_KEY = "darsgah_user_chats";

export default function AiAssistantScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const isFocused = useIsFocused(); // Hook to check if screen is focused

  const fetchChatHistory = useCallback(async () => {
    try {
      const chatsJson = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      const chats = chatsJson ? JSON.parse(chatsJson) : [];
      // Sort chats by most recently updated
      chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setChatHistory(chats);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  }, []);

  useEffect(() => {
    // Fetch history every time the screen comes into focus
    if (isFocused) {
      fetchChatHistory();
    }
  }, [isFocused, fetchChatHistory]);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handleNewChat = () => {
    // Navigate to AiChatScreen without a chatId to start a new chat
    navigation.navigate("AiChat");
  };

  const openChat = (chatId) => {
    // Navigate to AiChatScreen with a specific chatId to load that conversation
    navigation.navigate("AiChat", { chatId });
  };

  const renderChatItem = ({ item }) => {
    const lastMessage = item.messages[item.messages.length - 1];
    const subtitle = lastMessage ? `${lastMessage.sender === 'user' ? 'You: ' : 'AI: '}${lastMessage.text.substring(0, 40)}...` : 'No messages yet';

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.chatItem, { backgroundColor: theme.surface }]}
        onPress={() => openChat(item.id)}
      >
        <Ionicons name={"chatbubble-ellipses-outline"} size={24} color={theme.text} />
        <View style={styles.chatTextContainer}>
          <Text style={[styles.chatTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.chatSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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

        <View style={styles.chatHistoryHeader}>
          <Text style={[styles.mainTitle, { color: theme.text }]}>Chat History</Text>
          <TouchableOpacity
            style={[styles.newChatButton, { backgroundColor: theme.primary }]}
            onPress={handleNewChat}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={chatHistory}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={theme.textSecondary} />
              <Text style={[styles.emptyText, {color: theme.textSecondary}]}>No chat history yet.</Text>
              <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>Start a new chat to begin.</Text>
            </View>
          )}
        />

      </View>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="AiAssistant" />
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
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", flex: 1, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  mainTitle: { fontSize: 26, fontWeight: "bold" },
  chatHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  newChatButton: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  newChatButtonText: { color: "white", fontWeight: "bold", marginLeft: 5 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  chatTextContainer: { marginLeft: 15, flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: "bold" },
  chatSubtitle: { fontSize: 14, marginTop: 4 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
