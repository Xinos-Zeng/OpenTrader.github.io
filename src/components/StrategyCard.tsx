import type { StrategyInfo } from '../types';
import './StrategyCard.css';

interface StrategyCardProps {
  strategy: StrategyInfo;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function StrategyCard({ strategy, isSelected, onClick }: StrategyCardProps) {
  const strategyIcons: Record<string, string> = {
    ma_strategy: '📈',
    macd_strategy: '📊',
    bollinger_strategy: '📉',
  };

  const icon = strategyIcons[strategy.name] || '📊';

  return (
    <div
      onClick={onClick}
      className={`card card-hover strategy-card ${isSelected ? 'selected' : ''}`}
    >
      <div className="strategy-card-content">
        <div className="strategy-icon">{icon}</div>
        <div className="strategy-info">
          <h3>{strategy.name}</h3>
          <p>{strategy.description}</p>
          
          <div className="strategy-params">
            {Object.entries(strategy.default_params).map(([key, value]) => (
              <span key={key} className="param-tag">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="strategy-selected">
          <span>✓ 已选择</span>
        </div>
      )}
    </div>
  );
}
