import React, {createContext, useContext, useEffect, useState} from 'react';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import {useAuth} from './AuthContext';
import {Alert, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {notificationAPI} from '../services/api';

const PushNotificationContext = createContext();

export const usePushNotification = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotification must be used within a PushNotificationProvider');
  }
  return context;
};

export const PushNotificationProvider = ({children}) => {
  const {user, token} = useAuth();
  const [fcmToken, setFcmToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    initializePushNotifications();
    setupNotificationHandlers();
  }, []);

  useEffect(() => {
    if (user && token && fcmToken) {
      registerTokenWithServer();
    }
  }, [user, token, fcmToken]);

  const initializePushNotifications = async () => {
    try {
      // Get FCM token
      const token = await messaging().getToken();
      setFcmToken(token);
      await AsyncStorage.setItem('fcmToken', token);
      console.log('FCM Token generated:', token);

      // Listen for token refresh
      messaging().onTokenRefresh(token => {
        setFcmToken(token);
        AsyncStorage.setItem('fcmToken', token);
        if (user) {
          registerTokenWithServer(token);
        }
      });

    } catch (error) {
      console.error('Push notification initialization error:', error);
    }
  };

  const setupNotificationHandlers = () => {
    // Handle notification when app is killed/closed
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage);
        handleNotificationOpen(remoteMessage);
      }
    });

    // Handle notification when app is in background
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      handleNotificationOpen(remoteMessage);
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });
  };

  const registerTokenWithServer = async (tokenToRegister = fcmToken) => {
    try {
      if (token && tokenToRegister) {
        await notificationAPI.registerFCMToken(token, tokenToRegister);
        console.log('FCM token registered with server');
      }
    } catch (error) {
      console.error('Failed to register FCM token with server:', error);
    }
  };

  const handleNotificationOpen = (remoteMessage) => {
    try {
      const {data} = remoteMessage;
      
      // Handle different notification types
      switch (data?.type) {
        case 'friend_request':
          // Navigate to friends screen
          break;
        case 'message':
          // Navigate to chat
          break;
        case 'post_like':
        case 'post_comment':
          // Navigate to post
          break;
        case 'live_stream':
          // Navigate to live stream
          break;
        default:
          // Default action
          break;
      }
    } catch (error) {
      console.error('Notification handling error:', error);
    }
  };

  const sendLocalNotification = (title, message, data = {}) => {
    PushNotification.localNotification({
      title,
      message,
      playSound: true,
      soundName: 'default',
      data,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });
  };

  const scheduleNotification = (title, message, date, data = {}) => {
    PushNotification.localNotificationSchedule({
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      data,
    });
  };

  const clearAllNotifications = () => {
    PushNotification.cancelAllLocalNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      if (token) {
        await notificationAPI.markAsRead(token, notificationId);
        
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? {...notif, read: true}
              : notif
          )
        );
        
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getNotifications = async () => {
    try {
      if (token) {
        const response = await notificationAPI.getNotifications(token);
        if (response.success) {
          setNotifications(response.notifications);
          setUnreadCount(response.unreadCount);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const value = {
    fcmToken,
    notifications,
    unreadCount,
    sendLocalNotification,
    scheduleNotification,
    clearAllNotifications,
    markNotificationAsRead,
    getNotifications,
    registerTokenWithServer,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};