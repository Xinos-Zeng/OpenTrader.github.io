import api from './client';
import { ApiResponse, StrategyInfo, StrategyParams } from '../types';

// 用户自定义策略类型
export interface UserStrategy {
  id: number;
  name: string;
  base_strategy: string;
  description?: string;
  params: Record<string, unknown>;
  created_at: string;
}

export interface CreateStrategyRequest {
  name: string;
  base_strategy: string;
  description?: string;
  params: Record<string, unknown>;
}

export const strategyApi = {
  // 系统策略
  list: async () => {
    const response = await api.get<ApiResponse<StrategyInfo[]>>('/api/strategy/list');
    return response.data;
  },

  getParams: async (strategyName: string = 'ma_strategy') => {
    const response = await api.get<ApiResponse<StrategyParams>>('/api/strategy/params', {
      params: { strategy_name: strategyName },
    });
    return response.data;
  },

  updateParams: async (strategyName: string, params: Record<string, unknown>, reason?: string) => {
    const response = await api.put<ApiResponse<StrategyParams>>(
      '/api/strategy/params',
      { params, reason },
      { params: { strategy_name: strategyName } }
    );
    return response.data;
  },

  getParamsHistory: async (strategyName: string = 'ma_strategy', limit: number = 10) => {
    const response = await api.get<ApiResponse<Record<string, unknown>[]>>('/api/strategy/params/history', {
      params: { strategy_name: strategyName, limit },
    });
    return response.data;
  },
  
  // 用户自定义策略
  listUserStrategies: async () => {
    const response = await api.get<ApiResponse<UserStrategy[]>>('/api/strategies');
    return response.data;
  },
  
  createUserStrategy: async (data: CreateStrategyRequest) => {
    const response = await api.post<ApiResponse<{ id: number }>>('/api/strategies', data);
    return response.data;
  },
  
  deleteUserStrategy: async (id: number) => {
    const response = await api.delete<ApiResponse<string>>(`/api/strategies/${id}`);
    return response.data;
  },
};

export default strategyApi;
