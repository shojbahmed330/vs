const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message sender is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message recipient is required']
  },
  conversationId: {
    type: String,
    required: [true, 'Conversation ID is required'],
    index: true
  },
  content: {
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact'],
      required: [true, 'Message content type is required']
    },
    text: {
      type: String,
      maxlength: [1000, 'Message text cannot exceed 1000 characters']
    },
    media: {
      url: String,
      publicId: String,
      thumbnail: String,
      duration: Number, // For audio/video
      size: Number, // File size in bytes
      filename: String,
      mimeType: String,
      dimensions: {
        width: Number,
        height: Number
      }
    },
    location: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      address: String
    },
    contact: {
      name: String,
      phone: String,
      email: String
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
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
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  originalContent: {
    type: mongoose.Schema.Types.Mixed
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isForwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  encryption: {
    isEncrypted: {
      type: Boolean,
      default: false
    },
    algorithm: String,
    iv: String
  },
  metadata: {
    clientId: String,
    platform: {
      type: String,
      enum: ['web', 'mobile', 'desktop']
    },
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ isRead: 1, recipient: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'content.location.coordinates': '2dsphere' });

// Virtual fields
messageSchema.virtual('reactionsCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Instance methods
messageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save({ validateBeforeSave: false });
  }
};

messageSchema.methods.markAsDelivered = async function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    await this.save({ validateBeforeSave: false });
  }
};

messageSchema.methods.addReaction = async function(userId, emoji) {
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

messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  await this.save({ validateBeforeSave: false });
};

messageSchema.methods.editMessage = async function(newContent) {
  this.originalContent = this.content;
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save({ validateBeforeSave: false });
};

messageSchema.methods.deleteMessage = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save({ validateBeforeSave: false });
};

messageSchema.methods.forwardMessage = async function(sender, recipient, conversationId) {
  const Message = this.constructor;
  
  const forwardedMessage = new Message({
    sender,
    recipient,
    conversationId,
    content: this.content,
    isForwarded: true,
    forwardedFrom: this._id
  });
  
  return await forwardedMessage.save();
};

// Static methods
messageSchema.statics.getConversationMessages = function(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    conversationId,
    isDeleted: false
  })
  .populate('sender', 'username fullName avatar isOnline lastSeen')
  .populate('recipient', 'username fullName avatar isOnline lastSeen')
  .populate('replyTo', 'content sender createdAt')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

messageSchema.statics.markConversationAsRead = function(conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      recipient: userId,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

messageSchema.statics.searchMessages = function(userId, query, limit = 20) {
  return this.find({
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    'content.text': { $regex: query, $options: 'i' },
    isDeleted: false
  })
  .populate('sender', 'username fullName avatar')
  .populate('recipient', 'username fullName avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

messageSchema.statics.getMediaMessages = function(conversationId, mediaType = 'image') {
  return this.find({
    conversationId,
    'content.type': mediaType,
    isDeleted: false
  })
  .populate('sender', 'username fullName avatar')
  .sort({ createdAt: -1 });
};

messageSchema.statics.generateConversationId = function(userId1, userId2) {
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

module.exports = mongoose.model('Message', messageSchema);