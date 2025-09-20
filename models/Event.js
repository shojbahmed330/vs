const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coOrganizers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  coverPhoto: String,
  eventType: {
    type: String,
    enum: ['public', 'private', 'friends'],
    default: 'public'
  },
  category: {
    type: String,
    enum: ['party', 'concert', 'conference', 'workshop', 'sports', 'festival', 'meetup', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  location: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    onlineLink: String
  },
  attendees: {
    going: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      respondedAt: {
        type: Date,
        default: Date.now
      }
    }],
    interested: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      respondedAt: {
        type: Date,
        default: Date.now
      }
    }],
    invited: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      invitedAt: {
        type: Date,
        default: Date.now
      },
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  discussion: [{
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
  ticketPrice: {
    free: {
      type: Boolean,
      default: true
    },
    price: Number,
    currency: String
  },
  maxAttendees: Number,
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
eventSchema.index({ organizer: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ location: 1 });
eventSchema.index({ tags: 1 });

module.exports = mongoose.model('Event', eventSchema);
