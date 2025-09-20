const express = require('express');
const router = express.Router();
const Page = require('../models/Page');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for page uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/pages/';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র ইমেজ ফাইল গ্রহণযোগ্য'), false);
    }
  }
});

// Create a new page
router.post('/', auth, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name,
      username,
      description,
      category,
      subCategory,
      contactInfo,
      businessHours
    } = req.body;

    // Check if username is already taken
    if (username) {
      const existingPage = await Page.findOne({ username: username.toLowerCase() });
      if (existingPage) {
        return res.status(400).json({ message: 'এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হয়েছে' });
      }
    }

    const pageData = {
      name,
      username: username ? username.toLowerCase() : undefined,
      description,
      category,
      subCategory,
      owner: req.user.userId,
      admins: [{
        user: req.user.userId,
        role: 'admin',
        permissions: ['post', 'edit_page', 'manage_roles', 'view_insights', 'manage_ads', 'moderate']
      }]
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.profilePicture) {
        pageData.profilePicture = `/uploads/pages/${req.files.profilePicture[0].filename}`;
      }
      if (req.files.coverPhoto) {
        pageData.coverPhoto = `/uploads/pages/${req.files.coverPhoto[0].filename}`;
      }
    }

    // Parse JSON fields
    if (contactInfo) {
      pageData.contactInfo = JSON.parse(contactInfo);
    }
    if (businessHours) {
      pageData.businessHours = JSON.parse(businessHours);
    }

    const page = new Page(pageData);
    await page.save();

    await page.populate('owner', 'username fullName avatar');

    res.status(201).json({
      message: 'পেজ সফলভাবে তৈরি হয়েছে',
      page
    });
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({ message: 'পেজ তৈরি করতে সমস্যা হয়েছে' });
  }
});

// Get page feed/discovery
router.get('/discover', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {
      isActive: true,
      isPublished: true
    };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pages = await Page.find(filter)
      .populate('owner', 'username fullName avatar')
      .sort({ likes: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Page.countDocuments(filter);

    // Add user interaction status
    const pagesWithStatus = pages.map(page => {
      const pageObj = page.toObject();
      pageObj.userStatus = {
        isLiked: page.likes.includes(req.user.userId),
        isFollowing: page.followers.includes(req.user.userId),
        isOwner: page.owner._id.toString() === req.user.userId,
        isAdmin: page.admins.some(admin => admin.user.toString() === req.user.userId)
      };
      pageObj.stats = {
        totalLikes: page.likes.length,
        totalFollowers: page.followers.length,
        averageRating: page.averageRating,
        totalReviews: page.totalReviews
      };
      return pageObj;
    });

    res.json({
      pages: pagesWithStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPages: total,
        hasNext: skip + pages.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get pages discover error:', error);
    res.status(500).json({ message: 'পেজ ডিসকভার লোড করতে সমস্যা হয়েছে' });
  }
});

// Get page by ID or username
router.get('/:identifier', auth, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is username or ObjectId
    let page;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      // It's an ObjectId
      page = await Page.findById(identifier);
    } else {
      // It's a username
      page = await Page.findOne({ username: identifier.toLowerCase() });
    }

    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    // Populate related data
    await page.populate('owner', 'username fullName avatar');
    await page.populate('admins.user', 'username fullName avatar');
    await page.populate('reviews.author', 'username fullName avatar');

    const pageObj = page.toObject();
    const userId = req.user.userId;

    pageObj.userStatus = {
      isLiked: page.likes.includes(userId),
      isFollowing: page.followers.includes(userId),
      isOwner: page.owner._id.toString() === userId,
      isAdmin: page.admins.some(admin => admin.user._id.toString() === userId)
    };

    pageObj.stats = {
      totalLikes: page.likes.length,
      totalFollowers: page.followers.length,
      averageRating: page.averageRating,
      totalReviews: page.totalReviews
    };

    // Get recent posts from this page
    const recentPosts = await Post.find({
      author: page._id,
      isActive: true
    })
    .populate('author', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(5);

    pageObj.recentPosts = recentPosts;

    res.json(pageObj);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ message: 'পেজ লোড করতে সমস্যা হয়েছে' });
  }
});

// Like/Unlike a page
router.post('/:pageId/like', auth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const userId = req.user.userId;

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    const isLiked = page.likes.includes(userId);

    if (isLiked) {
      // Unlike the page
      page.likes = page.likes.filter(id => id.toString() !== userId);
    } else {
      // Like the page
      page.likes.push(userId);

      // Send notification to page owner
      if (userId !== page.owner.toString()) {
        const notification = new Notification({
          recipient: page.owner,
          sender: userId,
          type: 'page_like',
          title: 'পেজ লাইক',
          message: `আপনার পেজ লাইক করেছে: ${page.name}`,
          relatedId: pageId,
          relatedModel: 'Page',
          metadata: {
            pageTitle: page.name
          }
        });
        await notification.save();
      }
    }

    await page.save();

    res.json({
      message: isLiked ? 'পেজ আনলাইক করা হয়েছে' : 'পেজ লাইক করা হয়েছে',
      isLiked: !isLiked,
      totalLikes: page.likes.length
    });
  } catch (error) {
    console.error('Like page error:', error);
    res.status(500).json({ message: 'পেজ লাইক করতে সমস্যা হয়েছে' });
  }
});

// Follow/Unfollow a page
router.post('/:pageId/follow', auth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const userId = req.user.userId;

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    const isFollowing = page.followers.includes(userId);

    if (isFollowing) {
      // Unfollow the page
      page.followers = page.followers.filter(id => id.toString() !== userId);
    } else {
      // Follow the page
      page.followers.push(userId);

      // Send notification to page owner
      if (userId !== page.owner.toString()) {
        const notification = new Notification({
          recipient: page.owner,
          sender: userId,
          type: 'page_follow',
          title: 'নতুন ফলোয়ার',
          message: `আপনার পেজ ফলো করেছে: ${page.name}`,
          relatedId: pageId,
          relatedModel: 'Page',
          metadata: {
            pageTitle: page.name
          }
        });
        await notification.save();
      }
    }

    await page.save();

    res.json({
      message: isFollowing ? 'পেজ আনফলো করা হয়েছে' : 'পেজ ফলো করা হয়েছে',
      isFollowing: !isFollowing,
      totalFollowers: page.followers.length
    });
  } catch (error) {
    console.error('Follow page error:', error);
    res.status(500).json({ message: 'পেজ ফলো করতে সমস্যা হয়েছে' });
  }
});

// Add review to page
router.post('/:pageId/review', auth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { rating, text, isRecommended } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে' });
    }

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    const userId = req.user.userId;

    // Check if user already reviewed this page
    const existingReview = page.reviews.find(review => 
      review.author.toString() === userId
    );

    if (existingReview) {
      return res.status(400).json({ message: 'আপনি ইতিমধ্যে এই পেজে রিভিউ দিয়েছেন' });
    }

    const review = {
      author: userId,
      rating: parseInt(rating),
      text: text || '',
      isRecommended: isRecommended === true,
      timestamp: new Date()
    };

    page.reviews.push(review);
    page.calculateAverageRating();
    await page.save();

    // Populate the new review
    await page.populate('reviews.author', 'username fullName avatar');
    const newReview = page.reviews[page.reviews.length - 1];

    // Send notification to page owner
    if (userId !== page.owner.toString()) {
      const notification = new Notification({
        recipient: page.owner,
        sender: userId,
        type: 'page_review',
        title: 'নতুন রিভিউ',
        message: `আপনার পেজে ${rating} স্টার রিভিউ দিয়েছে: ${page.name}`,
        relatedId: pageId,
        relatedModel: 'Page',
        metadata: {
          pageTitle: page.name,
          rating: rating
        }
      });
      await notification.save();
    }

    res.status(201).json({
      message: 'রিভিউ সফলভাবে যোগ করা হয়েছে',
      review: newReview,
      averageRating: page.averageRating,
      totalReviews: page.totalReviews
    });
  } catch (error) {
    console.error('Add page review error:', error);
    res.status(500).json({ message: 'রিভিউ যোগ করতে সমস্যা হয়েছে' });
  }
});

// Update page
router.put('/:pageId', auth, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const { pageId } = req.params;
    const updates = req.body;

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    const userId = req.user.userId;

    // Check if user can edit this page
    const canEdit = 
      page.owner.toString() === userId ||
      page.admins.some(admin => 
        admin.user.toString() === userId && 
        admin.permissions.includes('edit_page')
      );

    if (!canEdit) {
      return res.status(403).json({ message: 'পেজ সম্পাদনা করার অনুমতি নেই' });
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.profilePicture) {
        // Delete old profile picture if exists
        if (page.profilePicture) {
          const oldPath = path.join(__dirname, '..', page.profilePicture);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        updates.profilePicture = `/uploads/pages/${req.files.profilePicture[0].filename}`;
      }
      
      if (req.files.coverPhoto) {
        // Delete old cover photo if exists
        if (page.coverPhoto) {
          const oldPath = path.join(__dirname, '..', page.coverPhoto);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        updates.coverPhoto = `/uploads/pages/${req.files.coverPhoto[0].filename}`;
      }
    }

    // Parse JSON fields
    ['contactInfo', 'businessHours'].forEach(field => {
      if (updates[field] && typeof updates[field] === 'string') {
        try {
          updates[field] = JSON.parse(updates[field]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });

    // Check username uniqueness if updating
    if (updates.username && updates.username !== page.username) {
      const existingPage = await Page.findOne({ 
        username: updates.username.toLowerCase(),
        _id: { $ne: pageId }
      });
      if (existingPage) {
        return res.status(400).json({ message: 'এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হয়েছে' });
      }
      updates.username = updates.username.toLowerCase();
    }

    Object.assign(page, updates);
    await page.save();

    await page.populate('owner', 'username fullName avatar');
    await page.populate('admins.user', 'username fullName avatar');

    res.json({
      message: 'পেজ সফলভাবে আপডেট হয়েছে',
      page
    });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ message: 'পেজ আপডেট করতে সমস্যা হয়েছে' });
  }
});

// Get user's pages
router.get('/user/my-pages', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pages = await Page.find({
      $or: [
        { owner: userId },
        { 'admins.user': userId }
      ],
      isActive: true
    })
    .populate('owner', 'username fullName avatar')
    .sort({ createdAt: -1 });

    // Add role information for each page
    const pagesWithRole = pages.map(page => {
      const pageObj = page.toObject();
      
      if (page.owner._id.toString() === userId) {
        pageObj.userRole = 'owner';
      } else {
        const adminEntry = page.admins.find(admin => admin.user.toString() === userId);
        pageObj.userRole = adminEntry ? adminEntry.role : 'none';
        pageObj.permissions = adminEntry ? adminEntry.permissions : [];
      }

      pageObj.stats = {
        totalLikes: page.likes.length,
        totalFollowers: page.followers.length,
        averageRating: page.averageRating,
        totalReviews: page.totalReviews
      };

      return pageObj;
    });

    res.json(pagesWithRole);
  } catch (error) {
    console.error('Get my pages error:', error);
    res.status(500).json({ message: 'আপনার পেজ লোড করতে সমস্যা হয়েছে' });
  }
});

// Add admin to page
router.post('/:pageId/admins', auth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { userId: newAdminId, role, permissions } = req.body;

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    const currentUserId = req.user.userId;

    // Only owner can add admins
    if (page.owner.toString() !== currentUserId) {
      return res.status(403).json({ message: 'অ্যাডমিন যোগ করার অনুমতি নেই' });
    }

    // Check if user is already an admin
    const existingAdmin = page.admins.find(admin => admin.user.toString() === newAdminId);
    if (existingAdmin) {
      return res.status(400).json({ message: 'ইউজার ইতিমধ্যে অ্যাডমিন' });
    }

    const validRoles = ['admin', 'editor', 'moderator', 'advertiser', 'analyst'];
    const validPermissions = ['post', 'edit_page', 'manage_roles', 'view_insights', 'manage_ads', 'moderate'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'অবৈধ রোল' });
    }

    const newAdmin = {
      user: newAdminId,
      role: role || 'editor',
      permissions: permissions || ['post']
    };

    // Validate permissions
    if (newAdmin.permissions.some(perm => !validPermissions.includes(perm))) {
      return res.status(400).json({ message: 'অবৈধ পারমিশন' });
    }

    page.admins.push(newAdmin);
    await page.save();

    // Send notification to new admin
    const notification = new Notification({
      recipient: newAdminId,
      sender: currentUserId,
      type: 'page_admin_added',
      title: 'পেজ অ্যাডমিন',
      message: `আপনাকে পেজের অ্যাডমিন করা হয়েছে: ${page.name}`,
      relatedId: pageId,
      relatedModel: 'Page',
      metadata: {
        pageTitle: page.name,
        role: role
      }
    });
    await notification.save();

    await page.populate('admins.user', 'username fullName avatar');

    res.json({
      message: 'অ্যাডমিন সফলভাবে যোগ করা হয়েছে',
      admins: page.admins
    });
  } catch (error) {
    console.error('Add page admin error:', error);
    res.status(500).json({ message: 'অ্যাডমিন যোগ করতে সমস্যা হয়েছে' });
  }
});

// Get page insights
router.get('/:pageId/insights', auth, async (req, res) => {
  try {
    const { pageId } = req.params;

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ message: 'পেজ পাওয়া যায়নি' });
    }

    const userId = req.user.userId;

    // Check if user can view insights
    const canViewInsights = 
      page.owner.toString() === userId ||
      page.admins.some(admin => 
        admin.user.toString() === userId && 
        admin.permissions.includes('view_insights')
      );

    if (!canViewInsights) {
      return res.status(403).json({ message: 'ইনসাইট দেখার অনুমতি নেই' });
    }

    // Get posts from this page for engagement calculation
    const posts = await Post.find({
      author: pageId,
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    const totalEngagement = posts.reduce((total, post) => {
      const likes = Object.values(post.reactions).reduce((sum, reactions) => sum + reactions.length, 0);
      const comments = post.comments.length;
      const shares = post.shares.length;
      return total + likes + comments + shares;
    }, 0);

    const insights = {
      overview: {
        totalLikes: page.likes.length,
        totalFollowers: page.followers.length,
        totalReviews: page.totalReviews,
        averageRating: page.averageRating,
        totalPosts: posts.length,
        totalEngagement
      },
      performance: {
        engagementRate: page.followers.length > 0 ? (totalEngagement / page.followers.length * 100).toFixed(2) : 0,
        weeklyGrowth: page.insights.weeklyData.slice(-4), // Last 4 weeks
        topPosts: posts
          .sort((a, b) => {
            const aEngagement = Object.values(a.reactions).reduce((sum, reactions) => sum + reactions.length, 0) + a.comments.length + a.shares.length;
            const bEngagement = Object.values(b.reactions).reduce((sum, reactions) => sum + reactions.length, 0) + b.comments.length + b.shares.length;
            return bEngagement - aEngagement;
          })
          .slice(0, 5)
      },
      audience: {
        demographics: {
          // In a real implementation, you would calculate this from actual user data
          ageGroups: {
            '18-24': 25,
            '25-34': 35,
            '35-44': 20,
            '45-54': 15,
            '55+': 5
          },
          locations: {
            'ঢাকা': 40,
            'চট্টগ্রাম': 20,
            'সিলেট': 15,
            'অন্যান্য': 25
          }
        }
      }
    };

    res.json(insights);
  } catch (error) {
    console.error('Get page insights error:', error);
    res.status(500).json({ message: 'ইনসাইট লোড করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
