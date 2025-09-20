const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const router = express.Router();

// Send private message
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, messageType, content, voiceData } = req.body;

    const message = new Message({
      sender: req.userId,
      receiver: receiverId,
      messageType: messageType || 'text',
      content,
      voiceData
    });

    await message.save();
    await message.populate('sender', 'username fullName avatar');
    await message.populate('receiver', 'username fullName avatar');

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send group message
router.post('/send-group', auth, async (req, res) => {
  try {
    const { groupId, messageType, content, voiceData } = req.body;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const message = new Message({
      sender: req.userId,
      group: groupId,
      messageType: messageType || 'text',
      content,
      voiceData
    });

    await message.save();
    await message.populate('sender', 'username fullName avatar');

    // Update group last activity
    group.lastActivity = new Date();
    group.messageCount += 1;
    await group.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation messages
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.userId }
      ],
      isDeleted: false
    })
    .populate('sender', 'username fullName avatar')
    .populate('receiver', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group messages
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if user is member of the group
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await Message.find({
      group: req.params.groupId,
      isDeleted: false
    })
    .populate('sender', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user conversations list
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(req.userId) },
            { receiver: mongoose.Types.ObjectId(req.userId) }
          ],
          group: { $exists: false },
          isDeleted: false
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', mongoose.Types.ObjectId(req.userId)] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', mongoose.Types.ObjectId(req.userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatar: 1,
            isOnline: 1,
            lastSeen: 1
          },
          lastMessage: 1,
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.put('/mark-read/:userId', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// React to message
router.post('/:messageId/react', auth, async (req, res) => {
  try {
    const { reaction } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Remove existing reaction from user
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== req.userId
    );

    // Add new reaction if provided
    if (reaction) {
      message.reactions.push({
        user: req.userId,
        reaction
      });
    }

    await message.save();
    res.json({ message: 'Reaction updated', reactions: message.reactions });
  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;