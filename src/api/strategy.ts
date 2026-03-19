import api from './client';
import { ApiResponse, StrategyInfo, StrategyParams } from '../types';

// 用户策略类型
export interface UserStrategy {
  id: number;
  name: string;
  description?: string;
  code?: string;
  // 回测指标
  return_rate?: number;
  total_profit?: number;
  win_rate?: number;
  max_drawdown?: number;
  backtest_symbol?: string;
  backtest_start?: string;
  backtest_end?: string;
  created_at: string;
}

export interface CreateStrategyRequest {
  name: string;
  code: string;  // 策略代码（必填）
  description?: string;
  // 回测指标
  return_rate?: number;
  total_profit?: number;
  win_rate?: number;
  max_drawdown?: number;
  backtest_symbol?: string;
  backtest_start?: string;
  backtest_end?: string;
}

// 预置策略类型
export interface PresetStrategy {
  id: string;
  name: string;
  description: string;
  code?: string;
  params?: Array<{
    name: string;
    type: string;
    default: unknown;
    description: string;
  }>;
}

// 策略验证结果
export interface ValidationResult {
  is_valid: boolean;
  results: Array<{
    check: string;
    passed: boolean;
    level: 'error' | 'warning' | 'info';
    message: string;
  }>;
}

export const strategyApi = {
  // 系统策略
  list: async () => {
    const response = await api.get<ApiResponse<StrategyInfo[]>>('/api/strategy/list');
    return response.data;
  },

  getParams: async (strategyName: string = 'ma_cross') => {
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

  getParamsHistory: async (strategyName: string = 'ma_cross', limit: number = 10) => {
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
  
  // 获取用户策略详情（含代码）
  getUserStrategy: async (id: number) => {
    const response = await api.get<ApiResponse<UserStrategy>>(`/api/strategies/${id}`);
    return response.data;
  },
  
  // 预置策略 API
  listPresets: async () => {
    const response = await api.get<ApiResponse<PresetStrategy[]>>('/api/strategies/presets');
    return response.data;
  },
  
  getPresetDetail: async (id: string) => {
    const response = await api.get<ApiResponse<PresetStrategy>>(`/api/strategies/presets/${id}`);
    return response.data;
  },
  
  // 策略验证
  validateCode: async (code: string) => {
    const response = await api.post<ApiResponse<ValidationResult>>('/api/strategies/validate', { code });
    return response.data;
  },
};

export default strategyApi;
