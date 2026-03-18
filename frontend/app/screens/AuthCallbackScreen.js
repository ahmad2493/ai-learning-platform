/**
 * Auth Callback Screen - OAuth Callback Handler
 * Author: Momna Butt (BCSF22M021)
 *
 * Functionality:
 * - Handles OAuth callback from authentication providers
 * - Extracts authentication tokens from URL
 * - Saves token and navigates to home after authentication
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackScreen({ navigation }) {
  const { signIn } = useAuth();

  useEffect(() => {
    const handleUrl = async ({ url }) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.token) {
        try {
          await signIn(queryParams.token);
        } catch (error) {
          console.error('Auth callback error:', error);
          navigation.replace('SignIn');
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }); });

    return () => subscription.remove();
  }, [signIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
