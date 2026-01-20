import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      const name = await AsyncStorage.getItem("userName");
      const email = await AsyncStorage.getItem("userEmail");
      if (name) setUserName(name);
      if (email) setUserEmail(email);
    };
    loadUserData();
  }, []);

  const getInitials = (name) => {
    const names = name.split(" ");
    return names
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Settings
          </Text>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <TouchableOpacity
            style={[styles.profileCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
          >
            <View style={styles.profileImageContainer}>
              <View
                style={[
                  styles.profileImage,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.profileInitials}>
                  {getInitials(userName)}
                </Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {userName}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.text }]}>
                {userEmail}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <View style={styles.settingsIconContainer}>
              <Ionicons name="notifications" size={28} color={theme.primary} />
              <View style={styles.notificationDot} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsTitle, { color: theme.text }]}>
                Notifications
              </Text>
              <Text style={[styles.settingsDescription, { color: theme.text }]}>
                Control alerts for reminders, course updates, and daily goals
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate("Security")}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsTitle, { color: theme.text }]}>
                Security
              </Text>
              <Text style={[styles.settingsDescription, { color: theme.text }]}>
                Manage your password, connected accounts, and privacy settings
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate("AboutApp")}
            activeOpacity={0.7}
          >
            <View style={styles.aboutIconContainer}>
              <Ionicons name="help-circle" size={28} color={theme.primary} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsTitle, { color: theme.text }]}>
                About App
              </Text>
              <Text style={[styles.settingsDescription, { color: theme.text }]}>
                View version number, terms & conditions, and privacy policy
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={toggleSidebar}
        activeScreen="Settings"
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
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
  profileCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
  },
  settingsCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsIconContainer: {
    position: "relative",
    marginRight: 15,
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  aboutIconContainer: {
    marginRight: 15,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  settingsDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
