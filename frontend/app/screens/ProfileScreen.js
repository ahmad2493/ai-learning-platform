import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [userData, setUserData] = useState({
    name: 'User',
    email: '',
    bio: '',
    profilePicture: null,
  });

  // This will only run once to load initial data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        const email = await AsyncStorage.getItem('userEmail');
        const storedData = {};
        if (name) storedData.name = name;
        if (email) storedData.email = email;
        setUserData(prev => ({...prev, ...storedData}));
      } catch (error) {
        console.error("Failed to load user data from storage.", error);
      }
    };
    loadUserData();
  }, []);

  const handleInputChange = (field, value) => {
    setUserData(prev => ({...prev, [field]: value}));
  }

  // This function now only exits edit mode. No saving.
  const handleSaveChanges = () => {
    setIsEditing(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      // Update the image in the UI state only
      setUserData(prev => ({ ...prev, profilePicture: uri }));
    }
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  }

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleEditPress = () => {
    if (isEditing) {
      handleSaveChanges();
    } else {
      setIsEditing(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.contentWrapper}>
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
                <TouchableOpacity onPress={toggleSidebar}>
                    <Ionicons name="menu" size={28} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.profileHeader, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity style={styles.avatarContainer} disabled={!isEditing} onPress={handlePickImage}>
                        <View style={[styles.avatar, {backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center'}]}>
                            {isEditing ? (
                                <Ionicons name="camera-outline" size={40} color="white" />
                            ) : userData.profilePicture ? (
                                <Image source={{ uri: userData.profilePicture }} style={styles.avatarImage} />
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
                    <Text style={[styles.email, { color: theme.textSecondary }]}>{userData.email}</Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>About Me</Text>
                    {isEditing ? (
                        <TextInput multiline style={[styles.bioInput, {color: theme.text, borderColor: theme.hairline}]} value={userData.bio} onChangeText={text => handleInputChange('bio', text)}/>
                    ) : (
                        <Text style={[styles.bio, { color: theme.textSecondary }]}>{userData.bio || 'Tell us about yourself...'}</Text>
                    )}
                </View>

                <TouchableOpacity 
                    style={[styles.editButton, { backgroundColor: theme.primary }]} 
                    onPress={handleEditPress}
                >
                    <Ionicons name={isEditing ? "checkmark-done-outline" : "pencil-outline"} size={20} color="white" />
                    <Text style={styles.editButtonText}>{isEditing ? 'Save Changes' : 'Edit Profile'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center'
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50, 
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
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
      fontSize: 48,
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center',
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
      textAlignVertical: 'top',
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