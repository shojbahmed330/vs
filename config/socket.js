const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class SocketManager {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // Map of userId -> socketId
    this.userSockets = new Map(); // Map of socketId -> userId
    this.rooms = new Map(); // Map of roomId -> Set of socketIds
    this.isInitialized = false;
  }

  initialize(server) {
    try {
      this.io = socketIo(server, {
        cors: {
          origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
        pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
        transports: ['websocket', 'polling'],
        allowEIO3: true
      });

      this.setupMiddleware();
      this.setupEventHandlers();
      this.setupNamespaces();
      
      this.isInitialized = true;
      logger.info('Socket.io server initialized successfully');
      
      return this.io;
    } catch (error) {
      logger.error('Socket.io initialization failed:', error.message);
      throw error;
    }
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          throw new Error('No authentication token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id username fullName avatar isOnline');
        
        if (!user) {
          throw new Error('User not found');
        }

        socket.userId = user._id.toString();
        socket.userInfo = {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar
        };
        
        next();
      } catch (error) {
        logger.logSocketEvent('authentication_failed', socket.id, { error: error.message });
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      socket.rateLimit = {
        messages: [],
        maxMessages: 50, // Max 50 messages per minute
        timeWindow: 60000 // 1 minute
      };
      next();
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      // Message events
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      socket.on('message_read', (data) => this.handleMessageRead(socket, data));
      socket.on('message_delivered', (data) => this.handleMessageDelivered(socket, data));
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
      
      // Conversation events
      socket.on('join_conversation', (data) => this.handleJoinConversation(socket, data));
      socket.on('leave_conversation', (data) => this.handleLeaveConversation(socket, data));
      
      // Notification events
      socket.on('mark_notification_read', (data) => this.handleMarkNotificationRead(socket, data));
      
      // Story events
      socket.on('story_view', (data) => this.handleStoryView(socket, data));
      socket.on('story_reaction', (data) => this.handleStoryReaction(socket, data));
      
      // Post events
      socket.on('post_like', (data) => this.handlePostLike(socket, data));
      socket.on('post_comment', (data) => this.handlePostComment(socket, data));
      
      // Video call events
      socket.on('call_user', (data) => this.handleCallUser(socket, data));
      socket.on('call_accepted', (data) => this.handleCallAccepted(socket, data));
      socket.on('call_rejected', (data) => this.handleCallRejected(socket, data));
      socket.on('call_ended', (data) => this.handleCallEnded(socket, data));
      socket.on('ice_candidate', (data) => this.handleIceCandidate(socket, data));
      socket.on('offer', (data) => this.handleOffer(socket, data));
      socket.on('answer', (data) => this.handleAnswer(socket, data));
      
      // General events
      socket.on('user_status_update', (data) => this.handleUserStatusUpdate(socket, data));
      socket.on('disconnect', () => this.handleDisconnection(socket));
      
      // Error handling
      socket.on('error', (error) => {
        logger.logSocketEvent('socket_error', socket.id, { error: error.message, userId: socket.userId });
      });
    });
  }

  setupNamespaces() {
    // Chat namespace
    const chatNamespace = this.io.of('/chat');
    chatNamespace.use(this.io._parser);
    
    // Notifications namespace
    const notificationsNamespace = this.io.of('/notifications');
    notificationsNamespace.use(this.io._parser);
    
    // Stories namespace
    const storiesNamespace = this.io.of('/stories');
    storiesNamespace.use(this.io._parser);
  }

  async handleConnection(socket) {
    try {
      const userId = socket.userId;
      
      // Add user to online users
      this.onlineUsers.set(userId, socket.id);
      this.userSockets.set(socket.id, userId);
      
      // Update user online status in database
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Join user to their personal room
      socket.join(`user_${userId}`);
      
      // Emit online status to user's friends
      this.broadcastUserStatus(userId, true);
      
      // Send pending notifications
      this.sendPendingNotifications(socket, userId);
      
      logger.logSocketEvent('user_connected', socket.id, { userId, username: socket.userInfo.username });
    } catch (error) {
      logger.logError(error, 'handleConnection');
    }
  }

  async handleDisconnection(socket) {
    try {
      const userId = socket.userId;
      
      if (userId) {
        // Remove user from online users
        this.onlineUsers.delete(userId);
        this.userSockets.delete(socket.id);
        
        // Update user offline status in database
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });
        
        // Broadcast offline status to user's friends
        this.broadcastUserStatus(userId, false);
        
        logger.logSocketEvent('user_disconnected', socket.id, { userId });
      }
    } catch (error) {
      logger.logError(error, 'handleDisconnection');
    }
  }

  async handleSendMessage(socket, data) {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(socket)) {
        socket.emit('rate_limit_exceeded', { message: 'Too many messages sent' });
        return;
      }

      const { recipientId, content, conversationId, replyTo } = data;
      const senderId = socket.userId;
      
      // Create message in database
      const message = new Message({
        sender: senderId,
        recipient: recipientId,
        conversationId: conversationId || Message.generateConversationId(senderId, recipientId),
        content,
        replyTo
      });
      
      await message.save();
      await message.populate('sender', 'username fullName avatar');
      await message.populate('recipient', 'username fullName avatar');
      
      // Send message to recipient if online
      const recipientSocketId = this.onlineUsers.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('new_message', {
          message: message.toObject(),
          conversationId: message.conversationId
        });
        
        // Mark as delivered
        message.isDelivered = true;
        message.deliveredAt = new Date();
        await message.save({ validateBeforeSave: false });
      }
      
      // Send confirmation to sender
      socket.emit('message_sent', {
        message: message.toObject(),
        tempId: data.tempId
      });
      
      // Create notification for recipient
      await this.createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'message',
        title: `New message from ${socket.userInfo.fullName}`,
        message: content.text || 'Sent you a message',
        data: {
          messageId: message._id,
          conversationId: message.conversationId,
          actionUrl: `/chat/${message.conversationId}`
        }
      });
      
      logger.logSocketEvent('message_sent', socket.id, { senderId, recipientId, messageId: message._id });
    } catch (error) {
      logger.logError(error, 'handleSendMessage');
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, conversationId } = data;
      const userId = socket.userId;
      
      if (messageId) {
        // Mark specific message as read
        await Message.findByIdAndUpdate(messageId, {
          isRead: true,
          readAt: new Date()
        });
      } else if (conversationId) {
        // Mark all messages in conversation as read
        await Message.markConversationAsRead(conversationId, userId);
      }
      
      // Notify sender about read receipt
      const messages = await Message.find(
        messageId ? { _id: messageId } : { conversationId, recipient: userId }
      ).populate('sender');
      
      messages.forEach(message => {
        const senderSocketId = this.onlineUsers.get(message.sender._id.toString());
        if (senderSocketId) {
          this.io.to(senderSocketId).emit('message_read', {
            messageId: message._id,
            conversationId: message.conversationId,
            readBy: userId,
            readAt: new Date()
          });
        }
      });
      
      logger.logSocketEvent('message_read', socket.id, { messageId, conversationId, userId });
    } catch (error) {
      logger.logError(error, 'handleMessageRead');
    }
  }

  async handleTypingStart(socket, data) {
    try {
      const { conversationId, recipientId } = data;
      const senderId = socket.userId;
      
      // Notify recipient that user is typing
      const recipientSocketId = this.onlineUsers.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('user_typing', {
          conversationId,
          userId: senderId,
          username: socket.userInfo.username,
          isTyping: true
        });
      }
      
      logger.logSocketEvent('typing_start', socket.id, { conversationId, senderId, recipientId });
    } catch (error) {
      logger.logError(error, 'handleTypingStart');
    }
  }

  async handleTypingStop(socket, data) {
    try {
      const { conversationId, recipientId } = data;
      const senderId = socket.userId;
      
      // Notify recipient that user stopped typing
      const recipientSocketId = this.onlineUsers.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('user_typing', {
          conversationId,
          userId: senderId,
          username: socket.userInfo.username,
          isTyping: false
        });
      }
      
      logger.logSocketEvent('typing_stop', socket.id, { conversationId, senderId, recipientId });
    } catch (error) {
      logger.logError(error, 'handleTypingStop');
    }
  }

  async handleJoinConversation(socket, data) {
    try {
      const { conversationId } = data;
      socket.join(`conversation_${conversationId}`);
      
      logger.logSocketEvent('joined_conversation', socket.id, { conversationId, userId: socket.userId });
    } catch (error) {
      logger.logError(error, 'handleJoinConversation');
    }
  }

  async handleLeaveConversation(socket, data) {
    try {
      const { conversationId } = data;
      socket.leave(`conversation_${conversationId}`);
      
      logger.logSocketEvent('left_conversation', socket.id, { conversationId, userId: socket.userId });
    } catch (error) {
      logger.logError(error, 'handleLeaveConversation');
    }
  }

  async handlePostLike(socket, data) {
    try {
      const { postId, authorId } = data;
      const userId = socket.userId;
      
      // Notify post author if they're online
      const authorSocketId = this.onlineUsers.get(authorId);
      if (authorSocketId && authorId !== userId) {
        this.io.to(authorSocketId).emit('post_liked', {
          postId,
          likedBy: {
            id: userId,
            username: socket.userInfo.username,
            fullName: socket.userInfo.fullName,
            avatar: socket.userInfo.avatar
          }
        });
        
        // Create notification
        await this.createNotification({
          recipient: authorId,
          sender: userId,
          type: 'like',
          title: `${socket.userInfo.fullName} liked your post`,
          message: 'Someone liked your post',
          data: {
            postId,
            actionUrl: `/post/${postId}`
          }
        });
      }
      
      logger.logSocketEvent('post_like', socket.id, { postId, userId, authorId });
    } catch (error) {
      logger.logError(error, 'handlePostLike');
    }
  }

  async handleStoryView(socket, data) {
    try {
      const { storyId, authorId } = data;
      const userId = socket.userId;
      
      // Notify story author if they're online
      const authorSocketId = this.onlineUsers.get(authorId);
      if (authorSocketId && authorId !== userId) {
        this.io.to(authorSocketId).emit('story_viewed', {
          storyId,
          viewedBy: {
            id: userId,
            username: socket.userInfo.username,
            fullName: socket.userInfo.fullName,
            avatar: socket.userInfo.avatar
          }
        });
      }
      
      logger.logSocketEvent('story_view', socket.id, { storyId, userId, authorId });
    } catch (error) {
      logger.logError(error, 'handleStoryView');
    }
  }

  // Video call handlers
  async handleCallUser(socket, data) {
    try {
      const { recipientId, callType, offer } = data;
      const senderId = socket.userId;
      
      const recipientSocketId = this.onlineUsers.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('incoming_call', {
          callerId: senderId,
          callerInfo: socket.userInfo,
          callType,
          offer
        });
      }
      
      logger.logSocketEvent('call_initiated', socket.id, { senderId, recipientId, callType });
    } catch (error) {
      logger.logError(error, 'handleCallUser');
    }
  }

  async handleCallAccepted(socket, data) {
    try {
      const { callerId, answer } = data;
      const recipientId = socket.userId;
      
      const callerSocketId = this.onlineUsers.get(callerId);
      if (callerSocketId) {
        this.io.to(callerSocketId).emit('call_accepted', {
          recipientId,
          recipientInfo: socket.userInfo,
          answer
        });
      }
      
      logger.logSocketEvent('call_accepted', socket.id, { callerId, recipientId });
    } catch (error) {
      logger.logError(error, 'handleCallAccepted');
    }
  }

  // Utility methods
  checkRateLimit(socket) {
    const now = Date.now();
    const { messages, maxMessages, timeWindow } = socket.rateLimit;
    
    // Remove old messages outside time window
    socket.rateLimit.messages = messages.filter(timestamp => now - timestamp < timeWindow);
    
    // Check if under limit
    if (socket.rateLimit.messages.length >= maxMessages) {
      return false;
    }
    
    // Add current message timestamp
    socket.rateLimit.messages.push(now);
    return true;
  }

  async broadcastUserStatus(userId, isOnline) {
    try {
      // Get user's friends/followers
      const user = await User.findById(userId).populate('followers', '_id');
      if (!user) return;
      
      // Broadcast status to online friends
      user.followers.forEach(follower => {
        const followerSocketId = this.onlineUsers.get(follower._id.toString());
        if (followerSocketId) {
          this.io.to(followerSocketId).emit('user_status_changed', {
            userId,
            isOnline,
            lastSeen: new Date()
          });
        }
      });
    } catch (error) {
      logger.logError(error, 'broadcastUserStatus');
    }
  }

  async sendPendingNotifications(socket, userId) {
    try {
      const notifications = await Notification.getUserNotifications(userId, {
        unreadOnly: true,
        limit: 50
      });
      
      if (notifications.length > 0) {
        socket.emit('pending_notifications', notifications);
      }
    } catch (error) {
      logger.logError(error, 'sendPendingNotifications');
    }
  }

  async createNotification(notificationData) {
    try {
      const notification = await Notification.createNotification(notificationData);
      
      // Send real-time notification if recipient is online
      const recipientSocketId = this.onlineUsers.get(notificationData.recipient);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('new_notification', notification);
      }
      
      return notification;
    } catch (error) {
      logger.logError(error, 'createNotification');
    }
  }

  // Public methods
  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getUserSocketId(userId) {
    return this.onlineUsers.get(userId);
  }

  emitToUser(userId, event, data) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  getStats() {
    return {
      connectedUsers: this.onlineUsers.size,
      totalSockets: this.io.sockets.sockets.size,
      rooms: this.rooms.size
    };
  }
}

module.exports = new SocketManager();