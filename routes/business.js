const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Page = require('../models/Page');
const Post = require('../models/Post');
const Analytics = require('../models/Analytics');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for business document uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/business/documents/';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র ইমেজ, PDF, এবং Word ডকুমেন্ট গ্রহণযোগ্য'), false);
    }
  }
});

// Convert personal account to business account
router.post('/upgrade', auth, upload.array('documents', 5), async (req, res) => {
  try {
    const {
      businessType,
      businessName,
      businessCategory,
      taxId,
      businessAddress,
      businessContact
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
    }

    if (user.businessAccount.isBusinessAccount) {
      return res.status(400).json({ message: 'এই অ্যাকাউন্ট ইতিমধ্যে বিজনেস অ্যাকাউন্ট' });
    }

    // Handle document uploads
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push(`/uploads/business/documents/${file.filename}`);
      });
    }

    // Update user with business information
    user.businessAccount = {
      isBusinessAccount: true,
      businessType,
      businessName,
      businessCategory,
      taxId,
      businessAddress: JSON.parse(businessAddress || '{}'),
      businessContact: JSON.parse(businessContact || '{}'),
      verificationStatus: 'pending',
      verificationDocuments: documents,
      analytics: {
        pageViews: 0,
        profileClicks: 0,
        totalReach: 0,
        engagementRate: 0
      }
    };

    await user.save();

    res.json({
      message: 'বিজনেস অ্যাকাউন্টের জন্য আবেদন সফল হয়েছে। যাচাই করা হচ্ছে।',
      businessAccount: user.businessAccount
    });
  } catch (error) {
    console.error('Business upgrade error:', error);
    res.status(500).json({ message: 'বিজনেস অ্যাকাউন্ট আপগ্রেড করতে সমস্যা হয়েছে' });
  }
});

// Get business account analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.businessAccount?.isBusinessAccount) {
      return res.status(403).json({ message: 'বিজনেস অ্যাকাউন্ট প্রয়োজন' });
    }

    const { period = '7d' } = req.query;
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Get user's pages
    const userPages = await Page.find({ owner: req.user.userId });
    const pageIds = userPages.map(page => page._id);

    // Post analytics
    const postAnalytics = await Post.aggregate([
      { 
        $match: { 
          author: req.user.userId,
          createdAt: { $gte: startDate }
        }
      },
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

    // Page analytics
    const pageAnalytics = await Page.aggregate([
      { $match: { _id: { $in: pageIds } } },
      {
        $group: {
          _id: null,
          totalPages: { $sum: 1 },
          totalFollowers: { $sum: { $size: '$followers' } },
          totalLikes: { $sum: { $size: '$likes' } },
          totalReviews: { $sum: { $size: '$reviews' } },
          avgRating: { $avg: '$averageRating' }
        }
      }
    ]);

    // Post performance over time
    const postPerformance = await Post.aggregate([
      { 
        $match: { 
          author: req.user.userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          posts: { $sum: 1 },
          likes: { $sum: { $size: '$likes' } },
          comments: { $sum: { $size: '$comments' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top performing posts
    const topPosts = await Post.find({
      author: req.user.userId,
      createdAt: { $gte: startDate }
    })
    .sort({ 'likes.length': -1 })
    .limit(5)
    .select('content images likes comments shares createdAt');

    // Page insights
    const pageInsights = await Page.find({ owner: req.user.userId })
      .select('name category likes followers reviews averageRating insights');

    res.json({
      summary: {
        posts: postAnalytics[0] || { totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        pages: pageAnalytics[0] || { totalPages: 0, totalFollowers: 0, totalLikes: 0, totalReviews: 0, avgRating: 0 }
      },
      performance: postPerformance,
      topPosts,
      pageInsights,
      businessAccount: user.businessAccount
    });
  } catch (error) {
    console.error('Get business analytics error:', error);
    res.status(500).json({ message: 'বিজনেস এনালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

// Get business account dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.businessAccount?.isBusinessAccount) {
      return res.status(403).json({ message: 'বিজনেস অ্যাকাউন্ট প্রয়োজন' });
    }

    // Get user's pages
    const pages = await Page.find({ owner: req.user.userId })
      .sort({ createdAt: -1 });

    // Recent activity
    const recentPosts = await Post.find({ author: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('content images likes comments shares createdAt');

    // Business metrics
    const businessMetrics = {
      totalPages: pages.length,
      totalFollowers: pages.reduce((sum, page) => sum + page.followers.length, 0),
      totalLikes: pages.reduce((sum, page) => sum + page.likes.length, 0),
      averageRating: pages.reduce((sum, page) => sum + page.averageRating, 0) / (pages.length || 1),
      verificationStatus: user.businessAccount.verificationStatus
    };

    // Notifications for business account
    const notifications = [];
    
    if (user.businessAccount.verificationStatus === 'pending') {
      notifications.push({
        type: 'warning',
        message: 'আপনার বিজনেস অ্যাকাউন্ট যাচাই করা হচ্ছে',
        action: 'documents'
      });
    }

    if (pages.length === 0) {
      notifications.push({
        type: 'info',
        message: 'আপনার প্রথম বিজনেস পেজ তৈরি করুন',
        action: 'create_page'
      });
    }

    res.json({
      businessAccount: user.businessAccount,
      pages,
      recentPosts,
      metrics: businessMetrics,
      notifications
    });
  } catch (error) {
    console.error('Get business dashboard error:', error);
    res.status(500).json({ message: 'বিজনেস ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে' });
  }
});

// Update business account information
router.put('/update', auth, upload.array('documents', 5), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.businessAccount?.isBusinessAccount) {
      return res.status(403).json({ message: 'বিজনেস অ্যাকাউন্ট প্রয়োজন' });
    }

    const {
      businessName,
      businessCategory,
      businessAddress,
      businessContact
    } = req.body;

    // Handle new document uploads
    const newDocuments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        newDocuments.push(`/uploads/business/documents/${file.filename}`);
      });
    }

    // Update business information
    if (businessName) user.businessAccount.businessName = businessName;
    if (businessCategory) user.businessAccount.businessCategory = businessCategory;
    if (businessAddress) user.businessAccount.businessAddress = JSON.parse(businessAddress);
    if (businessContact) user.businessAccount.businessContact = JSON.parse(businessContact);
    
    // Add new documents
    if (newDocuments.length > 0) {
      user.businessAccount.verificationDocuments.push(...newDocuments);
      // Reset verification status if new documents are uploaded
      user.businessAccount.verificationStatus = 'pending';
    }

    await user.save();

    res.json({
      message: 'বিজনেস তথ্য আপডেট হয়েছে',
      businessAccount: user.businessAccount
    });
  } catch (error) {
    console.error('Update business account error:', error);
    res.status(500).json({ message: 'বিজনেস তথ্য আপডেট করতে সমস্যা হয়েছে' });
  }
});

// Business page management
router.get('/pages', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.businessAccount?.isBusinessAccount) {
      return res.status(403).json({ message: 'বিজনেস অ্যাকাউন্ট প্রয়োজন' });
    }

    const { page = 1, limit = 10, category, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { owner: req.user.userId };
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (status === 'published') {
      filter.isPublished = true;
    } else if (status === 'draft') {
      filter.isPublished = false;
    }

    const pages = await Page.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip)
      .populate('admins.user', 'username fullName avatar');

    const total = await Page.countDocuments(filter);

    // Add performance metrics for each page
    const pagesWithMetrics = await Promise.all(pages.map(async (page) => {
      const pageObj = page.toObject();
      
      // Get recent posts count
      const recentPostsCount = await Post.countDocuments({
        author: page._id,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      pageObj.metrics = {
        recentPosts: recentPostsCount,
        totalFollowers: page.followers.length,
        totalLikes: page.likes.length,
        totalReviews: page.reviews.length,
        averageRating: page.averageRating
      };

      return pageObj;
    }));

    res.json({
      pages: pagesWithMetrics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: skip + pages.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get business pages error:', error);
    res.status(500).json({ message: 'বিজনেস পেজ তালিকা লোড করতে সমস্যা হয়েছে' });
  }
});

// Page performance analytics
router.get('/pages/:pageId/analytics', auth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { period = '7d' } = req.query;

    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    // Check if user owns this page
    if (page.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই পেজের অ্যাক্সেস নেই' });
    }

    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Page posts analytics
    const postAnalytics = await Post.aggregate([
      { 
        $match: { 
          author: pageId,
          createdAt: { $gte: startDate }
        }
      },
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

    // Follower growth (mock data - would need to track follower history)
    const followerGrowth = Array.from({ length: parseInt(period.replace('d', '')) }, (_, i) => {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        followers: Math.floor(page.followers.length * (0.8 + Math.random() * 0.4))
      };
    });

    // Review analytics
    const reviewAnalytics = {
      totalReviews: page.reviews.length,
      averageRating: page.averageRating,
      ratingDistribution: [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: page.reviews.filter(review => review.rating === rating).length
      }))
    };

    // Top posts
    const topPosts = await Post.find({
      author: pageId,
      createdAt: { $gte: startDate }
    })
    .sort({ 'likes.length': -1 })
    .limit(5)
    .select('content images likes comments shares createdAt');

    res.json({
      pageInfo: {
        name: page.name,
        category: page.category,
        followers: page.followers.length,
        likes: page.likes.length
      },
      analytics: postAnalytics[0] || { totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
      followerGrowth,
      reviewAnalytics,
      topPosts
    });
  } catch (error) {
    console.error('Get page analytics error:', error);
    res.status(500).json({ message: 'পেজ এনালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

// Business account verification status
router.get('/verification-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.businessAccount?.isBusinessAccount) {
      return res.status(403).json({ message: 'বিজনেস অ্যাকাউন্ট প্রয়োজন' });
    }

    const verificationInfo = {
      status: user.businessAccount.verificationStatus,
      documents: user.businessAccount.verificationDocuments,
      businessInfo: {
        businessName: user.businessAccount.businessName,
        businessType: user.businessAccount.businessType,
        businessCategory: user.businessAccount.businessCategory,
        taxId: user.businessAccount.taxId
      },
      requirements: {
        businessName: !!user.businessAccount.businessName,
        businessType: !!user.businessAccount.businessType,
        businessCategory: !!user.businessAccount.businessCategory,
        businessAddress: !!user.businessAccount.businessAddress?.city,
        businessContact: !!user.businessAccount.businessContact?.email,
        documents: user.businessAccount.verificationDocuments.length > 0
      }
    };

    // Check if all requirements are met
    const allRequirementsMet = Object.values(verificationInfo.requirements).every(req => req);
    
    res.json({
      ...verificationInfo,
      canSubmitForReview: allRequirementsMet && user.businessAccount.verificationStatus === 'pending'
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ message: 'যাচাইকরণ অবস্থা লোড করতে সমস্যা হয়েছে' });
  }
});

// Business insights and recommendations
router.get('/insights', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.businessAccount?.isBusinessAccount) {
      return res.status(403).json({ message: 'বিজনেস অ্যাকাউন্ট প্রয়োজন' });
    }

    const pages = await Page.find({ owner: req.user.userId });
    const insights = [];

    // Page performance insights
    for (const page of pages) {
      const recentPosts = await Post.countDocuments({
        author: page._id,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (recentPosts === 0) {
        insights.push({
          type: 'suggestion',
          title: 'নিয়মিত পোস্ট করুন',
          message: `${page.name} পেজে গত সপ্তাহে কোন পোস্ট নেই। নিয়মিত কন্টেন্ট শেয়ার করুন।`,
          action: 'create_post',
          pageId: page._id
        });
      }

      if (page.reviews.length === 0) {
        insights.push({
          type: 'tip',
          title: 'রিভিউ চান',
          message: `${page.name} পেজে কোন রিভিউ নেই। গ্রাহকদের রিভিউ দিতে উৎসাহিত করুন।`,
          action: 'request_reviews',
          pageId: page._id
        });
      }

      if (page.followers.length < 10) {
        insights.push({
          type: 'growth',
          title: 'ফলোয়ার বাড়ান',
          message: `${page.name} পেজে আরো ফলোয়ার প্রয়োজন। কন্টেন্ট প্রমোশন করুন।`,
          action: 'promote_page',
          pageId: page._id
        });
      }
    }

    // Business account insights
    if (user.businessAccount.verificationStatus === 'pending') {
      insights.push({
        type: 'important',
        title: 'ভেরিফিকেশন সম্পূর্ণ করুন',
        message: 'আপনার বিজনেস অ্যাকাউন্ট ভেরিফিকেশন সম্পূর্ণ করুন বিশ্বস্ততার জন্য।',
        action: 'complete_verification'
      });
    }

    res.json({
      insights,
      summary: {
        totalPages: pages.length,
        totalFollowers: pages.reduce((sum, page) => sum + page.followers.length, 0),
        verificationStatus: user.businessAccount.verificationStatus
      }
    });
  } catch (error) {
    console.error('Get business insights error:', error);
    res.status(500).json({ message: 'বিজনেস ইনসাইট লোড করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
