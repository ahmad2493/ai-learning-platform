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
import { BASE_URL } from '../utils/apiConfig';
import * as WebBrowser from 'expo-web-browser';

export default function SignUpScreen({ navigation }) {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

const handleSignUp = async () => {
  if (!agreeToTerms) {
    alert("You must agree to the Terms & Conditions");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
        name: fullName
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      alert("Registration successful!");
      // Navigate to SignIn or Settings
      navigation.navigate("SignIn");
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (error) {
    alert("An error occurred. Please try again.");
  }
};


  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  const handleGoogleSignIn = async () => {
    const authUrl = `${BASE_URL}/auth/google/signup`;
    await WebBrowser.openAuthSessionAsync(authUrl);
};


  const handleFacebookSignIn = () => {
    // Handle Facebook sign in
    console.log('Facebook Sign In');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Ionicons name="book" size={50} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Join DarsGah</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Learn smarter, achieve more.</Text>
        </View>

        {/* White Card Container */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: theme.inputBackground }]}>
            <TouchableOpacity style={[styles.tab, styles.activeTab, { backgroundColor: theme.primary }]}>
              <Text style={styles.activeTabText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, styles.inactiveTab]}
              onPress={handleSignIn}
            >
              <Text style={[styles.inactiveTabText, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.inputBorder,
                color: theme.text 
              }]}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={fullName}
              onChangeText={setFullName}
            />
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
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.inputBorder,
                color: theme.text 
              }]}
              placeholder="Confirm Password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* Terms & Conditions */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                {agreeToTerms ? (
                  <Ionicons name="checkbox" size={20} color={theme.primary} />
                ) : (
                  <Ionicons name="square-outline" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                I agree the{' '}
                <Text style={[styles.termsLink, { color: theme.primaryLight }]}>Terms & Conditions</Text>
              </Text>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[
                styles.createAccountButton,
                { backgroundColor: agreeToTerms ? theme.primary : '#CCCCCC' },
              ]}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={!agreeToTerms}
            >
              <Text style={styles.createAccountButtonText}>Create Account</Text>
            </TouchableOpacity>

            {/* OR Separator */}
            <View style={styles.separator}>
              <View style={[styles.separatorLine, { backgroundColor: theme.inputBorder }]} />
              <Text style={[styles.separatorText, { color: theme.textSecondary }]}>OR</Text>
              <View style={[styles.separatorLine, { backgroundColor: theme.inputBorder }]} />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity
              style={[styles.socialButton, { 
                backgroundColor: theme.surface, 
                borderColor: theme.inputBorder 
              }]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { 
                backgroundColor: theme.surface, 
                borderColor: theme.inputBorder 
              }]}
              onPress={handleFacebookSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>Continue with Facebook</Text>
            </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    // backgroundColor applied inline
  },
  inactiveTab: {
    backgroundColor: 'transparent',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inactiveTabText: {
    fontWeight: '600',
    fontSize: 16,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    flex: 1,
  },
  termsLink: {
    fontWeight: '600',
  },
  createAccountButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  createAccountButtonDisabled: {
    // Applied inline
  },
  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 15,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
