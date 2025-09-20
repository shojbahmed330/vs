const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  memoryType: {
    type: String,
    enum: ['on_this_day', 'friendship_anniversary', 'first_post', 'milestone', 'year_in_review'],
    required: true
  },
  originalContent: {
    contentType: {
      type: String,
      enum: ['post', 'photo', 'video', 'checkin', 'friendship', 'event'],
      required: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'originalContent.contentModel'
    },
    contentModel: {
      type: String,
      enum: ['Post', 'User', 'Event']
    },
    originalDate: {
      type: Date,
      required: true
    },
    preview: {
      text: String,
      imageUrl: String,
      videoUrl: String
    }
  },
  yearsPassed: {
    type: Number,
    required: true
  },
  isShared: {
    type: Boolean,
    default: false
  },
  sharedAt: Date,
  isPrivate: {
    type: Boolean,
    default: false
  },
  reactions: {
    like: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    love: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    wow: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'friends'
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
memorySchema.index({ user: 1, createdAt: -1 });
memorySchema.index({ memoryType: 1 });
memorySchema.index({ 'originalContent.originalDate': 1 });

module.exports = mongoose.model('Memory', memorySchema);
