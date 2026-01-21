import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { BASE_URL } from '../utils/apiConfig';

export default function OtpVerificationScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef([]);

  // Get parameters from navigation
  const { email, name, password, tempUserId, verificationType } = route.params || {};

  console.log('📱 [OTP SCREEN] Mounted with params:', { email, name, tempUserId, verificationType });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text, index) => {
    if (isNaN(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move to next input
    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && text) {
      const fullOtp = [...newOtp.slice(0, 5), text].join('');
      if (fullOtp.length === 6) {
        setTimeout(() => handleVerify(fullOtp), 100);
      }
    }
  };
  
  const handleBackspace = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async (providedOtp) => {
    const code = providedOtp || otp.join('');
    
    console.log('🔐 [OTP SCREEN] Verifying OTP:', code);
    console.log('🔐 [OTP SCREEN] Email:', email);
    console.log('🔐 [OTP SCREEN] TempUserId:', tempUserId);

    if (code.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter a 6-digit OTP.");
      return;
    }

    setIsVerifying(true);

    try {
      console.log('🌐 [OTP SCREEN] Sending verification request...');

      const response = await fetch(`${BASE_URL}/auth/verify-registration-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          email: email,
          otp: code,
          name: name,
          password: password,
          tempUserId: tempUserId
        }),
      });

      console.log('📥 [OTP SCREEN] Response status:', response.status);

      const data = await response.json();
      console.log('📥 [OTP SCREEN] Response data:', data);

      if (data.success) {
        console.log('✅ [OTP SCREEN] OTP verified successfully!');
        Alert.alert(
          "Success!", 
          "Your account has been created successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate('SignIn')
            }
          ]
        );
      } else {
        console.log('❌ [OTP SCREEN] Verification failed:', data.message);
        Alert.alert("Verification Failed", data.message || "Invalid OTP. Please try again.");
        // Clear OTP inputs
        setOtp(new Array(6).fill(''));
        inputs.current[0]?.focus();
      }
    } catch (error) {
      console.error('❌ [OTP SCREEN] Verification error:', error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    console.log('📧 [OTP SCREEN] Resending OTP to:', email);
    setIsResending(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          confirmPassword: password,
          name: name,
        }),
      });

      const data = await response.json();
      console.log('📥 [OTP SCREEN] Resend response:', data);

      if (data.success) {
        setTimer(30);
        setOtp(new Array(6).fill(''));
        Alert.alert("OTP Sent", "A new OTP has been sent to your email.");
      } else {
        Alert.alert("Error", data.message || "Failed to resend OTP.");
      }
    } catch (error) {
      console.error('❌ [OTP SCREEN] Resend error:', error);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={80} color={theme.primary} />
        <Text style={[styles.title, {color: theme.text}]}>Verify Your Email</Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          Enter the 6-digit code sent to {email || 'your email'}.
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
          style={[
            styles.verifyButton, 
            { 
              backgroundColor: isVerifying ? theme.disabled || '#ccc' : theme.primary 
            }
          ]} 
          onPress={() => handleVerify()}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, {color: theme.textSecondary}]}>
            Didn't receive a code? 
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0 || isResending}>
            {isResending ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 5 }} />
            ) : (
              <Text style={[
                styles.resendLink, 
                {color: timer > 0 ? theme.textSecondary : theme.primary}
              ]}>
                Resend {timer > 0 ? `in ${timer}s` : ''}
              </Text>
            )}
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
  header: {
    padding: 15,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  expiryWarning: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  verifyButton: {
    width: '100%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  }
});