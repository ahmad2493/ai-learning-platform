import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../utils/apiConfig";

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnimation = React.useRef(new Animated.Value(0)).current;
  const sidebarWidth = 90;

  // User data state
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    loading: true,
  });

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem("authToken");
      
      if (!token) {
        // No token, redirect to login
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: () => navigation.replace("SignIn") }
        ]);
        return;
      }

      // Fetch user data from backend
      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success && data.data.user) {
        const user = data.data.user;
        const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || "User";
        const userEmail = user.email || "";
        
        setUserData({
          name: userName,
          email: userEmail,
          loading: false,
        });

        // Store user data locally for quick access
        await AsyncStorage.setItem("userName", userName);
        await AsyncStorage.setItem("userEmail", userEmail);
      } else {
        // Failed to fetch user data, try loading from cache
        const cachedName = await AsyncStorage.getItem("userName");
        const cachedEmail = await AsyncStorage.getItem("userEmail");
        
        setUserData({
          name: cachedName || "User",
          email: cachedEmail || "",
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      
      // Try to load from local storage as fallback
      const cachedName = await AsyncStorage.getItem("userName");
      const cachedEmail = await AsyncStorage.getItem("userEmail");
      
      setUserData({
        name: cachedName || "User",
        email: cachedEmail || "",
        loading: false,
      });
    }
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Get first name for sidebar
  const getFirstName = (name) => {
    if (!name) return "User";
    return name.split(" ")[0];
  };

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

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Get token before clearing (in case backend needs it)
              const token = await AsyncStorage.getItem("authToken");
              
              // Optional: Call backend logout endpoint
              if (token) {
                try {
                  await fetch(`${BASE_URL}/auth/logout`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  });
                } catch (backendError) {
                  // Backend logout failed, but continue with local logout
                  console.warn("Backend logout failed:", backendError);
                }
              }
              
              // Clear all stored data
              await AsyncStorage.multiRemove([
                "authToken",
                "user_id",
                "userName",
                "userEmail",
              ]);
              
              // Double-check: Clear all AsyncStorage (optional, more thorough)
              // await AsyncStorage.clear();
              
              // Navigate to SignIn with reset stack
              navigation.reset({
                index: 0,
                routes: [{ name: "SignIn" }],
              });
              
            } catch (error) {
              console.error("Error during logout:", error);
              
              // Even if there's an error, try to clear storage and navigate
              try {
                await AsyncStorage.clear();
              } catch (clearError) {
                console.error("Failed to clear storage:", clearError);
              }
              
              navigation.reset({
                index: 0,
                routes: [{ name: "SignIn" }],
              });
            }
          },
        },
      ]
    );
  };

  const handleSidebarNavigation = (screenName) => {
    closeSidebar();
    if (screenName === "Settings") {
      return;
    }
    console.log(`Navigate to ${screenName}`);
  };

  if (userData.loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
                <Text style={styles.profileInitials}>
                  {getInitials(userData.name)}
                </Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {userData.name}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.text }]}>
                {userData.email}
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

      {/* Overlay */}
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
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("Dashboard")}
          >
            <Ionicons name="grid-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("AIAssistant")}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("TestGenerator")}
          >
            <Ionicons name="book-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("StudyMaterials")}
          >
            <Ionicons name="layers-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("Progress")}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

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
              <Text style={styles.sidebarProfileInitials}>
                {getInitials(userData.name)}
              </Text>
            </View>
            <Text style={styles.sidebarProfileName}>
              {getFirstName(userData.name)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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