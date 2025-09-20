import io from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.listeners = new Map();
    this.userId = null;
    this.token = null;
  }

  // Initialize socket connection
  connect(token, userId) {
    try {
      if (this.socket && this.socket.connected) {
        console.log('Socket already connected');
        return this.socket;
      }

      this.token = token;
      this.userId = userId;

      const socketUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
      
      this.socket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: 1e6 // 1MB
      });

      this.setupEventListeners();
      
      console.log('Socket connection initiated');
      return this.socket;
    } catch (error) {
      console.error('Socket connection failed:', error);
      throw error;
    }
  }

  // Setup basic event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Clear reconnection timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Emit custom event
      this.emit('socket_connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      // Emit custom event
      this.emit('socket_disconnected', { reason });
      
      // Handle reconnection
      if (reason === 'io server disconnect') {
        // Server disconnected, manually reconnect
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.isConnected = false;
      
      // Emit custom event
      this.emit('socket_error', { error: error.message });
      
      // Handle reconnection
      this.handleReconnection();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Emit custom event
      this.emit('socket_reconnected', { attempts: attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error.message);
      this.reconnectAttempts++;
      
      // Emit custom event
      this.emit('socket_reconnect_error', { 
        error: error.message, 
        attempts: this.reconnectAttempts 
      });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after max attempts');
      this.isConnected = false;
      
      // Emit custom event
      this.emit('socket_reconnect_failed', {});
    });

    // Message events
    this.socket.on('new_message', (data) => {
      console.log('New message received:', data);
      this.emit('new_message', data);
    });

    this.socket.on('message_sent', (data) => {
      console.log('Message sent confirmation:', data);
      this.emit('message_sent', data);
    });

    this.socket.on('message_delivered', (data) => {
      console.log('Message delivered:', data);
      this.emit('message_delivered', data);
    });

    this.socket.on('message_read', (data) => {
      console.log('Message read:', data);
      this.emit('message_read', data);
    });

    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    // Notification events
    this.socket.on('new_notification', (data) => {
      console.log('New notification:', data);
      this.emit('new_notification', data);
    });

    this.socket.on('pending_notifications', (data) => {
      console.log('Pending notifications:', data);
      this.emit('pending_notifications', data);
    });

    // User status events
    this.socket.on('user_status_changed', (data) => {
      this.emit('user_status_changed', data);
    });

    // Post events
    this.socket.on('post_liked', (data) => {
      this.emit('post_liked', data);
    });

    this.socket.on('post_commented', (data) => {
      this.emit('post_commented', data);
    });

    // Story events
    this.socket.on('story_viewed', (data) => {
      this.emit('story_viewed', data);
    });

    this.socket.on('story_reaction', (data) => {
      this.emit('story_reaction', data);
    });

    // Call events
    this.socket.on('incoming_call', (data) => {
      this.emit('incoming_call', data);
    });

    this.socket.on('call_accepted', (data) => {
      this.emit('call_accepted', data);
    });

    this.socket.on('call_rejected', (data) => {
      this.emit('call_rejected', data);
    });

    this.socket.on('call_ended', (data) => {
      this.emit('call_ended', data);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket_error', { error });
    });

    this.socket.on('rate_limit_exceeded', (data) => {
      console.warn('Rate limit exceeded:', data);
      this.emit('rate_limit_exceeded', data);
    });
  }

  // Handle reconnection with exponential backoff
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Attempting to reconnect in ${delay}ms...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.token && this.userId) {
        this.connect(this.token, this.userId);
      }
    }, delay);
  }

  // Send message
  sendMessage(recipientId, content, options = {}) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }

    const messageData = {
      recipientId,
      content,
      tempId: options.tempId || Date.now(),
      conversationId: options.conversationId,
      replyTo: options.replyTo
    };

    this.socket.emit('send_message', messageData);
    return messageData.tempId;
  }

  // Mark message as read
  markMessageAsRead(messageId, conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('message_read', {
      messageId,
      conversationId
    });
  }

  // Start typing indicator
  startTyping(conversationId, recipientId) {
    if (!this.isConnected) return;
    
    this.socket.emit('typing_start', {
      conversationId,
      recipientId
    });
  }

  // Stop typing indicator
  stopTyping(conversationId, recipientId) {
    if (!this.isConnected) return;
    
    this.socket.emit('typing_stop', {
      conversationId,
      recipientId
    });
  }

  // Join conversation
  joinConversation(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('join_conversation', {
      conversationId
    });
  }

  // Leave conversation
  leaveConversation(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('leave_conversation', {
      conversationId
    });
  }

  // Like post
  likePost(postId, authorId) {
    if (!this.isConnected) return;
    
    this.socket.emit('post_like', {
      postId,
      authorId
    });
  }

  // View story
  viewStory(storyId, authorId) {
    if (!this.isConnected) return;
    
    this.socket.emit('story_view', {
      storyId,
      authorId
    });
  }

  // React to story
  reactToStory(storyId, reaction) {
    if (!this.isConnected) return;
    
    this.socket.emit('story_reaction', {
      storyId,
      reaction
    });
  }

  // Update user status
  updateUserStatus(status) {
    if (!this.isConnected) return;
    
    this.socket.emit('user_status_update', {
      status
    });
  }

  // Call user
  callUser(recipientId, callType, offer) {
    if (!this.isConnected) return;
    
    this.socket.emit('call_user', {
      recipientId,
      callType,
      offer
    });
  }

  // Accept call
  acceptCall(callerId, answer) {
    if (!this.isConnected) return;
    
    this.socket.emit('call_accepted', {
      callerId,
      answer
    });
  }

  // Reject call
  rejectCall(callerId) {
    if (!this.isConnected) return;
    
    this.socket.emit('call_rejected', {
      callerId
    });
  }

  // End call
  endCall(userId) {
    if (!this.isConnected) return;
    
    this.socket.emit('call_ended', {
      userId
    });
  }

  // Add event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Also add to socket if connected
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }

    // Also remove from socket if connected
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit custom events
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
      this.token = null;
    }

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clear listeners
    this.listeners.clear();
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Check if connected
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Reconnect manually
  reconnect() {
    if (this.token && this.userId) {
      this.disconnect();
      this.connect(this.token, this.userId);
    } else {
      console.error('Cannot reconnect: missing token or userId');
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager;