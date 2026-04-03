import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { getDeviceId } from "./deviceId";

// IMPORTANT:
// - Web should ALWAYS use same-origin (/api) to avoid stale cross-domain build env values.
// - Native (Android/iOS) needs an absolute host because there is no same-origin /api.
const rawBaseEnv = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const isNative = (Capacitor.isNativePlatform?.() ?? false) || Capacitor.getPlatform() !== "web";
const fallbackBase = "https://iaalearn-1.fly.dev";

export const getApiRoot = () => (isNative ? (rawBaseEnv || fallbackBase) : "");

const effectiveRoot = getApiRoot();
const API_BASE_URL = effectiveRoot
  ? effectiveRoot.endsWith("/api")
    ? effectiveRoot
    : `${effectiveRoot}/api`
  : "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token if present
api.interceptors.request.use(
  (config) => {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token) {
          console.log(`[API] Attaching token to ${config.method?.toUpperCase()} ${config.url}`);
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn(`[API] No token found in auth-storage for ${config.method?.toUpperCase()} ${config.url}`);
        }
      } else {
        console.warn(`[API] No auth-storage found for ${config.method?.toUpperCase()} ${config.url}`);
      }
    } catch (err) {
      console.error('[API] Error reading auth-storage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Toast notification helper for auth errors
const showAuthToast = (message) => {
  // Remove any existing auth toast
  const existing = document.getElementById('auth-expired-toast');
  if (existing) existing.remove();
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'auth-expired-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #fee2e2;
    color: #991b1b;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 999999;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease;
    max-width: 90%;
    text-align: center;
    border: 1px solid #fecaca;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => toast.remove(), 4000);
};

// Handle 401 errors - auto logout and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMsg = error.response.data?.error || '';
      const details = error.response.data?.details || '';
      const errorId = error.response.data?.errorId || '';
      
      // Determine appropriate message based on error type
      let message = 'Session expired. Please log in again.';
      if (details.includes('jwt expired') || errorMsg.toLowerCase().includes('expired')) {
        message = 'Your session has expired. Please log in again.';
      } else if (errorMsg.includes('Invalid token') || details.includes('malformed')) {
        message = 'Invalid session. Please log in again.';
      } else if (errorMsg.includes('TokenRevokedError') || errorId.includes('revoked')) {
        message = 'Your session was revoked. Please log in again.';
      }
      
      console.warn('[API] 401 Unauthorized:', message);
      
      // Clear expired token from storage
      localStorage.removeItem('auth-storage');
      
      // Show toast notification
      showAuthToast(message);
      
      // Check if running on native platform
      const isNative = (typeof Capacitor !== 'undefined' && Capacitor?.isNativePlatform?.()) ?? false;
      
      // On native platforms, don't auto-redirect - just show message
      // User can manually navigate to login
      if (!isNative) {
        // Store current URL for redirect after re-login (if not on login/register page)
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // Redirect to login after short delay (web only)
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Named API wrappers (these must exist because your pages import them)
 */
export const authAPI = {
  login: (data) => api.post("/auth/login", { ...data, deviceId: getDeviceId() }),
  requestOtp: (data) => api.post("/auth/request-otp", data),
  verifyOtp: (data) => api.post("/auth/verify-otp", data),
  register: (data) => api.post("/auth/register", { ...data, deviceId: getDeviceId() }),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  me: () => api.get("/auth/me"),
};

export const sessionAPI = {
  getAll: (params) => api.get("/sessions", { params }),
  create: (data) => api.post("/sessions", data),
  getOne: (id) => api.get(`/sessions/${id}`),
  end: (id) => api.patch(`/sessions/${id}/end`),
  delete: (id) => api.delete(`/sessions/${id}`),

  // transfer routes are mounted under /sessions
  generateTransferCode: (sessionId) =>
    api.post(`/sessions/${sessionId}/transfer-code`),
  checkTransferStatus: (code) => api.get(`/sessions/transfer-status/${code}`),
  connectViaTransfer: (payload) => api.post("/sessions/connect-transfer", payload),
};

export const transcriptionAPI = {
  transcribe: (data) =>
    api.post("/transcription/transcribe", data, {
      // Remove default Content-Type so axios sets multipart/form-data with boundary
      headers: { "Content-Type": undefined },
      // Ensure axios handles FormData properly
      transformRequest: [(d) => d],
    }),
};

export const answerAPI = {
  generate: (data) => api.post("/answers/generate", data),
  generateOptimized: (data) => api.post("/answers-optimized/generate", data),

  // Your client calls getHistory(); server doesn’t have a dedicated route,
  // so use session details as “history” to avoid runtime breakage.
  getHistory: (sessionId) => api.get(`/sessions/${sessionId}`),
};

export const analyticsAPI = {
  getUserAnalytics: () => api.get("/analytics/user"),
};

export const cacheAPI = {
  getStats: () => api.get("/cache/stats"),
};

export const mobileAPI = {
  getSessions: () => api.get("/mobile/sessions"),
  generateCode: (data) => api.post("/mobile/generate-code", data),
  disconnect: (data) => api.post("/mobile/disconnect", data),
};

export const privacyAPI = {
  getSettings: () => api.get("/privacy"),
  updateSettings: (data) => api.patch("/privacy", data),
  clearHistory: () => api.post("/privacy/clear-history"),
  getThemes: () => api.get("/privacy/themes"),
};

export const documentsAPI = {
  uploadCV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Let axios auto-set Content-Type with proper boundary
    return api.post("/documents/upload/cv", formData);
  },
  uploadJobDescription: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Let axios auto-set Content-Type with proper boundary
    return api.post("/documents/upload/job_description", formData);
  },
  uploadPersonSpec: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Let axios auto-set Content-Type with proper boundary
    return api.post("/documents/upload/person_specification", formData);
  },
  getUserDocuments: () => api.get("/documents"),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
};

export default api;
