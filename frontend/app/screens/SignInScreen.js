import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { BASE_URL } from "../utils/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import CustomAlert from "../components/CustomAlert";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error",
  });

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const validateFields = () => {
    const newErrors = {};
    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle deep link callback from OAuth
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const { path, queryParams } = Linking.parse(event.url);

      if (path === "auth/callback" && queryParams?.token) {
        try {
          await AsyncStorage.setItem("authToken", queryParams.token);

          if (queryParams.user_id) {
            await AsyncStorage.setItem("user_id", queryParams.user_id);
          }

          // Fetch full user data
          const response = await fetch(`${BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${queryParams.token}`,
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
          });

          const userData = await response.json();

          if (userData.success && userData.data.user) {
            const user = userData.data.user;
            await AsyncStorage.setItem("user_id", user.user_id);
            await AsyncStorage.setItem("mongo_user_id", user._id); // ✅ ADDED
            await AsyncStorage.setItem(
              "userName",
              user.name ||
                `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            );
            await AsyncStorage.setItem("userEmail", user.email);
            showAlert("Success", "Login successful!", "success");
          } else {
            showAlert("Error", "Failed to fetch user data");
          }
        } catch (error) {
          console.error("Error handling OAuth callback:", error);
          showAlert("Error", "Failed to complete login");
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  const handleSignIn = async () => {
    console.log('🔐 [SIGNIN] ========== SIGNIN PROCESS STARTED ==========');
    console.log('🔐 [SIGNIN] Email:', email);

    if (!validateFields()) {
      console.log('❌ [SIGNIN] Validation failed');
      return;
    }

    try {
      console.log('🌐 [SIGNIN] Sending login request...');

      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log('📥 [SIGNIN] Response status:', response.status);

      const result = await response.json();
      console.log('📥 [SIGNIN] Response data:', result);

      if (!response.ok) {
        console.log('❌ [SIGNIN] Login failed:', result.message);
        showAlert("Error", result.message);
        return;
      }

      // SUCCESS
      const { token } = result.data;
      console.log('✅ [SIGNIN] Login successful, token received');

      // Store token with consistent key name
      await AsyncStorage.setItem("authToken", token);

      // Fetch full user data
      console.log('📥 [SIGNIN] Fetching user data...');
      const meResponse = await fetch(`${BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      const meData = await meResponse.json();
      console.log('📥 [SIGNIN] User data:', meData);

      if (meData.success && meData.data.user) {
        const user = meData.data.user;
        await AsyncStorage.setItem("user_id", user.user_id); // Custom ID (USR000035)
        await AsyncStorage.setItem("mongo_user_id", user._id); // ✅ ADDED - MongoDB ObjectId
        await AsyncStorage.setItem(
          "userName",
          user.name ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        );
        await AsyncStorage.setItem("userEmail", user.email);
        console.log('✅ [SIGNIN] User data saved to AsyncStorage');
        console.log('✅ [SIGNIN] Stored user_id:', user.user_id);
        console.log('✅ [SIGNIN] Stored mongo_user_id:', user._id);
      }

      showAlert("Success", "Login successful!", "success");
    } catch (error) {
      console.error('❌ [SIGNIN] Login error:', error);
      console.error('❌ [SIGNIN] Error message:', error.message);
      showAlert("Error", "Server error. Try again.");
    }
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  const handleGoogleSignIn = async () => {
    try {
      const authUrl = `${BASE_URL}/auth/google/signin`;

      console.log("Opening Google OAuth URL:", authUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        "darsgah://auth/callback",
      );

      console.log("OAuth result:", result);

      if (result.type === "cancel") {
        showAlert("Cancelled", "Google sign-in was cancelled");
      }
    } catch (error) {
      console.error("Google Sign In Error:", error);
      showAlert("Error", "Failed to sign in with Google");
    }
  };

  const handleFacebookSignIn = () => {
    // Handle Facebook sign in
    console.log("Facebook Sign In");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => {
          setAlertVisible(false);
          if (alertConfig.type === "success") {
            navigation.navigate("StudentDashboard");
          }
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Ionicons name="book" size={50} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>
            Join DarsGah
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Learn smarter, achieve more.
          </Text>
        </View>

        {/* White Card Container */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Tabs */}
          <View
            style={[
              styles.tabsContainer,
              { backgroundColor: theme.inputBackground },
            ]}
          >
            <TouchableOpacity
              style={[styles.tab, styles.inactiveTab]}
              onPress={handleSignUp}
            >
              <Text style={[styles.inactiveTabText, { color: theme.primary }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                styles.activeTab,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.activeTabText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.email ? "red" : theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email)
                  setErrors((prev) => ({ ...prev, email: false }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.password ? "red" : theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: false }));
              }}
              secureTextEntry
            />

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPasswordContainer}
            >
              <Text
                style={[styles.forgotPasswordText, { color: theme.primary }]}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, { backgroundColor: theme.primary }]}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            {/* OR Separator */}
            <View style={styles.separator}>
              <View
                style={[
                  styles.separatorLine,
                  { backgroundColor: theme.inputBorder },
                ]}
              />
              <Text
                style={[styles.separatorText, { color: theme.textSecondary }]}
              >
                OR
              </Text>
              <View
                style={[
                  styles.separatorLine,
                  { backgroundColor: theme.inputBorder },
                ]}
              />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={handleFacebookSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>
                Continue with Facebook
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 25,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    // backgroundColor applied inline
  },
  inactiveTab: {
    backgroundColor: "transparent",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  inactiveTabText: {
    fontWeight: "600",
    fontSize: 16,
  },
  form: {
    width: "100%",
  },
  input: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 15,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
});