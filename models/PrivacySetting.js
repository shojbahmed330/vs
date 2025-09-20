const mongoose = require('mongoose');

const privacySettingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Post Privacy Settings
  postVisibility: {
    default: {
      type: String,
      enum: ['public', 'friends', 'friends_except', 'specific_friends', 'only_me'],
      default: 'friends'
    },
    allowComments: {
      type: String,
      enum: ['everyone', 'friends', 'friends_of_friends', 'no_one'],
      default: 'friends'
    },
    allowShares: {
      type: String,
      enum: ['everyone', 'friends', 'friends_of_friends', 'no_one'],
      default: 'friends'
    },
    allowReactions: {
      type: String,
      enum: ['everyone', 'friends', 'friends_of_friends', 'no_one'],
      default: 'friends'
    }
  },
  
  // Profile Privacy Settings
  profileVisibility: {
    basicInfo: {
      type: String,
      enum: ['public', 'friends', 'only_me'],
      default: 'friends'
    },
    contactInfo: {
      type: String,
      enum: ['public', 'friends', 'only_me'],
      default: 'friends'
    },
    friendsList: {
      type: String,
      enum: ['public', 'friends', 'only_me'],
      default: 'friends'
    },
    photos: {
      type: String,
      enum: ['public', 'friends', 'friends_of_friends', 'only_me'],
      default: 'friends'
    },
    stories: {
      type: String,
      enum: ['public', 'friends', 'close_friends', 'custom'],
      default: 'friends'
    }
  },
  
  // Friend Request Settings
  friendRequests: {
    whoCanSend: {
      type: String,
      enum: ['everyone', 'friends_of_friends', 'no_one'],
      default: 'everyone'
    },
    whoCanSeeList: {
      type: String,
      enum: ['public', 'friends', 'only_me'],
      default: 'friends'
    }
  },
  
  // Messaging Settings
  messaging: {
    whoCanMessage: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'friends'
    },
    messageRequests: {
      type: Boolean,
      default: true
    }
  },
  
  // Search & Discovery Settings
  searchability: {
    findByEmail: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'friends'
    },
    findByPhone: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'friends'
    },
    searchEngines: {
      type: Boolean,
      default: false
    }
  },
  
  // Custom Lists
  customLists: [{
    name: {
      type: String,
      required: true
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Blocked Users
  blockedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    blockedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  
  // Restricted Users (limited interaction)
  restrictedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    restrictedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Activity Settings
  activityStatus: {
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    showLastSeen: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'friends'
    }
  },
  
  // Notification Settings
  notifications: {
    email: {
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      posts: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      likes: { type: Boolean, default: false },
      mentions: { type: Boolean, default: true }
    },
    push: {
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      posts: { type: Boolean, default: false },
      comments: { type: Boolean, default: true },
      likes: { type: Boolean, default: false },
      mentions: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Index for efficient user lookup
privacySettingSchema.index({ user: 1 });

module.exports = mongoose.model('PrivacySetting', privacySettingSchema);