import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('veravote_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('veravote_token');
      localStorage.removeItem('veravote_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.post('/auth/logout-all'),
  getPreferences: () => api.get('/auth/preferences'),
  updatePreferences: (data) => api.put('/auth/preferences', data),
};

export const electionsAPI = {
  getAll: (params) => api.get('/elections', { params }),
  getStats: () => api.get('/elections/stats'),
  getOne: (id) => api.get(`/elections/${id}`),
  create: (data) => api.post('/elections', data),
  update: (id, data) => api.put(`/elections/${id}`, data),
  delete: (id) => api.delete(`/elections/${id}`),
  releaseResults: (id) => api.post(`/elections/${id}/release-results`),
};

export const candidatesAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getOne: (id) => api.get(`/candidates/${id}`),
  create: (data) => api.post('/candidates', data),
  update: (id, data) => api.put(`/candidates/${id}`, data),
  delete: (id) => api.delete(`/candidates/${id}`),
  approve: (id) => api.put(`/candidates/${id}/approve`),
  reject: (id) => api.put(`/candidates/${id}/reject`),
};

export const votesAPI = {
  cast: (data) => api.post('/votes', data),
  getHistory: () => api.get('/votes/history'),
  getByElection: (electionId) => api.get(`/votes/election/${electionId}`),
};

export const votersAPI = {
  getAll: (params) => api.get('/voters', { params }),
  getOne: (id) => api.get(`/voters/${id}`),
  verify: (id) => api.put(`/voters/${id}/verify`),
  toggleActive: (id) => api.put(`/voters/${id}/toggle-active`),
  getHistory: (id) => api.get(`/voters/history/${id}`),
};

export const resultsAPI = {
  get: (electionId) => api.get(`/results/${electionId}`),
};

export const analyticsAPI = {
  get: () => api.get('/analytics'),
};

export const securityAPI = {
  getOverview: () => api.get('/security/overview'),
  getEvents: (params) => api.get('/security/events', { params }),
  getAnomalies: () => api.get('/security/anomalies'),
  updateEvent: (id, data) => api.put(`/security/events/${id}`, data),
};

export const auditLogsAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
};

export default api;
