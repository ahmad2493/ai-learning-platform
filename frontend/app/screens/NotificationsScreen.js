/**
 * Notifications Screen - Notification Preferences
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Manages notification preferences and settings
 * - Allows users to enable/disable notification types
 * - Controls reminders and course update notifications
 * - Saves notification preferences
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [dailyGoals, setDailyGoals] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Notifications
          </Text>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.optionsContainer}>
            <View
              style={[styles.optionCard, { backgroundColor: theme.surface }]}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="alarm" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Reminders
              </Text>
              <Switch
                value={reminders}
                onValueChange={setReminders}
                trackColor={{ false: "#767577", true: theme.primary }}
                thumbColor={reminders ? "#FFFFFF" : "#f4f3f4"}
              />
            </View>

            <View
              style={[styles.optionCard, { backgroundColor: theme.surface }]}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="book" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Course updates
              </Text>
              <Switch
                value={courseUpdates}
                onValueChange={setCourseUpdates}
                trackColor={{ false: "#767577", true: theme.primary }}
                thumbColor={courseUpdates ? "#FFFFFF" : "#f4f3f4"}
              />
            </View>

            <View
              style={[styles.optionCard, { backgroundColor: theme.surface }]}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="flag" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Daily goals
              </Text>
              <Switch
                value={dailyGoals}
                onValueChange={setDailyGoals}
                trackColor={{ false: "#767577", true: theme.primary }}
                thumbColor={dailyGoals ? "#FFFFFF" : "#f4f3f4"}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      <Sidebar
        isVisible={sidebarVisible}
        onClose={toggleSidebar}
        activeScreen="Notifications"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  contentWrapper: {
    flex: 1,
  },
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
    textAlign: "center",
  },
  scrollContent: {
    padding: 20,
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    marginRight: 15,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
});