import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/apiConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          await signIn(token);
        }
      } catch (e) {
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
      // THE FIX: The user data is nested under the `data` property.
      const userData = result.data;

      setUser(userData);
      setUserToken(token);

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

    } catch (error) {
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
