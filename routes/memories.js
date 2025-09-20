const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Get memories for user
router.get('/', auth, async (req, res) => {
  try {
    const { type, year } = req.query;
    
    const filter = {
      user: req.user.userId,
      isActive: true
    };

    if (type) {
      filter.memoryType = type;
    }

    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${parseInt(year) + 1}-01-01`);
      filter['originalContent.originalDate'] = {
        $gte: startOfYear,
        $lt: endOfYear
      };
    }

    const memories = await Memory.find(filter)
      .populate('originalContent.contentId')
      .populate('user', 'username fullName avatar')
      .sort({ createdAt: -1 });

    res.json(memories);
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ message: 'স্মৃতি লোড করতে সমস্যা হয়েছে' });
  }
});

// Get "On This Day" memories
router.get('/on-this-day', auth, async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    // Find posts from previous years on this date
    const previousYearsPosts = await Post.find({
      author: req.user.userId,
      isActive: true,
      $expr: {
        $and: [
          { $eq: [{ $month: '$createdAt' }, currentMonth] },
          { $eq: [{ $dayOfMonth: '$createdAt' }, currentDay] },
          { $lt: [{ $year: '$createdAt' }, today.getFullYear()] }
        ]
      }
    }).sort({ createdAt: -1 });

    // Create memories for these posts
    const memories = [];
    
    for (const post of previousYearsPosts) {
      const yearsPassed = today.getFullYear() - post.createdAt.getFullYear();
      
      // Check if memory already exists
      const existingMemory = await Memory.findOne({
        user: req.user.userId,
        'originalContent.contentId': post._id,
        memoryType: 'on_this_day',
        yearsPassed: yearsPassed
      });

      if (!existingMemory) {
        const memory = new Memory({
          user: req.user.userId,
          title: `${yearsPassed} বছর আগে আজকের দিনে`,
          description: `${yearsPassed} বছর আগে আপনি এই পোস্টটি করেছিলেন`,
          memoryType: 'on_this_day',
          originalContent: {
            contentType: 'post',
            contentId: post._id,
            contentModel: 'Post',
            originalDate: post.createdAt,
            preview: {
              text: post.content.text?.substring(0, 100),
              imageUrl: post.content.media?.[0]?.url || ''
            }
          },
          yearsPassed: yearsPassed
        });

        await memory.save();
        memories.push(memory);
      } else {
        memories.push(existingMemory);
      }
    }

    // Populate related data
    await Memory.populate(memories, [
      { path: 'originalContent.contentId' },
      { path: 'user', select: 'username fullName avatar' }
    ]);

    res.json(memories);
  } catch (error) {
    console.error('Get on this day memories error:', error);
    res.status(500).json({ message: 'আজকের স্মৃতি লোড করতে সমস্যা হয়েছে' });
  }
});

// Share a memory
router.post('/:memoryId/share', auth, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { caption } = req.body;

    const memory = await Memory.findById(memoryId);
    
    if (!memory) {
      return res.status(404).json({ message: 'স্মৃতি পাওয়া যায়নি' });
    }

    if (memory.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই স্মৃতি শেয়ার করার অনুমতি নেই' });
    }

    // Create a new post sharing this memory
    const originalPost = await Post.findById(memory.originalContent.contentId);
    
    if (!originalPost) {
      return res.status(404).json({ message: 'মূল পোস্ট পাওয়া যায়নি' });
    }

    const sharePost = new Post({
      author: req.user.userId,
      content: {
        text: caption || `${memory.yearsPassed} বছর আগে আজকের দিনে...`,
        media: originalPost.content.media
      },
      postType: 'memory_share',
      originalPost: originalPost._id,
      visibility: 'public'
    });

    await sharePost.save();

    // Mark memory as shared
    memory.isShared = true;
    memory.sharedAt = new Date();
    await memory.save();

    res.json({
      message: 'স্মৃতি সফলভাবে শেয়ার করা হয়েছে',
      post: sharePost
    });
  } catch (error) {
    console.error('Share memory error:', error);
    res.status(500).json({ message: 'স্মৃতি শেয়ার করতে সমস্যা হয়েছে' });
  }
});

// React to a memory
router.post('/:memoryId/react', auth, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { reactionType } = req.body;

    const validReactions = ['like', 'love', 'wow'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'অবৈধ রিয়েকশন টাইপ' });
    }

    const memory = await Memory.findById(memoryId);
    
    if (!memory) {
      return res.status(404).json({ message: 'স্মৃতি পাওয়া যায়নি' });
    }

    // Remove user from all reaction types first
    validReactions.forEach(reaction => {
      memory.reactions[reaction] = memory.reactions[reaction].filter(
        userId => userId.toString() !== req.user.userId
      );
    });

    // Add user to the selected reaction
    memory.reactions[reactionType].push(req.user.userId);

    await memory.save();

    res.json({ 
      message: 'রিয়েকশন যোগ করা হয়েছে',
      reactionType,
      totalReactions: validReactions.reduce((total, reaction) => 
        total + memory.reactions[reaction].length, 0
      )
    });
  } catch (error) {
    console.error('React to memory error:', error);
    res.status(500).json({ message: 'রিয়েকশন যোগ করতে সমস্যা হয়েছে' });
  }
});

// Add comment to memory
router.post('/:memoryId/comment', auth, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'কমেন্ট টেক্সট প্রয়োজন' });
    }

    const memory = await Memory.findById(memoryId);
    
    if (!memory) {
      return res.status(404).json({ message: 'স্মৃতি পাওয়া যায়নি' });
    }

    const comment = {
      author: req.user.userId,
      text: text.trim(),
      timestamp: new Date()
    };

    memory.comments.push(comment);
    await memory.save();

    // Populate the new comment
    await memory.populate('comments.author', 'username fullName avatar');
    const newComment = memory.comments[memory.comments.length - 1];

    res.status(201).json({
      message: 'কমেন্ট যোগ করা হয়েছে',
      comment: newComment
    });
  } catch (error) {
    console.error('Add memory comment error:', error);
    res.status(500).json({ message: 'কমেন্ট যোগ করতে সমস্যা হয়েছে' });
  }
});

// Generate year in review memory
router.post('/year-in-review/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const userId = req.user.userId;

    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01`);

    // Get user's posts from that year
    const yearPosts = await Post.find({
      author: userId,
      isActive: true,
      createdAt: {
        $gte: startOfYear,
        $lt: endOfYear
      }
    }).sort({ createdAt: -1 });

    if (yearPosts.length === 0) {
      return res.status(404).json({ message: `${year} সালে কোন পোস্ট পাওয়া যায়নি` });
    }

    // Calculate statistics
    const totalPosts = yearPosts.length;
    const totalLikes = yearPosts.reduce((sum, post) => {
      return sum + Object.values(post.reactions).reduce((reactionSum, reactions) => reactionSum + reactions.length, 0);
    }, 0);
    const totalComments = yearPosts.reduce((sum, post) => sum + post.comments.length, 0);

    // Find most liked post
    const mostLikedPost = yearPosts.reduce((max, post) => {
      const postLikes = Object.values(post.reactions).reduce((sum, reactions) => sum + reactions.length, 0);
      const maxLikes = Object.values(max.reactions || {}).reduce((sum, reactions) => sum + reactions.length, 0);
      return postLikes > maxLikes ? post : max;
    }, yearPosts[0]);

    // Check if year in review already exists
    let existingMemory = await Memory.findOne({
      user: userId,
      memoryType: 'year_in_review',
      'originalContent.originalDate': {
        $gte: startOfYear,
        $lt: endOfYear
      }
    });

    if (existingMemory) {
      return res.json({
        message: `${year} সালের রিভিউ ইতিমধ্যে তৈরি`,
        memory: existingMemory
      });
    }

    // Create year in review memory
    const memory = new Memory({
      user: userId,
      title: `${year} সালের রিভিউ`,
      description: `${year} সালে আপনার ${totalPosts}টি পোস্ট, ${totalLikes}টি লাইক এবং ${totalComments}টি কমেন্ট`,
      memoryType: 'year_in_review',
      originalContent: {
        contentType: 'post',
        contentId: mostLikedPost._id,
        contentModel: 'Post',
        originalDate: new Date(`${year}-12-31`),
        preview: {
          text: `${totalPosts} পোস্ট • ${totalLikes} লাইক • ${totalComments} কমেন্ট`,
          imageUrl: mostLikedPost.content.media?.[0]?.url || ''
        }
      },
      yearsPassed: new Date().getFullYear() - parseInt(year),
      metadata: {
        totalPosts,
        totalLikes,
        totalComments,
        mostLikedPostId: mostLikedPost._id
      }
    });

    await memory.save();
    await memory.populate('originalContent.contentId');

    res.json({
      message: `${year} সালের রিভিউ তৈরি হয়েছে`,
      memory
    });
  } catch (error) {
    console.error('Generate year in review error:', error);
    res.status(500).json({ message: 'বার্ষিক রিভিউ তৈরি করতে সমস্যা হয়েছে' });
  }
});

// Generate friendship anniversary memories
router.get('/friendship-anniversaries', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('friends');
    const today = new Date();
    const memories = [];

    for (const friend of user.friends) {
      // Find first interaction date (could be first message, friend request acceptance, etc.)
      const firstPost = await Post.findOne({
        $or: [
          { author: req.user.userId, tags: friend._id },
          { author: friend._id, tags: req.user.userId }
        ]
      }).sort({ createdAt: 1 });

      if (firstPost) {
        const friendshipStart = firstPost.createdAt;
        const yearsPassed = today.getFullYear() - friendshipStart.getFullYear();
        
        // Check if it's anniversary month and day
        if (today.getMonth() === friendshipStart.getMonth() && 
            today.getDate() === friendshipStart.getDate() && 
            yearsPassed > 0) {
          
          const existingMemory = await Memory.findOne({
            user: req.user.userId,
            memoryType: 'friendship_anniversary',
            'originalContent.contentId': friend._id,
            yearsPassed: yearsPassed
          });

          if (!existingMemory) {
            const memory = new Memory({
              user: req.user.userId,
              title: `${friend.fullName} এর সাথে ${yearsPassed} বছরের বন্ধুত্ব`,
              description: `আজ ${friend.fullName} এর সাথে আপনার ${yearsPassed} বছরের বন্ধুত্বের বার্ষিকী`,
              memoryType: 'friendship_anniversary',
              originalContent: {
                contentType: 'friendship',
                contentId: friend._id,
                contentModel: 'User',
                originalDate: friendshipStart,
                preview: {
                  text: `${yearsPassed} বছরের বন্ধুত্ব`,
                  imageUrl: friend.avatar || ''
                }
              },
              yearsPassed: yearsPassed
            });

            await memory.save();
            memories.push(memory);
          } else {
            memories.push(existingMemory);
          }
        }
      }
    }

    res.json(memories);
  } catch (error) {
    console.error('Get friendship anniversaries error:', error);
    res.status(500).json({ message: 'বন্ধুত্বের বার্ষিকী লোড করতে সমস্যা হয়েছে' });
  }
});

// Delete memory
router.delete('/:memoryId', auth, async (req, res) => {
  try {
    const { memoryId } = req.params;

    const memory = await Memory.findById(memoryId);
    
    if (!memory) {
      return res.status(404).json({ message: 'স্মৃতি পাওয়া যায়নি' });
    }

    if (memory.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই স্মৃতি মুছার অনুমতি নেই' });
    }

    memory.isActive = false;
    await memory.save();

    res.json({ message: 'স্মৃতি মুছে ফেলা হয়েছে' });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ message: 'স্মৃতি মুছতে সমস্যা হয়েছে' });
  }
});

// Set memory privacy
router.put('/:memoryId/privacy', auth, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { isPrivate } = req.body;

    const memory = await Memory.findById(memoryId);
    
    if (!memory) {
      return res.status(404).json({ message: 'স্মৃতি পাওয়া যায়নি' });
    }

    if (memory.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই স্মৃতির প্রাইভেসি পরিবর্তন করার অনুমতি নেই' });
    }

    memory.isPrivate = isPrivate;
    await memory.save();

    res.json({
      message: `স্মৃতি ${isPrivate ? 'প্রাইভেট' : 'পাবলিক'} করা হয়েছে`,
      memory
    });
  } catch (error) {
    console.error('Set memory privacy error:', error);
    res.status(500).json({ message: 'স্মৃতির প্রাইভেসি পরিবর্তন করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
