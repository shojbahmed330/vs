const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment author is required']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Comment post is required']
  },
  content: {
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'gif'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      }
    }],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
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
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  originalContent: {
    type: String
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
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
      enum: ['spam', 'harassment', 'inappropriate', 'other']
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
commentSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

commentSchema.virtual('repliesCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

commentSchema.virtual('reactionsCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ 'content.mentions': 1 });

// Instance methods
commentSchema.methods.like = async function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
    return { liked: false, likesCount: this.likes.length };
  } else {
    this.likes.push({ user: userId });
    return { liked: true, likesCount: this.likes.length };
  }
};

commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

commentSchema.methods.addReaction = async function(userId, emoji) {
  const existingReaction = this.reactions.find(reaction => 
    reaction.user.toString() === userId.toString()
  );
  
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({ user: userId, emoji });
  }
  
  await this.save({ validateBeforeSave: false });
};

commentSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  await this.save({ validateBeforeSave: false });
};

commentSchema.methods.editComment = async function(newContent) {
  this.originalContent = this.content.text;
  this.content.text = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save({ validateBeforeSave: false });
};

commentSchema.methods.deleteComment = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = 'deleted';
  await this.save({ validateBeforeSave: false });
};

commentSchema.methods.addReport = async function(userId, reason, description = '') {
  const existingReport = this.reports.find(report => 
    report.user.toString() === userId.toString()
  );
  
  if (!existingReport) {
    this.reports.push({ user: userId, reason, description });
    this.reportCount = this.reports.length;
    
    // Auto-hide comment if it gets too many reports
    if (this.reportCount >= 5) {
      this.status = 'hidden';
    }
    
    await this.save({ validateBeforeSave: false });
  }
};

commentSchema.methods.extractMentions = function() {
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
commentSchema.statics.getPostComments = function(postId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    post: postId,
    parentComment: null,
    status: 'active'
  })
  .populate('author', 'username fullName avatar isVerified')
  .populate('content.mentions', 'username fullName')
  .populate({
    path: 'replies',
    populate: {
      path: 'author',
      select: 'username fullName avatar isVerified'
    },
    options: {
      sort: { createdAt: 1 },
      limit: 3 // Show only first 3 replies
    }
  })
  .sort({ isPinned: -1, createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

commentSchema.statics.getCommentReplies = function(commentId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  return this.find({
    parentComment: commentId,
    status: 'active'
  })
  .populate('author', 'username fullName avatar isVerified')
  .populate('content.mentions', 'username fullName')
  .sort({ createdAt: 1 })
  .skip(skip)
  .limit(limit);
};

commentSchema.statics.searchComments = function(query, limit = 20, skip = 0) {
  return this.find({
    'content.text': { $regex: query, $options: 'i' },
    status: 'active'
  })
  .populate('author', 'username fullName avatar')
  .populate('post', 'content.text author')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

commentSchema.statics.getUserComments = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    author: userId,
    status: 'active'
  })
  .populate('post', 'content.text author')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Pre-save middleware
commentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentComment) {
    // Add this comment to parent's replies
    const Comment = this.constructor;
    await Comment.findByIdAndUpdate(
      this.parentComment,
      { $push: { replies: this._id } }
    );
  }
  next();
});

// Post-remove middleware
commentSchema.pre('remove', async function(next) {
  const Comment = this.constructor;
  
  // Remove from parent's replies if it's a reply
  if (this.parentComment) {
    await Comment.findByIdAndUpdate(
      this.parentComment,
      { $pull: { replies: this._id } }
    );
  }
  
  // Remove all replies
  await Comment.deleteMany({ parentComment: this._id });
  
  next();
});

module.exports = mongoose.model('Comment', commentSchema);