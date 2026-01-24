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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import Sidebar from './SidebarComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../utils/apiConfig';
import CustomAlert from '../components/CustomAlert';

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  const [userData, setUserData] = useState({
    name: 'User',
    email: '',
    bio: '',
    profilePicture: null,
  });

  const [userId, setUserId] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('📥 [PROFILE] Loading user data...');
        
        const mongoId = await AsyncStorage.getItem('mongo_user_id');
        const token = await AsyncStorage.getItem('authToken');
        const name = await AsyncStorage.getItem('userName');
        const email = await AsyncStorage.getItem('userEmail');

        console.log('📥 [PROFILE] Retrieved data:', { mongoId, hasToken: !!token, name, email });

        if (!mongoId) {
          showAlert('Error', 'No user found. Please log in again.');
          navigation.navigate('SignIn');
          return;
        }

        setUserId(mongoId);
        setAuthToken(token);
        setUserData(prev => ({
          ...prev,
          name: name || prev.name,
          email: email || prev.email,
        }));

        await fetchUserProfile(mongoId, token);

      } catch (error) {
        console.error('❌ [PROFILE] Failed to load user data:', error);
        showAlert('Error', 'Failed to load profile data.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, []);

  const fetchUserProfile = async (id, token) => {
    try {
      console.log('🌐 [PROFILE] Fetching profile from backend...');
      
      const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/profile/${id}`, {
        method: 'GET',
        headers: headers,
      });

      console.log('📥 [PROFILE] Response status:', response.status);
      const result = await response.json();
      console.log('📥 [PROFILE] Response data:', result);

      if (result.success) {
        setUserData(prev => ({
          ...prev,
          bio: result.data.bio || '',
          profilePicture: result.data.profile_photo_url || null,
          name: result.data.name || prev.name,
        }));
        console.log('✅ [PROFILE] Profile loaded successfully');
      } else {
        console.log('⚠️ [PROFILE] Failed to fetch profile:', result.message);
      }
    } catch (error) {
      console.error('❌ [PROFILE] Error fetching profile:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'We need camera roll permissions to pick an image.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        console.log('📸 [PROFILE] Image selected:', uri);
        setUserData(prev => ({ ...prev, profilePicture: uri }));
      }
    } catch (error) {
      console.error('❌ [PROFILE] ImagePicker error:', error);
      showAlert('Error', 'Failed to pick image.');
    }
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

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

  const handleSaveChanges = async () => {
    if (!userId) {
      showAlert('Error', 'User ID not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      console.log('💾 [PROFILE] Saving changes...');
      
      const formData = new FormData();
      formData.append('name', userData.name.trim());
      formData.append('bio', userData.bio);

      if (userData.profilePicture && userData.profilePicture.startsWith('file://')) {
        const filename = userData.profilePicture.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('profile_picture', {
          uri: Platform.OS === 'ios' ? userData.profilePicture.replace('file://', '') : userData.profilePicture,
          name: filename,
          type,
        });
        
        console.log('📸 [PROFILE] Uploading new profile picture');
      }

      const headers = {
        'ngrok-skip-browser-warning': 'true',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      console.log('🌐 [PROFILE] Sending update request...');
      const response = await fetch(`${BASE_URL}/profile/${userId}`, {
        method: 'PATCH',
        body: formData,
        headers: headers,
      });

      console.log('📥 [PROFILE] Response status:', response.status);
      const result = await response.json();
      console.log('📥 [PROFILE] Response data:', result);

      if (result.success) {
        await AsyncStorage.setItem('userName', userData.name.trim());
        
        showAlert('Success', 'Profile updated successfully!', 'success');
        setIsEditing(false);
        
        await fetchUserProfile(userId, authToken);
        
        console.log('✅ [PROFILE] Profile updated successfully');
      } else {
        console.log('❌ [PROFILE] Update failed:', result);
        showAlert('Error', result.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('❌ [PROFILE] Error updating profile:', error);
      showAlert('Error', 'An error occurred while updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />
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
              <TouchableOpacity 
                style={styles.avatarContainer} 
                disabled={!isEditing} 
                onPress={handlePickImage}
                activeOpacity={isEditing ? 0.7 : 1}
              >
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  {userData.profilePicture ? (
                    <Image source={{ uri: userData.profilePicture }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>{getInitials(userData.name)}</Text>
                  )}
                  {isEditing && (
                    <View style={styles.cameraOverlay}>
                      <Ionicons name="camera-outline" size={30} color="white" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {isEditing ? (
                <TextInput
                  style={[styles.nameInput, { color: theme.text, borderColor: theme.inputBorder }]}
                  value={userData.name}
                  onChangeText={text => handleInputChange('name', text)}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textSecondary}
                />
              ) : (
                <Text style={[styles.name, { color: theme.text }]}>{userData.name}</Text>
              )}
              <Text style={[styles.email, { color: theme.textSecondary }]}>{userData.email}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>About Me</Text>
              {isEditing ? (
                <TextInput
                  multiline
                  style={[styles.bioInput, { 
                    color: theme.text, 
                    borderColor: theme.inputBorder,
                    backgroundColor: theme.inputBackground 
                  }]}
                  value={userData.bio}
                  onChangeText={text => handleInputChange('bio', text)}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={theme.textSecondary}
                />
              ) : (
                <Text style={[styles.bio, { color: theme.textSecondary }]}>
                  {userData.bio || 'Tell us about yourself...'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.primary }]}
              onPress={handleEditPress}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name={isEditing ? "checkmark-done-outline" : "pencil-outline"} size={20} color="white" />
                  <Text style={styles.editButtonText}>{isEditing ? 'Save Changes' : 'Edit Profile'}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  profileHeader: { alignItems: 'center', padding: 30, borderRadius: 20, marginBottom: 20 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 48, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  cameraOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 16 },
  nameInput: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    borderBottomWidth: 1, 
    textAlign: 'center', 
    padding: 8, 
    width: '110%',
    marginBottom: 4,
  },
  card: { borderRadius: 15, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  bio: { fontSize: 16, lineHeight: 24 },
  bioInput: { 
    fontSize: 16, 
    lineHeight: 24, 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    minHeight: 120, 
    textAlignVertical: 'top' 
  },
  editButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 12,
    marginTop: 10,
  },
  editButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});