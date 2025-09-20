import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const adminAPI = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
adminAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const admin = {
  // Dashboard
  getDashboard: () => adminAPI.get('/dashboard'),

  // Analytics
  getUserAnalytics: (period = '7d', startDate, endDate) => {
    const params = { period };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return adminAPI.get('/users', { params });
  },

  getContentAnalytics: (period = '7d') => {
    return adminAPI.get('/content', { params: { period } });
  },

  getPageAnalytics: (period = '7d') => {
    return adminAPI.get('/pages', { params: { period } });
  },

  getLivestreamAnalytics: (period = '7d') => {
    return adminAPI.get('/livestreams', { params: { period } });
  },

  // User Management
  getUsers: (filters = {}) => {
    return adminAPI.get('/users/list', { params: filters });
  },

  updateUserRole: (userId, roleData) => {
    return adminAPI.put(`/users/${userId}/role`, roleData);
  },

  // Analytics Generation
  generateAnalytics: (type) => {
    return adminAPI.post(`/generate/${type}`);
  },

  // Export data
  exportData: (type, format = 'csv', filters = {}) => {
    return adminAPI.get(`/export/${type}`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
  },

  // System Health
  getSystemHealth: () => adminAPI.get('/system/health'),

  // User Actions
  suspendUser: (userId, reason) => {
    return adminAPI.put(`/users/${userId}/suspend`, { reason });
  },

  unsuspendUser: (userId) => {
    return adminAPI.put(`/users/${userId}/unsuspend`);
  },

  deleteUser: (userId, reason) => {
    return adminAPI.delete(`/users/${userId}`, { data: { reason } });
  },

  // Content Moderation
  getReportedContent: (filters = {}) => {
    return adminAPI.get('/content/reported', { params: filters });
  },

  moderateContent: (contentId, action, reason) => {
    return adminAPI.put(`/content/${contentId}/moderate`, { action, reason });
  },

  // Business Account Management
  getBusinessVerificationRequests: (filters = {}) => {
    return adminAPI.get('/business/verification-requests', { params: filters });
  },

  approveBusinessVerification: (userId) => {
    return adminAPI.put(`/business/${userId}/approve`);
  },

  rejectBusinessVerification: (userId, reason) => {
    return adminAPI.put(`/business/${userId}/reject`, { reason });
  },

  // Page Management
  getPageVerificationRequests: (filters = {}) => {
    return adminAPI.get('/pages/verification-requests', { params: filters });
  },

  approvePageVerification: (pageId) => {
    return adminAPI.put(`/pages/${pageId}/verify`);
  },

  rejectPageVerification: (pageId, reason) => {
    return adminAPI.put(`/pages/${pageId}/reject-verification`, { reason });
  },

  // Financial Analytics
  getFinancialAnalytics: (period = '30d') => {
    return adminAPI.get('/financial', { params: { period } });
  },

  // Settings
  getSystemSettings: () => adminAPI.get('/settings'),

  updateSystemSettings: (settings) => {
    return adminAPI.put('/settings', settings);
  },

  // Bulk Actions
  bulkUserAction: (userIds, action, data = {}) => {
    return adminAPI.post('/users/bulk-action', {
      userIds,
      action,
      ...data
    });
  },

  bulkContentAction: (contentIds, action, data = {}) => {
    return adminAPI.post('/content/bulk-action', {
      contentIds,
      action,
      ...data
    });
  },

  // Reports
  generateReport: (reportType, filters = {}) => {
    return adminAPI.post('/reports/generate', {
      reportType,
      filters
    });
  },

  getReports: (filters = {}) => {
    return adminAPI.get('/reports', { params: filters });
  },

  downloadReport: (reportId) => {
    return adminAPI.get(`/reports/${reportId}/download`, {
      responseType: 'blob'
    });
  }
};

export default admin;
