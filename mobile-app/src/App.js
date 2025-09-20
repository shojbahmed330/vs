import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthProvider, useAuth} from './contexts/AuthContext';
import {PushNotificationProvider} from './contexts/PushNotificationContext';
import {SocketProvider} from './contexts/SocketContext';
import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import LoadingScreen from './screens/LoadingScreen';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

const Stack = createStackNavigator();

const AppContent = () => {
  const {user, isLoading, checkAuthStatus} = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check authentication status
        await checkAuthStatus();
        
        // Request permission for push notifications
        await requestNotificationPermission();
        
        // Setup foreground message handler
        const unsubscribe = messaging().onMessage(async remoteMessage => {
          console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
          
          // Show local notification when app is in foreground
          PushNotification.localNotification({
            title: remoteMessage.notification?.title || 'নতুন বার্তা',
            message: remoteMessage.notification?.body || 'আপনার জন্য একটি নতুন বার্তা এসেছে',
            playSound: true,
            soundName: 'default',
            data: remoteMessage.data,
          });
        });

        setInitializing(false);
        return unsubscribe;
      } catch (error) {
        console.error('App initialization error:', error);
        setInitializing(false);
      }
    };

    initializeApp();
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        // Get FCM token
        const fcmToken = await messaging().getToken();
        console.log('FCM Token:', fcmToken);
        
        // Store token in AsyncStorage
        await AsyncStorage.setItem('fcmToken', fcmToken);
      } else {
        Alert.alert(
          'নোটিফিকেশন পারমিশন',
          'নোটিফিকেশন পেতে পারমিশন দিন',
          [
            {text: 'ঠিক আছে', style: 'default'},
          ]
        );
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  };

  if (initializing || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="#1877f2"
      />
      {user ? (
        <SocketProvider>
          <MainNavigator />
        </SocketProvider>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <PushNotificationProvider>
          <AppContent />
        </PushNotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;