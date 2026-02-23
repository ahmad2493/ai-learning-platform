/**
 * Splash Screen - App Launch Screen
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Displays animated splash screen on app launch
 * - Checks user authentication status
 * - Navigates to appropriate screen (login or dashboard)
 * - Provides smooth app initialization experience
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  // Animation values
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const iconGlow = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const decorCircle1 = useRef(new Animated.Value(0)).current;
  const decorCircle2 = useRef(new Animated.Value(0)).current;
  const decorCircle3 = useRef(new Animated.Value(0)).current;

  // Gradient colors based on theme
  const gradientColors = isDark
    ? ["#121212", "#1a1a2e", "#16213e", "#121212"] // Dark gradient
    : ["#F5F5DC", "#E8F5E9", "#C8E6C9", "#F5F5DC"]; // Light gradient

  useEffect(() => {
    // Background fade in
    Animated.timing(backgroundOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Decorative circles animation - using scale instead of width/height for native driver support
    Animated.parallel([
      Animated.timing(decorCircle1, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(decorCircle2, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: 200,
      }),
      Animated.timing(decorCircle3, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: 400,
      }),
    ]).start();

    // Icon animations - scale up, fade in, and continuous floating
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconFloat, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(iconFloat, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconGlow, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(iconGlow, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Title animation - fade in and slide up
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline animation - fade in and slide up
    Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 800,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Button animation - fade in, scale up, and slide up
    Animated.parallel([
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        delay: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.timing(buttonTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade out all elements before navigation
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate("SignIn");
    });
  };

  // Floating animation interpolation
  const floatingY = iconFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  // Glow animation interpolation
  const glowOpacity = iconGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Decor circle scale animations (using scale instead of width/height for native driver)
  const circle1Scale = decorCircle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const circle2Scale = decorCircle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const circle3Scale = decorCircle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[styles.backgroundContainer, { opacity: backgroundOpacity }]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative animated circles - using scale transform */}
          <Animated.View
            style={[
              styles.decorCircle,
              {
                width: 200,
                height: 200,
                backgroundColor: isDark
                  ? "rgba(76, 175, 80, 0.1)"
                  : "rgba(45, 80, 22, 0.08)",
                top: -100,
                right: -100,
                transform: [{ scale: circle1Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.decorCircle,
              {
                width: 150,
                height: 150,
                backgroundColor: isDark
                  ? "rgba(76, 175, 80, 0.08)"
                  : "rgba(45, 80, 22, 0.06)",
                bottom: -50,
                left: -50,
                transform: [{ scale: circle2Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.decorCircle,
              {
                width: 100,
                height: 100,
                backgroundColor: isDark
                  ? "rgba(76, 175, 80, 0.12)"
                  : "rgba(45, 80, 22, 0.1)",
                top: height * 0.3,
                right: width * 0.2,
                transform: [{ scale: circle3Scale }],
              },
            ]}
          />
        </LinearGradient>
      </Animated.View>

      <View style={styles.content}>
        {/* Icon with animations */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: iconScale }, { translateY: floatingY }],
              opacity: iconOpacity,
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.iconGlow,
              {
                opacity: glowOpacity,
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              },
            ]}
          />
          <View
            style={[
              styles.iconBackground,
              {
                backgroundColor: isDark
                  ? "rgba(76, 175, 80, 0.2)"
                  : "rgba(255, 250, 205, 0.9)",
                shadowColor: theme.primary,
              },
            ]}
          >
            <Ionicons name="book" size={70} color={theme.primary} />
          </View>
        </Animated.View>

        {/* App Name with animations */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}
        >
          <Text
            style={[
              styles.appName,
              {
                color: theme.text,
                textShadowColor: isDark
                  ? "rgba(76, 175, 80, 0.3)"
                  : "rgba(45, 80, 22, 0.2)",
              },
            ]}
          >
            DarsGah
          </Text>
        </Animated.View>

        {/* Tagline with animations */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text style={[styles.tagline, { color: theme.textLight }]}>
            Learning made smarter
          </Text>
        </Animated.View>

        {/* Get Started Button with animations - COMMENTED OUT */}
        {/*
        <Animated.View
          style={{
            opacity: buttonOpacity,
            transform: [
              { scale: buttonScale },
              { translateY: buttonTranslateY },
            ],
          }}
        >
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.9}
            style={styles.buttonTouchable}
          >
            <LinearGradient
              colors={
                isDark
                  ? [theme.primary, theme.primaryLight]
                  : [theme.primary, "#4CAF50"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedButton}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 1000,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 1,
    elevation: 10,
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  appName: {
    fontSize: 48,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 1.2,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 18,
    marginBottom: 60,
    letterSpacing: 0.5,
    fontWeight: "400",
  },
  buttonTouchable: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 16,
  },
  getStartedText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  buttonIcon: {
    marginLeft: 10,
  },
});
