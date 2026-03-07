/**
 * 策略详情弹窗组件
 * 显示策略的完整信息、代码和操作按钮
 */
import { Modal } from './Modal';
import CodeBlock from './CodeBlock';
import { UserStrategy } from '../api/strategy';
import './StrategyDetailModal.css';

interface StrategyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: UserStrategy | null;
  onOptimize?: (strategy: UserStrategy) => void;
  onBacktest?: (strategy: UserStrategy) => void;
}

export default function StrategyDetailModal({
  isOpen,
  onClose,
  strategy,
  onOptimize,
  onBacktest,
}: StrategyDetailModalProps) {
  if (!strategy) return null;
  
  const codeLines = strategy.code?.split('\n').length || 0;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📋 ${strategy.name}`}
      size="large"
    >
      <div className="strategy-detail-modal">
        {/* 策略描述 */}
        {strategy.description && (
          <section className="detail-section">
            <h4>📝 策略描述</h4>
            <p className="detail-description">{strategy.description}</p>
          </section>
        )}
        
        {/* 回测指标 */}
        {(strategy.return_rate != null || strategy.win_rate != null || strategy.max_drawdown != null) && (
          <section className="detail-section">
            <h4>📊 回测指标</h4>
            <div className="detail-metrics">
              {strategy.return_rate != null && (
                <div className={`metric-item ${strategy.return_rate >= 0 ? 'profit' : 'loss'}`}>
                  <span className="metric-label">收益率</span>
                  <span className="metric-value">
                    {strategy.return_rate >= 0 ? '+' : ''}{strategy.return_rate.toFixed(1)}%
                  </span>
                </div>
              )}
              {strategy.win_rate != null && (
                <div className="metric-item">
                  <span className="metric-label">胜率</span>
                  <span className="metric-value">{strategy.win_rate.toFixed(1)}%</span>
                </div>
              )}
              {strategy.max_drawdown != null && (
                <div className="metric-item warning">
                  <span className="metric-label">最大回撤</span>
                  <span className="metric-value">{strategy.max_drawdown.toFixed(1)}%</span>
                </div>
              )}
              {strategy.backtest_symbol && (
                <div className="metric-item">
                  <span className="metric-label">回测品种</span>
                  <span className="metric-value">{strategy.backtest_symbol}</span>
                </div>
              )}
              {strategy.backtest_start && strategy.backtest_end && (
                <div className="metric-item">
                  <span className="metric-label">回测周期</span>
                  <span className="metric-value">
                    {strategy.backtest_start} ~ {strategy.backtest_end}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* 策略代码 */}
        {strategy.code && (
          <section className="detail-section">
            <div className="detail-code-header">
              <h4>💻 策略代码 ({codeLines}行)</h4>
            </div>
            <div className="detail-code-block">
              <CodeBlock 
                code={strategy.code} 
                language="python"
                maxHeight="350px"
              />
            </div>
          </section>
        )}
        
        {/* 操作按钮 */}
        <div className="detail-actions">
          {onOptimize && (
            <button 
              className="detail-btn optimize-btn"
              onClick={() => {
                onOptimize(strategy);
                onClose();
              }}
            >
              🔧 优化策略
            </button>
          )}
          {onBacktest && (
            <button 
              className="detail-btn backtest-btn"
              onClick={() => {
                onBacktest(strategy);
                onClose();
              }}
            >
              ▶ 开始回测
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
