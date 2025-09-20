const express = require('express');
const router = express.Router();
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { getSocketIO } = require('../socket/socketManager');

// Send Friend Request
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    // Check if trying to send request to self
    if (senderId === receiverId) {
      return res.status(400).json({ message: 'আপনি নিজেকে বন্ধু অনুরোধ পাঠাতে পারেন না' });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'ব্যবহারকারী পাওয়া যায়নি' });
    }

    // Check if already friends
    const sender = await User.findById(senderId);
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'আপনারা ইতিমধ্যে বন্ধু' });
    }

    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ],
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'বন্ধু অনুরোধ ইতিমধ্যে পাঠানো হয়েছে' });
    }

    // Create friend request
    const friendRequest = new FriendRequest({
      sender: senderId,
      receiver: receiverId,
      message: message || ''
    });

    await friendRequest.save();

    // Create notification
    const notification = new Notification({
      recipient: receiverId,
      sender: senderId,
      type: 'friend_request',
      entityType: 'user',
      entityId: senderId,
      message: `${sender.name} আপনাকে বন্ধু অনুরোধ পাঠিয়েছেন`
    });

    await notification.save();

    // Send real-time notification
    const io = getSocketIO();
    if (io) {
      io.to(`user_${receiverId}`).emit('new_notification', {
        ...notification.toObject(),
        sender: { _id: sender._id, name: sender.name, avatar: sender.avatar }
      });
    }

    // Populate sender info for response
    await friendRequest.populate('sender', 'name avatar');
    await friendRequest.populate('receiver', 'name avatar');

    res.status(201).json({
      message: 'বন্ধু অনুরোধ পাঠানো হয়েছে',
      friendRequest
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Accept Friend Request
router.put('/accept/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'name avatar');

    if (!friendRequest) {
      return res.status(404).json({ message: 'বন্ধু অনুরোধ পাওয়া যায়নি' });
    }

    // Update friend request status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Add each other as friends
    await User.findByIdAndUpdate(friendRequest.sender._id, {
      $addToSet: { friends: userId }
    });
    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: friendRequest.sender._id }
    });

    // Create notification for sender
    const user = await User.findById(userId);
    const notification = new Notification({
      recipient: friendRequest.sender._id,
      sender: userId,
      type: 'friend_accept',
      entityType: 'user',
      entityId: userId,
      message: `${user.name} আপনার বন্ধু অনুরোধ গ্রহণ করেছেন`
    });

    await notification.save();

    // Send real-time notification
    const io = getSocketIO();
    if (io) {
      io.to(`user_${friendRequest.sender._id}`).emit('new_notification', {
        ...notification.toObject(),
        sender: { _id: user._id, name: user.name, avatar: user.avatar }
      });
    }

    res.json({
      message: 'বন্ধু অনুরোধ গ্রহণ করা হয়েছে',
      friendRequest
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Reject Friend Request
router.put('/reject/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendRequest = await FriendRequest.findOneAndUpdate(
      {
        _id: requestId,
        receiver: userId,
        status: 'pending'
      },
      { status: 'rejected' },
      { new: true }
    ).populate('sender', 'name avatar');

    if (!friendRequest) {
      return res.status(404).json({ message: 'বন্ধু অনুরোধ পাওয়া যায়নি' });
    }

    res.json({
      message: 'বন্ধু অনুরোধ প্রত্যাখ্যান করা হয়েছে',
      friendRequest
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Cancel Friend Request
router.delete('/cancel/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendRequest = await FriendRequest.findOneAndUpdate(
      {
        _id: requestId,
        sender: userId,
        status: 'pending'
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!friendRequest) {
      return res.status(404).json({ message: 'বন্ধু অনুরোধ পাওয়া যায়নি' });
    }

    res.json({
      message: 'বন্ধু অনুরোধ বাতিল করা হয়েছে',
      friendRequest
    });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Get Pending Friend Requests (Received)
router.get('/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const friendRequests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    })
    .populate('sender', 'name avatar bio')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await FriendRequest.countDocuments({
      receiver: userId,
      status: 'pending'
    });

    res.json({
      friendRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Get Sent Friend Requests
router.get('/sent', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const friendRequests = await FriendRequest.find({
      sender: userId,
      status: 'pending'
    })
    .populate('receiver', 'name avatar bio')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await FriendRequest.countDocuments({
      sender: userId,
      status: 'pending'
    });

    res.json({
      friendRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Get Friend Suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const user = await User.findById(userId).populate('friends', '_id');
    const friendIds = user.friends.map(friend => friend._id);
    
    // Get users who are friends of friends but not already friends
    const friendsOfFriends = await User.aggregate([
      {
        $match: {
          _id: { $in: friendIds }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'friends',
          foreignField: '_id',
          as: 'friendsOfFriend'
        }
      },
      {
        $unwind: '$friendsOfFriend'
      },
      {
        $match: {
          'friendsOfFriend._id': { 
            $nin: [...friendIds, userId] 
          }
        }
      },
      {
        $group: {
          _id: '$friendsOfFriend._id',
          mutualFriendsCount: { $sum: 1 },
          user: { $first: '$friendsOfFriend' }
        }
      },
      {
        $sort: { mutualFriendsCount: -1 }
      },
      {
        $limit: limit
      }
    ]);

    // Check if friend requests already sent/received
    const suggestedUserIds = friendsOfFriends.map(item => item._id);
    const existingRequests = await FriendRequest.find({
      $or: [
        { sender: userId, receiver: { $in: suggestedUserIds } },
        { sender: { $in: suggestedUserIds }, receiver: userId }
      ],
      status: 'pending'
    });

    const requestedUserIds = existingRequests.map(req => 
      req.sender.toString() === userId ? req.receiver.toString() : req.sender.toString()
    );

    const suggestions = friendsOfFriends
      .filter(item => !requestedUserIds.includes(item._id.toString()))
      .map(item => ({
        ...item.user,
        mutualFriendsCount: item.mutualFriendsCount
      }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Get friend suggestions error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Remove Friend
router.delete('/remove/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // Remove from both users' friend lists
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId }
    });
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId }
    });

    res.json({ message: 'বন্ধু তালিকা থেকে সরানো হয়েছে' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

// Get Friends List
router.get('/list', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    
    let query = {
      _id: { $in: user.friends }
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const friends = await User.find(query)
      .select('name avatar bio isOnline lastSeen')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      friends,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get friends list error:', error);
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
});

module.exports = router;