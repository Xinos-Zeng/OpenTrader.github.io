/**
 * 收藏列表页面
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { ConfirmModal } from '../components/Modal';
import { favoritesApi, Favorite } from '../api/favorites';
import { useStrategyStore } from '../stores/strategyStore';
import './Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const { showToast } = useStrategyStore();
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Favorite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const loadFavorites = async () => {
    try {
      const response = await favoritesApi.list();
      setFavorites(response.data || []);
    } catch (e) {
      console.error('加载收藏失败:', e);
      showToast('加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadFavorites();
  }, []);
  
  const openDeleteConfirm = (fav: Favorite, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(fav);
  };
  
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      await favoritesApi.delete(deleteTarget.id);
      setFavorites((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      showToast('删除成功', 'success');
      setDeleteTarget(null);
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="favorites-page">
      <NavBar />
      
      <div className="favorites-container">
        <div className="page-header">
          <h1>我的收藏</h1>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/backtest/stream')}
          >
            + 新建回测
          </button>
        </div>
        
        {isLoading ? (
          <div className="loading">
            <span className="spinner"></span>
            加载中...
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无收藏</p>
            <p className="hint">完成回测后可将结果保存到收藏</p>
          </div>
        ) : (
          <div className="favorites-grid">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="favorite-card"
                onClick={() => navigate(`/favorites/${fav.id}`)}
              >
                <div className="card-header">
                  <h3 className="card-title">{fav.name}</h3>
                  <button
                    className="delete-btn"
                    onClick={(e) => openDeleteConfirm(fav, e)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="card-body">
                  <div className="card-row">
                    <span className="label">品种</span>
                    <span className="value">{fav.symbol}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">策略</span>
                    <span className="value">{fav.strategy_name}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">区间</span>
                    <span className="value">{fav.period}</span>
                  </div>
                </div>
                
                <div className="card-footer">
                  <div className={`profit ${fav.total_profit >= 0 ? 'positive' : 'negative'}`}>
                    {fav.total_profit >= 0 ? '+' : ''}{fav.total_profit?.toFixed(2) || '0.00'}
                  </div>
                  <div className="win-rate">
                    胜率 {fav.win_rate?.toFixed(1) || '0'}%
                  </div>
                </div>
                
                <div className="card-time">{fav.created_at}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除收藏"
        message={`确定要删除「${deleteTarget?.name}」吗？删除后无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        confirmType="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
