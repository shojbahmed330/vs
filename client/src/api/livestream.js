import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: `${API_URL}/livestream`,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get all live streams
export const getLiveStreams = async (params = {}) => {
  try {
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get stream by ID
export const getStreamById = async (streamId) => {
  try {
    const response = await api.get(`/${streamId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create a new live stream
export const createLiveStream = async (streamData) => {
  try {
    const response = await api.post('/', streamData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update stream
export const updateStream = async (streamId, updateData) => {
  try {
    const response = await api.put(`/${streamId}`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Start stream
export const startStream = async (streamId) => {
  try {
    const response = await api.post(`/${streamId}/start`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// End stream
export const endStream = async (streamId) => {
  try {
    const response = await api.post(`/${streamId}/end`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Join stream as viewer
export const joinStream = async (streamId) => {
  try {
    const response = await api.post(`/${streamId}/join`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Leave stream
export const leaveStream = async (streamId) => {
  try {
    const response = await api.post(`/${streamId}/leave`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Add comment to stream
export const addStreamComment = async (streamId, message) => {
  try {
    const response = await api.post(`/${streamId}/comment`, { message });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Toggle like on stream
export const toggleStreamLike = async (streamId) => {
  try {
    const response = await api.post(`/${streamId}/like`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get stream analytics
export const getStreamAnalytics = async (streamId) => {
  try {
    const response = await api.get(`/${streamId}/analytics`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete stream
export const deleteStream = async (streamId) => {
  try {
    const response = await api.delete(`/${streamId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default {
  getLiveStreams,
  getStreamById,
  createLiveStream,
  updateStream,
  startStream,
  endStream,
  joinStream,
  leaveStream,
  addStreamComment,
  toggleStreamLike,
  getStreamAnalytics,
  deleteStream
};
