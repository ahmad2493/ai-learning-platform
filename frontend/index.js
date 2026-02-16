import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import AppNavigatorProvider from './app/navigation/AppNavigator'; // <-- IMPORT THE NEW PROVIDER
import { ThemeProvider } from './app/utils/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AppNavigatorProvider />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

registerRootComponent(App);