import api from './client';
import { ApiResponse, TradeRecord, TradeStats, BacktestRequest, BacktestResult } from '../types';

export const tradeApi = {
  getHistory: async (days: number = 7, symbol?: string, tradeMode?: string) => {
    const response = await api.get<ApiResponse<TradeRecord[]>>('/api/trade/history', {
      params: { days, symbol, trade_mode: tradeMode },
    });
    return response.data;
  },

  getStats: async (days: number = 30, symbol?: string, tradeMode?: string) => {
    const response = await api.get<ApiResponse<TradeStats>>('/api/trade/stats', {
      params: { days, symbol, trade_mode: tradeMode },
    });
    return response.data;
  },

  runBacktest: async (data: BacktestRequest) => {
    const response = await api.post<ApiResponse<Record<string, unknown>>>('/api/trade/backtest', data);
    return response.data;
  },

  getBacktestResults: async (strategyName?: string, limit: number = 10) => {
    const response = await api.get<ApiResponse<BacktestResult[]>>('/api/trade/backtest/results', {
      params: { strategy_name: strategyName, limit },
    });
    return response.data;
  },
};

export default tradeApi;
