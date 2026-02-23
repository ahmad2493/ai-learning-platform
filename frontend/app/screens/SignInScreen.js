import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useTheme } from "../utils/ThemeContext";
import { BASE_URL } from "../utils/apiConfig";
import CustomAlert from "../components/CustomAlert";
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen({ navigation }) {
  const { theme } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "", type: "error" });
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const { path, queryParams } = Linking.parse(event.url);
      if (path === "auth/callback" && queryParams?.token) {
        setIsLoading(true);
        try {
          await signIn(queryParams.token);
        } catch (error) {
          showAlert("Error", `Google Sign-In failed: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    const subscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });
    return () => subscription.remove();
  }, [signIn]);

  const handleSignIn = async () => {
    if (!validateFields()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        showAlert("Error", result.message || "Invalid credentials.");
        return;
      }
      
      if (result.requiresTwoFactor) {
        navigation.navigate('OtpVerification', { email, password, verificationType: 'TWO_FACTOR_LOGIN' });
        return;
      }

      const { token } = result.data;

      if (token) {
        await signIn(token);
      } else {
        showAlert("Error", "Login failed: No token received.");
      }
    } catch (error) {
      showAlert("Error", `Login failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const authUrl = `${BASE_URL}/auth/google/signin`;
      await WebBrowser.openAuthSessionAsync(authUrl, "darsgah://auth/callback");
    } catch (error) {
      showAlert("Error", "Failed to start Google Sign-In.");
    }
  };

  const handleSignUp = () => navigation.navigate("SignUp");
  const handleForgotPassword = () => navigation.navigate("ForgotPassword");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="book" size={50} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Join DarsGah</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Learn smarter, achieve more.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.tabsContainer, { backgroundColor: theme.inputBackground }]}>
            <TouchableOpacity style={[styles.tab, styles.inactiveTab]} onPress={handleSignUp}>
              <Text style={[styles.inactiveTabText, { color: theme.primary }]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, styles.activeTab, { backgroundColor: theme.primary }]}>
              <Text style={styles.activeTabText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[ styles.input, { backgroundColor: theme.inputBackground, borderColor: errors.email ? "red" : theme.inputBorder, color: theme.text } ]}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: false }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[ styles.input, { backgroundColor: theme.inputBackground, borderColor: errors.password ? "red" : theme.inputBorder, color: theme.text } ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: false }));
              }}
              secureTextEntry
            />

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[ styles.signInButton, { backgroundColor: theme.primary }, isLoading && styles.disabledButton, ]} onPress={handleSignIn} activeOpacity={0.8} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.separator}>
              <View style={[styles.separatorLine, { backgroundColor: theme.inputBorder }]} />
              <Text style={[styles.separatorText, { color: theme.textSecondary }]}>OR</Text>
              <View style={[styles.separatorLine, { backgroundColor: theme.inputBorder }]} />
            </View>

            <TouchableOpacity style={[ styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.inputBorder } ]} onPress={handleGoogleSignIn} activeOpacity={0.8}>
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 28, fontWeight: "bold", marginTop: 15, marginBottom: 5 },
  subtitle: { fontSize: 16 },
  card: { borderRadius: 20, padding: 20, marginBottom: 20 },
  tabsContainer: { flexDirection: "row", marginBottom: 25, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  activeTab: {},
  inactiveTab: { backgroundColor: "transparent" },
  activeTabText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  inactiveTabText: { fontWeight: "600", fontSize: 16 },
  form: { width: "100%" },
  input: { borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1 },
  forgotPasswordContainer: { alignSelf: "flex-start", marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, fontWeight: "600" },
  signInButton: { borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
  signInButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  separator: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  separatorLine: { flex: 1, height: 1 },
  separatorText: { marginHorizontal: 15, fontSize: 14 },
  socialButton: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 12 },
  socialButtonText: { marginLeft: 12, fontSize: 16, fontWeight: "500" },
  disabledButton: { backgroundColor: "#CCCCCC" },
});
