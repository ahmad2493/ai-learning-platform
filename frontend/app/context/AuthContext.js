import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/apiConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  // Robust helper to decode JWT token in React Native
  const getUserIdFromToken = (token) => {
    try {
      if (!token) return null;
      const payload = token.split('.')[1];
      if (!payload) return null;

      // Manual Base64 decoding (Base64Url to Base64)
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = String(base64).replace(/[=]+$/, '');
      let output = '';
      
      for (
        let bc = 0, bs, buffer, idx = 0;
        (buffer = str.charAt(idx++));
        ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
          ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
          : 0
      ) {
        buffer = chars.indexOf(buffer);
      }

      const decodedPayload = JSON.parse(output);
      console.log('🗝️ [AuthContext] Decoded ID from Token:', decodedPayload.userId || decodedPayload.id || decodedPayload.sub);
      
      // Look for common ID fields in JWT payloads
      return decodedPayload.userId || decodedPayload.id || decodedPayload.sub || decodedPayload._id;
    } catch (e) {
      console.error('[AuthContext] Token decode error:', e);
      return null;
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          await signIn(token);
        }
      } catch (e) {
        console.error('[AuthContext] Bootstrap error:', e);
        await signOut();
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const signIn = async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch profile on sign-in');
      }

      // Profile API data
      let userData = result.data;
      
      // EXTRACT ID FROM TOKEN if not present in profile data
      const idFromToken = getUserIdFromToken(token);
      
      // Merge profile data with the extracted ID
      const userWithId = {
        ...userData,
        userId: userData.userId || userData._id || userData.id || idFromToken
      };

      console.log('👤 [AuthContext] User Session Ready:', userWithId.name, 'ID:', userWithId.userId);

      setUser(userWithId);
      setUserToken(token);

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(userWithId));

    } catch (error) {
      console.error('[AuthContext] Sign-in error:', error);
      await signOut();
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const keysToRemove = [
          'userToken', 'user', 'authToken', 'mongo_user_id', 
          'userName', 'userEmail', 'darsgah_user_chats'
      ];
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (e) {
      console.error('[AuthContext] Failed to clear storage', e);
    } finally {
      setUser(null);
      setUserToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userToken,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
