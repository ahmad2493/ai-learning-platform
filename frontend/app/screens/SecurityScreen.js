import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';

export default function SecurityScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [biometricSignIn, setBiometricSignIn] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Security
          </Text>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.surface }]}
              onPress={handleChangePassword}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="lock-closed" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Change password
              </Text>
              <Ionicons name="chevron-forward" size={24} color={theme.text} />
            </TouchableOpacity>

            <View style={[styles.optionCard, { backgroundColor: theme.surface }]}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="shield" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Two-factor authentication
              </Text>
              <Switch
                value={twoFactorAuth}
                onValueChange={setTwoFactorAuth}
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={twoFactorAuth ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            <View style={[styles.optionCard, { backgroundColor: theme.surface }]}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="finger-print" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>
                Biometric sign-in
              </Text>
              <Switch
                value={biometricSignIn}
                onValueChange={setBiometricSignIn}
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={biometricSignIn ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      <Sidebar
        isVisible={sidebarVisible}
        onClose={toggleSidebar}
        activeScreen="Security"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
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
  scrollContent: {
    padding: 20,
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    marginRight: 15,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
});