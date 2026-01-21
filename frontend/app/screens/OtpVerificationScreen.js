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
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../components/CustomAlert';

export default function OtpVerificationScreen({ navigation, route }) {
  const { theme } = useTheme();
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

  // Get parameters from navigation
  const { email, name, password, tempUserId, verificationType } = route.params || {};

  console.log('📱 [OTP SCREEN] Mounted with params:', { email, name, tempUserId, verificationType });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);

    // ✅ AUTO-CLOSE SUCCESS ALERTS AFTER 2 SECONDS
    if (type === "success") {
      setTimeout(() => {
        setAlertVisible(false);
        handleSuccessNavigation();
      }, 2000); // 2 seconds for success messages
    }
  };

  const handleSuccessNavigation = () => {
    // Navigate based on verification type
    if (verificationType === 'REGISTRATION') {
      console.log('🧭 [OTP SCREEN] Navigating to SignIn');
      navigation.navigate('SignIn');
    } else if (verificationType === 'TWO_FACTOR_LOGIN') {
      console.log('🧭 [OTP SCREEN] Navigating to StudentDashboard');
      navigation.replace('StudentDashboard');
    }
  };

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
    console.log('🔐 [OTP SCREEN] Verification Type:', verificationType);

    if (code.length !== 6) {
      showAlert("Invalid OTP", "Please enter a 6-digit OTP.");
      return;
    }

    setIsVerifying(true);

    try {
      if (verificationType === 'TWO_FACTOR_LOGIN') {
        // Two-factor authentication login
        console.log('🌐 [OTP SCREEN] Verifying 2FA login OTP...');

        const response = await fetch(`${BASE_URL}/auth/verify-2fa-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            email: email,
            otp: code,
          }),
        });

        const data = await response.json();
        console.log('📥 [OTP SCREEN] 2FA login response:', data);

        if (data.success) {
          console.log('✅ [OTP SCREEN] 2FA login successful!');
          // Save token and user data
          await AsyncStorage.setItem('authToken', data.data.token);
          
          const user = data.data.user;
          await AsyncStorage.setItem('user_id', user.user_id);
          await AsyncStorage.setItem('mongo_user_id', user._id);
          await AsyncStorage.setItem('userName', user.name);
          await AsyncStorage.setItem('userEmail', user.email);
          
          // ✅ SHOW SUCCESS ALERT (will auto-close after 2s)
          showAlert(
            "Login Successful!", 
            "You have been authenticated successfully.",
            "success"
          );
        } else {
          console.log('❌ [OTP SCREEN] 2FA verification failed:', data.message);
          showAlert("Verification Failed", data.message || "Invalid OTP. Please try again.");
          setOtp(new Array(6).fill(''));
          inputs.current[0]?.focus();
        }
      } else if (verificationType === 'REGISTRATION') {
        // Registration OTP verification
        console.log('🌐 [OTP SCREEN] Verifying registration OTP...');

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

        const data = await response.json();
        console.log('📥 [OTP SCREEN] Registration response:', data);

        if (data.success) {
          console.log('✅ [OTP SCREEN] Registration OTP verified!');
          
          // ✅ SHOW SUCCESS ALERT (will auto-close after 2s)
          showAlert(
            "Success!", 
            "Your account has been created successfully!",
            "success"
          );
        } else {
          console.log('❌ [OTP SCREEN] Verification failed:', data.message);
          showAlert("Verification Failed", data.message || "Invalid OTP. Please try again.");
          setOtp(new Array(6).fill(''));
          inputs.current[0]?.focus();
        }
      } else if (verificationType === 'PASSWORD_RESET') {
        // Password reset OTP verification
        console.log('🌐 [OTP SCREEN] Verifying password reset OTP...');

        const response = await fetch(`${BASE_URL}/auth/verify-reset-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            email: email,
            otp: code,
          }),
        });

        const data = await response.json();
        console.log('📥 [OTP SCREEN] Password reset response:', data);

        if (data.success) {
          console.log('✅ [OTP SCREEN] Password reset OTP verified!');
          // Navigate to reset password screen without alert
          navigation.navigate('ResetPassword', {
            email: email,
            otp: code,
          });
        } else {
          console.log('❌ [OTP SCREEN] Verification failed:', data.message);
          showAlert("Verification Failed", data.message || "Invalid OTP. Please try again.");
          setOtp(new Array(6).fill(''));
          inputs.current[0]?.focus();
        }
      }
    } catch (error) {
      console.error('❌ [OTP SCREEN] Verification error:', error);
      showAlert("Error", "An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    console.log('📧 [OTP SCREEN] Resending OTP to:', email);
    console.log('📧 [OTP SCREEN] Verification type:', verificationType);
    setIsResending(true);

    try {
      let endpoint = '';
      let requestBody = {};

      if (verificationType === 'REGISTRATION') {
        endpoint = '/auth/register';
        requestBody = {
          email: email,
          password: password,
          confirmPassword: password,
          name: name,
        };
      } else if (verificationType === 'PASSWORD_RESET') {
        endpoint = '/auth/forgot-password';
        requestBody = {
          email: email,
        };
      } else if (verificationType === 'TWO_FACTOR_LOGIN') {
        endpoint = '/auth/login';
        requestBody = {
          email: email,
          password: password,
        };
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('📥 [OTP SCREEN] Resend response:', data);

      if (data.success) {
        setTimer(60);
        setOtp(new Array(6).fill(''));
        showAlert("OTP Sent", "A new verification code has been sent to your email.", "success");
      } else {
        showAlert("Error", data.message || "Failed to resend OTP.");
      }
    } catch (error) {
      console.error('❌ [OTP SCREEN] Resend error:', error);
      showAlert("Error", "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ✅ CUSTOM ALERT COMPONENT */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => {
          setAlertVisible(false);
          // Only navigate on manual close (button tap)
          if (alertConfig.type === "success") {
            handleSuccessNavigation();
          }
        }}
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
    textAlign: 'center',
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