/**
 * Theme Configuration - Color Schemes
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Defines light and dark theme color palettes
 * - Provides consistent color scheme across the app
 * - Supports theme switching functionality
 * - Exports theme getter function for dynamic theme access
 */

// Theme colors for light and dark modes
export const lightTheme = {
  // Background colors
  background: "#F0F8E8", // Light yellow-green
  surface: "#FFFFFF", // White cards
  splashBackground: "#F5F5DC", // Light yellow for splash
  
  // Text colors
  text: "#2D5016", // Dark green
  textSecondary: "#666666", // Gray
  textLight: "#808080", // Light gray
  
  // Primary colors
  primary: "#2D5016", // Dark green
  primaryLight: "#4CAF50", // Light green for links
  
  // Accent colors
  accent: "#00897B", // Teal for forgot password
  iconBackground: "#FFFACD", // Light yellow for icon background
  
  // Input colors
  inputBackground: "#F9F9F9",
  inputBorder: "#E0E0E0",
  
  // Status colors
  error: "#FF4444",
  success: "#4CAF50",
  
  // Profile colors
  profileBackground: "#FFB6C1", // Light pink
};

export const darkTheme = {
  // Background colors
  background: "#1A1A1A", // Dark background
  surface: "#2D2D2D", // Dark cards
  splashBackground: "#121212", // Dark splash
  
  // Text colors
  text: "#E0E0E0", // Light text
  textSecondary: "#B0B0B0", // Medium gray
  textLight: "#808080", // Light gray
  
  // Primary colors
  primary: "#4CAF50", // Light green (inverted)
  primaryLight: "#66BB6A", // Lighter green
  
  // Accent colors
  accent: "#26A69A", // Lighter teal
  iconBackground: "#2D2D2D", // Dark icon background
  
  // Input colors
  inputBackground: "#3D3D3D",
  inputBorder: "#4D4D4D",
  
  // Status colors
  error: "#FF6666",
  success: "#66BB6A",
  
  // Profile colors
  profileBackground: "#7B68EE", // Purple for dark mode
};

// Helper function to get theme based on color scheme
export const getTheme = (colorScheme) => {
  return colorScheme === "dark" ? darkTheme : lightTheme;
};

