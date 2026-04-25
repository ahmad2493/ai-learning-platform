import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, ScrollView
} from "react-native";
import { Image } from 'expo-image';
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(route.params?.chatId || null);

  const flatListRef = useRef();
  const sendButtonAnim = useRef(new Animated.Value(1)).current;

  // Controlled scroll to end
  const scrollToBottom = (animated = true) => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      const chatIdFromParams = route.params?.chatId;
      if (chatIdFromParams) {
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
            // Scroll to bottom after loading history
            scrollToBottom(false);
          } else {
            setMessages([{ id: "error-1", text: "Could not load this chat session.", sender: "ai" }]);
          }
        } catch (e) {
          setMessages([{ id: "error-1", text: "Failed to load chat history.", sender: "ai" }]);
        } finally {
          setIsLoadingHistory(false);
        }
      } else {
        setMessages([
          { id: "welcome-1", text: "Let\'s start a new session.", sender: "ai" }
        ]);
        setCurrentChatId(null);
        setIsLoadingHistory(false);
      }
    };
    initializeChat();
  }, [route.params?.chatId, userToken]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !isLoadingHistory) {
      scrollToBottom(true);
    }
  }, [messages.length]);

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
          chatId: currentChatId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const aiMessage = { 
          id: (Date.now() + 1).toString(), 
          text: data.answer, 
          sender: "ai",
          figures: data.figures || [] 
        };
        setMessages(prev => [...prev, aiMessage]);

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

  const renderTable = (tableData) => {
    const lines = tableData.trim().split("\n");
    // Filter out separator lines like |---|---|
    const rowsData = lines
      .filter(line => !line.trim().match(/^\|[\s-]*\|[\s-|]*$/))
      .map(row => row.split("|").slice(1, -1));

    if (rowsData.length === 0) return null;

    // Determine the number of columns
    const numCols = Math.max(...rowsData.map(row => row.length));
    
    // Calculate required width for each column
    // Base width of 100, capped at 200, but adjusted for content
    const colWidths = Array(numCols).fill(100);
    rowsData.forEach(row => {
      row.forEach((cell, i) => {
        const contentLen = cell.trim().length;
        // Estimate 9 pixels per character + padding
        const estimatedWidth = Math.min(Math.max(contentLen * 9 + 25, 80), 200);
        if (estimatedWidth > colWidths[i]) {
          colWidths[i] = estimatedWidth;
        }
      });
    });

    return (
      <View key={`table-${Math.random()}`} style={[styles.tableOuterContainer, { borderColor: theme.inputBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableInnerContainer}>
            {rowsData.map((actualCells, rowIndex) => {
              return (
                <View 
                  key={rowIndex} 
                  style={[
                    styles.tableRow, 
                    { 
                      backgroundColor: rowIndex === 0 ? theme.primary + "15" : "transparent",
                      borderBottomWidth: rowIndex === rowsData.length - 1 ? 0 : 1,
                      borderBottomColor: theme.inputBorder 
                    }
                  ]}
                >
                  {actualCells.map((cell, cellIndex) => (
                    <View 
                      key={cellIndex} 
                      style={[
                        styles.tableCell, 
                        { 
                          width: colWidths[cellIndex], // Ensure fixed width for alignment
                          borderRightWidth: cellIndex === actualCells.length - 1 ? 0 : 1,
                          borderRightColor: theme.inputBorder,
                        }
                      ]}
                    >
                      <Text style={[styles.cellText, { color: theme.text, fontWeight: rowIndex === 0 ? "bold" : "normal" }]}>
                        {cell.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    const blocks = [];
    let currentTable = [];
    let currentText = [];

    lines.forEach((line) => {
      const isTableRow = line.trim().startsWith("|") && line.trim().includes("|", 1);
      
      if (isTableRow) {
        if (currentText.length > 0) {
          blocks.push({ type: 'text', content: currentText.join("\n") });
          currentText = [];
        }
        currentTable.push(line);
      } else {
        if (currentTable.length > 0) {
          blocks.push({ type: 'table', content: currentTable.join("\n") });
          currentTable = [];
        }
        currentText.push(line);
      }
    });

    if (currentText.length > 0) blocks.push({ type: 'text', content: currentText.join("\n") });
    if (currentTable.length > 0) blocks.push({ type: 'table', content: currentTable.join("\n") });

    return blocks.map((block, index) => {
      if (block.type === 'text') {
        const textContent = block.content.trim();
        if (!textContent) return null;
        return (
          <Text key={index} style={[styles.messageText, { color: theme.text }]}>
            {textContent}
          </Text>
        );
      } else {
        return renderTable(block.content);
      }
    });
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
        <View style={styles.textAndImageContainer}>
          {isUser ? (
            <Text style={[styles.messageText, { color: "#FFFFFF" }]}>
              {item.text}
            </Text>
          ) : (
            renderFormattedText(item.text)
          )}

          {!isUser && item.figures && item.figures.length > 0 && (
            <View style={styles.figuresContainer}>
              {item.figures.map((fig, idx) => (
                <View key={idx} style={styles.figureWrapper}>
                  {fig.urls && fig.urls.map((url, uIdx) => (
                    <View key={uIdx}>
                       <Image
                        source={{ uri: url }}
                        style={styles.figureImage}
                        contentFit="contain"
                      />
                      {fig.caption ? (
                        <Text style={[styles.captionText, { color: theme.textSecondary }]}>
                          {fig.figure_number ? `Fig ${fig.figure_number}: ` : ""}{fig.caption}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
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
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
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
  textAndImageContainer: { flex: 1 },
  messageText: { fontSize: 16, lineHeight: 22 },
  figuresContainer: { marginTop: 10 },
  figureWrapper: { marginBottom: 10 },
  figureImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#f0f0f0' },
  captionText: { fontSize: 12, fontStyle: 'italic', marginTop: 5, textAlign: 'center' },
  inputSection: { paddingTop: 10, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingBottom: Platform.OS === "android" ? 15 : 30 },
  textInputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 25, paddingHorizontal: 15, minHeight: 50 },
  textInput: { flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 100, paddingVertical: 10 },
  sendButton: { marginLeft: 10, padding: 5 },
  suggestionContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  suggestionChip: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, margin: 5 },
  suggestionText: { fontSize: 14 },
  
  // Table Styles
  tableOuterContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  tableInnerContainer: {
    flexDirection: "column",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "stretch", // Changed from center to stretch for uniform row height
  },
  tableCell: {
    padding: 10,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  cellText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
