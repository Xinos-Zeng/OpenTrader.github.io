import api from './client';
import { ApiResponse, StrategyInfo, StrategyParams } from '../types';

export const strategyApi = {
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
};

export default strategyApi;
