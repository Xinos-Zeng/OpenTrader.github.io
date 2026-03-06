/**
 * Agent 对话状态管理
 * 
 * 支持流式输出和附加策略优化
 */
import { create } from 'zustand';
import { agentApi, ChatSession, GeneratedStrategy, ChatMessage } from '../api/agent';
import { UserStrategy } from '../api/strategy';

// 附加策略类型（简化版，用于优化场景）
export interface AttachedStrategy {
  id?: number;          // 用户策略 ID（可选）
  name: string;
  description?: string;
  code: string;
  // 回测指标（可选）
  return_rate?: number;
  win_rate?: number;
  max_drawdown?: number;
}

interface ChatState {
  // 会话列表
  sessions: ChatSession[];
  // 当前会话 ID
  currentSessionId: string | null;
  // 当前会话消息
  messages: ChatMessage[];
  // 流式输出的临时内容
  streamingContent: string;
  // 最新生成的策略
  latestStrategy: GeneratedStrategy | null;
  // 附加的策略（用于优化场景）
  attachedStrategy: AttachedStrategy | null;
  // 状态
  isLoading: boolean;
  isSending: boolean;
  isStreaming: boolean;
  error: string | null;
  // 当前流式请求的 AbortController
  streamController: AbortController | null;
  
  // Actions
  fetchSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  sendMessage: (message: string) => void;
  stopStreaming: () => void;
  startNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  clearLatestStrategy: () => void;
  clearError: () => void;
  // 附加策略相关
  setAttachedStrategy: (strategy: AttachedStrategy | null) => void;
  clearAttachedStrategy: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  streamingContent: '',
  latestStrategy: null,
  attachedStrategy: null,
  isLoading: false,
  isSending: false,
  isStreaming: false,
  error: null,
  streamController: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await agentApi.getSessions();
      if (response.data) {
        set({ sessions: response.data, isLoading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取会话列表失败';
      set({ error: message, isLoading: false });
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null, currentSessionId: sessionId });
    try {
      const response = await agentApi.getSessionDetail(sessionId);
      if (response.data) {
        set({
          messages: response.data.messages,
          latestStrategy: response.data.last_strategy || null,
          isLoading: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载会话失败';
      set({ error: message, isLoading: false, currentSessionId: null });
    }
  },

  sendMessage: (message: string) => {
    const { currentSessionId, messages, attachedStrategy, streamController: oldController } = get();
    
    // 取消之前的流式请求
    if (oldController) {
      oldController.abort();
    }
    
    // 构建完整消息（如果有附加策略）
    let fullMessage = message;
    if (attachedStrategy) {
      const codeLines = attachedStrategy.code.split('\n').length;
      const metrics = [];
      if (attachedStrategy.return_rate !== undefined) {
        metrics.push(`收益率: ${attachedStrategy.return_rate >= 0 ? '+' : ''}${attachedStrategy.return_rate.toFixed(1)}%`);
      }
      if (attachedStrategy.win_rate !== undefined) {
        metrics.push(`胜率: ${attachedStrategy.win_rate.toFixed(1)}%`);
      }
      if (attachedStrategy.max_drawdown !== undefined) {
        metrics.push(`最大回撤: ${attachedStrategy.max_drawdown.toFixed(1)}%`);
      }
      
      fullMessage = `我想优化以下策略：

**策略名称**：${attachedStrategy.name}
**策略描述**：${attachedStrategy.description || '无'}
${metrics.length > 0 ? `**回测指标**：${metrics.join(' | ')}\n` : ''}
**策略代码** (${codeLines}行)：
\`\`\`python
${attachedStrategy.code}
\`\`\`

**我的优化需求**：${message}`;
    }
    
    // 显示给用户的消息（简洁版）
    const displayMessage = attachedStrategy 
      ? `📎 [已附加策略: ${attachedStrategy.name}]\n\n${message}`
      : message;
    
    // 添加用户消息（显示简洁版）
    const userMessage: ChatMessage = {
      role: 'user',
      content: displayMessage,
      timestamp: new Date().toISOString(),
    };
    
    set({ 
      messages: [...messages, userMessage], 
      isSending: true,
      isStreaming: true,
      streamingContent: '',
      error: null,
      // 发送后清除附加策略
      attachedStrategy: null,
    });
    
    let receivedSessionId: string | null = null;
    let receivedStrategy: GeneratedStrategy | null = null;
    
    // 开始流式请求（发送完整消息）
    const controller = agentApi.chatStrategyStream(
      fullMessage,
      {
        onSession: (sessionId) => {
          receivedSessionId = sessionId;
          set({ currentSessionId: sessionId });
        },
        
        onToken: (content) => {
          set((state) => ({
            streamingContent: state.streamingContent + content,
          }));
        },
        
        onStrategy: (strategy) => {
          receivedStrategy = strategy;
          set({ latestStrategy: strategy });
        },
        
        onDone: (fullContent) => {
          // 流式完成，添加完整的助手消息
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullContent,
            timestamp: new Date().toISOString(),
            strategy: receivedStrategy || undefined,
          };
          
          set((state) => ({
            messages: [...state.messages, assistantMessage],
            streamingContent: '',
            isSending: false,
            isStreaming: false,
            streamController: null,
          }));
          
          // 刷新会话列表
          get().fetchSessions();
        },
        
        onError: (errorMsg) => {
          // 如果已经有部分内容，也保存为消息
          const { streamingContent } = get();
          if (streamingContent) {
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: streamingContent + '\n\n[响应中断]',
              timestamp: new Date().toISOString(),
            };
            set((state) => ({
              messages: [...state.messages, assistantMessage],
            }));
          }
          
          set({
            error: errorMsg,
            isSending: false,
            isStreaming: false,
            streamingContent: '',
            streamController: null,
          });
        },
      },
      currentSessionId || undefined
    );
    
    set({ streamController: controller });
  },

  stopStreaming: () => {
    const { streamController, streamingContent } = get();
    
    if (streamController) {
      streamController.abort();
      
      // 保存已接收的内容
      if (streamingContent) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: streamingContent + '\n\n[用户中断]',
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, assistantMessage],
        }));
      }
      
      set({
        isSending: false,
        isStreaming: false,
        streamingContent: '',
        streamController: null,
      });
    }
  },

  startNewSession: () => {
    const { streamController } = get();
    if (streamController) {
      streamController.abort();
    }
    
    set({
      currentSessionId: null,
      messages: [],
      streamingContent: '',
      latestStrategy: null,
      error: null,
      isStreaming: false,
      isSending: false,
      streamController: null,
    });
  },

  deleteSession: async (sessionId: string) => {
    try {
      await agentApi.deleteSession(sessionId);
      
      set((state) => ({
        sessions: state.sessions.filter((s) => s.session_id !== sessionId),
      }));
      
      if (get().currentSessionId === sessionId) {
        get().startNewSession();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除会话失败';
      set({ error: message });
    }
  },

  clearLatestStrategy: () => set({ latestStrategy: null }),
  
  clearError: () => set({ error: null }),
  
  // 设置附加策略（用于优化场景）
  setAttachedStrategy: (strategy: AttachedStrategy | null) => {
    set({ attachedStrategy: strategy });
  },
  
  // 清除附加策略
  clearAttachedStrategy: () => {
    set({ attachedStrategy: null });
  },
}));

export default useChatStore;
