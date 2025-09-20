const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Story author is required']
  },
  content: {
    type: {
      type: String,
      enum: ['image', 'video', 'text'],
      required: [true, 'Story content type is required']
    },
    media: {
      url: {
        type: String,
        required: function() {
          return this.content.type !== 'text';
        }
      },
      publicId: {
        type: String,
        required: function() {
          return this.content.type !== 'text';
        }
      },
      thumbnail: {
        type: String // For videos
      },
      duration: {
        type: Number // For videos in seconds
      },
      dimensions: {
        width: Number,
        height: Number
      }
    },
    text: {
      content: {
        type: String,
        maxlength: [500, 'Story text cannot exceed 500 characters']
      },
      style: {
        backgroundColor: {
          type: String,
          default: '#000000'
        },
        textColor: {
          type: String,
          default: '#ffffff'
        },
        fontSize: {
          type: String,
          enum: ['small', 'medium', 'large'],
          default: 'medium'
        },
        fontFamily: {
          type: String,
          enum: ['arial', 'helvetica', 'georgia', 'times'],
          default: 'arial'
        },
        textAlign: {
          type: String,
          enum: ['left', 'center', 'right'],
          default: 'center'
        }
      }
    },
    stickers: [{
      type: {
        type: String,
        enum: ['emoji', 'gif', 'location', 'music', 'poll']
      },
      content: String,
      position: {
        x: Number,
        y: Number
      },
      size: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      }
    }],
    music: {
      title: String,
      artist: String,
      url: String,
      startTime: {
        type: Number,
        default: 0
      },
      duration: Number
    },
    filter: {
      name: String,
      intensity: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
      }
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'close_friends', 'private'],
    default: 'followers'
  },
  allowReplies: {
    type: Boolean,
    default: true
  },
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: Number, // View duration in seconds
      default: 0
    }
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      maxlength: [200, 'Story reply cannot exceed 200 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  highlights: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    },
    index: { expireAfterSeconds: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  reportCount: {
    type: Number,
    default: 0
  },
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'copyright', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
storySchema.virtual('viewsCount').get(function() {
  return this.views ? this.views.length : 0;
});

storySchema.virtual('repliesCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

storySchema.virtual('reactionsCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

storySchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

storySchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, remaining);
});

// Indexes
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ createdAt: -1 });
storySchema.index({ visibility: 1, status: 1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ 'location.coordinates': '2dsphere' });

// Instance methods
storySchema.methods.addView = async function(userId, duration = 0) {
  const existingView = this.views.find(view => view.user.toString() === userId.toString());
  
  if (!existingView) {
    this.views.push({ user: userId, duration });
  } else {
    existingView.duration += duration;
    existingView.viewedAt = new Date();
  }
  
  await this.save({ validateBeforeSave: false });
};

storySchema.methods.hasViewedBy = function(userId) {
  return this.views.some(view => view.user.toString() === userId.toString());
};

storySchema.methods.addReaction = async function(userId, emoji) {
  const existingReaction = this.reactions.find(reaction => reaction.user.toString() === userId.toString());
  
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({ user: userId, emoji });
  }
  
  await this.save({ validateBeforeSave: false });
};

storySchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  await this.save({ validateBeforeSave: false });
};

storySchema.methods.addReply = async function(userId, content) {
  this.replies.push({ user: userId, content });
  await this.save({ validateBeforeSave: false });
};

storySchema.methods.addHighlight = async function(userId) {
  const existingHighlight = this.highlights.find(highlight => highlight.user.toString() === userId.toString());
  
  if (!existingHighlight) {
    this.highlights.push({ user: userId });
    this.isHighlighted = true;
    await this.save({ validateBeforeSave: false });
  }
};

storySchema.methods.removeHighlight = async function(userId) {
  this.highlights = this.highlights.filter(highlight => highlight.user.toString() !== userId.toString());
  
  if (this.highlights.length === 0) {
    this.isHighlighted = false;
  }
  
  await this.save({ validateBeforeSave: false });
};

storySchema.methods.extendExpiry = async function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await this.save({ validateBeforeSave: false });
};

storySchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save({ validateBeforeSave: false });
};

// Static methods
storySchema.statics.getActiveStories = function(userId, following = []) {
  return this.find({
    $or: [
      { author: userId },
      { author: { $in: following }, visibility: { $in: ['public', 'followers'] } },
      { visibility: 'public' }
    ],
    status: 'active',
    expiresAt: { $gt: new Date() }
  })
  .populate('author', 'username fullName avatar isVerified')
  .sort({ createdAt: -1 });
};

storySchema.statics.getUserStories = function(userId, viewerId = null) {
  const query = {
    author: userId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  };
  
  // If viewing someone else's stories, respect privacy settings
  if (viewerId && viewerId.toString() !== userId.toString()) {
    query.visibility = { $in: ['public', 'followers'] };
  }
  
  return this.find(query)
    .populate('author', 'username fullName avatar isVerified')
    .sort({ createdAt: -1 });
};

storySchema.statics.getStoryViewers = function(storyId, limit = 50) {
  return this.findById(storyId)
    .populate({
      path: 'views.user',
      select: 'username fullName avatar',
      options: {
        sort: { 'views.viewedAt': -1 },
        limit: limit
      }
    });
};

storySchema.statics.cleanupExpiredStories = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isHighlighted: false
  });
};

module.exports = mongoose.model('Story', storySchema);