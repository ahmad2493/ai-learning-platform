import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './screens/SplashScreen'; // Import your splash screen

// This component handles the redirection logic.
const InitialLayout = () => {
  const { userToken, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [isSplashTimeOver, setSplashTimeOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashTimeOver(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !isSplashTimeOver) return;

    if (userToken) {
      router.replace('/(app)/StudentDashboard');
    } else {
      router.replace('/(auth)/SignIn');
    }
  }, [userToken, isLoading, isSplashTimeOver]);

  return (
    <>
      <Slot />

      {(isLoading || !isSplashTimeOver) && (
        <SplashScreen />
      )}
    </>
  );
};

// This is the root layout for the entire app.
export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
