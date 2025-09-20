const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { notificationHelpers } = require('./notifications');

const router = express.Router();

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { content, postType, visibility, location, tags, hashtags, voiceCommand } = req.body;

    const post = new Post({
      author: req.userId,
      content,
      postType: postType || 'text',
      visibility: visibility || 'public',
      location,
      tags,
      hashtags,
      voiceCommand
    });

    await post.save();
    await post.populate('author', 'username fullName avatar');

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feed posts
router.get('/feed', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.userId);
    const friendIds = [...currentUser.friends, req.userId];

    const posts = await Post.find({
      $or: [
        { author: { $in: friendIds } },
        { visibility: 'public' }
      ],
      isActive: true
    })
    .populate('author', 'username fullName avatar')
    .populate('comments.author', 'username fullName avatar')
    .populate('tags', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(posts);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user posts
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      author: req.params.userId,
      isActive: true
    })
    .populate('author', 'username fullName avatar')
    .populate('comments.author', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
router.get('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username fullName avatar')
      .populate('comments.author', 'username fullName avatar')
      .populate('comments.replies.author', 'username fullName avatar')
      .populate('tags', 'username fullName avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// React to post
router.post('/:postId/react', auth, async (req, res) => {
  try {
    const { reactionType } = req.body; // like, love, laugh, angry, sad, wow
    const post = await Post.findById(req.params.postId).populate('author', 'name avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove existing reaction from user
    Object.keys(post.reactions).forEach(reaction => {
      post.reactions[reaction] = post.reactions[reaction].filter(
        userId => userId.toString() !== req.userId
      );
    });

    // Add new reaction
    if (reactionType && post.reactions[reactionType]) {
      post.reactions[reactionType].push(req.userId);
      
      // Create notification for like reaction (most common)
      if (reactionType === 'like') {
        const liker = await User.findById(req.userId);
        await notificationHelpers.createLikeNotification(
          post._id,
          post.author._id,
          req.userId,
          liker
        );
      }
    }

    await post.save();
    res.json({ message: 'Reaction updated', reactions: post.reactions });
  } catch (error) {
    console.error('React to post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Comment on post
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId).populate('author', 'name avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      author: req.userId,
      text,
      timestamp: new Date()
    };

    post.comments.push(comment);
    await post.save();
    
    await post.populate('comments.author', 'username fullName avatar');
    
    const newComment = post.comments[post.comments.length - 1];
    
    // Create notification for comment
    const commenter = await User.findById(req.userId);
    await notificationHelpers.createCommentNotification(
      post._id,
      post.author._id,
      req.userId,
      commenter
    );
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reply to comment
router.post('/:postId/comment/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = {
      author: req.userId,
      text,
      timestamp: new Date()
    };

    comment.replies.push(reply);
    await post.save();
    
    await post.populate('comments.replies.author', 'username fullName avatar');
    
    res.status(201).json(reply);
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share post
router.post('/:postId/share', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('author', 'name avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingShare = post.shares.find(
      share => share.user.toString() === req.userId
    );

    if (existingShare) {
      return res.status(400).json({ message: 'Post already shared' });
    }

    post.shares.push({
      user: req.userId,
      timestamp: new Date()
    });

    await post.save();
    
    // Create notification for share
    const sharer = await User.findById(req.userId);
    await notificationHelpers.createShareNotification(
      post._id,
      post.author._id,
      req.userId,
      sharer
    );
    
    res.json({ message: 'Post shared successfully' });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post
router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    post.isActive = false;
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search posts
router.get('/search/:query', auth, async (req, res) => {
  try {
    const query = req.params.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      $or: [
        { 'content.text': { $regex: query, $options: 'i' } },
        { hashtags: { $in: [new RegExp(query, 'i')] } }
      ],
      isActive: true,
      visibility: { $in: ['public'] }
    })
    .populate('author', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(posts);
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;