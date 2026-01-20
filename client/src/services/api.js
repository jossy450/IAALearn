import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { state } = JSON.parse(authStorage);
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Session API
export const sessionAPI = {
  create: (data) => api.post('/sessions', data),
  getAll: (params) => api.get('/sessions', { params }),
  getOne: (id) => api.get(`/sessions/${id}`),
  end: (id) => api.patch(`/sessions/${id}/end`),
  delete: (id) => api.delete(`/sessions/${id}`),
  generateTransferCode: (sessionId) => api.post(`/sessions/${sessionId}/transfer-code`),
  checkTransferStatus: (code) => api.get(`/sessions/transfer-status/${code}`),
  connectViaTransfer: (code) => api.post('/sessions/connect-transfer', { code }),
};

// Transcription API
export const transcriptionAPI = {
  transcribe: (formData) => api.post('/transcription/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  status: () => api.get('/transcription/status'),
};

// Answer API
export const answerAPI = {
  generate: (data) => api.post('/answers/generate', data),
  preGenerate: (data) => api.post('/answers/pre-generate', data),
  getPreGenerated: () => api.get('/answers/pre-generated'),
  search: (data) => api.post('/answers/search', data),
};

// Cache API
export const cacheAPI = {
  getStats: () => api.get('/cache/stats'),
  clearExpired: () => api.post('/cache/clear-expired'),
  clearAll: () => api.post('/cache/clear-all'),
  getPerformance: (params) => api.get('/cache/performance', { params }),
};

// Analytics API
export const analyticsAPI = {
  getUserAnalytics: (params) => api.get('/analytics/user', { params }),
  getSessionAnalytics: (id) => api.get(`/analytics/session/${id}`),
  exportSession: (id) => api.get(`/analytics/export/${id}`),
};

// Privacy API
export const privacyAPI = {
  getSettings: () => api.get('/privacy'),
  updateSettings: (data) => api.patch('/privacy', data),
  clearHistory: (data) => api.post('/privacy/clear-history', data),
  getThemes: () => api.get('/privacy/themes'),
};

// Mobile API
export const mobileAPI = {
  generateCode: (data) => api.post('/mobile/generate-code', data),
  connect: (data) => api.post('/mobile/connect', data),
  disconnect: (data) => api.post('/mobile/disconnect', data),
  heartbeat: (data) => api.post('/mobile/heartbeat', data),
  getSessions: () => api.get('/mobile/sessions'),
};

// Stealth API
export const stealthAPI = {
  enable: (options) => api.post('/stealth/enable', options),
  createDecoy: (type) => api.post('/stealth/decoy', { type }),
  getClipboardHistory: () => api.get('/stealth/clipboard'),
  detectScreenRecording: () => api.get('/stealth/screen-recording-check'),
  enableFloatingWidget: (options) => api.post('/stealth/floating-widget', options),
};

export default api;
