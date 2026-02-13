import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStrategyStore } from '../../stores/strategyStore';
import NavBar from '../../components/NavBar';
import StatsCard from '../../components/StatsCard';
import './Backtest.css';

export default function BacktestResult() {
  const navigate = useNavigate();
  const { currentStrategy, backtestResults, fetchBacktestResults, isLoading } = useStrategyStore();

  useEffect(() => {
    fetchBacktestResults(currentStrategy?.name);
  }, [currentStrategy, fetchBacktestResults]);

  const latestResult = backtestResults[0];

  return (
    <div className="page">
      <NavBar />
      
      <main className="container result-content">
        <div className="page-header">
          <button onClick={() => navigate('/backtest')} className="back-link">
            ← 返回配置
          </button>
          <h1>回测结果</h1>
          {latestResult && (
            <p>{latestResult.strategy} | {latestResult.symbol} | {latestResult.period}</p>
          )}
        </div>

        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : backtestResults.length === 0 ? (
          <div className="card empty-state">
            <p>暂无回测结果</p>
            <button onClick={() => navigate('/backtest')} className="btn btn-primary">
              开始回测
            </button>
          </div>
        ) : (
          <>
            {latestResult && (
              <div className="stats-grid">
                <StatsCard
                  label="总收益"
                  value={`${latestResult.total_profit >= 0 ? '+' : ''}${latestResult.total_profit.toFixed(2)}`}
                  type={latestResult.total_profit >= 0 ? 'profit' : 'loss'}
                  icon="💰"
                />
                <StatsCard
                  label="胜率"
                  value={latestResult.win_rate}
                  icon="🎯"
                />
                <StatsCard
                  label="总交易"
                  value={latestResult.total_trades}
                  icon="📊"
                />
                <StatsCard
                  label="最大回撤"
                  value={`${(latestResult.max_drawdown * 100).toFixed(2)}%`}
                  type={latestResult.max_drawdown > 0.1 ? 'loss' : 'default'}
                  icon="📉"
                />
              </div>
            )}

            {latestResult && (
              <div className="card detail-card">
                <h3>回测详情</h3>
                <div className="detail-row">
                  <span className="detail-label">策略名称</span>
                  <span className="detail-value">{latestResult.strategy}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">交易品种</span>
                  <span className="detail-value">{latestResult.symbol}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">回测周期</span>
                  <span className="detail-value">{latestResult.period}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">夏普比率</span>
                  <span className="detail-value">{latestResult.sharpe_ratio.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">策略参数</span>
                  <span className="detail-value">
                    {Object.entries(latestResult.params || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">回测时间</span>
                  <span className="detail-value">{latestResult.time}</span>
                </div>
              </div>
            )}

            <div className="card detail-card">
              <h3>历史回测</h3>
              <div className="history-list">
                {backtestResults.map((result) => (
                  <div key={result.id} className="history-item">
                    <div className="history-item-info">
                      <div className="history-item-title">
                        {result.strategy} - {result.symbol}
                      </div>
                      <div className="history-item-subtitle">{result.period}</div>
                    </div>
                    <div className="history-item-stats">
                      <span className={result.total_profit >= 0 ? 'profit' : 'loss'}>
                        {result.total_profit >= 0 ? '+' : ''}{result.total_profit.toFixed(2)}
                      </span>
                      <span className="text-gray-500">{result.win_rate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={() => navigate('/backtest')} className="btn btn-secondary">
                重新配置
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                选择其他策略
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
