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
  balance?: number;        // 当前余额
  trade_pnl?: number;      // 本次平仓盈亏
  realized_pnl?: number;   // 累计已实现盈亏
  floating_pnl?: number;   // 浮动盈亏
  market_value?: number;   // 持仓市值
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

// 统一消息类型（用于消息流展示）
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
  // 状态
  isRunning: boolean;
  currentDate: string | null;
  trades: TradeMessage[];
  agentMessages: AgentMessage[];  // Agent 消息列表
  messages: StreamMessage[];      // 统一消息流（按时间顺序）
  stats: BacktestStats | null;
  error: string | null;
  
  // 配置
  config: {
    strategy: string;
    symbol: string;
    startDate: string;
    endDate: string;
    fastPeriod: number;
    slowPeriod: number;
    initBalance: number;
    positionSize: number;     // 每次交易手数
    positionPercent: number;  // 仓位百分比 (0-100%)
    agentEnabled: boolean;    // 是否启用 Agent
    agentInterval: number;    // Agent 检测周期（天）
  };
  
  // EventSource 引用
  eventSource: EventSource | null;
  
  // Actions
  setConfig: (config: Partial<BacktestState['config']>) => void;
  startBacktest: () => void;
  cancelBacktest: () => void;
  clearResults: () => void;
  
  // 内部 actions
  _addTrade: (trade: TradeMessage) => void;
  _addAgentMessage: (msg: AgentMessage) => void;
  _setProgress: (date: string) => void;
  _setComplete: (stats: BacktestStats, trades: TradeMessage[]) => void;
  _setError: (error: string) => void;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

let agentMsgCounter = 0; // Agent 消息计数器

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
    strategy: 'ma_strategy',
    symbol: 'SHFE.rb2505',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    fastPeriod: 5,
    slowPeriod: 20,
    initBalance: 200000,
    positionSize: 1,
    positionPercent: 50,
    agentEnabled: false,
    agentInterval: 30,
  },
  
  setConfig: (config) => {
    set((state) => ({ config: { ...state.config, ...config } }));
  },
  
  startBacktest: () => {
    const state = get();
    
    // 关闭已有连接
    if (state.eventSource) {
      state.eventSource.close();
    }
    
    // 重置计数器
    agentMsgCounter = 0;
    
    // 清除之前的结果
    set({ 
      isRunning: true, 
      trades: [], 
      agentMessages: [], 
      messages: [],
      stats: null, 
      error: null, 
      currentDate: null 
    });
    
    // 构建 URL
    const { 
      strategy, symbol, startDate, endDate, 
      fastPeriod, slowPeriod, initBalance, positionSize, positionPercent,
      agentEnabled, agentInterval
    } = state.config;
    const token = localStorage.getItem('access_token');
    
    const params = new URLSearchParams({
      strategy,
      symbol,
      start_date: startDate,
      end_date: endDate,
      fast_period: String(fastPeriod),
      slow_period: String(slowPeriod),
      init_balance: String(initBalance),
      position_size: String(positionSize),
      position_percent: String(positionPercent),
      agent_enabled: String(agentEnabled),
      agent_interval: String(agentInterval),
    });
    
    // 创建 EventSource（需要在 URL 中传递 token）
    const url = `${API_URL}/api/backtest/stream?${params.toString()}`;
    
    // 使用 fetch + 手动处理 SSE（因为 EventSource 不支持自定义 headers）
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
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
        
        // 解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';  // 保留不完整的行
        
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
