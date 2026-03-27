/**
 * 通用工具调用卡片组件
 * 
 * 用于回测和 AI 对话界面，展示 Agent 工具调用状态。
 * running 状态有滚动式工具名动画，done 状态显示结果摘要。
 */
import './ToolCallCard.css';

interface ToolCallCardProps {
  toolName: string;
  status: 'running' | 'done';
  result?: string;
  compact?: boolean;
  step?: number;
  meta?: string;
}

export default function ToolCallCard({ toolName, status, result, compact, step, meta }: ToolCallCardProps) {
  return (
    <div className={`tool-call-card ${status} ${compact ? 'compact' : ''}`}>
      {status === 'running' ? (
        <>
          <span className="tcc-spinner" />
          <span className="tcc-body">
            <span className="tcc-label">
              调用工具{typeof step === 'number' ? ` #${step}` : ''}
            </span>
            <span className="tcc-name-scroll">
              <code className="tcc-name">{toolName}</code>
            </span>
            {meta && <span className="tcc-meta">{meta}</span>}
          </span>
        </>
      ) : (
        <>
          <span className="tcc-check">✓</span>
          <span className="tcc-body">
            <code className="tcc-name">
              {typeof step === 'number' ? `#${step} ` : ''}
              {toolName}
            </code>
            {meta && <span className="tcc-meta">{meta}</span>}
            {result && <span className="tcc-result">{result}</span>}
          </span>
        </>
      )}
    </div>
  );
}
