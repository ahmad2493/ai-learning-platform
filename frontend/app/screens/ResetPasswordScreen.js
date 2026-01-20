import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error",
  });
  const [errors, setErrors] = useState({});

  const { email } = route.params || {};

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const validateFields = () => {
    const newErrors = {};
    if (newPassword.length < 5) {
      newErrors.newPassword = "Password must be at least 5 characters long.";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateFields()) return;

    try {
      const response = await fetch(`${BASE_URL}/api/auth/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email, password: newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert("Success", "Your password has been reset successfully!", "success");
      } else {
        showAlert("Reset Failed", data.message || "Please try again.");
      }
    } catch (error) {
      console.error("Reset Password error:", error);
      showAlert("Error", "An error occurred. Please try again.");
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
        <Text style={[styles.title, { color: theme.text }]}>Reset Your Password</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Create a new password for your account.
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
            onChangeText={setNewPassword}
            secureTextEntry
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
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.primary }]}
          onPress={handleResetPassword}
          activeOpacity={0.8}
        >
          <Text style={styles.resetButtonText}>Reset Password</Text>
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
  },
  resetButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 20,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
