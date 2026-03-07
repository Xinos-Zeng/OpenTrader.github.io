/**
 * 流式回测状态管理
 */
import { create } from 'zustand';

export interface TradeMessage {
  id: number;
  time: string;
  signal: 'BUY' | 'SELL';
  price: number;
  reason: string;
  // 财务信息
  balance?: number;
  trade_pnl?: number;
  realized_pnl?: number;
  floating_pnl?: number;
  market_value?: number;
}

// Agent 消息
export interface AgentMessage {
  id: number;
  time: string;
  action: 'analyzing' | 'adjusted' | 'no_change';
  message: string;
  reason?: string;
  params_before?: Record<string, number>;
  params_after?: Record<string, number>;
}

// 统一消息类型
export type StreamMessage = 
  | { type: 'trade'; data: TradeMessage }
  | { type: 'agent'; data: AgentMessage };

export interface BacktestStats {
  total_trades: number;
  win_count: number;
  loss_count: number;
  total_profit: number;
  win_rate: string;
  max_drawdown: number;
  final_balance: number;
}

interface BacktestState {
  isRunning: boolean;
  currentDate: string | null;
  trades: TradeMessage[];
  agentMessages: AgentMessage[];
  messages: StreamMessage[];
  stats: BacktestStats | null;
  error: string | null;
  
  // 配置
  config: {
    // 策略加载方式（三选一）
    strategyCode?: string;      // Agent 生成的策略代码
    userStrategyId?: number;    // 用户保存的策略 ID
    presetId?: string;          // 预置策略 ID
    // 回测参数
    symbol: string;
    startDate: string;
    endDate: string;
    initBalance: number;
    positionPercent: number;
    agentEnabled: boolean;
    agentInterval: number;
  };
  
  eventSource: EventSource | null;
  
  setConfig: (config: Partial<BacktestState['config']>) => void;
  startBacktest: () => void;
  cancelBacktest: () => void;
  clearResults: () => void;
  
  _addTrade: (trade: TradeMessage) => void;
  _addAgentMessage: (msg: AgentMessage) => void;
  _setProgress: (date: string) => void;
  _setComplete: (stats: BacktestStats, trades: TradeMessage[]) => void;
  _setError: (error: string) => void;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

let agentMsgCounter = 0;

export const useBacktestStore = create<BacktestState>((set, get) => ({
  isRunning: false,
  currentDate: null,
  trades: [],
  agentMessages: [],
  messages: [],
  stats: null,
  error: null,
  eventSource: null,
  
  config: {
    symbol: 'SHFE.rb2505',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initBalance: 200000,
    positionPercent: 50,
    agentEnabled: false,
    agentInterval: 30,
  },
  
  setConfig: (config) => {
    set((state) => ({ config: { ...state.config, ...config } }));
  },
  
  startBacktest: () => {
    const state = get();
    
    if (state.eventSource) {
      state.eventSource.close();
    }
    
    agentMsgCounter = 0;
    
    set({ 
      isRunning: true, 
      trades: [], 
      agentMessages: [], 
      messages: [],
      stats: null, 
      error: null, 
      currentDate: null 
    });
    
    const { 
      strategyCode, userStrategyId, presetId,
      symbol, startDate, endDate, 
      initBalance, positionPercent,
      agentEnabled, agentInterval
    } = state.config;
    const token = localStorage.getItem('access_token');
    
    // POST 请求
    fetch(`${API_URL}/api/backtest/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        strategy_code: strategyCode,
        user_strategy_id: userStrategyId,
        preset_id: presetId,
        symbol,
        start_date: startDate,
        end_date: endDate,
        init_balance: initBalance,
        position_percent: positionPercent,
        agent_enabled: agentEnabled,
        agent_interval: agentInterval,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        get()._setError(error.detail || '回测失败');
        return;
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        get()._setError('无法读取响应');
        return;
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              const currentState = get();
              
              switch (event.type) {
                case 'trade':
                  currentState._addTrade(event.data);
                  break;
                case 'agent':
                  currentState._addAgentMessage({
                    ...event.data,
                    id: ++agentMsgCounter,
                    time: event.data.current_date || currentState.currentDate || '',
                  });
                  break;
                case 'progress':
                  currentState._setProgress(event.data.current_date);
                  break;
                case 'complete':
                  currentState._setComplete(event.data.stats, event.data.trades);
                  break;
                case 'error':
                  currentState._setError(event.data.message);
                  break;
                case 'cancelled':
                  set({ isRunning: false });
                  break;
              }
            } catch (e) {
              console.error('解析事件失败:', e, line);
            }
          }
        }
      }
      
      set({ isRunning: false });
    }).catch((e) => {
      get()._setError(e.message);
    });
  },
  
  cancelBacktest: async () => {
    const token = localStorage.getItem('access_token');
    
    try {
      await fetch(`${API_URL}/api/backtest/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.error('取消回测失败:', e);
    }
    
    set({ isRunning: false });
  },
  
  clearResults: () => {
    set({ trades: [], agentMessages: [], messages: [], stats: null, error: null, currentDate: null });
  },
  
  _addTrade: (trade) => {
    set((state) => ({ 
      trades: [...state.trades, trade],
      messages: [...state.messages, { type: 'trade', data: trade }]
    }));
  },
  
  _addAgentMessage: (msg) => {
    set((state) => ({
      agentMessages: [...state.agentMessages, msg],
      messages: [...state.messages, { type: 'agent', data: msg }]
    }));
  },
  
  _setProgress: (date) => {
    set({ currentDate: date });
  },
  
  _setComplete: (stats, trades) => {
    set({ stats, trades: trades.map((t, i) => ({ ...t, id: i + 1 })), isRunning: false });
  },
  
  _setError: (error) => {
    set({ error, isRunning: false });
  },
}));
