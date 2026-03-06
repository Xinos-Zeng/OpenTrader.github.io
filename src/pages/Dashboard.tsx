import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useStrategyStore } from '../stores/strategyStore';
import { useChatStore, AttachedStrategy } from '../stores/chatStore';
import { strategyApi, UserStrategy } from '../api/strategy';
import { ConfirmModal } from '../components/Modal';
import NavBar from '../components/NavBar';
import StrategyCard from '../components/StrategyCard';
import LeaderboardCard from '../components/LeaderboardCard';
import StrategyDetailModal from '../components/StrategyDetailModal';
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
  const { setAttachedStrategy } = useChatStore();
  
  // 用户自定义策略
  const [userStrategies, setUserStrategies] = useState<UserStrategy[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserStrategy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 策略详情弹窗
  const [detailStrategy, setDetailStrategy] = useState<UserStrategy | null>(null);

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
  
  // 查看策略详情
  const handleViewDetail = async (us: UserStrategy) => {
    // 如果策略没有 code，需要从后端获取
    if (!us.code) {
      try {
        const response = await strategyApi.getUserStrategy(us.id);
        if (response.data) {
          setDetailStrategy(response.data);
        }
      } catch (e) {
        console.error('获取策略详情失败:', e);
        showToast('获取策略详情失败', 'error');
      }
    } else {
      setDetailStrategy(us);
    }
  };
  
  // 优化策略 - 跳转到 AI 助手
  const handleOptimizeStrategy = async (us: UserStrategy) => {
    // 如果策略没有 code，先从后端获取完整详情
    let strategyWithCode = us;
    if (!us.code) {
      try {
        const response = await strategyApi.getUserStrategy(us.id);
        if (response.data) {
          strategyWithCode = response.data;
        } else {
          showToast('获取策略代码失败', 'error');
          return;
        }
      } catch (e) {
        console.error('获取策略详情失败:', e);
        showToast('获取策略代码失败', 'error');
        return;
      }
    }
    
    // 检查是否有代码
    if (!strategyWithCode.code) {
      showToast('该策略没有可优化的代码', 'warning');
      return;
    }
    
    // 构建附加策略对象
    const attachedStrategy: AttachedStrategy = {
      id: strategyWithCode.id,
      name: strategyWithCode.name,
      description: strategyWithCode.description,
      code: strategyWithCode.code,
      return_rate: strategyWithCode.return_rate,
      win_rate: strategyWithCode.win_rate,
      max_drawdown: strategyWithCode.max_drawdown,
    };
    
    // 跳转到 AI 助手页面，携带策略信息
    navigate('/agent', {
      state: { optimizeStrategy: attachedStrategy },
    });
  };
  
  // 从详情弹窗开始回测
  const handleBacktestFromDetail = (us: UserStrategy) => {
    selectUserStrategy(us);
    navigate('/backtest/stream');
  };

  return (
    <div className="page">
      <NavBar />
      
      <main className="container page-content">
        <div className="page-header">
          <h1>选择策略</h1>
          <p>选择一个交易策略模板开始回测或模拟交易</p>
        </div>

        <div className="dashboard-layout">
          {/* 左侧：策略选择区 */}
          <div className="strategy-area">
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
                        <p className="card-desc">{us.description || '用户自定义策略'}</p>
                        {us.return_rate !== undefined && us.return_rate !== null && (
                          <div className={`card-return-rate ${us.return_rate >= 0 ? 'profit' : 'loss'}`}>
                            收益率: {us.return_rate >= 0 ? '+' : ''}{us.return_rate.toFixed(1)}%
                          </div>
                        )}
                        <div className="card-time">{us.created_at}</div>
                        
                        {/* 操作按钮 */}
                        <div className="card-actions">
                          <button 
                            className="action-btn detail-btn"
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(us); }}
                          >
                            📋 详情
                          </button>
                          <button 
                            className="action-btn optimize-btn"
                            onClick={(e) => { e.stopPropagation(); handleOptimizeStrategy(us); }}
                          >
                            🔧 优化
                          </button>
                        </div>
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
          </div>

          {/* 右侧：排行榜 */}
          <aside className="leaderboard-area">
            <LeaderboardCard />
          </aside>
        </div>
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
      
      {/* 策略详情弹窗 */}
      <StrategyDetailModal
        isOpen={!!detailStrategy}
        onClose={() => setDetailStrategy(null)}
        strategy={detailStrategy}
        onOptimize={handleOptimizeStrategy}
        onBacktest={handleBacktestFromDetail}
      />
    </div>
  );
}
