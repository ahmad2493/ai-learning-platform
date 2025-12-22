import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';

export default function RootLayout() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}

