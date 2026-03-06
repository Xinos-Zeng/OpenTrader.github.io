/**
 * 附加策略卡片组件
 * 用于 AI 助手中显示已附加的待优化策略
 */
import { useState } from 'react';
import { Modal } from './Modal';
import CodeBlock from './CodeBlock';
import { AttachedStrategy } from '../stores/chatStore';
import './AttachedStrategyCard.css';

interface AttachedStrategyCardProps {
  strategy: AttachedStrategy;
  onRemove: () => void;
}

export default function AttachedStrategyCard({ strategy, onRemove }: AttachedStrategyCardProps) {
  const [showCode, setShowCode] = useState(false);
  
  const codeLines = strategy.code.split('\n').length;
  
  // 格式化指标（使用 != null 同时过滤 undefined 和 null）
  const metrics: string[] = [];
  if (strategy.return_rate != null) {
    const sign = strategy.return_rate >= 0 ? '+' : '';
    metrics.push(`收益率: ${sign}${strategy.return_rate.toFixed(1)}%`);
  }
  if (strategy.win_rate != null) {
    metrics.push(`胜率: ${strategy.win_rate.toFixed(1)}%`);
  }
  if (strategy.max_drawdown != null) {
    metrics.push(`回撤: ${strategy.max_drawdown.toFixed(1)}%`);
  }
  
  return (
    <>
      <div className="attached-strategy-card">
        <div className="attached-header">
          <span className="attached-icon">📎</span>
          <span className="attached-label">已附加策略</span>
          <button 
            className="attached-remove"
            onClick={onRemove}
            title="移除附加策略"
          >
            ×
          </button>
        </div>
        
        <div className="attached-content">
          <div className="attached-name">{strategy.name}</div>
          <div className="attached-meta">
            <span className="attached-lines">{codeLines} 行代码</span>
            {metrics.length > 0 && (
              <span className="attached-metrics">{metrics.join(' | ')}</span>
            )}
          </div>
        </div>
        
        <button 
          className="attached-view-code"
          onClick={() => setShowCode(true)}
        >
          👁 查看代码
        </button>
      </div>
      
      {/* 代码预览弹窗 */}
      <Modal
        isOpen={showCode}
        onClose={() => setShowCode(false)}
        title={`📋 ${strategy.name}`}
        size="large"
      >
        <div className="attached-code-modal">
          {strategy.description && (
            <div className="attached-code-desc">
              <strong>策略描述：</strong>{strategy.description}
            </div>
          )}
          <div className="attached-code-block">
            <CodeBlock 
              code={strategy.code} 
              language="python"
              maxHeight="400px"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
