import { create } from 'zustand';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, accessToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),
}));

// Initialize from localStorage on client
if (typeof window !== 'undefined') {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      useAuthStore.setState({ 
        user: JSON.parse(userStr), 
        isAuthenticated: true, 
        isLoading: false 
      });
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  } catch {
    useAuthStore.setState({ isLoading: false });
  }
}
