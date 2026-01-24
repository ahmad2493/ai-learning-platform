/**
 * Sign Up Screen - User Registration
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - User registration interface with form validation
 * - Collects user information (name, email, password, etc.)
 * - Handles OTP verification for email confirmation
 * - Displays terms and conditions
 * - Navigates to login after successful registration
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { BASE_URL } from "../utils/apiConfig";
import CustomAlert from "../components/CustomAlert";
import { termsAndConditionsText } from "../constants/legalText";

export default function SignUpScreen({ navigation }) {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error",
  });
  const [errors, setErrors] = useState({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const validateFields = () => {
    const newErrors = {};
    if (!fullName) newErrors.fullName = true;
    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;
    if (!confirmPassword) newErrors.confirmPassword = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    console.log('🚀 [SIGNUP] ========== SIGNUP PROCESS STARTED ==========');
    console.log('🚀 [SIGNUP] BASE_URL:', BASE_URL);
    console.log('🚀 [SIGNUP] Full endpoint:', `${BASE_URL}/auth/register`);

    if (!validateFields()) {
      console.log('❌ [SIGNUP] Validation failed - missing fields');
      return;
    }

    if (!agreeToTerms) {
      console.log('❌ [SIGNUP] Terms not agreed');
      showAlert("Error", "You must agree to the Terms & Conditions");
      return;
    }

    if (password !== confirmPassword) {
      console.log('❌ [SIGNUP] Passwords do not match');
      showAlert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);

    const requestBody = {
      email: email,
      password: password,
      confirmPassword: confirmPassword,
      name: fullName,
    };

    console.log('📤 [SIGNUP] Request body:', requestBody);

    try {
      console.log('🌐 [SIGNUP] Sending fetch request...');

      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 [SIGNUP] Response received');
      console.log('📥 [SIGNUP] Response status:', response.status);

      const data = await response.json();
      console.log('📥 [SIGNUP] Response data:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('✅ [SIGNUP] OTP sent successfully!');
        console.log('✅ [SIGNUP] TempUserId:', data.data.tempUserId);

        setTempUserId(data.data.tempUserId);

        console.log('🧭 [SIGNUP] Navigating to OTP verification screen');
        navigation.navigate("OtpVerification", {
          email: email,
          name: fullName,
          password: password,
          tempUserId: data.data.tempUserId,
          verificationType: "REGISTRATION",
        });
      } else {
        console.log('❌ [SIGNUP] Registration failed:', data.message);
        showAlert("Registration failed", data.message || "Please try again.");
      }
    } catch (error) {
      console.error("❌ [SIGNUP] Fetch error:", error);
      console.error("❌ [SIGNUP] Error message:", error.message);
      showAlert("Error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  const handleGoogleSignIn = () => {
    console.log("Google Sign In");
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleAcceptAndClose = () => {
    setAgreeToTerms(true);
    closeModal();
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
        onClose={() => setAlertVisible(false)}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="book" size={50} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>
            Join DarsGah
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Learn smarter, achieve more.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.tabsContainer,
              { backgroundColor: theme.inputBackground },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                styles.activeTab,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.activeTabText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, styles.inactiveTab]}
              onPress={handleSignIn}
            >
              <Text style={[styles.inactiveTabText, { color: theme.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.fullName ? "red" : theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName)
                  setErrors((prev) => ({ ...prev, fullName: false }));
              }}
            />
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
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.confirmPassword
                    ? "red"
                    : theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Confirm Password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: false }));
              }}
              secureTextEntry
            />

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                {agreeToTerms ? (
                  <Ionicons name="checkbox" size={20} color={theme.primary} />
                ) : (
                  <Ionicons
                    name="square-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                  I agree the{" "}
                  <Text style={[styles.termsLink, { color: theme.primaryLight }]}>
                    Terms & Conditions
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.createAccountButton,
                {
                  backgroundColor: agreeToTerms ? theme.primary : "#CCCCCC",
                },
                isLoading && styles.disabledButton,
              ]}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={!agreeToTerms || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createAccountButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

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
          </View>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContainer, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Terms & Conditions
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons
                  name="close-circle"
                  size={30}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.modalText, { color: theme.text }]}>
                {termsAndConditionsText}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleAcceptAndClose}
            >
              <Text style={styles.closeButtonText}>Accept & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  activeTab: {},
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
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    flex: 1,
  },
  termsLink: {
    fontWeight: "600",
  },
  createAccountButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  createAccountButtonText: {
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalScrollView: {
    marginVertical: 10,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
  closeButton: {
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
});