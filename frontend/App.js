import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './app/navigation/AppNavigator';
import { AuthProvider } from './app/context/AuthContext';
import { ThemeProvider } from './app/utils/ThemeContext';

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <ThemeProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}