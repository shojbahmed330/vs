const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'business', 'brand', 'celebrity', 'artist', 'musician', 'politician',
      'nonprofit', 'community', 'sports_team', 'restaurant', 'local_business',
      'entertainment', 'media', 'education', 'government', 'organization'
    ],
    required: true
  },
  subCategory: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'moderator', 'advertiser', 'analyst'],
      default: 'admin'
    },
    permissions: [{
      type: String,
      enum: ['post', 'edit_page', 'manage_roles', 'view_insights', 'manage_ads', 'moderate']
    }]
  }],
  profilePicture: String,
  coverPhoto: String,
  contactInfo: {
    phone: String,
    email: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  businessHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    open: String,
    close: String,
    isClosed: {
      type: Boolean,
      default: false
    }
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reviews: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRecommended: {
      type: Boolean,
      default: false
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    badgeType: {
      type: String,
      enum: ['blue', 'gray']
    }
  },
  insights: {
    totalReach: {
      type: Number,
      default: 0
    },
    totalEngagement: {
      type: Number,
      default: 0
    },
    weeklyData: [{
      week: Date,
      likes: Number,
      comments: Number,
      shares: Number,
      reach: Number
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate average rating
pageSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.totalReviews = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;
    this.totalReviews = this.reviews.length;
  }
};

// Index for better performance
pageSchema.index({ name: 'text', description: 'text' });
pageSchema.index({ category: 1 });
pageSchema.index({ owner: 1 });
pageSchema.index({ averageRating: -1 });

module.exports = mongoose.model('Page', pageSchema);
