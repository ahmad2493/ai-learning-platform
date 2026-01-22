/**
 * Auth Callback Screen - OAuth Callback Handler
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Handles OAuth callback from authentication providers
 * - Extracts authentication tokens from URL
 * - Processes authentication redirects
 * - Navigates to appropriate screen after authentication
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';

export default function AuthCallbackScreen({ navigation }) {
  useEffect(() => {
    const handleUrl = ({ url }) => {
      const token = url.split('token=')[1];
      if (token) {
        // Save token (AsyncStorage)
        navigation.replace('Home');
      }
    };

    Linking.addEventListener('url', handleUrl);

    return () => {
      Linking.removeEventListener('url', handleUrl);
    };
  }, []);

  return (
    <View>
      <ActivityIndicator size="large" />
    </View>
  );
}
