/**
 * OTP Verification Screen - OTP Code Entry
 * Updated: Integrated with AuthContext for stable login flow.
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { BASE_URL } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';

export default function OtpVerificationScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error",
  });
  const inputs = useRef([]);

  const { email, name, password, tempUserId, verificationType } = route.params || {};

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);

    if (type === "success") {
      setTimeout(() => {
        setAlertVisible(false);
        handleSuccessNavigation();
      }, 1500);
    }
  };

  const handleSuccessNavigation = () => {
    if (verificationType === 'REGISTRATION') {
      navigation.navigate('SignIn');
    }
    // For TWO_FACTOR_LOGIN, the stack switch happens automatically via AuthContext
  };

  const handleChange = (text, index) => {
    if (isNaN(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }

    if (index === 5 && text) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };
  
  const handleBackspace = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async (providedOtp) => {
    if (isVerifying) return;
    const code = providedOtp || otp.join('');
    
    if (code.length !== 6) {
      showAlert("Invalid OTP", "Please enter a 6-digit OTP.");
      return;
    }

    setIsVerifying(true);

    try {
      if (verificationType === 'TWO_FACTOR_LOGIN') {
        const response = await fetch(`${BASE_URL}/auth/verify-2fa-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, otp: code }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ [OTP SCREEN] 2FA success, calling signIn');
          // This updates AuthContext and triggers the navigator to switch to StudentDashboard
          await signIn(data.data.token);
        } else {
          showAlert("Verification Failed", data.message || "Invalid OTP.");
          setOtp(new Array(6).fill(''));
          inputs.current[0]?.focus();
        }
      } else if (verificationType === 'REGISTRATION') {
        const response = await fetch(`${BASE_URL}/auth/verify-registration-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, otp: code, name, password, tempUserId
          }),
        });

        const data = await response.json();
        if (data.success) {
          showAlert("Success!", "Account created successfully!", "success");
        } else {
          showAlert("Verification Failed", data.message || "Invalid OTP.");
        }
      } else if (verificationType === 'PASSWORD_RESET') {
        const response = await fetch(`${BASE_URL}/auth/verify-reset-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, otp: code }),
        });

        const data = await response.json();
        if (data.success) {
          navigation.navigate('ResetPassword', { email: email, otp: code });
        } else {
          showAlert("Verification Failed", data.message || "Invalid OTP.");
        }
      }
    } catch (error) {
      showAlert("Error", "An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      let endpoint = verificationType === 'PASSWORD_RESET' ? '/auth/forgot-password' : '/auth/login';
      let body = verificationType === 'PASSWORD_RESET' ? { email } : { email, password };

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        setTimer(60);
        setOtp(new Array(6).fill(''));
        showAlert("OTP Sent", "A new code has been sent to your email.", "success");
      }
    } catch (error) {
      showAlert("Error", "Failed to resend OTP.");
    } finally {
      setIsResending(false);
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
      </View>

      <View style={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={80} color={theme.primary} />
        <Text style={[styles.title, {color: theme.text}]}>
          {verificationType === 'TWO_FACTOR_LOGIN' ? 'Two-Factor Authentication' : 'Verify Your Email'}
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          Enter the 6-digit code sent to {email}.
        </Text>
        <Text style={[styles.expiryWarning, {color: theme.error || '#f44336'}]}>
          ⏰ OTP expires in {timer} seconds
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputs.current[index] = ref}
              style={[
                styles.otpInput, 
                {
                  borderColor: theme.inputBorder, 
                  color: theme.text, 
                  backgroundColor: theme.surface
                }
              ]}
              maxLength={1}
              keyboardType="number-pad"
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleBackspace(e, index)}
              value={digit}
              editable={!isVerifying}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyButton, { backgroundColor: isVerifying ? '#ccc' : theme.primary }]} 
          onPress={() => handleVerify()}
          disabled={isVerifying}
        >
          {isVerifying ? <ActivityIndicator color="white" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
        </TouchableOpacity>
        
        <View style={styles.resendContainer}>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0 || isResending}>
            <Text style={[styles.resendLink, {color: timer > 0 ? theme.textSecondary : theme.primary}]}>
              {isResending ? 'Sending...' : (timer > 0 ? `Resend in ${timer}s` : 'Resend Code')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 15 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 15, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 10 },
  expiryWarning: { fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  otpInput: { width: 45, height: 55, borderWidth: 1, borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
  verifyButton: { width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  verifyButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  resendContainer: { marginTop: 10 },
  resendLink: { fontSize: 16, fontWeight: 'bold' }
});
