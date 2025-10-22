import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error occurred';

    // Handle token expiration
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }

    return Promise.reject({
      message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// API endpoints organized by feature
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
};

export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (courseData) => api.post('/courses', courseData),
  update: (id, courseData) => api.put(`/courses/${id}`, courseData),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  getProgress: (id) => api.get(`/courses/${id}/progress`),
  getPopular: (params) => api.get('/courses/popular/all', { params }),
  getFeatured: (params) => api.get('/courses/featured/all', { params }),
  search: (params) => api.get('/courses/search/all', { params }),
};

export const lessonsAPI = {
  getAll: (params) => api.get('/lessons', { params }),
  getById: (id) => api.get(`/lessons/${id}`),
  create: (lessonData) => api.post('/lessons', lessonData),
  update: (id, lessonData) => api.put(`/lessons/${id}`, lessonData),
  delete: (id) => api.delete(`/lessons/${id}`),
  search: (params) => api.get('/lessons/search', { params }),
};

export const progressAPI = {
  getUserProgress: () => api.get('/progress/user'),
  updateProgress: (data) => api.post('/progress/update', data),
  getLeaderboard: (params) => api.get('/progress/leaderboard', { params }),
  getStats: () => api.get('/progress/stats'),
};

export const gamificationAPI = {
  getAchievements: (params) => api.get('/gamification/achievements', { params }),
  getUserAchievements: () => api.get('/gamification/user/achievements'),
  unlockAchievement: (id) => api.post(`/gamification/achievements/${id}/unlock`),
  getQuests: (params) => api.get('/gamification/quests', { params }),
  getActiveQuests: () => api.get('/gamification/quests/active'),
  completeQuest: (id) => api.post(`/gamification/quests/${id}/complete`),
  getUserStats: () => api.get('/gamification/user/stats'),
  addXP: (amount, source) => api.post('/gamification/xp/add', { amount, source }),
};

export const socialAPI = {
  getFriends: () => api.get('/social/friends'),
  addFriend: (userId) => api.post(`/social/friends/${userId}`),
  removeFriend: (userId) => api.delete(`/social/friends/${userId}`),
  getLeaderboard: (params) => api.get('/social/leaderboard', { params }),
  searchUsers: (query) => api.get('/social/users/search', { params: { q: query } }),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  manageUser: (id, action) => api.post(`/admin/users/${id}/${action}`),
  getAllCourses: (params) => api.get('/admin/courses', { params }),
  manageCourse: (id, action) => api.post(`/admin/courses/${id}/${action}`),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getReports: (params) => api.get('/admin/reports', { params }),
};

// Utility functions for API responses
export const apiUtils = {
  // Check if error is due to network issues
  isNetworkError: (error) => {
    return !error.response && error.message === 'Network Error';
  },

  // Check if error is due to server being down
  isServerError: (error) => {
    return error.response?.status >= 500;
  },

  // Check if error is due to authentication
  isAuthError: (error) => {
    return error.response?.status === 401;
  },

  // Check if error is due to insufficient permissions
  isPermissionError: (error) => {
    return error.response?.status === 403;
  },

  // Check if error is due to validation issues
  isValidationError: (error) => {
    return error.response?.status === 400 && error.response.data?.details;
  },

  // Get validation errors in a usable format
  getValidationErrors: (error) => {
    if (apiUtils.isValidationError(error)) {
      return error.response.data.details.reduce((acc, err) => {
        acc[err.field] = err.message;
        return acc;
      }, {});
    }
    return {};
  },

  // Handle API errors consistently
  handleError: (error) => {
    if (apiUtils.isNetworkError(error)) {
      return { error: 'Unable to connect to the server. Please check your internet connection.' };
    }

    if (apiUtils.isServerError(error)) {
      return { error: 'Server is temporarily unavailable. Please try again later.' };
    }

    if (apiUtils.isAuthError(error)) {
      return { error: 'Please log in to continue.' };
    }

    if (apiUtils.isPermissionError(error)) {
      return { error: 'You do not have permission to perform this action.' };
    }

    return { error: error.message || 'An unexpected error occurred.' };
  }
};

export default api;