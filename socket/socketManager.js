const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Update user online status
    updateUserOnlineStatus(socket.userId, true);

    // Handle typing indicators for messages
    socket.on('typing_start', (data) => {
      socket.to(data.chatId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        chatId: data.chatId
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.chatId).emit('user_stop_typing', {
        userId: socket.userId,
        chatId: data.chatId
      });
    });

    // Handle call events
    socket.on('call_user', (data) => {
      const { receiverId, callType, channelName } = data;
      socket.to(`user_${receiverId}`).emit('incoming_call', {
        callerId: socket.userId,
        callerName: socket.user.name,
        callerAvatar: socket.user.avatar,
        callType,
        channelName
      });
    });

    socket.on('call_accepted', (data) => {
      const { callerId } = data;
      socket.to(`user_${callerId}`).emit('call_accepted', {
        acceptedBy: socket.userId
      });
    });

    socket.on('call_rejected', (data) => {
      const { callerId } = data;
      socket.to(`user_${callerId}`).emit('call_rejected', {
        rejectedBy: socket.userId
      });
    });

    socket.on('call_ended', (data) => {
      const { otherUserId } = data;
      socket.to(`user_${otherUserId}`).emit('call_ended', {
        endedBy: socket.userId
      });
    });

    // Handle live stream events
    socket.on('join_stream_room', (data) => {
      const { streamId } = data;
      socket.join(`stream:${streamId}`);
      console.log(`User ${socket.user.name} joined stream room: ${streamId}`);
    });

    socket.on('leave_stream_room', (data) => {
      const { streamId } = data;
      socket.leave(`stream:${streamId}`);
      console.log(`User ${socket.user.name} left stream room: ${streamId}`);
    });

    socket.on('start_live_stream', (data) => {
      const { streamId, title } = data;
      socket.join(`stream:${streamId}`);
      
      // Notify friends about live stream
      socket.user.friends.forEach(friendId => {
        socket.to(`user_${friendId}`).emit('friend_live_stream', {
          streamerId: socket.userId,
          streamerName: socket.user.name,
          streamerAvatar: socket.user.avatar,
          streamId,
          title
        });
      });
    });

    socket.on('join_live_stream', (data) => {
      const { streamId } = data;
      socket.join(`stream:${streamId}`);
      
      // Notify others in stream about new viewer
      socket.to(`stream:${streamId}`).emit('viewer_joined', {
        viewerId: socket.userId,
        viewerName: socket.user.name,
        viewerAvatar: socket.user.avatar
      });
    });

    socket.on('leave_live_stream', (data) => {
      const { streamId } = data;
      socket.leave(`stream:${streamId}`);
      
      // Notify others in stream about viewer leaving
      socket.to(`stream:${streamId}`).emit('viewer_left', {
        viewerId: socket.userId
      });
    });

    socket.on('end_live_stream', (data) => {
      const { streamId } = data;
      socket.to(`stream:${streamId}`).emit('stream_ended', {
        streamId
      });
      
      // Remove all users from stream room
      io.in(`stream:${streamId}`).socketsLeave(`stream:${streamId}`);
    });

    // Handle live stream chat
    socket.on('stream_chat_message', (data) => {
      const { streamId, message } = data;
      const chatMessage = {
        userId: socket.userId,
        userName: socket.user.name,
        userAvatar: socket.user.avatar,
        message,
        timestamp: new Date(),
        id: Date.now() + Math.random()
      };
      
      // Broadcast to all users in the stream
      io.to(`stream:${streamId}`).emit('stream_chat_message', chatMessage);
    });

    // Handle live stream reactions
    socket.on('stream_reaction', (data) => {
      const { streamId, reaction } = data;
      socket.to(`stream:${streamId}`).emit('stream_reaction', {
        userId: socket.userId,
        userName: socket.user.name,
        userAvatar: socket.user.avatar,
        reaction,
        timestamp: new Date()
      });
    });

    // Handle post real-time updates
    socket.on('post_liked', (data) => {
      const { postOwnerId } = data;
      socket.to(`user_${postOwnerId}`).emit('post_activity', {
        type: 'like',
        ...data
      });
    });

    socket.on('post_commented', (data) => {
      const { postOwnerId } = data;
      socket.to(`user_${postOwnerId}`).emit('post_activity', {
        type: 'comment',
        ...data
      });
    });

    socket.on('post_shared', (data) => {
      const { postOwnerId } = data;
      socket.to(`user_${postOwnerId}`).emit('post_activity', {
        type: 'share',
        ...data
      });
    });

    // Handle story views
    socket.on('story_viewed', (data) => {
      const { storyOwnerId } = data;
      socket.to(`user_${storyOwnerId}`).emit('story_viewed', {
        viewerId: socket.userId,
        viewerName: socket.user.name,
        viewerAvatar: socket.user.avatar,
        ...data
      });
    });

    // Handle friend request real-time updates
    socket.on('friend_request_sent', (data) => {
      const { receiverId } = data;
      socket.to(`user_${receiverId}`).emit('friend_request_received', {
        senderId: socket.userId,
        senderName: socket.user.name,
        senderAvatar: socket.user.avatar,
        ...data
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
      updateUserOnlineStatus(socket.userId, false);
    });
  });

  return io;
};

const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date()
    });
  } catch (error) {
    console.error('Update online status error:', error);
  }
};

const getSocketIO = () => {
  return io;
};

const getUserSocketId = (userId) => {
  if (!io) return null;
  
  const sockets = io.sockets.sockets;
  for (let [socketId, socket] of sockets) {
    if (socket.userId === userId) {
      return socketId;
    }
  }
  return null;
};

const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('new_notification', notification);
  }
};

const sendMessageToUser = (userId, message) => {
  if (io) {
    io.to(`user_${userId}`).emit('new_message', message);
  }
};

const broadcastToFriends = (userId, event, data) => {
  if (io) {
    // Get user's friends and send to each
    User.findById(userId).populate('friends', '_id').then(user => {
      if (user && user.friends) {
        user.friends.forEach(friend => {
          io.to(`user_${friend._id}`).emit(event, data);
        });
      }
    });
  }
};

const broadcastToStreamRoom = (streamId, event, data) => {
  if (io) {
    io.to(`stream:${streamId}`).emit(event, data);
  }
};

const notifyStreamViewers = (streamId, notification) => {
  if (io) {
    io.to(`stream:${streamId}`).emit('stream_notification', notification);
  }
};

module.exports = {
  initializeSocket,
  getSocketIO,
  getUserSocketId,
  sendNotificationToUser,
  sendMessageToUser,
  broadcastToFriends,
  broadcastToStreamRoom,
  notifyStreamViewers
};
