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

export default function ResetPasswordScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error",
  });
  const [errors, setErrors] = useState({});

  const { email, otp } = route.params || {};

  console.log('🔐 [RESET PASSWORD] Screen mounted with:', { email, otp });

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const validateFields = () => {
    const newErrors = {};
    
    if (!newPassword) {
      newErrors.newPassword = "New password is required.";
    } else if (newPassword.length < 5) {
      newErrors.newPassword = "Password must be at least 5 characters long.";
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    console.log('🔐 [RESET PASSWORD] Starting password reset...');
    
    if (!validateFields()) {
      console.log('❌ [RESET PASSWORD] Validation failed');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🌐 [RESET PASSWORD] Sending reset request...');
      console.log('🌐 [RESET PASSWORD] Email:', email);

      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      console.log('📥 [RESET PASSWORD] Response status:', response.status);

      const data = await response.json();
      console.log('📥 [RESET PASSWORD] Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ [RESET PASSWORD] Password reset successful');
        showAlert("Success", "Your password has been reset successfully! You can now sign in with your new password.", "success");
      } else {
        console.log('❌ [RESET PASSWORD] Failed:', data.message);
        showAlert("Reset Failed", data.message || "Please try again.");
      }
    } catch (error) {
      console.error('❌ [RESET PASSWORD] Error:', error);
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
            console.log('🧭 [RESET PASSWORD] Navigating to Sign In');
            navigation.navigate("SignIn");
          }
        }}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Ionicons name="lock-open-outline" size={80} color={theme.primary} style={{ marginBottom: 20 }}/>
        <Text style={[styles.title, { color: theme.text }]}>Create New Password</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your new password must be different from your previous password.
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={22} color={theme.textSecondary} style={styles.inputIcon}/>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: errors.newPassword ? "red" : theme.inputBorder,
                color: theme.text,
              },
            ]}
            placeholder="New Password"
            placeholderTextColor={theme.textSecondary}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) {
                setErrors(prev => ({ ...prev, newPassword: null }));
              }
            }}
            secureTextEntry
            editable={!isLoading}
          />
        </View>
        {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={22} color={theme.textSecondary} style={styles.inputIcon}/>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: errors.confirmPassword ? "red" : theme.inputBorder,
                color: theme.text,
              },
            ]}
            placeholder="Confirm New Password"
            placeholderTextColor={theme.textSecondary}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                setErrors(prev => ({ ...prev, confirmPassword: null }));
              }
            }}
            secureTextEntry
            editable={!isLoading}
          />
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        <View style={styles.passwordHint}>
          <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            Password must be at least 5 characters long
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.resetButton, 
            { 
              backgroundColor: isLoading ? theme.disabled || '#ccc' : theme.primary 
            }
          ]}
          onPress={handleResetPassword}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.resetButtonText}>Reset Password</Text>
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
    marginBottom: 5,
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
    marginTop: 2,
    marginBottom: 10,
    fontSize: 14,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 20,
  },
  hintText: {
    marginLeft: 8,
    fontSize: 14,
  },
  resetButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});