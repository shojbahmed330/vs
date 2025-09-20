const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['like', 'comment', 'follow', 'mention', 'message', 'story_view'].includes(this.type);
    }
  },
  type: {
    type: String,
    enum: [
      'like',           // Someone liked your post
      'comment',        // Someone commented on your post
      'reply',          // Someone replied to your comment
      'follow',         // Someone followed you
      'unfollow',       // Someone unfollowed you
      'mention',        // Someone mentioned you
      'message',        // New message received
      'story_view',     // Someone viewed your story
      'story_reply',    // Someone replied to your story
      'post_share',     // Someone shared your post
      'friend_request', // Friend request received
      'system',         // System notifications
      'welcome',        // Welcome notification
      'achievement',    // Achievement unlocked
      'reminder',       // Reminders
      'promotion',      // Promotional notifications
      'security',       // Security alerts
      'backup'          // Backup notifications
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionUrl: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  deliveryMethod: {
    type: [String],
    enum: ['push', 'email', 'sms', 'in_app'],
    default: ['in_app']
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['social', 'system', 'security', 'promotional', 'reminder'],
    default: 'social'
  },
  icon: {
    type: String,
    default: 'notification'
  },
  image: {
    url: String,
    alt: String
  },
  actions: [{
    label: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    url: String,
    style: {
      type: String,
      enum: ['primary', 'secondary', 'danger', 'success'],
      default: 'primary'
    }
  }],
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  groupId: {
    type: String, // For grouping similar notifications
    index: true
  },
  batchId: {
    type: String, // For batch processing
    index: true
  },
  scheduledFor: {
    type: Date
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['web', 'android', 'ios']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ sender: 1, createdAt: -1 });
notificationSchema.index({ category: 1, priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ scheduledFor: 1, isScheduled: 1 });
notificationSchema.index({ groupId: 1, recipient: 1 });

// Virtual fields
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return this.createdAt.toLocaleDateString();
});

// Instance methods
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save({ validateBeforeSave: false });
  }
};

notificationSchema.methods.markAsDelivered = async function(method = 'in_app') {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    
    if (!this.deliveryMethod.includes(method)) {
      this.deliveryMethod.push(method);
    }
    
    await this.save({ validateBeforeSave: false });
  }
};

notificationSchema.methods.archive = async function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  await this.save({ validateBeforeSave: false });
};

notificationSchema.methods.incrementRetry = async function(errorMessage = '') {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.errorMessage = errorMessage;
  await this.save({ validateBeforeSave: false });
};

notificationSchema.methods.schedule = async function(scheduleDate) {
  this.scheduledFor = scheduleDate;
  this.isScheduled = true;
  await this.save({ validateBeforeSave: false });
};

notificationSchema.methods.addDeviceToken = async function(token, platform) {
  const existingToken = this.deviceTokens.find(dt => dt.token === token);
  
  if (!existingToken) {
    this.deviceTokens.push({ token, platform });
    await this.save({ validateBeforeSave: false });
  }
};

// Static methods
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    category = null,
    type = null
  } = options;
  
  const skip = (page - 1) * limit;
  const query = {
    recipient: userId,
    isArchived: false
  };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('sender', 'username fullName avatar')
    .populate('data.postId', 'content.text author')
    .populate('data.commentId', 'content.text author')
    .populate('data.storyId', 'content.type author')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

notificationSchema.statics.getUnreadCount = function(userId, category = null) {
  const query = {
    recipient: userId,
    isRead: false,
    isArchived: false
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.countDocuments(query);
};

notificationSchema.statics.markAllAsRead = function(userId, category = null) {
  const query = {
    recipient: userId,
    isRead: false
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.updateMany(query, {
    $set: {
      isRead: true,
      readAt: new Date()
    }
  });
};

notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

notificationSchema.statics.createBulkNotifications = async function(notifications) {
  return this.insertMany(notifications);
};

notificationSchema.statics.getScheduledNotifications = function() {
  return this.find({
    isScheduled: true,
    scheduledFor: { $lte: new Date() },
    isDelivered: false
  });
};

notificationSchema.statics.cleanupExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

notificationSchema.statics.getNotificationStats = function(userId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        recipient: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id.date': -1, '_id.type': 1 }
    }
  ]);
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Auto-generate groupId for similar notifications
  if (!this.groupId && this.type && this.sender) {
    this.groupId = `${this.type}_${this.sender}_${this.data.postId || this.data.storyId || 'general'}`;
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);