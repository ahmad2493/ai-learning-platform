import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

export default function OtpVerificationScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [timer, setTimer] = useState(30);
  const inputs = useRef([]);

  // Get the email from the navigation parameters
  const { email } = route.params || {};

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
  };
  
  const handleBackspace = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
        inputs.current[index - 1].focus();
    }
  }

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter a 6-digit OTP.");
      return;
    }
    // TODO: Add actual OTP verification logic here
    console.log("Verifying OTP:", code);
    navigation.navigate('StudentDashboard'); 
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(30);
      // TODO: Add logic to resend OTP
      console.log("Resending OTP...");
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

            <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={ref => inputs.current[index] = ref}
                        style={[styles.otpInput, {borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.surface}] }
                        maxLength={1}
                        keyboardType="number-pad"
                        onChangeText={(text) => handleChange(text, index)}
                        onKeyPress={(e) => handleBackspace(e, index)}
                        value={digit}
                    />
                ))}
            </View>

            <TouchableOpacity 
                style={[styles.verifyButton, { backgroundColor: theme.primary }]} 
                onPress={handleVerify}
            >
                <Text style={styles.verifyButtonText}>Verify</Text>
            </TouchableOpacity>
            
            <View style={styles.resendContainer}>
                <Text style={[styles.resendText, {color: theme.textSecondary}]}>Didn't receive a code? </Text>
                <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
                    <Text style={[styles.resendLink, {color: timer > 0 ? theme.textSecondary : theme.primary}]}>
                        Resend {timer > 0 ? `in ${timer}s` : ''}
                    </Text>
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
      marginBottom: 30,
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
  },
  resendText: {
      fontSize: 14,
  },
  resendLink: {
      fontSize: 14,
      fontWeight: 'bold',
  }
});
