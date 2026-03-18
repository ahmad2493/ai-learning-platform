/**
 * Change Password Screen - Password Update Interface
 * Updated: Fixed secureTextEntry and integrated with AuthContext.
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { BASE_URL } from '../utils/apiConfig';

export default function ChangePasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const { userToken, user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  const mongoUserId = user?._id || user?.id || user?.userId;

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

    if (!userToken || !mongoUserId) {
      showAlert('Error', 'Authentication session lost. Please login again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/students/${mongoUserId}/password/change`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('Success', 'Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showAlert('Update Failed', data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('❌ [CHANGE PASSWORD] Error:', error);
      showAlert('Error', 'Server error. Try again later.');
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
            navigation.goBack();
          }
        }}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Password</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: errors.currentPassword ? 'red' : theme.inputBorder }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor="#999"
            secureTextEntry={true}
          />
          {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Password</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: errors.newPassword ? 'red' : theme.inputBorder }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#999"
            secureTextEntry={true}
          />
          {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: errors.confirmPassword ? 'red' : theme.inputBorder }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            secureTextEntry={true}
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: isLoading ? '#ccc' : theme.primary }]}
          onPress={handleSaveChanges}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  formContainer: { padding: 20 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 16, marginBottom: 8 },
  input: { borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1 },
  errorText: { color: 'red', marginTop: 5, fontSize: 12 },
  saveButton: { borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
