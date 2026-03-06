import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    // 跳过 ngrok 免费版的浏览器警告页面
    'ngrok-skip-browser-warning': 'true',
  },
});

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理错误和 Token 刷新
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config;
    
    // 401 错误 - 尝试刷新 Token（仅在非登录/注册请求时）
    const isAuthRequest = originalRequest?.url?.includes('/api/auth/login') || 
                          originalRequest?.url?.includes('/api/auth/register');
    
    if (error.response?.status === 401 && originalRequest && !isAuthRequest) {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
            `${API_BASE_URL}/api/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          
          if (response.data.data) {
            localStorage.setItem('access_token', response.data.data.access_token);
            localStorage.setItem('refresh_token', response.data.data.refresh_token);
            
            // 重试原请求
            originalRequest.headers.Authorization = `Bearer ${response.data.data.access_token}`;
            return api(originalRequest);
          }
        } catch {
          // 刷新失败，清除 Token
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        // 没有 refresh token，且不在登录页面才重定向
        localStorage.removeItem('access_token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
