import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Base configuration
const getBaseURL = async () => {
  try {
    const storedURL = await AsyncStorage.getItem('serverURL');
    return storedURL || 'http://localhost:5000'; // Default server URL
  } catch (error) {
    return 'http://localhost:5000';
  }
};

// Create axios instance
const createAPIInstance = async () => {
  const baseURL = await getBaseURL();
  
  const api = axios.create({
    baseURL: `${baseURL}/api`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  api.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  api.interceptors.response.use(
    (response) => {
      return response.data;
    },
    async (error) => {
      if (error.response?.status === 401) {
        // Token expired, logout user
        await AsyncStorage.multiRemove(['authToken', 'user']);
        // Navigate to login screen
      }
      return Promise.reject(error.response?.data || error.message);
    }
  );

  return api;
};

// Authentication API
export const authAPI = {
  login: async (email, password) => {
    const api = await createAPIInstance();
    return api.post('/auth/login', { email, password });
  },
  
  register: async (userData) => {
    const api = await createAPIInstance();
    return api.post('/auth/register', userData);
  },
  
  verifyToken: async (token) => {
    const api = await createAPIInstance();
    return api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  updateFCMToken: async (token, fcmToken) => {
    const api = await createAPIInstance();
    return api.post('/auth/fcm-token', { fcmToken }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  removeFCMToken: async (token) => {
    const api = await createAPIInstance();
    return api.delete('/auth/fcm-token', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  forgotPassword: async (email) => {
    const api = await createAPIInstance();
    return api.post('/auth/forgot-password', { email });
  },
  
  resetPassword: async (token, newPassword) => {
    const api = await createAPIInstance();
    return api.post('/auth/reset-password', { token, newPassword });
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const api = await createAPIInstance();
    return api.get('/users/profile');
  },
  
  updateProfile: async (profileData) => {
    const api = await createAPIInstance();
    return api.put('/users/profile', profileData);
  },
  
  uploadAvatar: async (imageData) => {
    const api = await createAPIInstance();
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageData.uri,
      type: imageData.type,
      name: imageData.fileName || 'avatar.jpg',
    });
    
    return api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  searchUsers: async (query) => {
    const api = await createAPIInstance();
    return api.get(`/users/search?q=${encodeURIComponent(query)}`);
  },
  
  getUserById: async (userId) => {
    const api = await createAPIInstance();
    return api.get(`/users/${userId}`);
  },
};

// Posts API
export const postsAPI = {
  getFeed: async (page = 1, limit = 10) => {
    const api = await createAPIInstance();
    return api.get(`/posts/feed?page=${page}&limit=${limit}`);
  },
  
  createPost: async (postData) => {
    const api = await createAPIInstance();
    const formData = new FormData();
    
    // Add text content
    if (postData.content) {
      formData.append('content', postData.content);
    }
    
    // Add media files
    if (postData.media && postData.media.length > 0) {
      postData.media.forEach((file, index) => {
        formData.append('media', {
          uri: file.uri,
          type: file.type,
          name: file.fileName || `media_${index}.jpg`,
        });
      });
    }
    
    return api.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  likePost: async (postId) => {
    const api = await createAPIInstance();
    return api.post(`/posts/${postId}/like`);
  },
  
  commentOnPost: async (postId, comment) => {
    const api = await createAPIInstance();
    return api.post(`/posts/${postId}/comments`, { comment });
  },
  
  getPostComments: async (postId, page = 1) => {
    const api = await createAPIInstance();
    return api.get(`/posts/${postId}/comments?page=${page}`);
  },
  
  deletePost: async (postId) => {
    const api = await createAPIInstance();
    return api.delete(`/posts/${postId}`);
  },
};

// Messages API
export const messagesAPI = {
  getConversations: async () => {
    const api = await createAPIInstance();
    return api.get('/messages/conversations');
  },
  
  getMessages: async (conversationId, page = 1) => {
    const api = await createAPIInstance();
    return api.get(`/messages/${conversationId}?page=${page}`);
  },
  
  sendMessage: async (conversationId, messageData) => {
    const api = await createAPIInstance();
    
    if (messageData.media) {
      const formData = new FormData();
      formData.append('message', messageData.message || '');
      formData.append('media', {
        uri: messageData.media.uri,
        type: messageData.media.type,
        name: messageData.media.fileName || 'media.jpg',
      });
      
      return api.post(`/messages/${conversationId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      return api.post(`/messages/${conversationId}`, {
        message: messageData.message,
      });
    }
  },
  
  markAsRead: async (conversationId) => {
    const api = await createAPIInstance();
    return api.put(`/messages/${conversationId}/read`);
  },
};

// Notifications API
export const notificationAPI = {
  getNotifications: async (page = 1) => {
    const api = await createAPIInstance();
    return api.get(`/notifications?page=${page}`);
  },
  
  markAsRead: async (token, notificationId) => {
    const api = await createAPIInstance();
    return api.put(`/notifications/${notificationId}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  markAllAsRead: async () => {
    const api = await createAPIInstance();
    return api.put('/notifications/read-all');
  },
  
  registerFCMToken: async (token, fcmToken) => {
    const api = await createAPIInstance();
    return api.post('/notifications/fcm-token', { fcmToken }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getUnreadCount: async () => {
    const api = await createAPIInstance();
    return api.get('/notifications/unread-count');
  },
};

// Friends API
export const friendsAPI = {
  getFriends: async () => {
    const api = await createAPIInstance();
    return api.get('/friends');
  },
  
  getFriendRequests: async () => {
    const api = await createAPIInstance();
    return api.get('/friends/requests');
  },
  
  sendFriendRequest: async (userId) => {
    const api = await createAPIInstance();
    return api.post('/friends/request', { userId });
  },
  
  acceptFriendRequest: async (requestId) => {
    const api = await createAPIInstance();
    return api.put(`/friends/requests/${requestId}/accept`);
  },
  
  rejectFriendRequest: async (requestId) => {
    const api = await createAPIInstance();
    return api.put(`/friends/requests/${requestId}/reject`);
  },
  
  removeFriend: async (friendId) => {
    const api = await createAPIInstance();
    return api.delete(`/friends/${friendId}`);
  },
};

// Live Stream API
export const liveStreamAPI = {
  getActiveStreams: async () => {
    const api = await createAPIInstance();
    return api.get('/livestream/active');
  },
  
  startStream: async (streamData) => {
    const api = await createAPIInstance();
    return api.post('/livestream/start', streamData);
  },
  
  endStream: async (streamId) => {
    const api = await createAPIInstance();
    return api.post(`/livestream/${streamId}/end`);
  },
  
  joinStream: async (streamId) => {
    const api = await createAPIInstance();
    return api.post(`/livestream/${streamId}/join`);
  },
  
  leaveStream: async (streamId) => {
    const api = await createAPIInstance();
    return api.post(`/livestream/${streamId}/leave`);
  },
};

export default {
  auth: authAPI,
  user: userAPI,
  posts: postsAPI,
  messages: messagesAPI,
  notifications: notificationAPI,
  friends: friendsAPI,
  liveStream: liveStreamAPI,
};