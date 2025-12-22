import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnimation = React.useRef(new Animated.Value(0)).current;
  const sidebarWidth = 90;

  // Sample user data - you can replace this with actual user data
  const userName = "Brooklyn Simmons";
  const userEmail = "brooklyn234@gmail.com";

  // Close sidebar when navigating to different screens
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setSidebarVisible(false);
    });

    return unsubscribe;
  }, [navigation]);

  // Animate sidebar visibility
  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [sidebarVisible]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const handleNotificationPress = () => {
    closeSidebar();
    navigation.navigate("Notifications");
  };

  const handleSecurityPress = () => {
    closeSidebar();
    navigation.navigate("Security");
  };

  const handleAboutPress = () => {
    closeSidebar();
    navigation.navigate("AboutApp");
  };

  const handleLogout = () => {
    // Navigate back to SignIn screen (for testing)
    // In production, this should clear user session/tokens
    navigation.navigate("SignIn");
  };

  const handleSidebarNavigation = (screenName) => {
    closeSidebar();
    // Handle navigation to different screens via sidebar
    if (screenName === "Settings") {
      // Already on Settings screen
      return;
    }
    // Add navigation logic for other screens when they're created
    console.log(`Navigate to ${screenName}`);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.contentWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <Ionicons name="settings" size={24} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Settings
            </Text>
            <TouchableOpacity onPress={toggleSidebar}>
              <Ionicons name="menu" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View
            style={[styles.profileCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.profileImageContainer}>
              <View
                style={[
                  styles.profileImage,
                  { backgroundColor: theme.profileBackground },
                ]}
              >
                <Text style={styles.profileInitials}>BS</Text>
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
            <Ionicons name="grid" size={24} color={theme.primary} />
          </View>

          {/* Settings Cards */}
          <TouchableOpacity
            style={[styles.settingsCard, { backgroundColor: theme.surface }]}
            onPress={handleNotificationPress}
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
            onPress={handleSecurityPress}
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
            onPress={handleAboutPress}
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

      {/* Overlay - closes sidebar when tapped */}
      {sidebarVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      )}

      {/* Right Sidebar Navigation */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.primary,
            transform: [
              {
                translateX: sidebarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sidebarWidth, 0],
                }),
              },
            ],
            opacity: sidebarAnimation,
          },
        ]}
      >
        <View style={styles.sidebarIcons}>
          {/* Dashboard */}
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("Dashboard")}
          >
            <Ionicons name="grid-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* AI Assistant */}
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("AIAssistant")}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Test Generator */}
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("TestGenerator")}
          >
            <Ionicons name="book-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Study Materials */}
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("StudyMaterials")}
          >
            <Ionicons name="layers-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Progress */}
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("Progress")}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Settings (Active) */}
          <View style={[styles.sidebarIcon, styles.activeSidebarIcon]}>
            <Ionicons name="settings" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* Bottom Profile and Logout */}
        <View style={styles.sidebarBottom}>
          <View style={styles.sidebarProfile}>
            <View
              style={[
                styles.sidebarProfileImage,
                { backgroundColor: theme.profileBackground },
              ]}
            >
              <Text style={styles.sidebarProfileInitials}>BS</Text>
            </View>
            <Text style={styles.sidebarProfileName}>
              {userName.split(" ")[0]}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sidebarLogout}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sidebarLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingRight: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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
  logoutButton: {
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  sidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "#2D5016",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 15,
    zIndex: 2,
  },
  sidebarIcons: {
    flex: 1,
    alignItems: "center",
    gap: 20,
    marginTop: 20,
  },
  sidebarIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  activeSidebarIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  sidebarBottom: {
    alignItems: "center",
    gap: 15,
  },
  sidebarProfile: {
    alignItems: "center",
    gap: 8,
  },
  sidebarProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarProfileInitials: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  sidebarProfileName: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 5,
  },
  sidebarLogoutText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
