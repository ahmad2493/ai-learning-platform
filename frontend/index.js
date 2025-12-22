import { registerRootComponent } from "expo";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./app/navigation/AppNavigator";
import { ThemeProvider } from "./app/utils/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

registerRootComponent(App);

