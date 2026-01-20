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
import CustomAlert from "../components/CustomAlert";

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
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

  const handleSendInstructions = () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    
    // For now, just navigate to the ResetPasswordScreen
    navigation.navigate('ResetPassword', { email: email });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
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
          Enter the email address associated with your account and we'll send you a link to reset your password.
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
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: theme.primary }]}
          onPress={handleSendInstructions}
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>Send Instructions</Text>
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
