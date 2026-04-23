import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// --- Import All Screens ---
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import SettingsScreen from "../screens/SettingsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SecurityScreen from "../screens/SecurityScreen";
import AboutAppScreen from "../screens/AboutAppScreen";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";
import StudentDashboardScreen from "../screens/StudentDashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AiAssistantScreen from "../screens/AiAssistantScreen";
import AiChatScreen from "../screens/AiChatScreen";
import TestGeneratorScreen from "../screens/TestGeneratorScreen";
import TestViewScreen from "../screens/TestViewScreen";
import TestResultScreen from "../screens/TestResultScreen";
import PastPapersScreen from "../screens/PastPapersScreen";
import CloPerformanceScreen from "../screens/CloPerformanceScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import OtpVerificationScreen from "../screens/OtpVerificationScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import SplashScreen from '../screens/SplashScreen';

const { width } = Dimensions.get('window');
const Stack = createNativeStackNavigator();

// --- Main App Navigator ---
const AppStack = () => (
  <Stack.Navigator initialRouteName="StudentDashboard" screenOptions={{ animation: 'fade' }}>
    <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AiAssistant" component={AiAssistantScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AiChat" component={AiChatScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TestGenerator" component={TestGeneratorScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TestViewScreen" component={TestViewScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TestResult" component={TestResultScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PastPapers" component={PastPapersScreen} options={{ headerShown: false }} />
    <Stack.Screen name="CloPerformance" component={CloPerformanceScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AboutApp" component={AboutAppScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

// --- Auth Flow Navigator ---
const AuthStack = () => (
  <Stack.Navigator initialRouteName="SignIn" screenOptions={{ animation: 'fade' }}>
    <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const RootNavigator = () => {
  const { userToken, isLoading } = useAuth() || {};
  const [showSplash, setShowSplash] = useState(true);
  
  // Animation values for the smooth entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    // 1. Wait for splash duration
    const timer = setTimeout(() => {
      setShowSplash(false);
      
      // 2. Once splash is hidden, trigger the smooth entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
    }, 6500); // Set to match your splash duration (12s total, triggers 1s early for smooth transition)

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim]);

  if (showSplash) {
    return <SplashScreen />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Animated.View style={{ 
      flex: 1, 
      opacity: fadeAnim, 
      transform: [{ translateX: slideAnim }] 
    }}>
      {userToken ? <AppStack /> : <AuthStack />}
    </Animated.View>
  );
};

export default RootNavigator;
