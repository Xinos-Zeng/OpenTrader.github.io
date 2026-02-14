import { create } from 'zustand';
import { authApi } from '../api/auth';
import { User } from '../types';

interface LoginData {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('access_token'),
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      if (response.data) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        set({ isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ error: response.message || '登录失败', isLoading: false });
      return false;
    } catch (err: unknown) {
      // 提取 axios 错误响应中的消息
      let message = '登录失败';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string; detail?: string } } };
        message = axiosErr.response?.data?.message || axiosErr.response?.data?.detail || '用户名或密码错误';
      } else if (err instanceof Error) {
        message = err.message;
      }
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      if (response.success) {
        set({ isLoading: false });
        return true;
      }
      set({ error: response.message || '注册失败', isLoading: false });
      return false;
    } catch (err: unknown) {
      let message = '注册失败';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string; detail?: string } } };
        message = axiosErr.response?.data?.message || axiosErr.response?.data?.detail || '注册失败，请稍后重试';
      } else if (err instanceof Error) {
        message = err.message;
      }
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    if (!localStorage.getItem('access_token')) return;
    
    set({ isLoading: true });
    try {
      const response = await authApi.getMe();
      if (response.data) {
        set({ user: response.data, isAuthenticated: true, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
