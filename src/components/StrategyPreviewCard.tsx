/**
 * 策略预览卡片组件
 * 用于在对话中展示 AI 生成的策略
 */
import { GeneratedStrategy } from '../api/agent';
import CodeBlock from './CodeBlock';
import './StrategyPreviewCard.css';

interface StrategyPreviewCardProps {
  strategy: GeneratedStrategy;
  onSave?: (strategy: GeneratedStrategy) => void;
  onBacktest?: (strategy: GeneratedStrategy) => void;
  compact?: boolean;
}

export default function StrategyPreviewCard({
  strategy,
  onSave,
  onBacktest,
  compact = false,
}: StrategyPreviewCardProps) {
  return (
    <div className={`strategy-preview-card ${compact ? 'compact' : ''}`}>
      <div className="preview-header">
        <div className="preview-icon">📈</div>
        <div className="preview-title">
          <h4>{strategy.name}</h4>
          <span className="preview-badge">AI 生成</span>
        </div>
      </div>

      <p className="preview-description">
        {strategy.description}
      </p>

      {/* 直接显示策略代码 */}
      <div className="preview-code">
        <CodeBlock 
          code={strategy.code} 
          language="python"
          maxHeight="300px"
        />
      </div>

      <div className="preview-actions">
        {onSave && (
          <button 
            className="preview-btn preview-btn-outline"
            onClick={() => onSave(strategy)}
          >
            💾 保存策略
          </button>
        )}
        {onBacktest && (
          <button 
            className="preview-btn preview-btn-primary"
            onClick={() => onBacktest(strategy)}
          >
            🚀 开始回测
          </button>
        )}
      </div>
    </div>
  );
}
