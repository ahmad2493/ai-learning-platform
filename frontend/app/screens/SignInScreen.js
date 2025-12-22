import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";

export default function SignInScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = () => {
    // Handle sign in logic here
    console.log("Sign In:", { email, password });
    // TODO: Add actual authentication logic here
    // For testing navigation, navigate to Settings after sign in
    // Remove this in production and add proper authentication check
    navigation.navigate("Settings");
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  const handleGoogleSignIn = () => {
    // Handle Google sign in
    console.log("Google Sign In");
  };

  const handleFacebookSignIn = () => {
    // Handle Facebook sign in
    console.log("Facebook Sign In");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
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
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
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
