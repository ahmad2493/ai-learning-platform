import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
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
import PastPapersScreen from "../screens/PastPapersScreen";
import CloPerformanceScreen from "../screens/CloPerformanceScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import OtpVerificationScreen from "../screens/OtpVerificationScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import SplashScreen from '../screens/SplashScreen'; // make sure this exists

const Stack = createNativeStackNavigator();

// --- Main App Navigator ---
const AppStack = () => (
  <Stack.Navigator initialRouteName="StudentDashboard">
    <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AiAssistant" component={AiAssistantScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AiChat" component={AiChatScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TestGenerator" component={TestGeneratorScreen} options={{ headerShown: false }} />
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
  <Stack.Navigator initialRouteName="SignIn">
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 sec splash

    return () => clearTimeout(timer);
  }, []);

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

  return userToken ? <AppStack /> : <AuthStack />;
};

export default RootNavigator;
