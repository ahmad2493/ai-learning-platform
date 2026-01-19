import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const offsetValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current; // For 3D rotation

  const [userData, setUserData] = useState({
    name: 'Brooklyn Simmons',
    email: 'brooklyn234@gmail.com',
    bio: 'Aspiring full-stack developer with a passion for creating innovative and user-friendly applications. Currently honing my skills in React Native and Node.js.',
    location: 'San Francisco, CA',
    joined: 'January 2023',
  });

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = (name) => {
    const names = name.split(' ');
    return names.map((n) => n[0]).join('').toUpperCase();
  };

  const toggleMenu = () => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: showMenu ? 1 : 0.85,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(offsetValue, {
        toValue: showMenu ? 0 : 250,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateValue, {
        toValue: showMenu ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setShowMenu(!showMenu);
  };
  
  const rotateY = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'], // 3D rotation effect
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.sidebarContainer}>
        <Sidebar activeScreen="Profile" />
      </View>

      <Animated.View 
        style={[
            styles.screen,
            { 
                backgroundColor: theme.background, 
                transform: [
                    { scale: scaleValue }, 
                    { translateX: offsetValue },
                    { rotateY: rotateY },
                ]
            }
        ]}
      >
        {showMenu && (
            <TouchableOpacity style={styles.overlay} onPress={toggleMenu} />
        )}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={toggleMenu}>
            <Ionicons name="menu-outline" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
          <View style={{ width: 28 }} />{/* For spacing */}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.profileHeader, { backgroundColor: theme.surface }]}>
                <TouchableOpacity style={styles.avatarContainer} disabled={!isEditing}>
                  <View style={[styles.avatar, {backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center'}]}>
                      {isEditing ? (
                          <Ionicons name="camera-outline" size={40} color="white" />
                      ) : (
                          <Text style={styles.avatarInitials}>{getInitials(userData.name)}</Text>
                      )}
                  </View>
                </TouchableOpacity>
                {isEditing ? (
                    <TextInput style={[styles.nameInput, {color: theme.text, borderColor: theme.hairline}]} value={userData.name} onChangeText={text => handleInputChange('name', text)}/>
                ) : (
                    <Text style={[styles.name, { color: theme.text }]}>{userData.name}</Text>
                )}
                 {isEditing ? (
                    <TextInput style={[styles.emailInput, {color: theme.text, borderColor: theme.hairline}]} value={userData.email} onChangeText={text => handleInputChange('email', text)}/>
                ) : (
                    <Text style={[styles.email, { color: theme.textSecondary }]}>{userData.email}</Text>
                )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>About Me</Text>
                {isEditing ? (
                    <TextInput multiline style={[styles.bioInput, {color: theme.text, borderColor: theme.hairline}]} value={userData.bio} onChangeText={text => handleInputChange('bio', text)}/>
                ) : (
                    <Text style={[styles.bio, { color: theme.textSecondary }]}>{userData.bio}</Text>
                )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.text }]}>Lives in {userData.location}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.text }]}>Joined {userData.joined}</Text>
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: theme.primary }]} 
                onPress={() => setIsEditing(!isEditing)}
            >
                <Ionicons name={isEditing ? "checkmark-done-outline" : "pencil-outline"} size={20} color="white" />
                <Text style={styles.editButtonText}>{isEditing ? 'Save Changes' : 'Edit Profile'}</Text>
            </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sidebarContainer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 250, // Match the animation offset
      zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 100, 
  },
  screen: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  header: {
     flexDirection: "row",
     justifyContent: "space-between",
     alignItems: "center",
     paddingVertical: 10,
     paddingHorizontal: 20,
     borderBottomWidth: 1,
     borderBottomColor: '#E0E0E0',
   },
   headerTitle: {
     fontSize: 22,
     fontWeight: "bold",
   },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 20,
    marginBottom: 20,
  },
  avatarContainer: {
      position: 'relative'
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  avatarInitials: {
      fontSize: 48,
      fontWeight: 'bold',
      color: 'white'
  },
  cameraIcon: {
      position: 'absolute',
      bottom: 15,
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 8,
      borderRadius: 15,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    marginTop: 4,
  },
   nameInput: {
    fontSize: 26,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    textAlign: 'center',
    padding: 5,
    width: '80%'
  },
  emailInput: {
    fontSize: 16,
    marginTop: 4,
    borderBottomWidth: 1,
    textAlign: 'center',
    padding: 5,
    width: '80%'
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
  },
  bioInput: {
      fontSize: 16,
      lineHeight: 24,
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      minHeight: 100,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
  },
  editButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});