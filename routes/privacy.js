const express = require('express');
const router = express.Router();
const PrivacySetting = require('../models/PrivacySetting');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user's privacy settings
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let privacySettings = await PrivacySetting.findOne({ user: userId });
    
    // Create default settings if not exists
    if (!privacySettings) {
      privacySettings = new PrivacySetting({ user: userId });
      await privacySettings.save();
    }
    
    res.json({ privacySettings });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Update privacy settings
router.put('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { new: true, upsert: true }
    );
    
    res.json({ 
      message: 'প্রাইভেসি সেটিংস আপডেট করা হয়েছে',
      privacySettings 
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Update post visibility settings
router.put('/posts', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postVisibility } = req.body;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      { $set: { postVisibility } },
      { new: true, upsert: true }
    );
    
    res.json({ 
      message: 'পোস্ট প্রাইভেসি সেটিংস আপডেট করা হয়েছে',
      postVisibility: privacySettings.postVisibility 
    });
  } catch (error) {
    console.error('Update post privacy error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Update profile visibility settings
router.put('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileVisibility } = req.body;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      { $set: { profileVisibility } },
      { new: true, upsert: true }
    );
    
    res.json({ 
      message: 'প্রোফাইল প্রাইভেসি সেটিংস আপডেট করা হয়েছে',
      profileVisibility: privacySettings.profileVisibility 
    });
  } catch (error) {
    console.error('Update profile privacy error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Block user
router.post('/block', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { userToBlockId, reason } = req.body;
    
    if (userId === userToBlockId) {
      return res.status(400).json({ message: 'আপনি নিজেকে ব্লক করতে পারেন না' });
    }
    
    const userToBlock = await User.findById(userToBlockId);
    if (!userToBlock) {
      return res.status(404).json({ message: 'ব্যবহারকারী পাওয়া যায়নি' });
    }
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      {
        $addToSet: {
          blockedUsers: {
            user: userToBlockId,
            blockedAt: new Date(),
            reason: reason || ''
          }
        }
      },
      { new: true, upsert: true }
    );
    
    // Remove from friends if they are friends
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: userToBlockId }
    });
    await User.findByIdAndUpdate(userToBlockId, {
      $pull: { friends: userId }
    });
    
    res.json({ 
      message: 'ব্যবহারকারী ব্লক করা হয়েছে',
      blockedUsers: privacySettings.blockedUsers 
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Unblock user
router.post('/unblock', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { userToUnblockId } = req.body;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      {
        $pull: {
          blockedUsers: { user: userToUnblockId }
        }
      },
      { new: true }
    );
    
    res.json({ 
      message: 'ব্যবহারকারী আনব্লক করা হয়েছে',
      blockedUsers: privacySettings?.blockedUsers || [] 
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Restrict user
router.post('/restrict', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { userToRestrictId } = req.body;
    
    if (userId === userToRestrictId) {
      return res.status(400).json({ message: 'আপনি নিজেকে রেস্ট্রিক্ট করতে পারেন না' });
    }
    
    const userToRestrict = await User.findById(userToRestrictId);
    if (!userToRestrict) {
      return res.status(404).json({ message: 'ব্যবহারকারী পাওয়া যায়নি' });
    }
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      {
        $addToSet: {
          restrictedUsers: {
            user: userToRestrictId,
            restrictedAt: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
    
    res.json({ 
      message: 'ব্যবহারকারী রেস্ট্রিক্ট করা হয়েছে',
      restrictedUsers: privacySettings.restrictedUsers 
    });
  } catch (error) {
    console.error('Restrict user error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Unrestrict user
router.post('/unrestrict', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { userToUnrestrictId } = req.body;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      {
        $pull: {
          restrictedUsers: { user: userToUnrestrictId }
        }
      },
      { new: true }
    );
    
    res.json({ 
      message: 'ব্যবহারকারী আনরেস্ট্রিক্ট করা হয়েছে',
      restrictedUsers: privacySettings?.restrictedUsers || [] 
    });
  } catch (error) {
    console.error('Unrestrict user error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Create custom list
router.post('/custom-lists', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, members } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'তালিকার নাম প্রয়োজন' });
    }
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      {
        $push: {
          customLists: {
            name: name.trim(),
            members: members || [],
            createdAt: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
    
    res.json({ 
      message: 'কাস্টম তালিকা তৈরি করা হয়েছে',
      customLists: privacySettings.customLists 
    });
  } catch (error) {
    console.error('Create custom list error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Update custom list
router.put('/custom-lists/:listId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listId } = req.params;
    const { name, members } = req.body;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { 
        user: userId,
        'customLists._id': listId
      },
      {
        $set: {
          'customLists.$.name': name,
          'customLists.$.members': members
        }
      },
      { new: true }
    );
    
    if (!privacySettings) {
      return res.status(404).json({ message: 'কাস্টম তালিকা পাওয়া যায়নি' });
    }
    
    res.json({ 
      message: 'কাস্টম তালিকা আপডেট করা হয়েছে',
      customLists: privacySettings.customLists 
    });
  } catch (error) {
    console.error('Update custom list error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Delete custom list
router.delete('/custom-lists/:listId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listId } = req.params;
    
    const privacySettings = await PrivacySetting.findOneAndUpdate(
      { user: userId },
      {
        $pull: {
          customLists: { _id: listId }
        }
      },
      { new: true }
    );
    
    res.json({ 
      message: 'কাস্টম তালিকা ডিলিট করা হয়েছে',
      customLists: privacySettings?.customLists || [] 
    });
  } catch (error) {
    console.error('Delete custom list error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Get blocked users
router.get('/blocked', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const privacySettings = await PrivacySetting.findOne({ user: userId })
      .populate('blockedUsers.user', 'name avatar');
    
    res.json({ 
      blockedUsers: privacySettings?.blockedUsers || [] 
    });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Check if user can perform action (helper function)
const checkPermission = async (userId, targetUserId, action) => {
  try {
    // Get target user's privacy settings
    const privacySettings = await PrivacySetting.findOne({ user: targetUserId });
    if (!privacySettings) return true; // Default allow if no settings
    
    // Check if user is blocked
    const isBlocked = privacySettings.blockedUsers.some(
      blocked => blocked.user.toString() === userId
    );
    if (isBlocked) return false;
    
    // Get relationship between users
    const targetUser = await User.findById(targetUserId);
    const isFriend = targetUser.friends.includes(userId);
    
    let setting;
    switch (action) {
      case 'view_profile':
        setting = privacySettings.profileVisibility.basicInfo;
        break;
      case 'send_friend_request':
        setting = privacySettings.friendRequests.whoCanSend;
        break;
      case 'send_message':
        setting = privacySettings.messaging.whoCanMessage;
        break;
      case 'comment':
        setting = privacySettings.postVisibility.allowComments;
        break;
      case 'share':
        setting = privacySettings.postVisibility.allowShares;
        break;
      default:
        return true;
    }
    
    switch (setting) {
      case 'public':
      case 'everyone':
        return true;
      case 'friends':
        return isFriend;
      case 'friends_of_friends':
        if (isFriend) return true;
        // Check if friend of friend
        const mutualFriends = await User.findOne({
          _id: { $in: targetUser.friends },
          friends: userId
        });
        return !!mutualFriends;
      case 'only_me':
      case 'no_one':
        return false;
      default:
        return true;
    }
  } catch (error) {
    console.error('Check permission error:', error);
    return false;
  }
};

module.exports = {
  router,
  checkPermission
};