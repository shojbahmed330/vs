import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert} from 'react-native';
import {authAPI} from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verify token with server
        try {
          const response = await authAPI.verifyToken(storedToken);
          if (response.success) {
            setUser(response.user);
            await AsyncStorage.setItem('user', JSON.stringify(response.user));
          } else {
            await logout();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          await logout();
        }
      }
    } catch (error) {
      console.error('Auth status check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        const {token: authToken, user: userData} = response;
        
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        setToken(authToken);
        setUser(userData);
        
        // Send FCM token to server
        const fcmToken = await AsyncStorage.getItem('fcmToken');
        if (fcmToken) {
          await authAPI.updateFCMToken(authToken, fcmToken);
        }
        
        return {success: true};
      } else {
        return {success: false, message: response.message};
      }
    } catch (error) {
      console.error('Login error:', error);
      return {success: false, message: 'লগইন করতে সমস্যা হয়েছে'};
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const {token: authToken, user: newUser} = response;
        
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        
        setToken(authToken);
        setUser(newUser);
        
        return {success: true};
      } else {
        return {success: false, message: response.message};
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {success: false, message: 'রেজিস্ট্রেশন করতে সমস্যা হয়েছে'};
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Remove FCM token from server
      if (token) {
        await authAPI.removeFCMToken(token);
      }
      
      await AsyncStorage.multiRemove(['authToken', 'user', 'fcmToken']);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const updatedUser = {...user, ...updatedData};
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('User update error:', error);
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};