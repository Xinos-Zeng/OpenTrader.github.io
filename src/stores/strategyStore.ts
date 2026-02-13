import { create } from 'zustand';
import { strategyApi } from '../api/strategy';
import { tradeApi } from '../api/trade';
import { StrategyInfo, StrategyParams, BacktestResult, BacktestRequest } from '../types';

interface StrategyState {
  strategies: StrategyInfo[];
  currentStrategy: StrategyInfo | null;
  currentParams: StrategyParams | null;
  backtestResults: BacktestResult[];
  isLoading: boolean;
  error: string | null;
  fetchStrategies: () => Promise<void>;
  selectStrategy: (strategy: StrategyInfo) => void;
  fetchParams: (strategyName: string) => Promise<void>;
  updateParams: (params: Record<string, unknown>) => void;
  runBacktest: (data: BacktestRequest) => Promise<boolean>;
  fetchBacktestResults: (strategyName?: string) => Promise<void>;
  clearError: () => void;
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
  strategies: [],
  currentStrategy: null,
  currentParams: null,
  backtestResults: [],
  isLoading: false,
  error: null,

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
}));

export default useStrategyStore;
