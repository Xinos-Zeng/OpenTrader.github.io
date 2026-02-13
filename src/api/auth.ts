import api from './client';
import { ApiResponse, User, TokenResponse } from '../types';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export const authApi = {
  register: async (data: RegisterData) => {
    const response = await api.post<ApiResponse<User>>('/api/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await api.post<ApiResponse<TokenResponse>>('/api/auth/login', data);
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await api.post<ApiResponse<TokenResponse>>('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<ApiResponse<User>>('/api/auth/me');
    return response.data;
  },
};

export default authApi;
