import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../utils/apiConfig";
import { useIsFocused } from '@react-navigation/native';
import CustomAlert from "../components/CustomAlert"; // Import the custom alert

export default function AiAssistantScreen({ navigation }) {
  const { theme } = useTheme();
  const { userToken } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const isFocused = useIsFocused();

  // ADDED: State for managing the custom alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const fetchChatHistory = useCallback(async () => {
    if (!userToken) return;
    try {
      const response = await fetch(`${BASE_URL}/chat/history`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setChatHistory(data.data);
      } else {
        setAlertConfig({ title: 'Error', message: data.message || 'Failed to fetch history', type: 'error' });
        setAlertVisible(true);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setAlertConfig({ title: 'Error', message: 'Could not connect to the server.', type: 'error' });
      setAlertVisible(true);
    }
  }, [userToken]);

  useEffect(() => {
    if (isFocused) {
      fetchChatHistory();
    }
  }, [isFocused, fetchChatHistory]);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handleNewChat = () => {
    navigation.navigate("AiChat");
  };

  const openChat = (chatId) => {
    navigation.navigate("AiChat", { chatId });
  };

  // MODIFIED: handleDelete to use the custom alert
  const handleDelete = (chatId) => {
    setAlertConfig({
      title: "Delete Chat",
      message: "Are you sure you want to delete this chat session? This action cannot be undone.",
      type: 'confirm',
      onConfirm: async () => {
        setAlertVisible(false); // Close the alert immediately
        try {
          const response = await fetch(`${BASE_URL}/chat/${chatId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${userToken}`,
            },
          });
          const data = await response.json();
          if (data.success) {
            fetchChatHistory(); // Refresh the list
            // Optional: Show a success message
            // setAlertConfig({ title: 'Success', message: 'Chat deleted!', type: 'success' });
            // setAlertVisible(true);
          } else {
            setAlertConfig({ title: 'Error', message: data.message || 'Failed to delete chat.', type: 'error' });
            setAlertVisible(true);
          }
        } catch (error) {
          console.error("Failed to delete chat session:", error);
          setAlertConfig({ title: 'Error', message: 'An error occurred while deleting the chat.', type: 'error' });
          setAlertVisible(true);
        }
      },
    });
    setAlertVisible(true);
  };

  const renderChatItem = ({ item }) => (
    <View style={[styles.chatItem, { backgroundColor: theme.surface }]}>
      <TouchableOpacity style={styles.chatItemTouchable} onPress={() => openChat(item._id)}>
        <Ionicons name={"chatbubble-ellipses-outline"} size={24} color={theme.text} />
        <View style={styles.chatTextContainer}>
          <Text style={[styles.chatTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.chatSubtitle, { color: theme.textSecondary }]}>
            Last updated: {new Date(item.updatedAt).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
        <Ionicons name="trash-outline" size={24} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ADDED: The CustomAlert component instance */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
        onConfirm={alertConfig.onConfirm} 
      />

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
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No chat history yet.</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Start a new chat to begin.</Text>
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
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  chatItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  chatTextContainer: { marginLeft: 15, flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: "bold" },
  chatSubtitle: { fontSize: 14, marginTop: 4 },
  deleteButton: {
    padding: 15,
  },
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