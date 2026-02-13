import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useStrategyStore } from '../stores/strategyStore';
import NavBar from '../components/NavBar';
import StrategyCard from '../components/StrategyCard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();
  const { strategies, currentStrategy, fetchStrategies, selectStrategy, isLoading } = useStrategyStore();

  useEffect(() => {
    fetchUser();
    fetchStrategies();
  }, [fetchUser, fetchStrategies]);

  const handleSelectStrategy = (strategy: typeof strategies[0]) => {
    selectStrategy(strategy);
  };

  const handleStartBacktest = () => {
    if (currentStrategy) {
      navigate('/backtest');
    }
  };

  return (
    <div className="page">
      <NavBar />
      
      <main className="container page-content">
        <div className="page-header">
          <h1>选择策略</h1>
          <p>选择一个交易策略模板开始回测或模拟交易</p>
        </div>

        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="strategy-grid">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.name}
                strategy={strategy}
                isSelected={currentStrategy?.name === strategy.name}
                onClick={() => handleSelectStrategy(strategy)}
              />
            ))}
          </div>
        )}

        {currentStrategy && (
          <div className="action-bar">
            <button onClick={handleStartBacktest} className="btn btn-primary">
              开始回测
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
