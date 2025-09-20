const admin = require('firebase-admin');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Initialize Firebase Admin (you need to add your service account key)
const serviceAccount = {
  // Add your Firebase service account credentials here
  // Download from Firebase Console > Project Settings > Service Accounts
};

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Add your Firebase project configuration
    });
  }
} catch (error) {
  console.log('Firebase Admin initialization error:', error.message);
}

class PushNotificationService {
  constructor() {
    this.messaging = admin.messaging();
  }

  // Send push notification to a single user
  async sendToUser(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user: ${userId}`);
        return false;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: notification.type || 'general',
          targetId: notification.targetId || '',
          userId: userId.toString(),
          ...notification.data
        },
        tokens: user.fcmTokens,
        android: {
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: user.unreadNotifications || 0,
            },
          },
        },
      };

      const response = await this.messaging.sendMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(user.fcmTokens[idx]);
          }
        });
        
        // Remove invalid tokens
        await this.removeInvalidTokens(userId, failedTokens);
      }

      // Save notification to database
      await this.saveNotification(userId, notification);

      console.log(`Push notification sent to user ${userId}:`, response.successCount, 'successful,', response.failureCount, 'failed');
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send push notification to multiple users
  async sendToMultipleUsers(userIds, notification) {
    const promises = userIds.map(userId => this.sendToUser(userId, notification));
    return Promise.allSettled(promises);
  }

  // Send notification to all friends of a user
  async sendToFriends(userId, notification) {
    try {
      const user = await User.findById(userId).populate('friends');
      if (!user || !user.friends.length) {
        return false;
      }

      const friendIds = user.friends.map(friend => friend._id);
      return this.sendToMultipleUsers(friendIds, notification);
    } catch (error) {
      console.error('Error sending notification to friends:', error);
      return false;
    }
  }

  // Send notification based on user preferences
  async sendWithPreferences(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Check notification preferences
      const preferences = user.notificationPreferences || {};
      const notificationType = notification.type;

      // Skip if user has disabled this notification type
      if (preferences[notificationType] === false) {
        console.log(`User ${userId} has disabled ${notificationType} notifications`);
        return false;
      }

      return this.sendToUser(userId, notification);
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return false;
    }
  }

  // Register FCM token for a user
  async registerToken(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Initialize fcmTokens array if it doesn't exist
      if (!user.fcmTokens) {
        user.fcmTokens = [];
      }

      // Add token if it doesn't already exist
      if (!user.fcmTokens.includes(token)) {
        user.fcmTokens.push(token);
        await user.save();
        console.log(`FCM token registered for user: ${userId}`);
      }

      return true;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  }

  // Remove FCM token for a user
  async removeToken(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.fcmTokens) return false;

      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();
      
      console.log(`FCM token removed for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error removing FCM token:', error);
      return false;
    }
  }

  // Remove invalid tokens
  async removeInvalidTokens(userId, invalidTokens) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.fcmTokens) return;

      user.fcmTokens = user.fcmTokens.filter(token => !invalidTokens.includes(token));
      await user.save();
      
      console.log(`Removed ${invalidTokens.length} invalid tokens for user: ${userId}`);
    } catch (error) {
      console.error('Error removing invalid tokens:', error);
    }
  }

  // Save notification to database
  async saveNotification(userId, notificationData) {
    try {
      const notification = new Notification({
        recipient: userId,
        title: notificationData.title,
        message: notificationData.body,
        type: notificationData.type || 'general',
        data: notificationData.data || {},
        read: false,
        createdAt: new Date()
      });

      await notification.save();

      // Update user's unread count
      await User.findByIdAndUpdate(userId, {
        $inc: { unreadNotifications: 1 }
      });

      return notification;
    } catch (error) {
      console.error('Error saving notification:', error);
      return null;
    }
  }

  // Send friend request notification
  async sendFriendRequestNotification(senderId, receiverId) {
    const sender = await User.findById(senderId);
    if (!sender) return false;

    const notification = {
      title: 'নতুন বন্ধুত্বের অনুরোধ',
      body: `${sender.firstName} ${sender.lastName} আপনাকে বন্ধুত্বের অনুরোধ পাঠিয়েছেন`,
      type: 'friend_request',
      targetId: senderId,
      data: {
        senderId: senderId.toString(),
        senderName: `${sender.firstName} ${sender.lastName}`,
        senderAvatar: sender.avatar || ''
      }
    };

    return this.sendWithPreferences(receiverId, notification);
  }

  // Send message notification
  async sendMessageNotification(senderId, receiverId, messagePreview) {
    const sender = await User.findById(senderId);
    if (!sender) return false;

    const notification = {
      title: `${sender.firstName} ${sender.lastName}`,
      body: messagePreview || 'নতুন মেসেজ পাঠিয়েছেন',
      type: 'message',
      targetId: senderId,
      data: {
        senderId: senderId.toString(),
        senderName: `${sender.firstName} ${sender.lastName}`,
        conversationId: receiverId.toString()
      }
    };

    return this.sendWithPreferences(receiverId, notification);
  }

  // Send post interaction notification
  async sendPostNotification(actorId, postOwnerId, type, postId) {
    if (actorId.toString() === postOwnerId.toString()) return false; // Don't notify yourself

    const actor = await User.findById(actorId);
    if (!actor) return false;

    let title, body;
    switch (type) {
      case 'like':
        title = 'নতুন লাইক';
        body = `${actor.firstName} ${actor.lastName} আপনার পোস্ট লাইক করেছেন`;
        break;
      case 'comment':
        title = 'নতুন কমেন্ট';
        body = `${actor.firstName} ${actor.lastName} আপনার পোস্টে কমেন্ট করেছেন`;
        break;
      default:
        return false;
    }

    const notification = {
      title,
      body,
      type: `post_${type}`,
      targetId: postId,
      data: {
        actorId: actorId.toString(),
        actorName: `${actor.firstName} ${actor.lastName}`,
        postId: postId.toString()
      }
    };

    return this.sendWithPreferences(postOwnerId, notification);
  }

  // Send live stream notification
  async sendLiveStreamNotification(streamerId, title) {
    const streamer = await User.findById(streamerId);
    if (!streamer) return false;

    const notification = {
      title: 'লাইভ স্ট্রিম শুরু!',
      body: `${streamer.firstName} ${streamer.lastName} লাইভ হয়েছেন: ${title}`,
      type: 'live_stream',
      targetId: streamerId,
      data: {
        streamerId: streamerId.toString(),
        streamerName: `${streamer.firstName} ${streamer.lastName}`,
        streamTitle: title
      }
    };

    return this.sendToFriends(streamerId, notification);
  }
}

module.exports = new PushNotificationService();