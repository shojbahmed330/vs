const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  
  // User Analytics
  userMetrics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    newUsers: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    deletedUsers: {
      type: Number,
      default: 0
    },
    verifiedUsers: {
      type: Number,
      default: 0
    },
    businessAccounts: {
      type: Number,
      default: 0
    }
  },

  // Content Analytics
  contentMetrics: {
    totalPosts: {
      type: Number,
      default: 0
    },
    newPosts: {
      type: Number,
      default: 0
    },
    deletedPosts: {
      type: Number,
      default: 0
    },
    reportedPosts: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalShares: {
      type: Number,
      default: 0
    }
  },

  // Page Analytics
  pageMetrics: {
    totalPages: {
      type: Number,
      default: 0
    },
    newPages: {
      type: Number,
      default: 0
    },
    verifiedPages: {
      type: Number,
      default: 0
    },
    activePage: {
      type: Number,
      default: 0
    },
    pagesByCategory: [{
      category: String,
      count: Number
    }]
  },

  // Engagement Analytics
  engagementMetrics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    averageSessionDuration: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    pageViews: {
      type: Number,
      default: 0
    },
    uniquePageViews: {
      type: Number,
      default: 0
    }
  },

  // Live Stream Analytics
  liveStreamMetrics: {
    totalStreams: {
      type: Number,
      default: 0
    },
    activeStreams: {
      type: Number,
      default: 0
    },
    totalViewers: {
      type: Number,
      default: 0
    },
    averageViewDuration: {
      type: Number,
      default: 0
    },
    totalStreamTime: {
      type: Number,
      default: 0
    }
  },

  // Messages Analytics
  messageMetrics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    newMessages: {
      type: Number,
      default: 0
    },
    groupMessages: {
      type: Number,
      default: 0
    },
    privateMessages: {
      type: Number,
      default: 0
    }
  },

  // System Health
  systemMetrics: {
    errorCount: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number,
      default: 0
    },
    uptime: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0
    },
    bandwidthUsed: {
      type: Number,
      default: 0
    }
  },

  // Revenue Analytics (for business features)
  revenueMetrics: {
    totalRevenue: {
      type: Number,
      default: 0
    },
    subscriptionRevenue: {
      type: Number,
      default: 0
    },
    adRevenue: {
      type: Number,
      default: 0
    },
    premiumUsers: {
      type: Number,
      default: 0
    }
  },

  // Geographic Analytics
  geographicData: [{
    country: String,
    userCount: Number,
    sessionCount: Number,
    pageViews: Number
  }],

  // Device Analytics
  deviceData: {
    mobile: {
      type: Number,
      default: 0
    },
    desktop: {
      type: Number,
      default: 0
    },
    tablet: {
      type: Number,
      default: 0
    }
  },

  // Real-time data
  realTimeData: {
    currentActiveUsers: {
      type: Number,
      default: 0
    },
    liveStreamsNow: {
      type: Number,
      default: 0
    },
    messagesLastHour: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
analyticsSchema.index({ date: -1, type: 1 });
analyticsSchema.index({ type: 1 });
analyticsSchema.index({ 'userMetrics.totalUsers': -1 });
analyticsSchema.index({ 'contentMetrics.totalPosts': -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
