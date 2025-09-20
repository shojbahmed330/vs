import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const businessAPI = axios.create({
  baseURL: `${API_BASE_URL}/business`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
businessAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
businessAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const business = {
  // Account Management
  upgrade: (formData) => {
    return businessAPI.post('/upgrade', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateAccount: (formData) => {
    return businessAPI.put('/update', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Dashboard
  getDashboard: () => businessAPI.get('/dashboard'),

  // Analytics
  getAnalytics: (period = '7d') => {
    return businessAPI.get('/analytics', { params: { period } });
  },

  // Page Management
  getPages: (filters = {}) => {
    return businessAPI.get('/pages', { params: filters });
  },

  getPageAnalytics: (pageId, period = '7d') => {
    return businessAPI.get(`/pages/${pageId}/analytics`, { 
      params: { period } 
    });
  },

  // Verification
  getVerificationStatus: () => businessAPI.get('/verification-status'),

  // Insights
  getInsights: () => businessAPI.get('/insights'),

  // Advanced Analytics
  getDetailedAnalytics: (filters = {}) => {
    return businessAPI.get('/analytics/detailed', { params: filters });
  },

  getCompetitorAnalysis: (category) => {
    return businessAPI.get('/analytics/competitors', {
      params: { category }
    });
  },

  getAudienceInsights: (pageId) => {
    return businessAPI.get(`/analytics/audience/${pageId}`);
  },

  // Performance Tracking
  getPerformanceMetrics: (pageId, period = '30d') => {
    return businessAPI.get(`/performance/${pageId}`, {
      params: { period }
    });
  },

  getEngagementRate: (pageId, period = '7d') => {
    return businessAPI.get(`/engagement/${pageId}`, {
      params: { period }
    });
  },

  // Content Performance
  getTopPerformingPosts: (pageId, limit = 10) => {
    return businessAPI.get(`/content/top-posts/${pageId}`, {
      params: { limit }
    });
  },

  getContentAnalytics: (pageId, period = '30d') => {
    return businessAPI.get(`/content/analytics/${pageId}`, {
      params: { period }
    });
  },

  // Customer Demographics
  getCustomerDemographics: (pageId) => {
    return businessAPI.get(`/demographics/${pageId}`);
  },

  getGeographicData: (pageId) => {
    return businessAPI.get(`/geographic/${pageId}`);
  },

  // Recommendations
  getGrowthRecommendations: (pageId) => {
    return businessAPI.get(`/recommendations/growth/${pageId}`);
  },

  getContentRecommendations: (pageId) => {
    return businessAPI.get(`/recommendations/content/${pageId}`);
  },

  // Campaign Management
  getCampaigns: (filters = {}) => {
    return businessAPI.get('/campaigns', { params: filters });
  },

  createCampaign: (campaignData) => {
    return businessAPI.post('/campaigns', campaignData);
  },

  updateCampaign: (campaignId, campaignData) => {
    return businessAPI.put(`/campaigns/${campaignId}`, campaignData);
  },

  deleteCampaign: (campaignId) => {
    return businessAPI.delete(`/campaigns/${campaignId}`);
  },

  getCampaignAnalytics: (campaignId) => {
    return businessAPI.get(`/campaigns/${campaignId}/analytics`);
  },

  // Lead Management
  getLeads: (filters = {}) => {
    return businessAPI.get('/leads', { params: filters });
  },

  updateLeadStatus: (leadId, status) => {
    return businessAPI.put(`/leads/${leadId}/status`, { status });
  },

  exportLeads: (filters = {}) => {
    return businessAPI.get('/leads/export', {
      params: filters,
      responseType: 'blob'
    });
  },

  // Customer Support
  getSupportTickets: (filters = {}) => {
    return businessAPI.get('/support/tickets', { params: filters });
  },

  createSupportTicket: (ticketData) => {
    return businessAPI.post('/support/tickets', ticketData);
  },

  updateTicketStatus: (ticketId, status) => {
    return businessAPI.put(`/support/tickets/${ticketId}/status`, { status });
  },

  // Financial Analytics
  getRevenue: (period = '30d') => {
    return businessAPI.get('/financial/revenue', { params: { period } });
  },

  getExpenses: (period = '30d') => {
    return businessAPI.get('/financial/expenses', { params: { period } });
  },

  getProfitLoss: (period = '30d') => {
    return businessAPI.get('/financial/profit-loss', { params: { period } });
  },

  // Integration Management
  getIntegrations: () => businessAPI.get('/integrations'),

  connectIntegration: (platform, credentials) => {
    return businessAPI.post('/integrations/connect', {
      platform,
      credentials
    });
  },

  disconnectIntegration: (integrationId) => {
    return businessAPI.delete(`/integrations/${integrationId}`);
  },

  // Team Management
  getTeamMembers: () => businessAPI.get('/team'),

  inviteTeamMember: (email, role, permissions) => {
    return businessAPI.post('/team/invite', {
      email,
      role,
      permissions
    });
  },

  updateTeamMemberRole: (memberId, role, permissions) => {
    return businessAPI.put(`/team/${memberId}`, {
      role,
      permissions
    });
  },

  removeTeamMember: (memberId) => {
    return businessAPI.delete(`/team/${memberId}`);
  },

  // Notification Settings
  getNotificationSettings: () => businessAPI.get('/notifications/settings'),

  updateNotificationSettings: (settings) => {
    return businessAPI.put('/notifications/settings', settings);
  },

  // Export Data
  exportAnalytics: (format = 'csv', filters = {}) => {
    return businessAPI.get('/export/analytics', {
      params: { format, ...filters },
      responseType: 'blob'
    });
  },

  exportCustomerData: (format = 'csv', filters = {}) => {
    return businessAPI.get('/export/customers', {
      params: { format, ...filters },
      responseType: 'blob'
    });
  },

  // API Usage and Billing
  getApiUsage: () => businessAPI.get('/api/usage'),

  getBillingInfo: () => businessAPI.get('/billing'),

  updatePaymentMethod: (paymentData) => {
    return businessAPI.put('/billing/payment-method', paymentData);
  },

  // Scheduled Reports
  getScheduledReports: () => businessAPI.get('/reports/scheduled'),

  createScheduledReport: (reportConfig) => {
    return businessAPI.post('/reports/scheduled', reportConfig);
  },

  updateScheduledReport: (reportId, reportConfig) => {
    return businessAPI.put(`/reports/scheduled/${reportId}`, reportConfig);
  },

  deleteScheduledReport: (reportId) => {
    return businessAPI.delete(`/reports/scheduled/${reportId}`);
  }
};

export default business;
