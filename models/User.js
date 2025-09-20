const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  bio: {
    type: String,
    maxlength: [160, 'Bio cannot exceed 160 characters'],
    default: ''
  },
  avatar: {
    url: {
      type: String,
      default: ''
    },
    publicId: {
      type: String,
      default: ''
    }
  },
  coverImage: {
    url: {
      type: String,
      default: ''
    },
    publicId: {
      type: String,
      default: ''
    }
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  stories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      enum: ['en', 'bn'],
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      },
      allowMessaging: {
        type: String,
        enum: ['everyone', 'followers', 'none'],
        default: 'followers'
      }
    }
  },
  devices: [{
    deviceId: String,
    deviceType: {
      type: String,
      enum: ['web', 'mobile', 'tablet']
    },
    fcmToken: String,
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  socialLinks: {
    website: String,
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000 // 30 days
    }
  }],
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
userSchema.virtual('followersCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

userSchema.virtual('postsCount').get(function() {
  return this.posts ? this.posts.length : 0;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ createdAt: -1 });
userSchema.index({ isOnline: 1, lastSeen: -1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      email: this.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

userSchema.methods.addRefreshToken = async function(token) {
  this.refreshTokens.push({ token });
  
  // Keep only last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1, loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

userSchema.methods.updateOnlineStatus = async function(isOnline = true) {
  this.isOnline = isOnline;
  this.lastSeen = new Date();
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.addDevice = async function(deviceInfo) {
  const existingDevice = this.devices.find(d => d.deviceId === deviceInfo.deviceId);
  
  if (existingDevice) {
    existingDevice.fcmToken = deviceInfo.fcmToken;
    existingDevice.lastUsed = new Date();
  } else {
    this.devices.push({
      ...deviceInfo,
      lastUsed: new Date()
    });
  }
  
  // Keep only last 10 devices
  if (this.devices.length > 10) {
    this.devices = this.devices.slice(-10);
  }
  
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.removeDevice = async function(deviceId) {
  this.devices = this.devices.filter(d => d.deviceId !== deviceId);
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.toPublicProfile = function() {
  const publicProfile = this.toObject();
  
  delete publicProfile.password;
  delete publicProfile.refreshTokens;
  delete publicProfile.emailVerificationToken;
  delete publicProfile.emailVerificationExpires;
  delete publicProfile.passwordResetToken;
  delete publicProfile.passwordResetExpires;
  delete publicProfile.loginAttempts;
  delete publicProfile.lockUntil;
  delete publicProfile.devices;
  
  if (!publicProfile.preferences.privacy.showEmail) {
    delete publicProfile.email;
  }
  
  return publicProfile;
};

// Static methods
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  }).select('+password');
};

userSchema.statics.searchUsers = function(query, limit = 10, skip = 0) {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { username: searchRegex },
      { fullName: searchRegex },
      { email: searchRegex }
    ],
    accountStatus: 'active'
  })
  .select('-password -refreshTokens -devices')
  .limit(limit)
  .skip(skip)
  .sort({ createdAt: -1 });
};

userSchema.statics.getOnlineUsers = function(userIds = []) {
  const query = {
    isOnline: true,
    accountStatus: 'active'
  };
  
  if (userIds.length > 0) {
    query._id = { $in: userIds };
  }
  
  return this.find(query)
    .select('_id username fullName avatar isOnline lastSeen')
    .sort({ lastSeen: -1 });
};

module.exports = mongoose.model('User', userSchema);