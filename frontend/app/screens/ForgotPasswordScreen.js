import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { BASE_URL } from "../utils/apiConfig";
import CustomAlert from "../components/CustomAlert";

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error",
  });
  const [error, setError] = useState(null);

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const handleSendOTP = async () => {
    console.log('🔐 [FORGOT PASSWORD] Starting forgot password flow...');
    console.log('🔐 [FORGOT PASSWORD] Email:', email);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log('🌐 [FORGOT PASSWORD] Sending OTP request...');

      const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      console.log('📥 [FORGOT PASSWORD] Response status:', response.status);

      const data = await response.json();
      console.log('📥 [FORGOT PASSWORD] Response data:', data);

      if (data.success) {
        console.log('✅ [FORGOT PASSWORD] OTP sent successfully');
        showAlert(
          "OTP Sent", 
          "A verification code has been sent to your email. It will expire in 60 seconds.",
          "success"
        );
      } else {
        console.log('❌ [FORGOT PASSWORD] Failed:', data.message);
        showAlert("Error", data.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error('❌ [FORGOT PASSWORD] Error:', error);
      showAlert("Error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => {
          setAlertVisible(false);
          if (alertConfig.type === "success") {
            // Navigate to OTP verification screen
            console.log('🧭 [FORGOT PASSWORD] Navigating to OTP screen');
            navigation.navigate('OtpVerification', {
              email: email.toLowerCase(),
              verificationType: 'PASSWORD_RESET',
            });
          }
        }}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Ionicons name="mail-unread-outline" size={80} color={theme.primary} style={{ marginBottom: 20 }}/>
        <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your email address and we'll send you a verification code to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={22} color={theme.textSecondary} style={styles.inputIcon}/>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: error ? "red" : theme.inputBorder,
                color: theme.text,
              },
            ]}
            placeholder="Enter your email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.sendButton, 
            { 
              backgroundColor: isLoading ? theme.disabled || '#ccc' : theme.primary 
            }
          ]}
          onPress={handleSendOTP}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    paddingLeft: 45,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginTop: 5,
    marginBottom: 10,
  },
  sendButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 20,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});