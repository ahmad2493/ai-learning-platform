/**
 * AI Chat Screen - Chat Interface for AI Assistant
 * Author: Momna Butt (BCSF22M021)
 *
 * Functionality:
 * - Real-time chat interface for interacting with AI assistant
 * - Manages and saves chat history to local storage
 * - Loads existing chats or starts new ones
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHATS_STORAGE_KEY = "darsgah_user_chats";

const suggestedPrompts = [
  "Explain quantum physics",
  "what is inertia",
  'Short question 1.2',
];

export default function AiChatScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userName, setUserName] = useState("User");
  const [currentChatId, setCurrentChatId] = useState(null);
  const flatListRef = useRef();
  const sendButtonAnim = useRef(new Animated.Value(1)).current;

  // --- Helper Functions for AsyncStorage ---
  const loadChats = async () => {
    try {
      const chatsJson = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      return chatsJson ? JSON.parse(chatsJson) : [];
    } catch (e) { console.error("Failed to load chats.", e); return []; }
  };

  const saveChats = async (chats) => {
    try {
      await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    } catch (e) { console.error("Failed to save chats.", e); }
  };

  // --- Chat Logic ---
  useEffect(() => {
    const initializeChat = async () => {
      const name = await AsyncStorage.getItem("userName");
      setUserName(name || "User");

      const chatIdFromParams = route.params?.chatId;
      if (chatIdFromParams) {
        const allChats = await loadChats();
        const chatToLoad = allChats.find(c => c.id === chatIdFromParams);
        if (chatToLoad) {
          setMessages(chatToLoad.messages);
          setCurrentChatId(chatToLoad.id);
        }
      } else {
        const welcomeMessage = {
          id: "welcome-1",
          text: `Welcome back, ${name || "User"}!\nLet's start a new session.`,
          sender: "ai",
        };
        setMessages([welcomeMessage]);
        setCurrentChatId(null);
      }
    };
    initializeChat();
  }, [route.params?.chatId]);

  const handleSend = async (text = inputText) => {
    if (text.trim().length === 0 || isTyping) return;

    const userMessage = { id: Date.now().toString(), text, sender: "user" };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    let chatId = currentChatId;
    
    if (!chatId) {
      chatId = Date.now().toString();
      setCurrentChatId(chatId);
    }

    try {
      const aiServiceUrl = 'https://darsgah-rag-epbjg9dka5hmexaj.uaenorth-01.azurewebsites.net/api/ask';
      const response = await fetch(aiServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();

      let aiMessage;
      if (response.ok && data.answer) {
        aiMessage = { id: (Date.now() + 1).toString(), text: data.answer, sender: "ai" };
      } else {
        aiMessage = { id: (Date.now() + 1).toString(), text: "Sorry, I couldn't get a response. Please try again.", sender: "ai" };
      }
      
      setMessages(prev => [...prev, aiMessage]);

      // --- Save Conversation Logic ---
      const allChats = await loadChats();
      const chatIndex = allChats.findIndex(c => c.id === chatId);
      const finalMessages = messages.concat([userMessage, aiMessage]);

      if (chatIndex !== -1) {
        // Update existing chat
        allChats[chatIndex].messages = finalMessages;
        allChats[chatIndex].timestamp = new Date().toISOString();
      } else {
        // Create new chat
        const newChat = {
          id: chatId,
          title: text.length > 35 ? text.substring(0, 32) + "..." : text,
          messages: finalMessages,
          timestamp: new Date().toISOString(),
        };
        allChats.unshift(newChat); // Add to the beginning of the list
      }
      await saveChats(allChats);

    } catch (error) {
      const errorMessage = { id: (Date.now() + 1).toString(), text: "Network error. Please check your connection.", sender: "ai" };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handlePressIn = () => {
    if (isTyping) return;
    Animated.spring(sendButtonAnim, { toValue: 0.8, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    if (isTyping) return;
    Animated.spring(sendButtonAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === "ai" ? styles.aiBubble : styles.userBubble,
        { backgroundColor: item.sender === "ai" ? theme.primary : theme.surface },
      ]}
    >
      {item.sender === "ai" && (
        <View style={styles.aiIconContainer}>
          <Ionicons name="hardware-chip-outline" size={24} color="white" />
        </View>
      )}
      <Text style={[ styles.messageText, { color: item.sender === "ai" ? "white" : theme.text } ]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
          <View style={styles.headerLeft}>
              <Ionicons name="book" size={30} color={theme.primary} style={styles.logo} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>DarsGah</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate("AiAssistant")}>
              <Ionicons name="albums-outline" size={28} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSidebar}>
                <Ionicons name="menu" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
      </View>

      <KeyboardAvoidingView style={styles.flexContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          ListFooterComponent={isTyping ? <ActivityIndicator style={{ margin: 10 }} color={theme.primary} /> : null}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current.scrollToEnd({ animated: true })}
        />

        {messages.length <= 1 && (
          <View style={[styles.suggestionContainer, { backgroundColor: theme.background }]}>
            {suggestedPrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={[styles.suggestionChip, { backgroundColor: theme.surface }]}
                onPress={() => handleSend(prompt)}
                disabled={isTyping}
              >
                <Text style={[styles.suggestionText, { color: theme.text }]}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputSection, { backgroundColor: theme.surface }]}>
          <View style={[styles.textInputContainer, { backgroundColor: theme.background }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type Your Question Here..."
              placeholderTextColor="#999"
              multiline
              editable={!isTyping}
            />
            <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={isTyping}>
              <Animated.View style={[{ transform: [{ scale: sendButtonAnim }] }]}>
                <Ionicons name="send" size={24} color={isTyping ? theme.textSecondary : theme.primary} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="AiChat" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexContainer: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 15 },
  logo: { marginRight: 10 },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  messagesContainer: { flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12 },
  messageBubble: { borderRadius: 20, padding: 12, marginBottom: 10, maxWidth: "85%", flexDirection: "row", alignItems: "flex-start" },
  aiBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 5 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 5 },
  aiIconContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginRight: 8 },
  messageText: { fontSize: 16, lineHeight: 22, flex: 1 },
  inputSection: { paddingTop: 10, paddingHorizontal: 15, borderTopWidth: 1, paddingBottom: Platform.OS === "android" ? 15 : 30 },
  textInputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 25, paddingHorizontal: 15, minHeight: 50 },
  textInput: { flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 100, paddingVertical: 10 },
  sendButton: { marginLeft: 10, padding: 5 },
  suggestionContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10, paddingBottom: 10 },
  suggestionChip: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, margin: 5 },
  suggestionText: { fontSize: 14 },
});