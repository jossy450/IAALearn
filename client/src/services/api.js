import axios from "axios";
import { Capacitor } from "@capacitor/core";

// IMPORTANT:
// - Web should ALWAYS use same-origin (/api) to avoid stale cross-domain build env values.
// - Native (Android/iOS) needs an absolute host because there is no same-origin /api.
const rawBaseEnv = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const isNative = (Capacitor.isNativePlatform?.() ?? false) || Capacitor.getPlatform() !== "web";
const fallbackBase = "https://iaalearn-cloud.fly.dev";

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
        const { state } = JSON.parse(authStorage);
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {
      // ignore bad storage
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Named API wrappers (these must exist because your pages import them)
 */
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  requestOtp: (data) => api.post("/auth/request-otp", data),
  verifyOtp: (data) => api.post("/auth/verify-otp", data),
  register: (data) => api.post("/auth/register", data),
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
