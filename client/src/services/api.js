import axios from "axios";

// Prefer same-origin in production (Render) so "/api" hits the same server.
// If you ever split frontend/backend, set VITE_API_URL to:
//   https://your-api.onrender.com   (we append /api)
// or https://your-api.onrender.com/api (used as-is)
const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const API_BASE_URL = rawBase
  ? rawBase.endsWith("/api")
    ? rawBase
    : `${rawBase}/api`
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
  register: (data) => api.post("/auth/register", data),
};

export const sessionAPI = {
  getAll: () => api.get("/sessions"),
  create: (data) => api.post("/sessions", data),
  getOne: (id) => api.get(`/sessions/${id}`),
  end: (id) => api.delete(`/sessions/${id}`),

  // transfer routes are mounted under /sessions
  generateTransferCode: (sessionId) =>
    api.post(`/sessions/${sessionId}/transfer-code`),
  checkTransferStatus: (code) => api.get(`/sessions/transfer-status/${code}`),
  connectViaTransfer: (payload) => api.post("/sessions/connect-transfer", payload),
};

export const transcriptionAPI = {
  transcribe: (data) => api.post("/transcription/transcribe", data),
};

export const answerAPI = {
  generate: (data) => api.post("/answers/generate", data),

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

export default api;
