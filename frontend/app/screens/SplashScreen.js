/**
 * Creative Animated Splash Screen
 * Style: Premium / Creative (Duolingo & LinkedIn inspired)
 * Features: Typing effect for Brand Name, Subtle Tagline reveal, Custom Logo
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  Platform,
  Image, // Added Image import
} from "react-native";
import { useTheme } from "../utils/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  // Brand name to animate
  const brandName = "DarsGah...";
  const brandChars = brandName.split("");

  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  // Values for each character typing effect
  const charAnimations = useRef(brandChars.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // 1. Logo Pops in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Typing Effect for "darsgah."
      const typingAnimations = charAnimations.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );

      Animated.sequence([
        Animated.stagger(120, typingAnimations), // Slightly slower typing
        // 3. Tagline reveal after typing is done
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ]).start();
    });

    // Auto navigation after animation - stays for 12 seconds
    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace("SignIn");
      });
    }, 12000);

    return () => clearTimeout(timer);
  }, []);

  // Background color - Matching the provided light yellow/green palette
  const bgColor = isDark ? "#0A0A0A" : "#EAFF96"; 
  const primaryBrandColor = isDark ? "#4CAF50" : "#1B5E20";

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity: containerOpacity }]}>
      <StatusBar hidden />
      
      {/* Decorative subtle background elements */}
      <View style={[styles.backgroundGlow, { backgroundColor: isDark ? "#1B5E20" : "#C5E1A5", opacity: 0.2 }]} />

      <View style={styles.centerContent}>
        {/* Static Logo Container with custom Image */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={[styles.whiteCircle, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" }]}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
        </Animated.View>

        {/* Brand Typography with Typing Effect */}
        <View style={styles.textContainer}>
          <View style={styles.brandNameRow}>
            {brandChars.map((char, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.brandName,
                  { 
                    color: primaryBrandColor,
                    opacity: charAnimations[index],
                    transform: [{
                      translateY: charAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [5, 0],
                      })
                    }]
                  }
                ]}
              >
                {char}
              </Animated.Text>
            ))}
          </View>
          
          <Animated.View 
            style={{ 
              opacity: taglineOpacity, 
              transform: [{ translateY: taglineTranslateY }] 
            }}
          >
            <Text style={[styles.brandTagline, { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(27,94,32,0.7)" }]}>
              Empowering Your Physics Journey
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Modern Minimalist Loader at Bottom */}
      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
         <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: primaryBrandColor }]} />
         </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundGlow: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    top: -width * 0.5,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  whiteCircle: {
    width: 230, // Increased from 180
    height: 230, // Increased from 180
    borderRadius: 110, // Updated to match half of new size
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  logoImage: {
    width: 300, // Increased from 120
    height: 300, // Increased from 120
  },
  textContainer: {
    marginTop: 35,
    alignItems: "center",
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Heavy' : 'sans-serif-medium',
  },
  brandTagline: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 5,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    width: 120,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    width: "45%",
    height: "100%",
    borderRadius: 2,
  }
});
