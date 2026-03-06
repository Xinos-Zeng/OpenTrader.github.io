/**
 * AI 助手对话页面
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ChatMessage from '../components/ChatMessage';
import Toast from '../components/Toast';
import AttachedStrategyCard from '../components/AttachedStrategyCard';
import { useChatStore, AttachedStrategy } from '../stores/chatStore';
import { strategyApi } from '../api/strategy';
import { GeneratedStrategy } from '../api/agent';
import './Agent.css';

export default function Agent() {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    sessions,
    currentSessionId,
    messages,
    streamingContent,
    latestStrategy,
    attachedStrategy,
    isLoading,
    isSending,
    isStreaming,
    error,
    fetchSessions,
    loadSession,
    sendMessage,
    stopStreaming,
    startNewSession,
    deleteSession,
    clearError,
    setAttachedStrategy,
    clearAttachedStrategy,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 加载会话列表
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  
  // 处理从其他页面传入的策略（用于优化）
  useEffect(() => {
    const state = location.state as { optimizeStrategy?: AttachedStrategy } | null;
    if (state?.optimizeStrategy) {
      // 开启新会话并设置附加策略
      startNewSession();
      setAttachedStrategy(state.optimizeStrategy);
      // 清除 location state，防止刷新时重复处理
      window.history.replaceState({}, document.title);
    }
  }, [location.state, startNewSession, setAttachedStrategy]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentSessionId]);

  // 发送消息
  const handleSend = () => {
    const msg = inputValue.trim();
    if (!msg || isSending) return;
    
    sendMessage(msg);
    setInputValue('');
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 保存策略
  const handleSaveStrategy = async (strategy: GeneratedStrategy) => {
    setIsSaving(true);
    try {
      const response = await strategyApi.createUserStrategy({
        name: strategy.name,
        description: strategy.description,
        code: strategy.code,
      });
      
      if (response.success) {
        setToast({ message: '策略已保存到"我的策略"', type: 'success' });
      } else {
        setToast({ message: response.message || '保存失败', type: 'error' });
      }
    } catch (err) {
      setToast({ message: '保存失败，请重试', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // 回测策略 - 直接跳转到回测页面，传递策略代码
  const handleBacktest = (strategy: GeneratedStrategy) => {
    // 通过 state 传递策略代码到回测页面
    navigate('/backtest/stream', {
      state: {
        agentStrategy: {
          name: strategy.name,
          code: strategy.code,
          description: strategy.description,
        },
      },
    });
  };

  // 格式化时间
  const formatSessionTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="agent-page">
      <NavBar />
      
      <div className="agent-container">
        {/* 侧边栏 - 会话列表 */}
        <aside className={`agent-sidebar ${showSidebar ? '' : 'collapsed'}`}>
          <div className="sidebar-header">
            <h3>💬 对话历史</h3>
            <button 
              className="new-chat-btn"
              onClick={startNewSession}
            >
              + 新对话
            </button>
          </div>
          
          <div className="session-list">
            {sessions.length === 0 ? (
              <div className="empty-sessions">
                <p>暂无对话历史</p>
                <span>开始你的第一次对话吧</span>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`session-item ${currentSessionId === session.session_id ? 'active' : ''}`}
                  onClick={() => loadSession(session.session_id)}
                >
                  <div className="session-info">
                    <span className="session-title">
                      {session.title || '新对话'}
                    </span>
                    <span className="session-time">
                      {formatSessionTime(session.updated_at)}
                    </span>
                  </div>
                  <button
                    className="session-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.session_id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* 主聊天区域 */}
        <main className="agent-main">
          {/* 切换侧边栏按钮 */}
          <button 
            className="toggle-sidebar-btn"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? '◀' : '▶'}
          </button>

          {/* 消息区域 */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-icon">🤖</div>
                <h2>AI 量化助手</h2>
                <p>我可以帮你生成和优化量化交易策略</p>
                <div className="welcome-suggestions">
                  <button onClick={() => setInputValue('帮我写一个 MACD 策略，金叉买入死叉卖出')}>
                    📈 MACD 策略
                  </button>
                  <button onClick={() => setInputValue('帮我写一个布林带策略，突破上轨卖出，突破下轨买入')}>
                    📊 布林带策略
                  </button>
                  <button onClick={() => setInputValue('帮我写一个 RSI 超买超卖策略')}>
                    📉 RSI 策略
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={index}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    strategy={msg.strategy}
                    onSaveStrategy={handleSaveStrategy}
                    onBacktestStrategy={handleBacktest}
                  />
                ))}
                {/* 流式输出的临时内容 */}
                {isStreaming && streamingContent && (
                  <ChatMessage
                    role="assistant"
                    content={streamingContent}
                    timestamp={new Date().toISOString()}
                    isStreaming={true}
                    onSaveStrategy={handleSaveStrategy}
                    onBacktestStrategy={handleBacktest}
                  />
                )}
                {/* 等待开始的指示器 */}
                {isSending && !streamingContent && (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 输入区域 */}
          <div className="chat-input-area">
            {/* 附加策略卡片 */}
            {attachedStrategy && (
              <AttachedStrategyCard
                strategy={attachedStrategy}
                onRemove={clearAttachedStrategy}
              />
            )}
            
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedStrategy ? "描述你想要如何优化这个策略..." : "描述你想要的策略..."}
                rows={1}
                disabled={isSending}
              />
              {isStreaming ? (
                <button 
                  className="send-btn stop-btn"
                  onClick={stopStreaming}
                  title="停止生成"
                >
                  ⏹
                </button>
              ) : (
                <button 
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                >
                  {isSending ? '⏳' : '➤'}
                </button>
              )}
            </div>
            <p className="input-hint">
              {isStreaming 
                ? '正在生成中，点击 ⏹ 可停止' 
                : attachedStrategy 
                  ? '输入优化需求后按 Enter 发送'
                  : '按 Enter 发送，Shift + Enter 换行'
              }
            </p>
          </div>
        </main>
      </div>

      {/* 错误提示 */}
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={clearError}
        />
      )}

      {/* 操作提示 */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
