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

// Agent 工具调用消息
export interface AgentToolMessage {
  id: number;
  time: string;
  tool_name: string;
  status: 'running' | 'done';
  result?: string;
  input?: string;
  tool_call_id?: string;
  backtest_run_id?: string;
}

/** 单次分析周期：工具调用 + 最终结论，对应一张「Agent 量化助手」卡片 */
export interface AgentBundleMessage {
  id: number;
  time: string;
  tools: AgentToolMessage[];
  agent?: AgentMessage;
  /** 收到首条工具 running 至收到 agent 事件前为 true */
  pending: boolean;
}

// 统一消息类型
export type StreamMessage = 
  | { type: 'trade'; data: TradeMessage }
  | { type: 'agent'; data: AgentMessage }
  | { type: 'agent_tool'; data: AgentToolMessage }
  | { type: 'agent_bundle'; data: AgentBundleMessage };

export interface BacktestStats {
  total_trades: number;
  win_count: number;
  loss_count: number;
  total_profit: number;
  win_rate: string;
  max_drawdown: number | null;
  final_balance: number;
  return_rate?: number;
  annual_return?: number | null;
  profit_loss_ratio?: number | null;
  sharpe_ratio?: number | null;
  sortino_ratio?: number | null;
}

const DEFAULT_STATS: BacktestStats = {
  total_trades: 0,
  win_count: 0,
  loss_count: 0,
  total_profit: 0,
  win_rate: '0.0%',
  max_drawdown: 0,
  final_balance: 0,
  return_rate: 0,
  annual_return: 0,
  profit_loss_ratio: 0,
  sharpe_ratio: 0,
  sortino_ratio: 0,
};

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

      const handleEvent = (event: any) => {
        const currentState = get();

        switch (event.type) {
          case 'trade':
            currentState._addTrade(event.data);
            break;
          case 'agent_tool': {
            const toolTime = event.data.current_date || currentState.currentDate || '';
            set((state) => {
              const msgs: StreamMessage[] = [...state.messages];

              const getOrCreatePendingBundleIndex = (): number => {
                const last = msgs[msgs.length - 1];
                if (last?.type === 'agent_bundle' && last.data.pending) {
                  return msgs.length - 1;
                }
                const bundleId = ++agentMsgCounter;
                msgs.push({
                  type: 'agent_bundle',
                  data: {
                    id: bundleId,
                    time: toolTime,
                    tools: [],
                    pending: true,
                  },
                });
                return msgs.length - 1;
              };

              if (event.data.status === 'running') {
                const bi = getOrCreatePendingBundleIndex();
                const prev = msgs[bi];
                if (prev.type !== 'agent_bundle') return { messages: msgs };
                const bundle = prev.data;
                const inputRaw = event.data.input;
                const inputStr =
                  inputRaw == null
                    ? undefined
                    : typeof inputRaw === 'string'
                      ? inputRaw
                      : (() => {
                          try {
                            return JSON.stringify(inputRaw);
                          } catch {
                            return String(inputRaw);
                          }
                        })();
                const row: AgentToolMessage = {
                  id: ++agentMsgCounter,
                  time: toolTime,
                  tool_name: event.data.tool_name,
                  status: 'running',
                  tool_call_id: event.data.tool_call_id,
                  backtest_run_id: event.data.backtest_run_id,
                  input: inputStr,
                };
                msgs[bi] = {
                  type: 'agent_bundle',
                  data: { ...bundle, tools: [...bundle.tools, row] },
                };
                return { messages: msgs };
              }

              if (event.data.status === 'done') {
                for (let bi = msgs.length - 1; bi >= 0; bi--) {
                  const m = msgs[bi];
                  if (m.type !== 'agent_bundle' || !m.data.pending) continue;
                  const bundle = m.data;
                  const nextTools = bundle.tools.map((t) => ({ ...t }));
                  let hit = false;
                  for (let i = nextTools.length - 1; i >= 0; i--) {
                    const t = nextTools[i];
                    if (t.status !== 'running') continue;
                    const byCallId =
                      !!event.data.tool_call_id && t.tool_call_id === event.data.tool_call_id;
                    const byNameFallback =
                      !event.data.tool_call_id && t.tool_name === event.data.tool_name;
                    if (byCallId || byNameFallback) {
                      nextTools[i] = {
                        ...t,
                        status: 'done',
                        result: event.data.result,
                        tool_call_id: event.data.tool_call_id ?? t.tool_call_id,
                        backtest_run_id: event.data.backtest_run_id ?? t.backtest_run_id,
                      };
                      hit = true;
                      break;
                    }
                  }
                  if (hit) {
                    msgs[bi] = { type: 'agent_bundle', data: { ...bundle, tools: nextTools } };
                    break;
                  }
                }
                return { messages: msgs };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'agent': {
            const t = event.data.current_date || currentState.currentDate || '';
            const agentMsg: AgentMessage = {
              ...event.data,
              id: ++agentMsgCounter,
              time: t,
            };
            set((state) => {
              const msgs: StreamMessage[] = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last?.type === 'agent_bundle' && last.data.pending) {
                msgs[msgs.length - 1] = {
                  type: 'agent_bundle',
                  data: {
                    ...last.data,
                    agent: agentMsg,
                    pending: false,
                  },
                };
              } else {
                msgs.push({ type: 'agent', data: agentMsg });
              }
              return {
                messages: msgs,
                agentMessages: [...state.agentMessages, agentMsg],
              };
            });
            break;
          }
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
      };
      
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
              handleEvent(event);
            } catch (e) {
              console.error('解析事件失败:', e, line);
            }
          }
        }
      }

      // 处理 EOF 前最后一段残留（无交易时 complete 事件更容易落在这里）
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch (e) {
            console.error('解析尾部事件失败:', e, line);
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
    const normalizedStats: BacktestStats = {
      ...DEFAULT_STATS,
      ...(stats || {}),
      // 后端无交易可能传 "NaN"，前端展示统一为 0.0%
      win_rate: stats?.win_rate && stats.win_rate !== 'NaN' ? stats.win_rate : '0.0%',
    };
    const normalizedTrades = Array.isArray(trades) ? trades : [];
    set({
      stats: normalizedStats,
      trades: normalizedTrades.map((t, i) => ({ ...t, id: i + 1 })),
      isRunning: false,
    });
  },
  
  _setError: (error) => {
    set({ error, isRunning: false });
  },
}));
