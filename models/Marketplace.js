const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
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
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: [
      'vehicles', 'electronics', 'clothing', 'home_garden', 'sports',
      'books', 'toys_games', 'services', 'real_estate', 'jobs',
      'food', 'health_beauty', 'pets', 'collectibles', 'other'
    ],
    required: true
  },
  subCategory: String,
  condition: {
    type: String,
    enum: ['new', 'like_new', 'good', 'fair', 'poor'],
    required: true
  },
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'BDT'
    },
    isNegotiable: {
      type: Boolean,
      default: false
    }
  },
  images: [{
    url: String,
    caption: String
  }],
  location: {
    area: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  specifications: [{
    name: String,
    value: String
  }],
  tags: [String],
  availability: {
    type: String,
    enum: ['available', 'pending', 'sold'],
    default: 'available'
  },
  interestedBuyers: [{
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    offeredPrice: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  promotionDetails: {
    startDate: Date,
    endDate: Date,
    budget: Number
  },
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
marketplaceSchema.index({ title: 'text', description: 'text' });
marketplaceSchema.index({ category: 1 });
marketplaceSchema.index({ seller: 1 });
marketplaceSchema.index({ 'price.amount': 1 });
marketplaceSchema.index({ 'location.city': 1 });
marketplaceSchema.index({ availability: 1 });

module.exports = mongoose.model('Marketplace', marketplaceSchema);
