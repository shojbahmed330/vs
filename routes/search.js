const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Story = require('../models/Story');
const { asyncHandler } = require('../middleware/auth');
const Fuse = require('fuse.js');
const { logger } = require('../utils/logger');

// @route   GET /api/search
// @desc    Universal search endpoint
// @access  Public
router.get('/',
  asyncHandler(async (req, res) => {
    const {
      q: query,
      type = 'all', // all, users, posts, hashtags, stories
      page = 1,
      limit = 20,
      sort = 'relevance' // relevance, date, popularity
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let results = {
      query: query.trim(),
      type,
      page: pageNum,
      limit: limitNum,
      total: 0,
      data: {}
    };

    try {
      // Search based on type
      switch (type) {
        case 'users':
          results.data.users = await searchUsers(query, limitNum, skip, sort);
          results.total = results.data.users.length;
          break;
          
        case 'posts':
          results.data.posts = await searchPosts(query, limitNum, skip, sort);
          results.total = results.data.posts.length;
          break;
          
        case 'hashtags':
          results.data.hashtags = await searchHashtags(query, limitNum, skip);
          results.total = results.data.hashtags.length;
          break;
          
        case 'stories':
          results.data.stories = await searchStories(query, limitNum, skip);
          results.total = results.data.stories.length;
          break;
          
        default: // 'all'
          const [users, posts, hashtags, stories] = await Promise.all([
            searchUsers(query, Math.min(limitNum, 10), 0, sort),
            searchPosts(query, Math.min(limitNum, 10), 0, sort),
            searchHashtags(query, Math.min(limitNum, 10), 0),
            searchStories(query, Math.min(limitNum, 10), 0)
          ]);
          
          results.data = {
            users: users.slice(0, 5),
            posts: posts.slice(0, 5),
            hashtags: hashtags.slice(0, 5),
            stories: stories.slice(0, 5)
          };
          
          results.total = users.length + posts.length + hashtags.length + stories.length;
          break;
      }

      // Log search action
      logger.logUserAction(
        req.user?._id || 'anonymous',
        'search_performed',
        {
          query: query.trim(),
          type,
          resultsCount: results.total,
          ip: req.ip
        }
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.logError(error, 'search');
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   GET /api/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/suggestions',
  asyncHandler(async (req, res) => {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 1) {
      return res.json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    try {
      const limitNum = parseInt(limit);
      
      // Get recent searches and popular terms
      const [userSuggestions, hashtagSuggestions] = await Promise.all([
        getSuggestedUsers(query.trim(), Math.ceil(limitNum / 2)),
        getSuggestedHashtags(query.trim(), Math.ceil(limitNum / 2))
      ]);

      const suggestions = [
        ...userSuggestions.map(user => ({
          type: 'user',
          text: user.username,
          display: `@${user.username}`,
          subtitle: user.fullName,
          avatar: user.avatar?.url || null,
          verified: user.isVerified
        })),
        ...hashtagSuggestions.map(tag => ({
          type: 'hashtag',
          text: tag.hashtag,
          display: `#${tag.hashtag}`,
          subtitle: `${tag.count} posts`,
          count: tag.count
        }))
      ];

      res.json({
        success: true,
        data: {
          query: query.trim(),
          suggestions: suggestions.slice(0, limitNum)
        }
      });
    } catch (error) {
      logger.logError(error, 'search_suggestions');
      res.status(500).json({
        success: false,
        message: 'Failed to get suggestions'
      });
    }
  })
);

// @route   GET /api/search/trending
// @desc    Get trending hashtags and topics
// @access  Public
router.get('/trending',
  asyncHandler(async (req, res) => {
    const { limit = 10, period = '24h' } = req.query;

    try {
      const limitNum = parseInt(limit);
      let timeLimit;
      
      switch (period) {
        case '1h':
          timeLimit = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      // Get trending hashtags from recent posts
      const trendingHashtags = await Post.aggregate([
        {
          $match: {
            createdAt: { $gte: timeLimit },
            status: 'active',
            visibility: 'public'
          }
        },
        {
          $unwind: '$content.hashtags'
        },
        {
          $group: {
            _id: '$content.hashtags',
            count: { $sum: 1 },
            posts: { $addToSet: '$_id' },
            latestPost: { $max: '$createdAt' }
          }
        },
        {
          $match: {
            count: { $gte: 2 } // At least 2 posts
          }
        },
        {
          $sort: { count: -1, latestPost: -1 }
        },
        {
          $limit: limitNum
        },
        {
          $project: {
            hashtag: '$_id',
            count: 1,
            postsCount: { $size: '$posts' },
            latestPost: 1,
            _id: 0
          }
        }
      ]);

      // Get trending users (most followed recently)
      const trendingUsers = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: timeLimit },
            accountStatus: 'active'
          }
        },
        {
          $addFields: {
            followersCount: { $size: '$followers' },
            recentPostsCount: {
              $size: {
                $filter: {
                  input: '$posts',
                  as: 'post',
                  cond: { $gte: ['$$post.createdAt', timeLimit] }
                }
              }
            }
          }
        },
        {
          $sort: {
            followersCount: -1,
            recentPostsCount: -1,
            createdAt: -1
          }
        },
        {
          $limit: Math.ceil(limitNum / 2)
        },
        {
          $project: {
            username: 1,
            fullName: 1,
            avatar: 1,
            isVerified: 1,
            followersCount: 1,
            recentPostsCount: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          hashtags: trendingHashtags,
          users: trendingUsers,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      logger.logError(error, 'trending_search');
      res.status(500).json({
        success: false,
        message: 'Failed to get trending data'
      });
    }
  })
);

// Helper functions
async function searchUsers(query, limit, skip, sort = 'relevance') {
  const searchRegex = new RegExp(query, 'i');
  
  let sortOptions = {};
  
  switch (sort) {
    case 'popularity':
      sortOptions = { followersCount: -1, createdAt: -1 };
      break;
    case 'date':
      sortOptions = { createdAt: -1 };
      break;
    default: // relevance
      sortOptions = { createdAt: -1 };
  }

  const users = await User.find({
    $or: [
      { username: searchRegex },
      { fullName: searchRegex },
      { bio: searchRegex }
    ],
    accountStatus: 'active'
  })
  .select('username fullName bio avatar isVerified followers')
  .sort(sortOptions)
  .skip(skip)
  .limit(limit)
  .lean();

  // Add follower count for sorting
  return users.map(user => ({
    ...user,
    followersCount: user.followers ? user.followers.length : 0,
    followers: undefined // Remove the array from response
  }));
}

async function searchPosts(query, limit, skip, sort = 'relevance') {
  let sortOptions = {};
  
  switch (sort) {
    case 'popularity':
      sortOptions = { 'engagement.totalLikes': -1, 'engagement.totalComments': -1, createdAt: -1 };
      break;
    case 'date':
      sortOptions = { createdAt: -1 };
      break;
    default: // relevance
      sortOptions = { score: { $meta: 'textScore' }, createdAt: -1 };
  }

  const posts = await Post.find({
    $text: { $search: query },
    status: 'active',
    visibility: 'public'
  })
  .populate('author', 'username fullName avatar isVerified')
  .sort(sortOptions)
  .skip(skip)
  .limit(limit)
  .lean();

  return posts;
}

async function searchHashtags(query, limit, skip) {
  const hashtagRegex = new RegExp(query.replace('#', ''), 'i');
  
  const hashtags = await Post.aggregate([
    {
      $match: {
        'content.hashtags': hashtagRegex,
        status: 'active',
        visibility: 'public'
      }
    },
    {
      $unwind: '$content.hashtags'
    },
    {
      $match: {
        'content.hashtags': hashtagRegex
      }
    },
    {
      $group: {
        _id: '$content.hashtags',
        count: { $sum: 1 },
        latestPost: { $max: '$createdAt' },
        posts: { $addToSet: '$_id' }
      }
    },
    {
      $sort: { count: -1, latestPost: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        hashtag: '$_id',
        count: 1,
        latestPost: 1,
        postsCount: { $size: '$posts' },
        _id: 0
      }
    }
  ]);

  return hashtags;
}

async function searchStories(query, limit, skip) {
  const searchRegex = new RegExp(query, 'i');
  
  const stories = await Story.find({
    $or: [
      { 'content.text.content': searchRegex }
    ],
    status: 'active',
    visibility: 'public',
    expiresAt: { $gt: new Date() }
  })
  .populate('author', 'username fullName avatar isVerified')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();

  return stories;
}

async function getSuggestedUsers(query, limit) {
  const searchRegex = new RegExp(query, 'i');
  
  return await User.find({
    $or: [
      { username: { $regex: `^${query}`, $options: 'i' } },
      { fullName: searchRegex }
    ],
    accountStatus: 'active'
  })
  .select('username fullName avatar isVerified')
  .sort({ followersCount: -1 })
  .limit(limit)
  .lean();
}

async function getSuggestedHashtags(query, limit) {
  const hashtagRegex = new RegExp(`^${query.replace('#', '')}`, 'i');
  
  return await Post.aggregate([
    {
      $match: {
        'content.hashtags': hashtagRegex,
        status: 'active',
        visibility: 'public',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    },
    {
      $unwind: '$content.hashtags'
    },
    {
      $match: {
        'content.hashtags': hashtagRegex
      }
    },
    {
      $group: {
        _id: '$content.hashtags',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        hashtag: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
}

module.exports = router;