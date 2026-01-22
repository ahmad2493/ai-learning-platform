/**
 * Security Screen - Security Settings
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Manages two-factor authentication (2FA) settings
 * - Enables/disables 2FA for user account
 * - Displays security options and preferences
 * - Handles security-related API calls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { BASE_URL } from '../utils/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SecurityScreen({ navigation }) {
  console.log('🔒 [SECURITY SCREEN] Component mounted');
  
  const { theme } = useTheme();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // ✅ Changed default to false
  const [isSaving, setIsSaving] = useState(false);

  // Load 2FA status when component mounts
  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const loadTwoFactorStatus = async () => {
    try {
      console.log('🔐 [SECURITY] Loading 2FA status...');
      setIsLoading(true);

      const token = await AsyncStorage.getItem('authToken');
      const mongoUserId = await AsyncStorage.getItem('mongo_user_id');

      console.log('🔐 [SECURITY] Token:', token ? 'exists' : 'missing');
      console.log('🔐 [SECURITY] MongoDB User ID:', mongoUserId);

      if (!token) {
        console.log('❌ [SECURITY] No auth token found');
        Alert.alert('Error', 'Please login again');
        navigation.replace('SignIn');
        return;
      }

      // Fetch user data to get 2FA status
      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const data = await response.json();
      console.log('📥 [SECURITY] User data response:', data);

      if (data.success && data.data.user) {
        const status = data.data.user.twoFactorEnabled || false;
        console.log('✅ [SECURITY] 2FA Status:', status);
        setTwoFactorEnabled(status);
      } else {
        console.log('❌ [SECURITY] Failed to load user data:', data.message);
        Alert.alert('Error', 'Failed to load security settings');
      }
    } catch (error) {
      console.error('❌ [SECURITY] Error loading 2FA status:', error);
      Alert.alert('Error', 'Failed to load security settings');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTwoFactor = async (value) => {
    try {
      console.log('🔐 [SECURITY] Toggling 2FA to:', value);
      setIsSaving(true);

      const token = await AsyncStorage.getItem('authToken');
      const mongoUserId = await AsyncStorage.getItem('mongo_user_id');

      console.log('🔐 [SECURITY] MongoDB User ID for toggle:', mongoUserId);

      if (!token || !mongoUserId) {
        console.log('❌ [SECURITY] Missing token or user ID');
        Alert.alert('Error', 'Authentication error. Please login again.');
        return;
      }

      const response = await fetch(`${BASE_URL}/auth/toggle-2fa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          userId: mongoUserId,
          enabled: value,
        }),
      });

      const data = await response.json();
      console.log('📥 [SECURITY] Toggle 2FA response:', data);

      if (data.success) {
        console.log('✅ [SECURITY] 2FA toggled successfully');
        setTwoFactorEnabled(value);
        Alert.alert(
          'Success',
          `Two-factor authentication ${value ? 'enabled' : 'disabled'} successfully`
        );
      } else {
        console.log('❌ [SECURITY] Failed to toggle 2FA:', data.message);
        Alert.alert('Error', data.message || 'Failed to update 2FA settings');
      }
    } catch (error) {
      console.error('❌ [SECURITY] Error toggling 2FA:', error);
      Alert.alert('Error', 'Failed to update 2FA settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    console.log('🔐 [SECURITY] Navigating to Change Password');
    navigation.navigate('ChangePassword');
  };

  // ✅ Render content immediately, show loading indicator inline
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Security</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Two-Factor Authentication */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Two-Factor Authentication
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
            Add an extra layer of security to your account by requiring a verification code
            when signing in.
          </Text>
          
          {/* ✅ Show loading indicator inline instead of blocking entire screen */}
          {isLoading ? (
            <View style={styles.loadingIndicatorInline}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingTextInline, { color: theme.textSecondary }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Text>
              <Switch
                value={twoFactorEnabled}
                onValueChange={toggleTwoFactor}
                disabled={isSaving}
                trackColor={{ false: theme.inputBorder, true: theme.primary }}
                thumbColor={twoFactorEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          )}
          
          {isSaving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.savingText, { color: theme.textSecondary }]}>
                Saving...
              </Text>
            </View>
          )}
        </View>

        {/* Password Management */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="lock-closed" size={28} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Password Management
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
            Keep your account secure by regularly updating your password.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleChangePassword}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Security Tips */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={28} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Security Tips
            </Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Use a strong, unique password
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Enable two-factor authentication
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Never share your password with anyone
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Review your account activity regularly
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingIndicatorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  loadingTextInline: {
    marginLeft: 10,
    fontSize: 14,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsList: {
    marginTop: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});