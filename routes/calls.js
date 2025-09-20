const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const Call = require('../models/Call');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Agora credentials - should be in environment variables
const AGORA_APP_ID = process.env.AGORA_APP_ID || 'your-agora-app-id';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'your-agora-app-certificate';

// Generate Agora RTC token
router.post('/agora-token', auth, async (req, res) => {
  try {
    const { channelName, uid, role = 'publisher' } = req.body;

    if (!channelName || !uid) {
      return res.status(400).json({ message: 'Channel name and UID are required' });
    }

    // Token expiration time (24 hours)
    const expirationTimeInSeconds = 24 * 60 * 60;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Role mapping
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    res.json({
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid,
      expiresAt: privilegeExpiredTs
    });
  } catch (error) {
    console.error('Agora token generation error:', error);
    res.status(500).json({ message: 'Token generation failed' });
  }
});

// Start a new call
router.post('/start', auth, async (req, res) => {
  try {
    const { targetUserId, callType = 'audio' } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Generate unique channel name
    const channelName = `call_${req.user.userId}_${targetUserId}_${Date.now()}`;

    // Create call record
    const call = new Call({
      caller: req.user.userId,
      receiver: targetUserId,
      channelName,
      callType,
      status: 'calling',
      startTime: new Date()
    });

    await call.save();

    // In a real app, you would send push notification or socket event to target user
    // For now, we'll emit a socket event (assuming socket.io is set up)
    const io = req.app.get('io');
    if (io) {
      io.to(targetUserId).emit('incoming-call', {
        callId: call._id,
        caller: {
          _id: req.user.userId,
          username: req.user.username,
          fullName: req.user.fullName,
          avatar: req.user.avatar
        },
        channelName,
        callType
      });
    }

    res.json({
      callId: call._id,
      channelName,
      callType,
      status: 'calling'
    });
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({ message: 'Failed to start call' });
  }
});

// Accept a call
router.post('/:callId/accept', auth, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (call.receiver.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized to accept this call' });
    }

    if (call.status !== 'calling') {
      return res.status(400).json({ message: 'Call is not in calling state' });
    }

    // Update call status
    call.status = 'active';
    call.acceptTime = new Date();
    await call.save();

    // Notify caller that call was accepted
    const io = req.app.get('io');
    if (io) {
      io.to(call.caller.toString()).emit('call-accepted', {
        callId: call._id,
        channelName: call.channelName
      });
    }

    res.json({
      callId: call._id,
      channelName: call.channelName,
      callType: call.callType,
      status: 'active'
    });
  } catch (error) {
    console.error('Accept call error:', error);
    res.status(500).json({ message: 'Failed to accept call' });
  }
});

// Reject a call
router.post('/:callId/reject', auth, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (call.receiver.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized to reject this call' });
    }

    // Update call status
    call.status = 'rejected';
    call.endTime = new Date();
    await call.save();

    // Notify caller that call was rejected
    const io = req.app.get('io');
    if (io) {
      io.to(call.caller.toString()).emit('call-rejected', {
        callId: call._id
      });
    }

    res.json({
      callId: call._id,
      status: 'rejected'
    });
  } catch (error) {
    console.error('Reject call error:', error);
    res.status(500).json({ message: 'Failed to reject call' });
  }
});

// End a call
router.post('/:callId/end', auth, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    const userId = req.user.userId;
    if (call.caller.toString() !== userId && call.receiver.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to end this call' });
    }

    // Calculate call duration
    const startTime = call.acceptTime || call.startTime;
    const duration = Math.floor((new Date() - startTime) / 1000);

    // Update call status
    call.status = 'ended';
    call.endTime = new Date();
    call.duration = duration;
    await call.save();

    // Notify other party that call was ended
    const otherUserId = call.caller.toString() === userId ? call.receiver : call.caller;
    const io = req.app.get('io');
    if (io) {
      io.to(otherUserId.toString()).emit('call-ended', {
        callId: call._id,
        endedBy: userId
      });
    }

    res.json({
      callId: call._id,
      status: 'ended',
      duration
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ message: 'Failed to end call' });
  }
});

// Get call history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const calls = await Call.find({
      $or: [
        { caller: userId },
        { receiver: userId }
      ]
    })
    .populate('caller', 'username fullName avatar')
    .populate('receiver', 'username fullName avatar')
    .sort({ startTime: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Call.countDocuments({
      $or: [
        { caller: userId },
        { receiver: userId }
      ]
    });

    res.json({
      calls,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ message: 'Failed to get call history' });
  }
});

// Get active calls for user
router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeCalls = await Call.find({
      $or: [
        { caller: userId },
        { receiver: userId }
      ],
      status: { $in: ['calling', 'active'] }
    })
    .populate('caller', 'username fullName avatar')
    .populate('receiver', 'username fullName avatar')
    .sort({ startTime: -1 });

    res.json(activeCalls);
  } catch (error) {
    console.error('Get active calls error:', error);
    res.status(500).json({ message: 'Failed to get active calls' });
  }
});

module.exports = router;
