const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create group
router.post('/create', auth, async (req, res) => {
  try {
    const { name, description, privacy, category } = req.body;

    const group = new Group({
      name,
      description,
      privacy: privacy || 'public',
      category: category || 'general',
      creator: req.userId,
      admins: [req.userId],
      members: [{
        user: req.userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await group.save();
    await group.populate('creator', 'username fullName avatar');
    await group.populate('members.user', 'username fullName avatar');

    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.userId,
      isActive: true
    })
    .populate('creator', 'username fullName avatar')
    .populate('members.user', 'username fullName avatar')
    .sort({ lastActivity: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group details
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('creator', 'username fullName avatar')
      .populate('admins', 'username fullName avatar')
      .populate('moderators', 'username fullName avatar')
      .populate('members.user', 'username fullName avatar');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user has access to the group
    const isMember = group.members.some(
      member => member.user._id.toString() === req.userId
    );

    if (group.privacy === 'secret' && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search groups
router.get('/search/:query', auth, async (req, res) => {
  try {
    const query = req.params.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const groups = await Group.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      privacy: { $in: ['public', 'closed'] },
      isActive: true
    })
    .populate('creator', 'username fullName avatar')
    .select('name description avatar privacy category members creator')
    .sort({ 'members.length': -1 })
    .skip(skip)
    .limit(limit);

    res.json(groups);
  } catch (error) {
    console.error('Search groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join group
router.post('/:groupId/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    const { message } = req.body;

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if already a member
    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member' });
    }

    if (group.privacy === 'closed' || group.settings.requireApproval) {
      // Add to join requests
      const existingRequest = group.joinRequests.find(
        request => request.user.toString() === req.userId
      );

      if (existingRequest) {
        return res.status(400).json({ message: 'Join request already sent' });
      }

      group.joinRequests.push({
        user: req.userId,
        message: message || '',
        requestedAt: new Date()
      });

      await group.save();
      res.json({ message: 'Join request sent' });
    } else {
      // Directly add to group
      group.members.push({
        user: req.userId,
        role: 'member',
        joinedAt: new Date()
      });

      await group.save();
      res.json({ message: 'Successfully joined the group' });
    }
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave group
router.post('/:groupId/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the creator
    if (group.creator.toString() === req.userId) {
      return res.status(400).json({ message: 'Creator cannot leave the group. Transfer ownership first.' });
    }

    // Remove from members
    group.members = group.members.filter(
      member => member.user.toString() !== req.userId
    );

    // Remove from admins and moderators
    group.admins = group.admins.filter(
      admin => admin.toString() !== req.userId
    );
    
    group.moderators = group.moderators.filter(
      moderator => moderator.toString() !== req.userId
    );

    await group.save();
    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve join request
router.post('/:groupId/approve/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can approve join requests' });
    }

    // Remove from join requests
    group.joinRequests = group.joinRequests.filter(
      request => request.user.toString() !== req.params.userId
    );

    // Add to members
    group.members.push({
      user: req.params.userId,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();
    res.json({ message: 'Join request approved' });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject join request
router.delete('/:groupId/reject/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can reject join requests' });
    }

    // Remove from join requests
    group.joinRequests = group.joinRequests.filter(
      request => request.user.toString() !== req.params.userId
    );

    await group.save();
    res.json({ message: 'Join request rejected' });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group
router.put('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update group' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        group[key] = updates[key];
      }
    });

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete group
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the creator
    if (group.creator.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only group creator can delete the group' });
    }

    group.isActive = false;
    await group.save();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;