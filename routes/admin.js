const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Group = require('../models/Group');
const LiveStream = require('../models/LiveStream');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Middleware to check admin permissions
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || (user.platformRole !== 'admin' && user.platformRole !== 'super_admin')) {
      return res.status(403).json({ 
        message: 'এডমিন অ্যাক্সেস প্রয়োজন',
        error: 'INSUFFICIENT_PERMISSIONS' 
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'অনুমতি যাচাই করতে সমস্যা হয়েছে' });
  }
};

// Middleware to check specific admin permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.adminUser.platformRole === 'super_admin' || 
        req.adminUser.adminPermissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({ 
        message: `${permission} অনুমতি প্রয়োজন`,
        error: 'INSUFFICIENT_PERMISSIONS' 
      });
    }
  };
};

// Get dashboard overview
router.get('/dashboard', auth, requireAdmin, requirePermission('view_analytics'), async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get latest analytics data
    const latestDaily = await Analytics.findOne({ 
      type: 'daily',
      date: { $gte: yesterday }
    }).sort({ date: -1 });

    // Real-time calculations
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today.setHours(0, 0, 0, 0) }
    });
    const activeUsersToday = await User.countDocuments({
      lastSeen: { $gte: yesterday }
    });
    const businessAccounts = await User.countDocuments({
      'businessAccount.isBusinessAccount': true
    });

    const totalPosts = await Post.countDocuments();
    const newPostsToday = await Post.countDocuments({
      createdAt: { $gte: today.setHours(0, 0, 0, 0) }
    });

    const totalPages = await Page.countDocuments();
    const verifiedPages = await Page.countDocuments({
      'verification.isVerified': true
    });

    const activeStreams = await LiveStream.countDocuments({
      status: 'live'
    });

    // Growth calculations
    const yesterdayUsers = await User.countDocuments({
      createdAt: { $lte: yesterday }
    });
    const userGrowthRate = yesterdayUsers > 0 ? 
      ((totalUsers - yesterdayUsers) / yesterdayUsers * 100) : 0;

    const lastWeekPosts = await Post.countDocuments({
      createdAt: { $gte: lastWeek, $lte: yesterday }
    });
    const thisWeekPosts = await Post.countDocuments({
      createdAt: { $gte: lastWeek }
    });
    const postGrowthRate = lastWeekPosts > 0 ? 
      ((thisWeekPosts - lastWeekPosts) / lastWeekPosts * 100) : 0;

    // Page category breakdown
    const pageCategories = await Page.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Top countries (mock data - would need real user location tracking)
    const topCountries = [
      { country: 'বাংলাদেশ', userCount: Math.floor(totalUsers * 0.8), flag: '🇧🇩' },
      { country: 'ভারত', userCount: Math.floor(totalUsers * 0.15), flag: '🇮🇳' },
      { country: 'পাকিস্তান', userCount: Math.floor(totalUsers * 0.05), flag: '🇵🇰' }
    ];

    const dashboardData = {
      overview: {
        totalUsers,
        newUsersToday,
        activeUsersToday,
        businessAccounts,
        totalPosts,
        newPostsToday,
        totalPages,
        verifiedPages,
        activeStreams,
        userGrowthRate: parseFloat(userGrowthRate.toFixed(2)),
        postGrowthRate: parseFloat(postGrowthRate.toFixed(2))
      },
      
      charts: {
        pageCategories,
        topCountries,
        dailyStats: latestDaily ? {
          users: latestDaily.userMetrics,
          content: latestDaily.contentMetrics,
          engagement: latestDaily.engagementMetrics
        } : null
      },

      realtimeData: {
        currentActiveUsers: await User.countDocuments({ isOnline: true }),
        liveStreamsNow: activeStreams,
        messagesLastHour: await Message.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        })
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'ড্যাশবোর্ড ডেটা লোড করতে সমস্যা হয়েছে' });
  }
});

// Get user analytics
router.get('/users', auth, requireAdmin, requirePermission('view_analytics'), async (req, res) => {
  try {
    const { period = '7d', startDate, endDate } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        }
      };
    }

    // User growth over time
    const userGrowth = await User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // User demographics
    const businessAccountStats = await User.aggregate([
      { $match: { 'businessAccount.isBusinessAccount': true } },
      {
        $group: {
          _id: '$businessAccount.businessType',
          count: { $sum: 1 }
        }
      }
    ]);

    const verificationStats = await User.aggregate([
      {
        $group: {
          _id: '$verification.isVerified',
          count: { $sum: 1 }
        }
      }
    ]);

    // Platform roles
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$platformRole',
          count: { $sum: 1 }
        }
      }
    ]);

    // Active users by time
    const activeUsersByHour = await User.aggregate([
      { $match: { isOnline: true } },
      {
        $group: {
          _id: { $hour: '$lastSeen' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      userGrowth,
      businessAccountStats,
      verificationStats,
      roleStats,
      activeUsersByHour
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ message: 'ইউজার এনালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

// Get content analytics
router.get('/content', auth, requireAdmin, requirePermission('view_analytics'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Posts over time
    const postGrowth = await Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Post engagement
    const engagementStats = await Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
          totalShares: { $sum: { $size: '$shares' } }
        }
      }
    ]);

    // Top content types
    const contentTypes = await Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            hasImage: { $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] },
            hasVideo: { $gt: [{ $size: { $ifNull: ['$videos', []] } }, 0] },
            hasText: { $ne: ['$content', ''] }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Most engaging posts
    const topPosts = await Post.find({ createdAt: { $gte: startDate } })
      .populate('author', 'username fullName avatar')
      .sort({ 'likes.length': -1 })
      .limit(10)
      .select('content likes comments shares createdAt author');

    res.json({
      postGrowth,
      engagementStats: engagementStats[0] || {},
      contentTypes,
      topPosts
    });
  } catch (error) {
    console.error('Get content analytics error:', error);
    res.status(500).json({ message: 'কন্টেন্ট এনালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

// Get page analytics
router.get('/pages', auth, requireAdmin, requirePermission('view_analytics'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Page growth
    const pageGrowth = await Page.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Pages by category
    const categoryStats = await Page.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgLikes: { $avg: { $size: '$likes' } },
          avgFollowers: { $avg: { $size: '$followers' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top pages by engagement
    const topPages = await Page.find({ isActive: true })
      .populate('owner', 'username fullName')
      .sort({ 'likes.length': -1, 'followers.length': -1 })
      .limit(10)
      .select('name category likes followers verification');

    // Verification stats
    const verificationStats = await Page.aggregate([
      {
        $group: {
          _id: '$verification.isVerified',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      pageGrowth,
      categoryStats,
      topPages,
      verificationStats
    });
  } catch (error) {
    console.error('Get page analytics error:', error);
    res.status(500).json({ message: 'পেজ এনালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

// Get live stream analytics
router.get('/livestreams', auth, requireAdmin, requirePermission('view_analytics'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Stream stats
    const streamStats = await LiveStream.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalStreams: { $sum: 1 },
          totalViewers: { $sum: '$analytics.totalViewers' },
          totalDuration: { $sum: '$analytics.duration' },
          avgViewers: { $avg: '$analytics.totalViewers' }
        }
      }
    ]);

    // Streams over time
    const streamGrowth = await LiveStream.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          viewers: { $sum: '$analytics.totalViewers' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top streamers
    const topStreamers = await LiveStream.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$streamer',
          totalStreams: { $sum: 1 },
          totalViewers: { $sum: '$analytics.totalViewers' },
          avgViewers: { $avg: '$analytics.totalViewers' }
        }
      },
      { $sort: { totalViewers: -1 } },
      { $limit: 10 }
    ]);

    // Populate streamer info
    await LiveStream.populate(topStreamers, {
      path: '_id',
      select: 'username fullName avatar'
    });

    res.json({
      streamStats: streamStats[0] || {},
      streamGrowth,
      topStreamers
    });
  } catch (error) {
    console.error('Get livestream analytics error:', error);
    res.status(500).json({ message: 'লাইভ স্ট্রিম এনালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

// User management endpoints
router.get('/users/list', auth, requireAdmin, requirePermission('manage_users'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, verified } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && role !== 'all') {
      filter.platformRole = role;
    }
    if (verified !== undefined) {
      filter['verification.isVerified'] = verified === 'true';
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: skip + users.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({ message: 'ইউজার তালিকা লোড করতে সমস্যা হয়েছে' });
  }
});

// Update user role and permissions
router.put('/users/:userId/role', auth, requireAdmin, requirePermission('manage_users'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { platformRole, adminPermissions } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
    }

    // Only super_admin can create other admins
    if (platformRole === 'admin' || platformRole === 'super_admin') {
      if (req.adminUser.platformRole !== 'super_admin') {
        return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন অন্য এডমিন তৈরি করতে পারেন' });
      }
    }

    user.platformRole = platformRole;
    if (adminPermissions) {
      user.adminPermissions = adminPermissions;
    }

    await user.save();

    res.json({
      message: 'ইউজার রোল আপডেট হয়েছে',
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        platformRole: user.platformRole,
        adminPermissions: user.adminPermissions
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'ইউজার রোল আপডেট করতে সমস্যা হয়েছে' });
  }
});

// Generate and save analytics data (scheduled task)
router.post('/generate/:type', auth, requireAdmin, requirePermission('view_analytics'), async (req, res) => {
  try {
    const { type } = req.params; // daily, weekly, monthly, yearly
    const date = new Date();

    // Set date based on type
    if (type === 'daily') {
      date.setHours(0, 0, 0, 0);
    } else if (type === 'weekly') {
      const dayOfWeek = date.getDay();
      date.setDate(date.getDate() - dayOfWeek);
      date.setHours(0, 0, 0, 0);
    } else if (type === 'monthly') {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    } else if (type === 'yearly') {
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }

    // Calculate metrics
    const userMetrics = {
      totalUsers: await User.countDocuments(),
      newUsers: await User.countDocuments({
        createdAt: { $gte: date }
      }),
      activeUsers: await User.countDocuments({
        lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      verifiedUsers: await User.countDocuments({
        'verification.isVerified': true
      }),
      businessAccounts: await User.countDocuments({
        'businessAccount.isBusinessAccount': true
      })
    };

    const contentMetrics = {
      totalPosts: await Post.countDocuments(),
      newPosts: await Post.countDocuments({
        createdAt: { $gte: date }
      }),
      totalComments: await Post.aggregate([
        { $project: { commentCount: { $size: '$comments' } } },
        { $group: { _id: null, total: { $sum: '$commentCount' } } }
      ]).then(result => result[0]?.total || 0),
      totalLikes: await Post.aggregate([
        { $project: { likeCount: { $size: '$likes' } } },
        { $group: { _id: null, total: { $sum: '$likeCount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    const analytics = new Analytics({
      date,
      type,
      userMetrics,
      contentMetrics
    });

    await analytics.save();

    res.json({
      message: `${type} এনালিটিক্স ডেটা তৈরি হয়েছে`,
      analytics
    });
  } catch (error) {
    console.error('Generate analytics error:', error);
    res.status(500).json({ message: 'এনালিটিক্স ডেটা তৈরি করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
