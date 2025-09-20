const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for story uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/stories/';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র ইমেজ এবং ভিডিও ফাইল গ্রহণযোগ্য'), false);
    }
  }
});

// Create a new story
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const {
      type,
      text,
      backgroundColor,
      textColor,
      font,
      music,
      location,
      stickers
    } = req.body;

    const storyData = {
      author: req.user.userId,
      content: {
        type: type || 'text'
      }
    };

    // Handle media upload
    if (req.file) {
      storyData.content.url = `/uploads/stories/${req.file.filename}`;
      storyData.content.type = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    }

    // Handle text story
    if (type === 'text' && text) {
      storyData.content.text = text;
      storyData.content.backgroundColor = backgroundColor || '#1877f2';
      storyData.content.textColor = textColor || '#ffffff';
      storyData.content.font = font || 'Arial';
    }

    // Add music if provided
    if (music) {
      storyData.music = JSON.parse(music);
    }

    // Add location if provided
    if (location) {
      storyData.location = JSON.parse(location);
    }

    // Add stickers if provided
    if (stickers) {
      storyData.stickers = JSON.parse(stickers);
    }

    const story = new Story(storyData);
    await story.save();

    // Populate author info
    await story.populate('author', 'username fullName avatar');

    res.status(201).json({
      message: 'স্টোরি সফলভাবে তৈরি হয়েছে',
      story
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'স্টোরি তৈরি করতে সমস্যা হয়েছে' });
  }
});

// Get all active stories for feed
router.get('/feed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('friends');
    const friendIds = user.friends.map(friend => friend._id);
    friendIds.push(req.user.userId); // Include user's own stories

    const stories = await Story.find({
      author: { $in: friendIds },
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('author', 'username fullName avatar')
    .sort({ createdAt: -1 });

    // Group stories by author
    const groupedStories = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: [],
          hasUnseen: false
        };
      }
      
      // Check if user has seen this story
      const hasViewed = story.viewers.some(viewer => 
        viewer.user.toString() === req.user.userId
      );
      
      if (!hasViewed) {
        groupedStories[authorId].hasUnseen = true;
      }
      
      groupedStories[authorId].stories.push({
        ...story.toObject(),
        hasViewed
      });
    });

    // Convert to array and sort by latest story
    const result = Object.values(groupedStories).sort((a, b) => {
      const aLatest = Math.max(...a.stories.map(s => new Date(s.createdAt)));
      const bLatest = Math.max(...b.stories.map(s => new Date(s.createdAt)));
      return bLatest - aLatest;
    });

    res.json(result);
  } catch (error) {
    console.error('Get stories feed error:', error);
    res.status(500).json({ message: 'স্টোরি ফিড লোড করতে সমস্যা হয়েছে' });
  }
});

// Get user's own stories
router.get('/my-stories', auth, async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.user.userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('viewers.user', 'username fullName avatar')
    .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get my stories error:', error);
    res.status(500).json({ message: 'আপনার স্টোরি লোড করতে সমস্যা হয়েছে' });
  }
});

// Get specific user's stories
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is friend or if stories are public
    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(req.user.userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
    }

    // Check friendship or if it's the same user
    const isFriend = currentUser.friends.includes(userId);
    const isSameUser = userId === req.user.userId;

    if (!isFriend && !isSameUser) {
      return res.status(403).json({ message: 'এই স্টোরি দেখার অনুমতি নেই' });
    }

    const stories = await Story.find({
      author: userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('author', 'username fullName avatar')
    .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'স্টোরি লোড করতে সমস্যা হয়েছে' });
  }
});

// View a story
router.post('/:storyId/view', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    
    if (!story) {
      return res.status(404).json({ message: 'স্টোরি পাওয়া যায়নি' });
    }

    // Check if user already viewed this story
    const alreadyViewed = story.viewers.some(viewer => 
      viewer.user.toString() === req.user.userId
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: req.user.userId,
        viewedAt: new Date()
      });
      await story.save();
    }

    res.json({ message: 'স্টোরি দেখা হয়েছে' });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ message: 'স্টোরি দেখতে সমস্যা হয়েছে' });
  }
});

// React to a story
router.post('/:storyId/react', auth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { reactionType } = req.body;

    const validReactions = ['like', 'love', 'laugh', 'wow'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'অবৈধ রিয়েকশন টাইপ' });
    }

    const story = await Story.findById(storyId);
    
    if (!story) {
      return res.status(404).json({ message: 'স্টোরি পাওয়া যায়নি' });
    }

    // Remove user from all reaction types first
    validReactions.forEach(reaction => {
      story.reactions[reaction] = story.reactions[reaction].filter(
        userId => userId.toString() !== req.user.userId
      );
    });

    // Add user to the selected reaction
    story.reactions[reactionType].push(req.user.userId);

    await story.save();

    res.json({ 
      message: 'রিয়েকশন যোগ করা হয়েছে',
      reactionType,
      totalReactions: validReactions.reduce((total, reaction) => 
        total + story.reactions[reaction].length, 0
      )
    });
  } catch (error) {
    console.error('React to story error:', error);
    res.status(500).json({ message: 'রিয়েকশন যোগ করতে সমস্যা হয়েছে' });
  }
});

// Get story viewers
router.get('/:storyId/viewers', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId)
      .populate('viewers.user', 'username fullName avatar')
      .populate('author', 'username fullName avatar');
    
    if (!story) {
      return res.status(404).json({ message: 'স্টোরি পাওয়া যায়নি' });
    }

    // Only story author can see viewers
    if (story.author._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'ভিউয়ার দেখার অনুমতি নেই' });
    }

    const viewers = story.viewers.sort((a, b) => b.viewedAt - a.viewedAt);

    res.json({
      totalViewers: viewers.length,
      viewers
    });
  } catch (error) {
    console.error('Get story viewers error:', error);
    res.status(500).json({ message: 'ভিউয়ার লিস্ট লোড করতে সমস্যা হয়েছে' });
  }
});

// Delete a story
router.delete('/:storyId', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    
    if (!story) {
      return res.status(404).json({ message: 'স্টোরি পাওয়া যায়নি' });
    }

    // Only story author can delete
    if (story.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'স্টোরি মুছার অনুমতি নেই' });
    }

    // Delete media file if exists
    if (story.content.url) {
      const filePath = path.join(__dirname, '..', story.content.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    story.isActive = false;
    await story.save();

    res.json({ message: 'স্টোরি মুছে ফেলা হয়েছে' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'স্টোরি মুছতে সমস্যা হয়েছে' });
  }
});

// Get story analytics (for story author)
router.get('/:storyId/analytics', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId)
      .populate('viewers.user', 'username fullName avatar')
      .populate('author', 'username fullName avatar');
    
    if (!story) {
      return res.status(404).json({ message: 'স্টোরি পাওয়া যায়নি' });
    }

    // Only story author can see analytics
    if (story.author._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'অ্যানালিটিক্স দেখার অনুমতি নেই' });
    }

    const totalReactions = Object.values(story.reactions).reduce(
      (total, reactions) => total + reactions.length, 0
    );

    const analytics = {
      totalViews: story.viewers.length,
      totalReactions,
      reactionBreakdown: {
        like: story.reactions.like.length,
        love: story.reactions.love.length,
        laugh: story.reactions.laugh.length,
        wow: story.reactions.wow.length
      },
      timeLeft: Math.max(0, new Date(story.expiresAt) - new Date()),
      viewersTimeline: story.viewers.map(viewer => ({
        user: viewer.user,
        viewedAt: viewer.viewedAt
      })).sort((a, b) => b.viewedAt - a.viewedAt)
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get story analytics error:', error);
    res.status(500).json({ message: 'অ্যানালিটিক্স লোড করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
