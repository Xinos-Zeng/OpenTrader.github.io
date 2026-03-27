/**
 * Agent 对话 API
 * 
 * 支持流式输出（SSE）
 */
import api from './client';
import { ApiResponse } from '../types';

// 策略信息（Agent 生成）
export interface GeneratedStrategy {
  name: string;
  code: string;
  description: string;
}

// 对话消息
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  strategy?: GeneratedStrategy;
}

// 会话信息
export interface ChatSession {
  session_id: string;
  user_id: number;
  session_type: 'strategy' | 'analysis';
  title?: string;
  message_count: number;
  last_strategy?: GeneratedStrategy;
  created_at: string;
  updated_at: string;
}

// 会话详情（含消息）
export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

// 对话响应
export interface ChatResponse {
  session_id: string;
  reply: string;
  strategy?: GeneratedStrategy;
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

// 工具调用事件
export interface ToolCallEvent {
  tool: string;
  params?: Record<string, unknown>;
  status: 'running' | 'done';
  result?: string;
}

// SSE 事件回调类型
export interface StreamCallbacks {
  onSession?: (sessionId: string) => void;
  onToken?: (content: string) => void;
  onStrategy?: (strategy: GeneratedStrategy) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onDone?: (fullContent: string) => void;
  onError?: (message: string) => void;
  /** HTTP 流已读完时调用（无论是否收到 event: done）；用于收尾 UI，避免一直显示「中断」 */
  onStreamComplete?: (info: { receivedDone: boolean }) => void;
}

const AGENT_TIMEOUT = 120000;
/** 两次读流之间的最大间隔（与后端 5s 心跳 + 代理缓冲对齐，避免误判超时） */
const STREAM_IDLE_TIMEOUT = 120000;
const STREAM_TOOL_TIMEOUT = 300000;

/**
 * 获取 API 基础 URL
 */
const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:8000';
};

export const agentApi = {
  /**
   * 发送策略对话消息（非流式）
   */
  chatStrategy: async (message: string, sessionId?: string) => {
    const response = await api.post<ApiResponse<ChatResponse>>(
      '/api/agent/chat/strategy',
      {
        message,
        session_id: sessionId,
      },
      { timeout: AGENT_TIMEOUT }
    );
    return response.data;
  },

  /**
   * 发送策略对话消息（流式 SSE）
   * 
   * @param message 用户消息
   * @param callbacks 事件回调
   * @param sessionId 会话 ID（可选）
   * @returns AbortController 用于取消请求
   */
  chatStrategyStream: (
    message: string,
    callbacks: StreamCallbacks,
    sessionId?: string
  ): AbortController => {
    const controller = new AbortController();
    const token = localStorage.getItem('access_token');
    
    // 构建 URL
    const params = new URLSearchParams({ message });
    if (sessionId) {
      params.append('session_id', sessionId);
    }
    const url = `${getApiBaseUrl()}/api/agent/chat/strategy/stream?${params.toString()}`;
    
    let timeoutId: NodeJS.Timeout | null = null;
    let currentTimeoutMs = STREAM_IDLE_TIMEOUT;
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callbacks.onError?.(`请求超时：${Math.round(currentTimeoutMs / 1000)}秒内未收到新内容`);
        controller.abort();
      }, currentTimeoutMs);
    };
    
    // 开始请求
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        'ngrok-skip-browser-warning': 'true',
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法获取响应流');
        }
        
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';
        let receivedDone = false;
        
        // 处理单个 SSE 事件
        const processEvent = () => {
          if (!currentEvent || !currentData) return;
          
          try {
            const data = JSON.parse(currentData);
            
            switch (currentEvent) {
              case 'session':
                callbacks.onSession?.(data.session_id);
                break;
              case 'heartbeat':
                // 与 reader.read() 重置并列：显式防止解析顺序导致漏重置
                resetTimeout();
                break;
              case 'action':
                currentTimeoutMs = STREAM_TOOL_TIMEOUT;
                callbacks.onToolCall?.({
                  tool: data.tool,
                  params: data.params,
                  status: 'running',
                });
                break;
              case 'observation':
                currentTimeoutMs = STREAM_IDLE_TIMEOUT;
                callbacks.onToolCall?.({
                  tool: '',
                  status: 'done',
                  result: typeof data.result === 'string' ? data.result : JSON.stringify(data.result),
                });
                break;
              case 'token':
                currentTimeoutMs = STREAM_IDLE_TIMEOUT;
                callbacks.onToken?.(data.content);
                break;
              case 'strategy':
                callbacks.onStrategy?.(data);
                break;
              case 'done':
                receivedDone = true;
                callbacks.onDone?.(data.full_content);
                break;
              case 'error':
                callbacks.onError?.(data.message);
                break;
            }
          } catch (e) {
            console.error('解析 SSE 数据失败:', e, currentData);
          }
          
          currentEvent = '';
          currentData = '';
        };
        
        resetTimeout(); // 开始超时计时
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          resetTimeout(); // 收到数据，重置超时
          buffer += decoder.decode(value, { stream: true });
          
          // 解析 SSE 事件
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留未完成的行
          
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              // 新事件开始，处理上一个事件
              processEvent();
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '') {
              // 空行表示事件结束
              processEvent();
            }
          }
        }
        
        // 处理缓冲区中剩余的内容
        if (buffer) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              processEvent();
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '') {
              processEvent();
            }
          }
          // 处理最后一个事件
          processEvent();
        }
        
        if (timeoutId) clearTimeout(timeoutId);
        
        // 如果没有收到 done 事件，可能是连接异常断开
        if (!receivedDone) {
          console.warn('SSE 流结束但未收到 done 事件');
        }
        callbacks.onStreamComplete?.({ receivedDone });
      })
      .catch((err) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (err.name !== 'AbortError') {
          callbacks.onError?.(err.message || '请求失败');
        }
        // 网络/HTTP 错误时也要结束流式态（onError 已清理时此处为双保险）
        callbacks.onStreamComplete?.({ receivedDone: false });
      });
    
    return controller;
  },

  /**
   * 快速生成策略（单轮对话）
   */
  quickGenerate: async (message: string) => {
    const response = await api.post<ApiResponse<ChatResponse>>(
      '/api/agent/chat/strategy/quick-generate',
      { message },
      { timeout: AGENT_TIMEOUT }
    );
    return response.data;
  },

  /**
   * 验证策略代码
   */
  validateStrategy: async (code: string) => {
    const response = await api.post<ApiResponse<ValidationResult>>('/api/agent/chat/strategy/validate', {
      code,
    });
    return response.data;
  },

  /**
   * 获取会话列表
   */
  getSessions: async () => {
    const response = await api.get<ApiResponse<ChatSession[]>>('/api/agent/chat/sessions');
    return response.data;
  },

  /**
   * 获取会话详情（含消息历史）
   */
  getSessionDetail: async (sessionId: string) => {
    const response = await api.get<ApiResponse<ChatSessionDetail>>(`/api/agent/chat/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * 删除会话
   */
  deleteSession: async (sessionId: string) => {
    const response = await api.delete<ApiResponse<string>>(`/api/agent/chat/sessions/${sessionId}`);
    return response.data;
  },
};

export default agentApi;
