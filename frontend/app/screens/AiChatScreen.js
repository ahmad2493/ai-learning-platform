import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../utils/apiConfig";

const suggestedPrompts = [
  "Explain quantum physics",
  "what is inertia",
  'Short question 1.2',
];

export default function AiChatScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { userToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // New state for loading history
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(route.params?.chatId || null);

  const flatListRef = useRef();
  const sendButtonAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const initializeChat = async () => {
      const chatIdFromParams = route.params?.chatId;
      if (chatIdFromParams) {
        // --- THIS IS THE NEW LOGIC TO LOAD AN EXISTING CHAT ---
        setIsLoadingHistory(true);
        try {
          const response = await fetch(`${BASE_URL}/chat/${chatIdFromParams}`,
            {
              headers: { 'Authorization': `Bearer ${userToken}` },
            }
          );
          const data = await response.json();
          if (data.success) {
            setMessages(data.data.messages);
            setCurrentChatId(data.data._id);
          } else {
            // Handle case where chat is not found or user is not authorized
            setMessages([{ id: "error-1", text: "Could not load this chat session.", sender: "ai" }]);
          }
        } catch (e) {
          setMessages([{ id: "error-1", text: "Failed to load chat history.", sender: "ai" }]);
        } finally {
          setIsLoadingHistory(false);
        }
      } else {
        // This is a new chat
        setMessages([
          { id: "welcome-1", text: "Let\'s start a new session.", sender: "ai" }
        ]);
        setCurrentChatId(null);
        setIsLoadingHistory(false);
      }
    };
    initializeChat();
  }, [route.params?.chatId, userToken]);

  const handleSend = async (text = inputText) => {
    if (text.trim().length === 0 || isTyping) return;

    const userMessage = { id: Date.now().toString(), text, sender: "user" };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch(`${BASE_URL}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          message: text,
          chatId: currentChatId // This will be null for new chats, or a valid ID for existing ones
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const aiMessage = { id: (Date.now() + 1).toString(), text: data.answer, sender: "ai" };
        setMessages(prev => [...prev, aiMessage]);

        // --- THIS IS THE FIX ---
        // If this was a new chat, the backend sends back the new official ID.
        // We must update our state to use this ID for all future messages in this session.
        if (!currentChatId && data.chatId) {
          setCurrentChatId(data.chatId);
        }
      } else {
        throw new Error(data.message || "An error occurred.");
      }
    } catch (error) {
      const errorMessage = { id: (Date.now() + 1).toString(), text: error.message || "Network error.", sender: "ai" };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handlePressIn = () => {
    Animated.spring(sendButtonAnim, {
      toValue: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(sendButtonAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

   const renderMessage = ({ item }) => {
       const isUser = item.sender === "user";
       return (
         <View
           style={[
             styles.messageBubble,
             isUser ? styles.userBubble : styles.aiBubble,
             { backgroundColor: isUser ? theme.primary : theme.surface },
           ]}
         >
           {!isUser && (
             <View style={[styles.aiIconContainer, { backgroundColor: theme.iconBackground }]}>
               <Ionicons name="hardware-chip-outline" size={16} color={theme.primary} />
             </View>
           )}
           <Text style={[styles.messageText, { color: isUser ? "#FFFFFF" : theme.text }]}>
                      {item.text}
           </Text>
         </View>
       );
   };
  if (isLoadingHistory) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

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
                keyExtractor={(item, index) => item.id || item._id || index.toString()}
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

// ... Your full styles object from before ...
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
  inputSection: { paddingTop: 10, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingBottom: Platform.OS === "android" ? 15 : 30 },
  textInputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 25, paddingHorizontal: 15, minHeight: 50 },
  textInput: { flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 100, paddingVertical: 10 },
  sendButton: { marginLeft: 10, padding: 5 },
  suggestionContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  suggestionChip: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, margin: 5 },
  suggestionText: { fontSize: 14 },
});
