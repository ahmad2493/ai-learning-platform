import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = () => {
    // Handle password update logic here
    console.log('Update Password:', { email, newPassword, confirmPassword });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={40} color={theme.accent} />
            <Ionicons
              name="lock-closed"
              size={20}
              color={theme.accent}
              style={[styles.lockIcon, { backgroundColor: theme.surface }]}
            />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Set a New Password</Text>
        </View>

        {/* White Card Container */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.inputBorder,
                color: theme.text 
              }]}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.inputBorder,
                color: theme.text 
              }]}
              placeholder="New Password"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.inputBorder,
                color: theme.text 
              }]}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* Update Password Button */}
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: theme.accent }]}
              onPress={handleUpdatePassword}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        <Text style={[styles.requirementsText, { color: theme.textSecondary }]}>
          Must be at least 8 characters, include a number and a symbol
        </Text>
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
    paddingTop: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  lockIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    borderRadius: 10,
    padding: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 20,
    padding: 25,
    width: '100%',
    marginBottom: 20,
  },
  form: {
    width: '100%',
  },
  input: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  updateButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requirementsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});
