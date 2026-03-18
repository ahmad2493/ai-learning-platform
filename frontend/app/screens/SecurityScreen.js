/**
 * Security Screen - Security Settings
 * Updated: Integrated CustomAlert and unified navigation.
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../utils/apiConfig';
import CustomAlert from '../components/CustomAlert';

export default function SecurityScreen({ navigation }) {
  console.log('🔒 [SECURITY SCREEN] Component mounted');
  
  const { theme } = useTheme();
  const { userToken, user, signOut } = useAuth();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  const mongoUserId = user?._id || user?.id || user?.userId;

  useEffect(() => {
    if (userToken) {
      loadTwoFactorStatus();
    }
  }, [userToken]);

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const loadTwoFactorStatus = async () => {
    try {
      console.log('🔐 [SECURITY] Loading 2FA status...');
      setIsLoading(true);

      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const data = await response.json();
      
      if (response.status === 401) {
          console.log('❌ [SECURITY] Token expired or invalid');
          signOut(); 
          return;
      }

      if (data.success && data.data.user) {
        setTwoFactorEnabled(data.data.user.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error('❌ [SECURITY] Error loading 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTwoFactor = async (value) => {
    try {
      if (!userToken || !mongoUserId) {
        showAlert('Error', 'Authentication session lost. Please restart the app.');
        return;
      }

      setIsSaving(true);
      const response = await fetch(`${BASE_URL}/auth/toggle-2fa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          userId: mongoUserId,
          enabled: value,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTwoFactorEnabled(value);
        showAlert('Success', `Two-factor authentication ${value ? 'enabled' : 'disabled'} successfully`, 'success');
      } else {
        showAlert('Error', data.message || 'Failed to update 2FA settings');
      }
    } catch (error) {
      showAlert('Error', 'Failed to update 2FA settings');
    } finally {
      setIsSaving(false);
    }
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Security</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Two-Factor Authentication</Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
            Add an extra layer of security to your account by requiring a verification code when signing in.
          </Text>
          
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</Text>
              <Switch
                value={twoFactorEnabled}
                onValueChange={toggleTwoFactor}
                disabled={isSaving}
                trackColor={{ false: theme.inputBorder, true: theme.primary }}
                thumbColor={twoFactorEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="lock-closed" size={28} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Password Management</Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>Keep your account secure by regularly updating your password.</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={28} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Security Tips</Text>
          </View>
          <View style={styles.tipsList}>
            {['Use a strong, unique password', 'Enable two-factor authentication', 'Never share your password', 'Review account activity regularly'].map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { borderRadius: 15, padding: 20, marginBottom: 20, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, flex: 1 },
  cardDescription: { fontSize: 14, lineHeight: 20, marginBottom: 15 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  switchLabel: { fontSize: 16, fontWeight: '600' },
  actionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, paddingVertical: 15, paddingHorizontal: 20, marginTop: 10 },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  tipsList: { marginTop: 10 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipText: { fontSize: 14, marginLeft: 10, flex: 1 },
});
