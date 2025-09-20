const express = require('express');
const router = express.Router();
const LiveStream = require('../models/LiveStream');
const auth = require('../middleware/auth');
const { RtcTokenBuilder, RtmTokenBuilder, RtcRole } = require('agora-access-token');

// Get Agora credentials from environment
const agoraAppId = process.env.AGORA_APP_ID;
const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

// Helper function to generate Agora token
const generateAgoraToken = (channelName, uid, role = RtcRole.PUBLISHER) => {
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  
  return RtcTokenBuilder.buildTokenWithUid(
    agoraAppId,
    agoraAppCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
};

// Get all live streams (public and friends based on privacy)
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    // For now, showing all public streams and user's own streams
    query.$or = [
      { privacy: 'public' },
      { streamer: req.user.id }
    ];
    
    const streams = await LiveStream.find(query)
      .populate('streamer', 'name avatar')
      .populate('comments.user', 'name avatar')
      .sort({ actualStartTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await LiveStream.countDocuments(query);
    
    res.json({
      streams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    res.status(500).json({ error: 'Failed to fetch live streams' });
  }
});

// Get stream by ID
router.get('/:streamId', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId)
      .populate('streamer', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('currentViewers.user', 'name avatar');
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Check privacy permissions
    if (stream.privacy === 'private' && stream.streamer._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(stream);
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ error: 'Failed to fetch stream' });
  }
});

// Create a new live stream
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, scheduledStartTime, privacy = 'public', tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Generate unique channel ID
    const channelId = `stream_${req.user.id}_${Date.now()}`;
    
    // Generate Agora token for the streamer
    const agoraToken = generateAgoraToken(channelId, parseInt(req.user.id.slice(-6), 16), RtcRole.PUBLISHER);
    
    const streamData = {
      streamer: req.user.id,
      title,
      description,
      agoraChannelId: channelId,
      agoraToken,
      privacy,
      tags: tags || []
    };
    
    if (scheduledStartTime) {
      streamData.scheduledStartTime = new Date(scheduledStartTime);
    }
    
    const stream = new LiveStream(streamData);
    await stream.save();
    
    await stream.populate('streamer', 'name avatar');
    
    res.status(201).json(stream);
  } catch (error) {
    console.error('Error creating live stream:', error);
    res.status(500).json({ error: 'Failed to create live stream' });
  }
});

// Update stream
router.put('/:streamId', auth, async (req, res) => {
  try {
    const { title, description, privacy, tags } = req.body;
    
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this stream' });
    }
    
    if (stream.status === 'ended') {
      return res.status(400).json({ error: 'Cannot update ended stream' });
    }
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (privacy) updateData.privacy = privacy;
    if (tags) updateData.tags = tags;
    
    const updatedStream = await LiveStream.findByIdAndUpdate(
      req.params.streamId,
      updateData,
      { new: true }
    ).populate('streamer', 'name avatar');
    
    res.json(updatedStream);
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ error: 'Failed to update stream' });
  }
});

// Start stream
router.post('/:streamId/start', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to start this stream' });
    }
    
    if (stream.status === 'live') {
      return res.status(400).json({ error: 'Stream is already live' });
    }
    
    if (stream.status === 'ended') {
      return res.status(400).json({ error: 'Cannot restart ended stream' });
    }
    
    await stream.startStream();
    await stream.populate('streamer', 'name avatar');
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('stream:started', {
        streamId: stream._id,
        streamer: stream.streamer,
        title: stream.title
      });
    }
    
    res.json(stream);
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// End stream
router.post('/:streamId/end', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to end this stream' });
    }
    
    if (stream.status !== 'live') {
      return res.status(400).json({ error: 'Stream is not currently live' });
    }
    
    await stream.endStream();
    await stream.populate('streamer', 'name avatar');
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('stream:ended', {
        streamId: stream._id,
        streamer: stream.streamer
      });
    }
    
    res.json(stream);
  } catch (error) {
    console.error('Error ending stream:', error);
    res.status(500).json({ error: 'Failed to end stream' });
  }
});

// Join stream as viewer
router.post('/:streamId/join', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.status !== 'live') {
      return res.status(400).json({ error: 'Stream is not currently live' });
    }
    
    // Check privacy permissions
    if (stream.privacy === 'private' && stream.streamer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate viewer token
    const viewerToken = generateAgoraToken(
      stream.agoraChannelId, 
      parseInt(req.user.id.slice(-6), 16), 
      RtcRole.AUDIENCE
    );
    
    await stream.addViewer(req.user.id);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`stream:${stream._id}`).emit('viewer:joined', {
        streamId: stream._id,
        viewerCount: stream.currentViewers.length
      });
    }
    
    res.json({
      channelId: stream.agoraChannelId,
      token: viewerToken,
      uid: parseInt(req.user.id.slice(-6), 16),
      appId: agoraAppId
    });
  } catch (error) {
    console.error('Error joining stream:', error);
    res.status(500).json({ error: 'Failed to join stream' });
  }
});

// Leave stream
router.post('/:streamId/leave', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    await stream.removeViewer(req.user.id);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`stream:${stream._id}`).emit('viewer:left', {
        streamId: stream._id,
        viewerCount: stream.currentViewers.length
      });
    }
    
    res.json({ message: 'Left stream successfully' });
  } catch (error) {
    console.error('Error leaving stream:', error);
    res.status(500).json({ error: 'Failed to leave stream' });
  }
});

// Add comment to stream
router.post('/:streamId/comment', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Comment message is required' });
    }
    
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    await stream.addComment(req.user.id, message.trim());
    await stream.populate('comments.user', 'name avatar');
    
    const newComment = stream.comments[stream.comments.length - 1];
    
    // Emit socket event for real-time comments
    const io = req.app.get('io');
    if (io) {
      io.to(`stream:${stream._id}`).emit('comment:new', {
        streamId: stream._id,
        comment: newComment
      });
    }
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Toggle like on stream
router.post('/:streamId/like', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    await stream.toggleLike(req.user.id);
    
    const isLiked = stream.likes.some(like => like.user.toString() === req.user.id);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`stream:${stream._id}`).emit('like:toggled', {
        streamId: stream._id,
        likeCount: stream.likes.length,
        isLiked
      });
    }
    
    res.json({
      message: isLiked ? 'Liked stream' : 'Unliked stream',
      likeCount: stream.likes.length,
      isLiked
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Get stream analytics (for streamer)
router.get('/:streamId/analytics', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view analytics' });
    }
    
    const analytics = {
      totalViews: stream.viewCount,
      maxConcurrentViewers: stream.maxViewers,
      currentViewers: stream.currentViewers.length,
      totalComments: stream.comments.length,
      totalLikes: stream.likes.length,
      duration: stream.duration,
      status: stream.status
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Delete stream
router.delete('/:streamId', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this stream' });
    }
    
    if (stream.status === 'live') {
      return res.status(400).json({ error: 'Cannot delete a live stream. End it first.' });
    }
    
    await LiveStream.findByIdAndDelete(req.params.streamId);
    
    res.json({ message: 'Stream deleted successfully' });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: 'Failed to delete stream' });
  }
});

module.exports = router;
