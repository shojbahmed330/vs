const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

class FirebaseAdmin {
  constructor() {
    this.app = null;
    this.messaging = null;
    this.auth = null;
    this.firestore = null;
    this.isInitialized = false;
  }

  initialize() {
    try {
      if (this.isInitialized) {
        logger.info('Firebase Admin already initialized');
        return this.app;
      }

      // Check if required environment variables exist
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_PRIVATE_KEY || 
          !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error('Missing Firebase configuration environment variables');
      }

      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
      };

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });

      this.messaging = admin.messaging();
      this.auth = admin.auth();
      this.firestore = admin.firestore();
      
      this.isInitialized = true;
      logger.info('Firebase Admin initialized successfully');
      
      return this.app;
    } catch (error) {
      logger.error('Firebase Admin initialization failed:', error.message);
      throw error;
    }
  }

  getMessaging() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.messaging;
  }

  getAuth() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.auth;
  }

  getFirestore() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.firestore;
  }

  async sendPushNotification(tokens, payload, options = {}) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      if (!tokens || tokens.length === 0) {
        throw new Error('No FCM tokens provided');
      }

      const message = {
        notification: {
          title: payload.title || 'Voice Social',
          body: payload.body || 'You have a new notification',
          image: payload.image || undefined
        },
        data: {
          ...payload.data,
          timestamp: Date.now().toString(),
          type: payload.type || 'general'
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#1976d2',
            sound: 'default',
            clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
            priority: 'high'
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: payload.badge || 1,
              'content-available': 1,
              'mutable-content': 1
            }
          }
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            image: payload.image,
            tag: payload.tag || 'general',
            requireInteraction: payload.requireInteraction || false,
            silent: payload.silent || false,
            vibrate: payload.vibrate || [200, 100, 200],
            actions: payload.actions || []
          },
          fcmOptions: {
            link: payload.clickAction || '/'
          }
        },
        ...options
      };

      let response;
      
      if (tokens.length === 1) {
        // Single token
        response = await this.messaging.send({
          ...message,
          token: tokens[0]
        });
        logger.info('Push notification sent successfully:', response);
        return { success: true, response };
      } else {
        // Multiple tokens
        response = await this.messaging.sendMulticast({
          ...message,
          tokens: tokens
        });
        
        logger.info(`Push notifications sent: ${response.successCount}/${tokens.length}`);
        
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push({
                token: tokens[idx],
                error: resp.error?.message
              });
            }
          });
          logger.warn('Some notifications failed:', failedTokens);
        }
        
        return {
          success: response.successCount > 0,
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses
        };
      }
    } catch (error) {
      logger.error('Error sending push notification:', error.message);
      throw error;
    }
  }

  async sendTopicNotification(topic, payload, options = {}) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const message = {
        topic: topic,
        notification: {
          title: payload.title || 'Voice Social',
          body: payload.body || 'You have a new notification'
        },
        data: {
          ...payload.data,
          timestamp: Date.now().toString()
        },
        ...options
      };

      const response = await this.messaging.send(message);
      logger.info('Topic notification sent successfully:', response);
      return { success: true, response };
    } catch (error) {
      logger.error('Error sending topic notification:', error.message);
      throw error;
    }
  }

  async subscribeToTopic(tokens, topic) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const response = await this.messaging.subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${response.successCount} tokens to topic: ${topic}`);
      return response;
    } catch (error) {
      logger.error('Error subscribing to topic:', error.message);
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens, topic) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${response.successCount} tokens from topic: ${topic}`);
      return response;
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error.message);
      throw error;
    }
  }

  async verifyIdToken(idToken) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Error verifying ID token:', error.message);
      throw error;
    }
  }

  async createCustomToken(uid, additionalClaims = {}) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const customToken = await this.auth.createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      logger.error('Error creating custom token:', error.message);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const userRecord = await this.auth.getUserByEmail(email);
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      logger.error('Error getting user by email:', error.message);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const userRecord = await this.auth.createUser(userData);
      return userRecord;
    } catch (error) {
      logger.error('Error creating user:', error.message);
      throw error;
    }
  }

  async updateUser(uid, userData) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const userRecord = await this.auth.updateUser(uid, userData);
      return userRecord;
    } catch (error) {
      logger.error('Error updating user:', error.message);
      throw error;
    }
  }

  async deleteUser(uid) {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      await this.auth.deleteUser(uid);
      logger.info(`User ${uid} deleted successfully`);
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error.message);
      throw error;
    }
  }

  async cleanupInvalidTokens(tokens) {
    try {
      const validTokens = [];
      const invalidTokens = [];
      
      for (const token of tokens) {
        try {
          // Try to send a test message to validate token
          await this.messaging.send({
            token: token,
            data: { test: 'true' }
          }, true); // dry run
          
          validTokens.push(token);
        } catch (error) {
          if (error.code === 'messaging/registration-token-not-registered' ||
              error.code === 'messaging/invalid-registration-token') {
            invalidTokens.push(token);
          } else {
            validTokens.push(token); // Keep token if error is not token-related
          }
        }
      }
      
      return { validTokens, invalidTokens };
    } catch (error) {
      logger.error('Error cleaning up tokens:', error.message);
      throw error;
    }
  }
}

module.exports = new FirebaseAdmin();