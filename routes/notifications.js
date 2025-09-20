const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getSocketIO } = require('../socket/socketManager');
const pushNotificationService = require('../services/pushNotificationService');

// Register FCM token
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { fcmToken, deviceInfo } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Register token with push notification service
    const success = await pushNotificationService.registerToken(req.user.id, fcmToken);
    
    if (success && deviceInfo) {
      // Update device information
      const user = await User.findById(req.user.id);
      
      // Remove existing device with same deviceId
      user.devices = user.devices.filter(device => device.deviceId !== deviceInfo.deviceId);
      
      // Add new device info
      user.devices.push({
        ...deviceInfo,
        fcmToken,
        lastActive: new Date()
      });
      
      await user.save();
    }

    res.json({
      success: true,
      message: 'FCM token registered successfully'
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Remove FCM token
router.delete('/fcm-token', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const success = await pushNotificationService.removeToken(req.user.id, fcmToken);
    
    // Also remove from devices array
    const user = await User.findById(req.user.id);
    user.devices = user.devices.filter(device => device.fcmToken !== fcmToken);
    await user.save();

    res.json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update notification preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationPreferences: preferences },
      { new: true }
    );

    res.json({
      success: true,
      preferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get notification preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      preferences: user.notificationPreferences || {}
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Send test notification (for development)
router.post('/test', auth, async (req, res) => {
  try {
    const { title, message, type } = req.body;
    
    const notification = {
      title: title || 'Test Notification',
      body: message || 'This is a test notification',
      type: type || 'general'
    };

    const success = await pushNotificationService.sendToUser(req.user.id, notification);
    
    res.json({
      success: success,
      message: success ? 'Test notification sent' : 'Failed to send test notification'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all notifications for user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = { recipient: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Mark notification as read
router.put('/read/:notificationId', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId
      },
      { isRead: true },
      { new: true }
    ).populate('sender', 'name avatar');

    if (!notification) {
      return res.status(404).json({ message: 'নোটিফিকেশন পাওয়া যায়নি' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      {
        recipient: userId,
        isRead: false
      },
      { isRead: true }
    );

    res.json({ message: 'সব নোটিফিকেশন পড়া হয়েছে বলে চিহ্নিত করা হয়েছে' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Delete notification
router.delete('/:notificationId', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'নোটিফিকেশন পাওয়া যায়নি' });
    }

    res.json({ message: 'নোটিফিকেশন ডিলিট করা হয়েছে' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Create notification (helper function for other routes)
const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
    
    // Populate sender info
    await notification.populate('sender', 'name avatar');
    
    // Send real-time notification via socket
    const io = getSocketIO();
    if (io) {
      io.to(`user_${data.recipient}`).emit('new_notification', notification);
    }
    
    // Send push notification
    if (pushNotificationService) {
      const pushNotif = {
        title: data.message.split(' ')[0] + ' ' + data.message.split(' ')[1] || 'নতুন নোটিফিকেশন',
        body: data.message,
        type: data.type,
        targetId: data.entityId,
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          senderId: data.sender?.toString()
        }
      };
      
      await pushNotificationService.sendWithPreferences(data.recipient, pushNotif);
    }
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error)
    throw error;
  }
};

// Helper function to create notifications for different activities
const notificationHelpers = {
  // Post like notification
  async createLikeNotification(postId, postOwnerId, likerId, liker) {
    if (postOwnerId === likerId) return; // Don't notify self
    
    return await createNotification({
      recipient: postOwnerId,
      sender: likerId,
      type: 'like',
      entityType: 'post',
      entityId: postId,
      message: `${liker.name} আপনার পোস্টে লাইক দিয়েছেন`
    });
  },
  
  // Comment notification
  async createCommentNotification(postId, postOwnerId, commenterId, commenter) {
    if (postOwnerId === commenterId) return; // Don't notify self
    
    return await createNotification({
      recipient: postOwnerId,
      sender: commenterId,
      type: 'comment',
      entityType: 'post',
      entityId: postId,
      message: `${commenter.name} আপনার পোস্টে কমেন্ট করেছেন`
    });
  },
  
  // Share notification
  async createShareNotification(postId, postOwnerId, sharerId, sharer) {
    if (postOwnerId === sharerId) return; // Don't notify self
    
    return await createNotification({
      recipient: postOwnerId,
      sender: sharerId,
      type: 'share',
      entityType: 'post',
      entityId: postId,
      message: `${sharer.name} আপনার পোস্ট শেয়ার করেছেন`
    });
  },
  
  // Mention notification
  async createMentionNotification(postId, mentionedUserId, mentionerId, mentioner) {
    if (mentionedUserId === mentionerId) return; // Don't notify self
    
    return await createNotification({
      recipient: mentionedUserId,
      sender: mentionerId,
      type: 'mention',
      entityType: 'post',
      entityId: postId,
      message: `${mentioner.name} আপনাকে একটি পোস্টে ট্যাগ করেছেন`
    });
  }
};

module.exports = {
  router,
  createNotification,
  notificationHelpers
};