const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Post author is required']
  },
  content: {
    text: {
      type: String,
      maxlength: [2000, 'Post content cannot exceed 2000 characters']
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      },
      thumbnail: {
        type: String // For videos
      },
      duration: {
        type: Number // For videos and audio in seconds
      },
      size: {
        type: Number // File size in bytes
      },
      dimensions: {
        width: Number,
        height: Number
      }
    }],
    hashtags: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    location: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      address: String
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      maxlength: [500, 'Share message cannot exceed 500 characters']
    }
  }],
  saves: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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
      type: Number // View duration in seconds
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: {
      text: String,
      media: [mongoose.Schema.Types.Mixed]
    },
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
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
  }],
  status: {
    type: String,
    enum: ['active', 'hidden', 'deleted'],
    default: 'active'
  },
  engagement: {
    totalLikes: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalShares: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  },
  scheduledFor: {
    type: Date
  },
  isScheduled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
postSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

postSchema.virtual('commentsCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

postSchema.virtual('sharesCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

postSchema.virtual('savesCount').get(function() {
  return this.saves ? this.saves.length : 0;
});

postSchema.virtual('viewsCount').get(function() {
  return this.views ? this.views.length : 0;
});

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ 'content.hashtags': 1 });
postSchema.index({ 'content.mentions': 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ 'content.location.coordinates': '2dsphere' });
postSchema.index({ status: 1, visibility: 1 });
postSchema.index({ scheduledFor: 1, isScheduled: 1 });

// Text search index
postSchema.index({
  'content.text': 'text',
  'content.hashtags': 'text'
});

// Pre-save middleware
postSchema.pre('save', function(next) {
  // Update engagement metrics
  this.engagement.totalLikes = this.likes.length;
  this.engagement.totalComments = this.comments.length;
  this.engagement.totalShares = this.shares.length;
  this.engagement.totalViews = this.views.length;
  
  // Calculate engagement rate
  const totalEngagements = this.engagement.totalLikes + 
                          this.engagement.totalComments + 
                          this.engagement.totalShares;
  
  this.engagement.engagementRate = this.engagement.totalViews > 0 
    ? (totalEngagements / this.engagement.totalViews) * 100 
    : 0;
  
  next();
});

// Instance methods
postSchema.methods.like = async function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
    return { liked: false, likesCount: this.likes.length };
  } else {
    this.likes.push({ user: userId });
    return { liked: true, likesCount: this.likes.length };
  }
};

postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

postSchema.methods.isSavedBy = function(userId) {
  return this.saves.some(save => save.user.toString() === userId.toString());
};

postSchema.methods.addView = async function(userId, duration = 0) {
  const existingView = this.views.find(view => view.user.toString() === userId.toString());
  
  if (!existingView) {
    this.views.push({ user: userId, duration });
  } else {
    existingView.duration += duration;
    existingView.viewedAt = new Date();
  }
  
  await this.save({ validateBeforeSave: false });
};

postSchema.methods.addReport = async function(userId, reason, description = '') {
  const existingReport = this.reports.find(report => report.user.toString() === userId.toString());
  
  if (!existingReport) {
    this.reports.push({ user: userId, reason, description });
    this.reportCount = this.reports.length;
    
    // Auto-hide post if it gets too many reports
    if (this.reportCount >= 10) {
      this.status = 'hidden';
    }
    
    await this.save({ validateBeforeSave: false });
  }
};

postSchema.methods.extractHashtags = function() {
  if (!this.content.text) return [];
  
  const hashtagRegex = /#([\w\u0980-\u09FF]+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(this.content.text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  
  return [...new Set(hashtags)];
};

postSchema.methods.extractMentions = function() {
  if (!this.content.text) return [];
  
  const mentionRegex = /@([\w\u0980-\u09FF]+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(this.content.text)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)];
};

// Static methods
postSchema.statics.getFeedPosts = function(userId, following = [], page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    $or: [
      { author: userId },
      { author: { $in: following }, visibility: { $in: ['public', 'followers'] } },
      { visibility: 'public' }
    ],
    status: 'active',
    $or: [
      { isScheduled: false },
      { isScheduled: true, scheduledFor: { $lte: new Date() } }
    ]
  })
  .populate('author', 'username fullName avatar isVerified')
  .populate('content.mentions', 'username fullName')
  .sort({ isPinned: -1, createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

postSchema.statics.searchPosts = function(query, limit = 20, skip = 0) {
  return this.find({
    $text: { $search: query },
    status: 'active',
    visibility: 'public'
  })
  .populate('author', 'username fullName avatar')
  .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

postSchema.statics.getTrendingPosts = function(limit = 20, hours = 24) {
  const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    createdAt: { $gte: timeLimit },
    status: 'active',
    visibility: 'public'
  })
  .populate('author', 'username fullName avatar')
  .sort({ 'engagement.engagementRate': -1, createdAt: -1 })
  .limit(limit);
};

postSchema.statics.getPostsByHashtag = function(hashtag, limit = 20, skip = 0) {
  return this.find({
    'content.hashtags': hashtag.toLowerCase(),
    status: 'active',
    visibility: 'public'
  })
  .populate('author', 'username fullName avatar')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

module.exports = mongoose.model('Post', postSchema);