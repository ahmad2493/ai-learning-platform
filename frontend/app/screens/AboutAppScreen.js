import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";

export default function AboutAppScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnimation = React.useRef(new Animated.Value(0)).current;
  const sidebarWidth = 90;
  
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Sample user data - you can replace this with actual user data
  const userName = "Brooklyn Simmons";

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

  const handleSidebarNavigation = (screenName) => {
    closeSidebar();
    if (screenName === "Settings") {
      navigation.navigate("Settings");
      return;
    }
    // Add navigation logic for other screens when they're created
    console.log(`Navigate to ${screenName}`);
  };

  const handleLogout = () => {
    closeSidebar();
    navigation.navigate("SignIn");
  };

  const handleTermsPress = () => {
    // Navigate to terms & conditions screen
    console.log("Navigate to Terms & Conditions");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.contentWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <View style={styles.headerIconContainer}>
              <Ionicons name="information-circle" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              About App
            </Text>
            <TouchableOpacity onPress={toggleSidebar}>
              <Ionicons name="menu" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

        {/* App Information */}
        <View style={styles.optionsContainer}>
          {/* App Version */}
          <View style={[styles.optionCard, { backgroundColor: theme.surface }]}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="lock-closed" size={24} color={theme.primary} />
            </View>
            <View style={styles.versionContainer}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                App version
              </Text>
              <Text style={[styles.versionText, { color: theme.text }]}>
                1.5.0
              </Text>
            </View>
          </View>

          {/* Terms & Conditions */}
          <View style={[styles.optionCard, { backgroundColor: theme.surface }]}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="document-text" size={24} color={theme.primary} />
            </View>
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={handleTermsPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Terms & Conditions
              </Text>
            </TouchableOpacity>
            <Switch
              value={termsAccepted}
              onValueChange={setTermsAccepted}
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor={termsAccepted ? "#FFFFFF" : "#f4f3f4"}
            />
          </View>
        </View>
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

          {/* Settings */}
          <TouchableOpacity
            style={styles.sidebarIcon}
            onPress={() => handleSidebarNavigation("Settings")}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingRight: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  headerIconContainer: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
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
  versionContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  versionText: {
    fontSize: 18,
    fontWeight: "600",
  },
  termsContainer: {
    flex: 1,
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

