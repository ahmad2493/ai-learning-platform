import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/apiConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  // Helper to decode JWT token
  const getUserIdFromToken = (token) => {
    try {
      if (!token) return null;
      const payload = token.split('.')[1];
      if (!payload) return null;

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
      return decodedPayload.userId || decodedPayload.id || decodedPayload.sub || decodedPayload._id;
    } catch (e) {
      console.error('[AuthContext] Token decode error:', e);
      return null;
    }
  };

  const refreshUser = async () => {
    if (!userToken) return;
    try {
      const response = await fetch(`${BASE_URL}/profile/me`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const result = await response.json();
      
      if (response.ok && result.success) {
        const idFromToken = getUserIdFromToken(userToken);
        const updatedUser = {
          ...result.data,
          userId: result.data.userId || result.data._id || idFromToken
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('[AuthContext] Refresh user error:', error);
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Instead of calling signIn (which fetches profile), 
          // we can just set token and refresh to avoid redundant code
          setUserToken(token);
          const savedUser = await AsyncStorage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
          // Sync with server
          const response = await fetch(`${BASE_URL}/profile/me`, {
            headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          });
          const result = await response.json();
          if (response.ok && result.success) {
            const idFromToken = getUserIdFromToken(token);
            const userWithId = { ...result.data, userId: result.data.userId || result.data._id || idFromToken };
            setUser(userWithId);
            await AsyncStorage.setItem('user', JSON.stringify(userWithId));
          }
        }
      } catch (e) {
        console.error('[AuthContext] Bootstrap error:', e);
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

      const idFromToken = getUserIdFromToken(token);
      const userWithId = {
        ...result.data,
        userId: result.data.userId || result.data._id || idFromToken
      };

      setUser(userWithId);
      setUserToken(token);

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(userWithId));
    } catch (error) {
      console.error('[AuthContext] Sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const keysToRemove = ['userToken', 'user', 'authToken', 'mongo_user_id', 'userName', 'userEmail'];
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (e) {
      console.error('[AuthContext] Sign-out error:', e);
    } finally {
      setUser(null);
      setUserToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userToken, isLoading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
