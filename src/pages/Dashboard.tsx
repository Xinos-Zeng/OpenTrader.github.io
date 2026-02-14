import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useStrategyStore } from '../stores/strategyStore';
import { strategyApi, UserStrategy } from '../api/strategy';
import { ConfirmModal } from '../components/Modal';
import NavBar from '../components/NavBar';
import StrategyCard from '../components/StrategyCard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();
  const { 
    strategies, 
    currentStrategy, 
    fetchStrategies, 
    selectStrategy, 
    selectUserStrategy,
    isLoading,
    showToast
  } = useStrategyStore();
  
  // 用户自定义策略
  const [userStrategies, setUserStrategies] = useState<UserStrategy[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserStrategy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchStrategies();
    loadUserStrategies();
  }, [fetchUser, fetchStrategies]);
  
  const loadUserStrategies = async () => {
    setLoadingUser(true);
    try {
      const response = await strategyApi.listUserStrategies();
      setUserStrategies(response.data || []);
    } catch (e) {
      console.error('加载用户策略失败:', e);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSelectStrategy = (strategy: typeof strategies[0]) => {
    selectStrategy(strategy);
  };
  
  const handleSelectUserStrategy = (us: UserStrategy) => {
    selectUserStrategy(us);
  };
  
  const handleDeleteUserStrategy = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      await strategyApi.deleteUserStrategy(deleteTarget.id);
      setUserStrategies(prev => prev.filter(s => s.id !== deleteTarget.id));
      showToast('删除成功', 'success');
      setDeleteTarget(null);
    } catch (e) {
      console.error('删除策略失败:', e);
      showToast('删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartBacktest = () => {
    if (currentStrategy) {
      navigate('/backtest/stream');
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

        {/* 系统策略 */}
        <section className="strategy-section">
          <h2>系统策略</h2>
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
        </section>
        
        {/* 我的策略 */}
        <section className="strategy-section">
          <h2>我的策略</h2>
          {loadingUser ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : userStrategies.length === 0 ? (
            <div className="empty-user-strategies">
              <p>暂无自定义策略</p>
              <p className="hint">在回测页面保存策略参数后，会显示在这里</p>
            </div>
          ) : (
            <div className="strategy-grid">
              {userStrategies.map((us) => {
                const isSelected = currentStrategy?.name === `user_${us.id}`;
                return (
                  <div 
                    key={us.id}
                    className={`user-strategy-card card card-hover ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectUserStrategy(us)}
                  >
                    {isSelected && <span className="selected-badge">✓ 已选择</span>}
                    <div className="card-header">
                      <h3>{us.name}</h3>
                      <button 
                        className="delete-btn"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(us); }}
                      >
                        ×
                      </button>
                    </div>
                    <p className="card-desc">{us.description || `基于 ${us.base_strategy}`}</p>
                    <div className="card-params">
                      {Object.entries(us.params).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="param-tag">{key}: {String(value)}</span>
                      ))}
                    </div>
                    <div className="card-time">{us.created_at}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {currentStrategy && (
          <div className="action-bar">
            <button onClick={handleStartBacktest} className="btn btn-primary">
              开始回测
            </button>
          </div>
        )}
      </main>
      
      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUserStrategy}
        title="删除策略"
        message={`确定要删除「${deleteTarget?.name}」吗？删除后无法恢复。`}
        confirmText="删除"
        confirmType="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
