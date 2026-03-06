/**
 * 对话消息气泡组件
 * 
 * 支持流式输出显示和代码高亮
 * 自动解析 JSON 策略块并渲染为 Python 代码
 */
import { useMemo } from 'react';
import { GeneratedStrategy } from '../api/agent';
import StrategyPreviewCard from './StrategyPreviewCard';
import CodeBlock from './CodeBlock';
import './ChatMessage.css';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  strategy?: GeneratedStrategy;
  isStreaming?: boolean;  // 是否正在流式输出
  onSaveStrategy?: (strategy: GeneratedStrategy) => void;
  onBacktestStrategy?: (strategy: GeneratedStrategy) => void;
}

/**
 * 尝试从 JSON 字符串中提取策略
 */
function tryParseStrategyJson(jsonStr: string): GeneratedStrategy | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data && typeof data.name === 'string' && typeof data.code === 'string' && typeof data.description === 'string') {
      return {
        name: data.name,
        code: data.code,
        description: data.description,
      };
    }
  } catch {
    // 解析失败，返回 null
  }
  return null;
}

/**
 * 解析内容，提取代码块和普通文本
 * 特殊处理 JSON 策略块 -> 转换为 Python 代码块
 */
function parseContent(content: string, hasStrategy: boolean, isStreaming: boolean) {
  const parts: Array<{ type: 'text' | 'code' | 'strategy-code'; content: string; language?: string; strategy?: GeneratedStrategy }> = [];
  
  // 正则匹配代码块
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let foundStrategyInJson = false;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块前的文本
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }
    
    const language = match[1] || 'text';
    const codeContent = match[2].trim();
    
    // 检查是否是 JSON 策略块
    if (language === 'json' && codeContent) {
      const parsedStrategy = tryParseStrategyJson(codeContent);
      if (parsedStrategy) {
        // JSON 包含策略，提取 code 并渲染为 Python
        foundStrategyInJson = true;
        if (!isStreaming) {
          // 流式完成后，如果已有 strategy 属性，跳过（让策略卡片展示）
          // 如果没有 strategy 属性，显示提取的代码
          if (!hasStrategy) {
            parts.push({ 
              type: 'strategy-code', 
              content: parsedStrategy.code, 
              language: 'python',
              strategy: parsedStrategy 
            });
          }
        } else {
          // 流式输出时，显示提取的 Python 代码
          parts.push({ type: 'code', content: parsedStrategy.code, language: 'python' });
        }
      } else {
        // 普通 JSON，直接显示
        parts.push({ type: 'code', content: codeContent, language: 'json' });
      }
    } else if (language === 'python' && codeContent) {
      // Python 代码块
      // 如果已有策略且不是流式，跳过代码块（让策略卡片展示）
      if (hasStrategy && !isStreaming) {
        // 跳过
      } else {
        parts.push({ type: 'code', content: codeContent, language: 'python' });
      }
    } else if (codeContent) {
      // 其他代码块
      parts.push({ type: 'code', content: codeContent, language });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩余文本
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      parts.push({ type: 'text', content: text });
    }
  }
  
  return { parts, foundStrategyInJson };
}

/**
 * 格式化普通文本（处理 Markdown 样式）
 */
function formatText(text: string): string {
  let formatted = text;
  // 加粗
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // 斜体
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // 行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // 换行
  formatted = formatted.replace(/\n/g, '<br />');
  return formatted;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  strategy,
  isStreaming = false,
  onSaveStrategy,
  onBacktestStrategy,
}: ChatMessageProps) {
  const isUser = role === 'user';
  
  // 格式化时间
  const formatTime = (ts?: string) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 解析内容
  const { parts, foundStrategyInJson } = useMemo(() => {
    return parseContent(content, !!strategy, isStreaming);
  }, [content, strategy, isStreaming]);

  // 确定要显示的策略（优先使用传入的 strategy，其次使用从 JSON 解析的）
  const displayStrategy = strategy || (
    !isStreaming && foundStrategyInJson 
      ? parts.find(p => p.type === 'strategy-code')?.strategy 
      : undefined
  );

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'} ${isStreaming ? 'streaming' : ''}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-content-wrapper">
        <div className="message-bubble">
          {/* 渲染内容部分 */}
          {parts.map((part, index) => {
            if (part.type === 'code' || part.type === 'strategy-code') {
              return (
                <div key={index} className="message-code">
                  <CodeBlock 
                    code={part.content} 
                    language={part.language || 'python'}
                    maxHeight="400px"
                  />
                </div>
              );
            } else {
              return (
                <div 
                  key={index}
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: formatText(part.content) }}
                />
              );
            }
          })}
          
          {/* 流式输出时显示光标 */}
          {isStreaming && (
            <span className="streaming-cursor">▊</span>
          )}
          
          {/* 策略预览卡片（只有流式完成后才显示） */}
          {displayStrategy && !isStreaming && (
            <div className="message-strategy">
              <StrategyPreviewCard
                strategy={displayStrategy}
                onSave={onSaveStrategy}
                onBacktest={onBacktestStrategy}
              />
            </div>
          )}
        </div>
        
        {timestamp && !isStreaming && (
          <div className="message-time">{formatTime(timestamp)}</div>
        )}
      </div>
    </div>
  );
}
