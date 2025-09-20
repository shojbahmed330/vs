const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channelName: {
    type: String,
    required: true,
    unique: true
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    default: 'audio'
  },
  status: {
    type: String,
    enum: ['calling', 'active', 'ended', 'rejected', 'missed', 'failed'],
    default: 'calling'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  acceptTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  quality: {
    callerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    receiverRating: {
      type: Number,
      min: 1,
      max: 5
    },
    networkStats: {
      callerStats: {
        avgBitrate: Number,
        packetLoss: Number,
        latency: Number
      },
      receiverStats: {
        avgBitrate: Number,
        packetLoss: Number,
        latency: Number
      }
    }
  },
  metadata: {
    agoraChannelName: String,
    recordingId: String,
    screenshots: [String],
    troubleshootingInfo: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for better query performance
callSchema.index({ caller: 1, startTime: -1 });
callSchema.index({ receiver: 1, startTime: -1 });
callSchema.index({ status: 1 });
callSchema.index({ startTime: -1 });

// Virtual for call direction from user perspective
callSchema.virtual('direction').get(function() {
  // This will be set manually when needed
  return this._direction;
});

// Method to get call direction for a specific user
callSchema.methods.getDirectionForUser = function(userId) {
  if (this.caller.toString() === userId.toString()) {
    return 'outgoing';
  } else if (this.receiver.toString() === userId.toString()) {
    return 'incoming';
  }
  return 'unknown';
};

// Method to get other party for a specific user
callSchema.methods.getOtherPartyForUser = function(userId) {
  if (this.caller.toString() === userId.toString()) {
    return this.receiver;
  } else if (this.receiver.toString() === userId.toString()) {
    return this.caller;
  }
  return null;
};

// Static method to get call statistics for a user
callSchema.statics.getCallStats = async function(userId, period = 'month') {
  const startDate = new Date();
  
  switch (period) {
    case 'day':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  const stats = await this.aggregate([
    {
      $match: {
        $or: [
          { caller: mongoose.Types.ObjectId(userId) },
          { receiver: mongoose.Types.ObjectId(userId) }
        ],
        startTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] }
        },
        totalDuration: {
          $sum: { $cond: [{ $eq: ['$status', 'ended'] }, '$duration', 0] }
        },
        videoCalls: {
          $sum: { $cond: [{ $eq: ['$callType', 'video'] }, 1, 0] }
        },
        audioCalls: {
          $sum: { $cond: [{ $eq: ['$callType', 'audio'] }, 1, 0] }
        },
        missedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] }
        },
        rejectedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalCalls: 0,
    completedCalls: 0,
    totalDuration: 0,
    videoCalls: 0,
    audioCalls: 0,
    missedCalls: 0,
    rejectedCalls: 0
  };
};

// Pre-save middleware to set missed calls
callSchema.pre('save', function(next) {
  // If call is being ended and was never accepted, mark as missed
  if (this.isModified('status') && this.status === 'ended' && !this.acceptTime) {
    this.status = 'missed';
  }
  next();
});

module.exports = mongoose.model('Call', callSchema);
