/**
 * Theme Context - Theme Management Provider
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Provides theme context to all app components
 * - Manages light/dark mode based on system preferences
 * - Supplies theme colors and styles throughout the app
 * - Enables dynamic theme switching
 */

import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { getTheme } from "./theme";

// Create the theme context
const ThemeContext = createContext();

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Theme Provider component
export const ThemeProvider = ({ children }) => {
  // Get system color scheme (automatically detects light/dark)
  const colorScheme = useColorScheme();
  
  // Get theme colors based on color scheme
  const theme = getTheme(colorScheme);
  
  // Value to provide to children
  const value = {
    theme,
    colorScheme, // 'light' or 'dark'
    isDark: colorScheme === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

