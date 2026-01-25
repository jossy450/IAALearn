import axios from 'axios';

// If the client is served by the same Express server (recommended on Render),
// use relative '/api' so requests automatically go to the same origin.
// If you deploy API separately, set VITE_API_URL to either:
//   - https://your-api.onrender.com (we'll append /api), or
//   - https://your-api.onrender.com/api (we'll use it as-is)
const rawBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

const API_BASE_URL = rawBase
  ? (rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`)
  : '/api';

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
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
