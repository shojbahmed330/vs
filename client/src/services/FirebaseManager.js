import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../config/firebase';

class FirebaseManager {
  constructor() {
    this.app = null;
    this.messaging = null;
    this.auth = null;
    this.isInitialized = false;
    this.vapidKey = process.env.REACT_APP_VAPID_KEY;
    this.onMessageCallback = null;
    this.currentToken = null;
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        return this.app;
      }

      // Initialize Firebase app
      this.app = initializeApp(firebaseConfig);
      
      // Initialize Auth
      this.auth = getAuth(this.app);
      
      // Check if messaging is supported
      const messagingSupported = await isSupported();
      
      if (messagingSupported) {
        // Initialize Messaging
        this.messaging = getMessaging(this.app);
        
        // Set up message listener
        this.setupMessageListener();
        
        console.log('Firebase messaging initialized successfully');
      } else {
        console.warn('Firebase messaging not supported in this browser');
      }
      
      this.isInitialized = true;
      return this.app;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  setupMessageListener() {
    if (!this.messaging) return;

    // Handle foreground messages
    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      const { notification, data } = payload;
      
      // Create notification object
      const notificationData = {
        title: notification?.title || 'Voice Social',
        body: notification?.body || 'You have a new notification',
        icon: notification?.icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        image: notification?.image,
        tag: data?.tag || 'general',
        data: data || {},
        timestamp: Date.now(),
        requireInteraction: data?.requireInteraction === 'true',
        silent: data?.silent === 'true',
        actions: data?.actions ? JSON.parse(data.actions) : []
      };
      
      // Show notification if permission granted
      if (Notification.permission === 'granted') {
        this.showNotification(notificationData);
      }
      
      // Call custom callback if set
      if (this.onMessageCallback) {
        this.onMessageCallback(notificationData);
      }
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('firebaseMessage', {
        detail: notificationData
      }));
    });
  }

  async requestPermission() {
    try {
      if (!this.messaging) {
        throw new Error('Firebase messaging not initialized');
      }

      // Check if permission already granted
      if (Notification.permission === 'granted') {
        return await this.getFCMToken();
      }

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        return await this.getFCMToken();
      } else {
        console.log('Notification permission denied');
        return null;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  async getFCMToken() {
    try {
      if (!this.messaging) {
        throw new Error('Firebase messaging not initialized');
      }

      if (!this.vapidKey) {
        throw new Error('VAPID key not configured');
      }

      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      });
      
      if (token) {
        console.log('FCM token obtained:', token);
        this.currentToken = token;
        
        // Store token in localStorage
        localStorage.setItem('fcm_token', token);
        
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      // Clear stored token
      localStorage.removeItem('fcm_token');
      this.currentToken = null;
      
      // Get new token
      return await this.getFCMToken();
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      throw error;
    }
  }

  getStoredToken() {
    return localStorage.getItem('fcm_token') || this.currentToken;
  }

  showNotification(notificationData) {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          image: notificationData.image,
          tag: notificationData.tag,
          data: notificationData.data,
          requireInteraction: notificationData.requireInteraction,
          silent: notificationData.silent,
          actions: notificationData.actions,
          vibrate: [200, 100, 200],
          timestamp: notificationData.timestamp
        });
      });
    } else {
      // Fallback for browsers without service worker
      new Notification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        tag: notificationData.tag,
        data: notificationData.data
      });
    }
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  // Helper method to check notification support
  isNotificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get notification permission status
  getPermissionStatus() {
    if (!this.isNotificationSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Subscribe to topic (for group notifications)
  async subscribeToTopic(topic) {
    try {
      const token = this.getStoredToken();
      if (!token) {
        throw new Error('No FCM token available');
      }

      // Send token to server to subscribe to topic
      const response = await fetch('/api/notifications/subscribe-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          token,
          topic
        })
      });

      if (response.ok) {
        console.log(`Subscribed to topic: ${topic}`);
        return true;
      } else {
        throw new Error('Failed to subscribe to topic');
      }
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  // Unsubscribe from topic
  async unsubscribeFromTopic(topic) {
    try {
      const token = this.getStoredToken();
      if (!token) {
        throw new Error('No FCM token available');
      }

      const response = await fetch('/api/notifications/unsubscribe-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          token,
          topic
        })
      });

      if (response.ok) {
        console.log(`Unsubscribed from topic: ${topic}`);
        return true;
      } else {
        throw new Error('Failed to unsubscribe from topic');
      }
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }

  // Update server with FCM token
  async updateServerToken() {
    try {
      const token = this.getStoredToken();
      if (!token) {
        console.log('No FCM token to update');
        return;
      }

      const response = await fetch('/api/auth/update-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          fcmToken: token,
          deviceInfo: {
            deviceId: this.getDeviceId(),
            deviceType: this.getDeviceType(),
            platform: 'web',
            userAgent: navigator.userAgent
          }
        })
      });

      if (response.ok) {
        console.log('FCM token updated on server');
      } else {
        console.error('Failed to update FCM token on server');
      }
    } catch (error) {
      console.error('Error updating FCM token:', error);
    }
  }

  // Generate device ID
  getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'web_' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  // Detect device type
  getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile';
    } else {
      return 'web';
    }
  }

  // Test notification
  async testNotification() {
    if (Notification.permission === 'granted') {
      this.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from Voice Social',
        icon: '/icons/icon-192x192.png',
        tag: 'test',
        data: { test: true },
        timestamp: Date.now()
      });
    } else {
      console.log('Notification permission not granted');
    }
  }

  // Clear all notifications
  clearAllNotifications() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => {
            notification.close();
          });
        });
      });
    }
  }

  // Get notification settings
  getNotificationSettings() {
    return {
      supported: this.isNotificationSupported(),
      permission: this.getPermissionStatus(),
      token: this.getStoredToken(),
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType()
    };
  }
}

// Create singleton instance
const firebaseManager = new FirebaseManager();

export default firebaseManager;