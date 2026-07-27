import axios from 'axios';
import { useAuthStore } from '../store/auth';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Track if refresh is in progress to avoid storm on many concurrent requests
let refreshingPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    
    // Only attempt refresh on 401, not already retried, and we have refresh token
    if (
      err.response?.status === 401 && 
      !originalRequest._retry && 
      typeof window !== 'undefined'
    ) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(err);
      }

      // Share single refresh call across concurrent requests
      if (!refreshingPromise) {
        refreshingPromise = (async () => {
          try {
            const res = await axios.post(`${apiUrl}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            const { access_token, refresh_token } = res.data;
            
            if (access_token && refresh_token) {
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);
              
              // Update user in store from refresh response
              if (res.data.user) {
                useAuthStore.getState().updateUser(res.data.user);
              }
              
              return access_token;
            }
          } catch {
            // Refresh failed — force logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            useAuthStore.getState().logout();
          }
          return null;
        })();
      }

      const newToken = await refreshingPromise;
      refreshingPromise = null;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    // Hard 401 with no refresh possibility — clear session
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      useAuthStore.getState().logout();
    }

    return Promise.reject(err);
  }
);

export default apiClient;
