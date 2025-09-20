const mongoose = require('mongoose');
const crypto = require('crypto');

const biometricAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  faceRecognition: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    descriptors: {
      type: String, // Encrypted face descriptors
      select: false
    },
    enrollmentDate: Date,
    lastUsed: Date,
    accuracy: {
      type: Number,
      default: 0.85,
      min: 0.7,
      max: 1.0
    },
    attempts: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      success: Boolean,
      confidence: Number,
      deviceInfo: String
    }]
  },
  voiceRecognition: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    voicePrint: {
      type: String, // Encrypted voice pattern
      select: false
    },
    phraseUsed: String,
    language: {
      type: String,
      enum: ['bn-BD', 'en-US'],
      default: 'bn-BD'
    },
    enrollmentDate: Date,
    lastUsed: Date,
    accuracy: {
      type: Number,
      default: 0.8,
      min: 0.7,
      max: 1.0
    },
    attempts: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      success: Boolean,
      confidence: Number,
      audioQuality: Number
    }]
  },
  fingerprint: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String, // Encrypted fingerprint pattern
      select: false
    },
    enrollmentDate: Date,
    lastUsed: Date,
    attempts: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      success: Boolean,
      quality: Number
    }]
  },
  multiModal: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    requiredMethods: [{
      type: String,
      enum: ['face', 'voice', 'fingerprint']
    }],
    fusionStrategy: {
      type: String,
      enum: ['score_level', 'decision_level'],
      default: 'score_level'
    }
  },
  security: {
    encryptionKey: {
      type: String,
      select: false,
      default: () => crypto.randomBytes(32).toString('hex')
    },
    failedAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: Date,
    maxFailedAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 30 * 60 * 1000 // 30 minutes
    }
  },
  deviceTrust: [{
    deviceId: String,
    deviceName: String,
    userAgent: String,
    isTrusted: {
      type: Boolean,
      default: false
    },
    firstSeen: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date,
    ipAddress: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  }],
  preferences: {
    fallbackToPassword: {
      type: Boolean,
      default: true
    },
    requireBiometricForSensitive: {
      type: Boolean,
      default: true
    },
    biometricTimeout: {
      type: Number,
      default: 24 * 60 * 60 * 1000 // 24 hours
    },
    enableAntiSpoofing: {
      type: Boolean,
      default: true
    }
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['enrollment', 'authentication', 'update', 'disable', 'enable']
    },
    method: {
      type: String,
      enum: ['face', 'voice', 'fingerprint', 'multi_modal']
    },
    result: {
      type: String,
      enum: ['success', 'failure', 'error']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    details: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Encrypt biometric data before saving
biometricAuthSchema.pre('save', function(next) {
  if (this.isModified('faceRecognition.descriptors') && this.faceRecognition.descriptors) {
    this.faceRecognition.descriptors = this.encryptData(this.faceRecognition.descriptors);
  }
  if (this.isModified('voiceRecognition.voicePrint') && this.voiceRecognition.voicePrint) {
    this.voiceRecognition.voicePrint = this.encryptData(this.voiceRecognition.voicePrint);
  }
  if (this.isModified('fingerprint.pattern') && this.fingerprint.pattern) {
    this.fingerprint.pattern = this.encryptData(this.fingerprint.pattern);
  }
  next();
});

// Encrypt data method
biometricAuthSchema.methods.encryptData = function(data) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(this.security.encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt data method
biometricAuthSchema.methods.decryptData = function(encryptedData) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(this.security.encryptionKey, 'hex');
  
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Check if account is locked
biometricAuthSchema.methods.isLocked = function() {
  return this.security.lockoutUntil && this.security.lockoutUntil > Date.now();
};

// Lock account after failed attempts
biometricAuthSchema.methods.lockAccount = function() {
  this.security.failedAttempts += 1;
  
  if (this.security.failedAttempts >= this.security.maxFailedAttempts) {
    this.security.lockoutUntil = Date.now() + this.security.lockoutDuration;
  }
  
  return this.save();
};

// Reset failed attempts
biometricAuthSchema.methods.resetFailedAttempts = function() {
  this.security.failedAttempts = 0;
  this.security.lockoutUntil = undefined;
  return this.save();
};

// Index for better performance
biometricAuthSchema.index({ user: 1 });
biometricAuthSchema.index({ 'security.lockoutUntil': 1 });

module.exports = mongoose.model('BiometricAuth', biometricAuthSchema);
