const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended'],
    default: 'scheduled'
  },
  agoraChannelId: {
    type: String,
    required: true,
    unique: true
  },
  agoraToken: {
    type: String,
    required: true
  },
  scheduledStartTime: {
    type: Date
  },
  actualStartTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  viewCount: {
    type: Number,
    default: 0
  },
  currentViewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  privacy: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  tags: [{
    type: String,
    trim: true
  }],
  thumbnail: {
    type: String
  },
  recordingUrl: {
    type: String
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  maxViewers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
liveStreamSchema.index({ streamer: 1, status: 1 });
liveStreamSchema.index({ status: 1, actualStartTime: -1 });
liveStreamSchema.index({ agoraChannelId: 1 });

// Virtual for stream duration
liveStreamSchema.virtual('duration').get(function() {
  if (this.actualStartTime && this.endTime) {
    return Math.floor((this.endTime - this.actualStartTime) / 1000); // Duration in seconds
  }
  return null;
});

// Method to add a viewer
liveStreamSchema.methods.addViewer = function(userId) {
  const existingViewer = this.currentViewers.find(v => v.user.toString() === userId.toString());
  if (!existingViewer) {
    this.currentViewers.push({ user: userId });
    this.viewCount = Math.max(this.viewCount, this.currentViewers.length);
    if (this.currentViewers.length > this.maxViewers) {
      this.maxViewers = this.currentViewers.length;
    }
  }
  return this.save();
};

// Method to remove a viewer
liveStreamSchema.methods.removeViewer = function(userId) {
  this.currentViewers = this.currentViewers.filter(v => v.user.toString() !== userId.toString());
  return this.save();
};

// Method to add a comment
liveStreamSchema.methods.addComment = function(userId, message) {
  this.comments.push({ user: userId, message });
  return this.save();
};

// Method to toggle like
liveStreamSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

// Method to start stream
liveStreamSchema.methods.startStream = function() {
  this.status = 'live';
  this.actualStartTime = new Date();
  return this.save();
};

// Method to end stream
liveStreamSchema.methods.endStream = function() {
  this.status = 'ended';
  this.endTime = new Date();
  this.currentViewers = [];
  return this.save();
};

module.exports = mongoose.model('LiveStream', liveStreamSchema);
