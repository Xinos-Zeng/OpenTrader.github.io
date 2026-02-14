import { create } from 'zustand';
import { strategyApi, UserStrategy } from '../api/strategy';
import { tradeApi } from '../api/trade';
import { StrategyInfo, StrategyParams, BacktestResult, BacktestRequest } from '../types';

interface ToastMessage {
  text: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface StrategyState {
  strategies: StrategyInfo[];
  currentStrategy: StrategyInfo | null;
  currentParams: StrategyParams | null;
  backtestResults: BacktestResult[];
  isLoading: boolean;
  error: string | null;
  toast: ToastMessage | null;
  fetchStrategies: () => Promise<void>;
  selectStrategy: (strategy: StrategyInfo) => void;
  selectUserStrategy: (us: UserStrategy) => void;
  fetchParams: (strategyName: string) => Promise<void>;
  updateParams: (params: Record<string, unknown>) => void;
  runBacktest: (data: BacktestRequest) => Promise<boolean>;
  fetchBacktestResults: (strategyName?: string) => Promise<void>;
  clearError: () => void;
  showToast: (text: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
  clearToast: () => void;
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
  strategies: [],
  currentStrategy: null,
  currentParams: null,
  backtestResults: [],
  isLoading: false,
  error: null,
  toast: null,

  fetchStrategies: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await strategyApi.list();
      if (response.data) {
        set({ strategies: response.data, isLoading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取策略列表失败';
      set({ error: message, isLoading: false });
    }
  },

  selectStrategy: (strategy) => {
    set({
      currentStrategy: strategy,
      currentParams: {
        strategy_name: strategy.name,
        params: { ...strategy.default_params },
      },
    });
  },
  
  selectUserStrategy: (us) => {
    // 将用户策略转换为 StrategyInfo 格式
    set({
      currentStrategy: {
        name: `user_${us.id}`,
        description: us.name,
        default_params: us.params as Record<string, number>,
      },
      currentParams: {
        strategy_name: us.base_strategy,  // 用于回测的实际策略名
        params: { ...us.params },
      },
    });
  },

  fetchParams: async (strategyName) => {
    set({ isLoading: true });
    try {
      const response = await strategyApi.getParams(strategyName);
      if (response.data) {
        set({ currentParams: response.data, isLoading: false });
      }
    } catch {
      const strategy = get().currentStrategy;
      if (strategy) {
        set({
          currentParams: {
            strategy_name: strategy.name,
            params: { ...strategy.default_params },
          },
          isLoading: false,
        });
      }
    }
  },

  updateParams: (params) => {
    const current = get().currentParams;
    if (current) {
      set({
        currentParams: {
          ...current,
          params: { ...current.params, ...params },
        },
      });
    }
  },

  runBacktest: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradeApi.runBacktest(data);
      if (response.success) {
        set({ isLoading: false });
        return true;
      }
      set({ error: response.message, isLoading: false });
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : '回测失败';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  fetchBacktestResults: async (strategyName) => {
    set({ isLoading: true });
    try {
      const response = await tradeApi.getBacktestResults(strategyName, 20);
      if (response.data) {
        set({ backtestResults: response.data, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  
  showToast: (text, type = 'info') => set({ toast: { text, type } }),
  
  clearToast: () => set({ toast: null }),
}));

export default useStrategyStore;
