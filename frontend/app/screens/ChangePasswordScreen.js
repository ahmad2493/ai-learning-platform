import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import CustomAlert from '../components/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/apiConfig';

export default function ChangePasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!currentPassword) newErrors.currentPassword = 'Current password is required.';
    if (newPassword.length < 5) newErrors.newPassword = 'Password must be at least 5 characters.';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!validate()) return;

    const token = await AsyncStorage.getItem('authToken');
    const userId = await AsyncStorage.getItem('user_id');

    if (!token || !userId) {
      showAlert('Error', 'You are not logged in.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/students/${userId}/change_password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('Success', 'Your password has been changed successfully.', 'success');
      } else {
        showAlert('Update Failed', data.message || 'An error occurred.');
      }
    } catch (error) {
      console.error("Change password error:", error);
      showAlert('Error', 'A server error occurred. Please try again.');
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
            navigation.goBack();
          }
        }}
      />
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Change Password
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Current Password
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: errors.currentPassword ? 'red' : theme.inputBorder }]}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter your current password"
              placeholderTextColor="#999"
            />
             {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              New Password
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: errors.newPassword ? 'red' : theme.inputBorder }]}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter your new password"
              placeholderTextColor="#999"
            />
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Confirm New Password
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: errors.confirmPassword ? 'red' : theme.inputBorder }]}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your new password"
              placeholderTextColor="#999"
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleSaveChanges}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
      color: 'red',
      marginTop: 5,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
