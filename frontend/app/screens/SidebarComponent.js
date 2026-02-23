import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isVisible, onClose, activeScreen }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const sidebarAnimation = React.useRef(new Animated.Value(0)).current;
  const sidebarWidth = 110;

  useEffect(() => {
    Animated.spring(sidebarAnimation, {
      toValue: isVisible ? 1 : 0,
      tension: 40,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [isVisible]);

  const handleLogout = async () => {
    if (isVisible) {
      onClose();
      await signOut();
    }
  };

  const handleNavigation = (screenName) => {
    if (isVisible) {
      onClose();
      if (screenName === activeScreen) return;
      navigation.navigate(screenName);
    }
  };

  const SidebarIcon = ({ name, screenName, label }) => (
    <TouchableOpacity 
        style={[styles.sidebarIcon, activeScreen === screenName && styles.activeSidebarIcon]} 
        onPress={() => handleNavigation(screenName)}
    >
        <Ionicons name={name} size={30} color="#FFFFFF" />
        <Text style={styles.sidebarLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      {isVisible && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.primary,
            width: sidebarWidth,
            transform: [
              {
                translateX: sidebarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sidebarWidth, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.sidebarScroll}>
            <View style={styles.sidebarTop}>
                <SidebarIcon name="grid-outline" screenName="StudentDashboard" label="Dashboard" />
                <SidebarIcon name="person-circle-outline" screenName="Profile" label="Profile" />
                <SidebarIcon name="chatbubbles-outline" screenName="AiChat" label="AI Chat" />
                <SidebarIcon name="document-text-outline" screenName="TestGenerator" label="Test Generator" />
                <SidebarIcon name="documents-outline" screenName="PastPapers" label="Past Papers" />
                <SidebarIcon name="bar-chart-outline" screenName="CloPerformance" label="Progress" />
                <SidebarIcon name="settings-outline" screenName="Settings" label="Settings" />
            </View>
        </ScrollView>
        <View style={styles.sidebarBottom}>
            <TouchableOpacity style={styles.sidebarIcon} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={30} color="#FF6B6B" />
                <Text style={[styles.sidebarLabel, {color: '#FF6B6B'}]}>Logout</Text>
            </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 100 },
  sidebar: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'space-between', paddingVertical: 50, zIndex: 101, borderTopLeftRadius: 25, borderBottomLeftRadius: 25 },
  sidebarScroll: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  sidebarTop: { alignItems: 'center', gap: 30, marginTop: 50, paddingBottom: 20 },
  sidebarBottom: { marginBottom: 20 },
  sidebarIcon: { 
      height: 60, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderRadius: 15, 
      paddingHorizontal: 10, 
  },
  activeSidebarIcon: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  sidebarLabel: { color: 'white', marginTop: 5, fontSize: 12, fontWeight: '500' },
});
