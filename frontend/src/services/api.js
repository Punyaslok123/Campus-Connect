/**
 * services/api.js
 * Axios instance with:
 *  - Authorization header injected from Zustand store
 *  - 401 → auto-refresh access token via /api/auth/refresh
 *  - Failed refresh → logout + redirect to login
 */
import axios from 'axios';
import useAuthStore from '../store/authStore.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,          // sends httpOnly refresh cookie
  timeout:         15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: inject access token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: handle 401 → refresh → retry ────────────────────────────────────
let isRefreshing  = false;
let failedQueue   = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Don't attempt refresh for auth endpoints — avoids "refresh token not provided"
    // errors when the login cookie hasn't been flushed to the browser yet
    const isAuthEndpoint = original.url?.includes('/auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken  = data.data.accessToken;
        useAuthStore.getState().updateToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
