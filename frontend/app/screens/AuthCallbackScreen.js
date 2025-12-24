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
