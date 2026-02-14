/**
 * 收藏详情页面
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { favoritesApi, FavoriteDetail as FavoriteDetailType } from '../api/favorites';
import { useStrategyStore } from '../stores/strategyStore';
import './FavoriteDetail.css';

export default function FavoriteDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useStrategyStore();
  
  const [detail, setDetail] = useState<FavoriteDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!id) return;
    
    const load = async () => {
      try {
        const response = await favoritesApi.get(Number(id));
        setDetail(response.data);
      } catch (e) {
        console.error('加载详情失败:', e);
        showToast('加载失败', 'error');
        navigate('/favorites');
      } finally {
        setIsLoading(false);
      }
    };
    
    load();
  }, [id, navigate, showToast]);
  
  if (isLoading) {
    return (
      <div className="favorite-detail-page">
        <NavBar />
        <div className="detail-container">
          <div className="loading">
            <span className="spinner"></span>
            加载中...
          </div>
        </div>
      </div>
    );
  }
  
  if (!detail) {
    return (
      <div className="favorite-detail-page">
        <NavBar />
        <div className="detail-container">
          <div className="error-box">收藏不存在</div>
        </div>
      </div>
    );
  }
  
  const stats = detail.stats as {
    total_trades?: number;
    win_rate?: string;
    total_profit?: number;
    max_drawdown?: number;
    final_balance?: number;
  };
  
  return (
    <div className="favorite-detail-page">
      <NavBar />
      
      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate('/favorites')}>
          ← 返回列表
        </button>
        
        <h1 className="detail-title">{detail.name}</h1>
        
        {/* 基本信息卡片 */}
        <div className="info-card">
          <h2>基本信息</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">策略</span>
              <span className="value">{detail.strategy_name}</span>
            </div>
            <div className="info-item">
              <span className="label">品种</span>
              <span className="value">{detail.symbol}</span>
            </div>
            <div className="info-item">
              <span className="label">开始日期</span>
              <span className="value">{detail.start_date}</span>
            </div>
            <div className="info-item">
              <span className="label">结束日期</span>
              <span className="value">{detail.end_date}</span>
            </div>
          </div>
          
          {detail.params && Object.keys(detail.params).length > 0 && (
            <div className="params-section">
              <h3>策略参数</h3>
              <div className="params-grid">
                {Object.entries(detail.params).map(([key, value]) => (
                  <div key={key} className="param-item">
                    <span className="label">{key}</span>
                    <span className="value">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 统计结果卡片 */}
        <div className="stats-card">
          <h2>回测结果</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.total_trades || 0}</span>
              <span className="stat-label">总交易次数</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.win_rate || '0%'}</span>
              <span className="stat-label">胜率</span>
            </div>
            <div className={`stat-item ${(stats.total_profit || 0) >= 0 ? 'profit' : 'loss'}`}>
              <span className="stat-value">
                {(stats.total_profit || 0) >= 0 ? '+' : ''}{(stats.total_profit || 0).toFixed(2)}
              </span>
              <span className="stat-label">总盈亏</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{(stats.max_drawdown || 0).toFixed(2)}%</span>
              <span className="stat-label">最大回撤</span>
            </div>
          </div>
        </div>
        
        {/* 交易记录卡片 */}
        {detail.trades && detail.trades.length > 0 && (
          <div className="trades-card">
            <h2>交易记录 ({detail.trades.length}笔)</h2>
            <div className="trades-list">
              {detail.trades.map((trade, index) => (
                <div
                  key={index}
                  className={`trade-item ${trade.signal.toLowerCase()}`}
                >
                  <div className="trade-time">{trade.time}</div>
                  <div className="trade-info">
                    <span className={`signal ${trade.signal.toLowerCase()}`}>
                      {trade.signal === 'BUY' ? '📈 买入' : '📉 卖出'}
                    </span>
                    <span className="price">@ {trade.price.toFixed(2)}</span>
                  </div>
                  <div className="trade-reason">{trade.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="detail-footer">
          <span className="created-time">保存时间: {detail.created_at}</span>
        </div>
      </div>
    </div>
  );
}
