// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
}

// 用户类型
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// 策略类型
export interface StrategyInfo {
  name: string;
  description: string;
  default_params: Record<string, unknown>;
}

export interface StrategyParams {
  strategy_name: string;
  params: Record<string, unknown>;
}

// 交易类型
export interface TradeRecord {
  id: number;
  symbol: string;
  direction: string;
  offset: string;
  price: number;
  volume: number;
  strategy?: string;
  reason?: string;
  mode: string;
  time: string;
}

export interface TradeStats {
  total_trades: number;
  buy_count: number;
  sell_count: number;
  completed_rounds: number;
  win_count: number;
  win_rate: string;
  total_profit: number;
  avg_profit: number;
  period_days: number;
}

// 回测类型
export interface BacktestRequest {
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  params?: Record<string, unknown>;
}

export interface BacktestResult {
  id: number;
  strategy: string;
  params: Record<string, unknown>;
  symbol: string;
  period: string;
  total_trades: number;
  win_rate: string;
  total_profit: number;
  max_drawdown: number;
  sharpe_ratio: number;
  time: string;
}

// 用户配置
export interface UserConfig {
  tq_user?: string;
  llm_model: string;
  default_strategy: string;
  strategy_params?: Record<string, unknown>;
}
