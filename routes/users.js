const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('friends', 'username fullName avatar isOnline')
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/search/:query', auth, async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    }).select('username fullName avatar isOnline').limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    );

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/friend-request/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends
    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Check if request already sent
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUser._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Add friend request
    targetUser.friendRequests.push({
      from: currentUser._id,
      timestamp: new Date()
    });

    await targetUser.save();

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.post('/accept-friend/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const requester = await User.findById(req.params.userId);

    if (!requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove friend request
    currentUser.friendRequests = currentUser.friendRequests.filter(
      req => req.from.toString() !== requester._id.toString()
    );

    // Add to friends list
    currentUser.friends.push(requester._id);
    requester.friends.push(currentUser._id);

    await currentUser.save();
    await requester.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject friend request
router.delete('/reject-friend/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    currentUser.friendRequests = currentUser.friendRequests.filter(
      req => req.from.toString() !== req.params.userId
    );

    await currentUser.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (currentUser.following.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already following' });
    }

    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow user
router.delete('/unfollow/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    currentUser.following = currentUser.following.filter(
      id => id.toString() !== targetUser._id.toString()
    );
    
    targetUser.followers = targetUser.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friend suggestions
router.get('/suggestions/friends', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const friendIds = currentUser.friends.map(id => id.toString());
    
    // Get friends of friends who are not already friends
    const suggestions = await User.aggregate([
      {
        $match: {
          _id: { $in: currentUser.friends },
          friends: { $not: { $size: 0 } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'friends',
          foreignField: '_id',
          as: 'friendsList'
        }
      },
      {
        $unwind: '$friendsList'
      },
      {
        $match: {
          'friendsList._id': {
            $nin: [...currentUser.friends, currentUser._id]
          }
        }
      },
      {
        $group: {
          _id: '$friendsList._id',
          user: { $first: '$friendsList' },
          mutualCount: { $sum: 1 }
        }
      },
      {
        $sort: { mutualCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: '$user._id',
          username: '$user.username',
          fullName: '$user.fullName',
          avatar: '$user.avatar',
          mutualCount: 1
        }
      }
    ]);

    res.json(suggestions);
  } catch (error) {
    console.error('Friend suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;