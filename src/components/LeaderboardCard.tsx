import { useEffect, useState } from 'react';
import { leaderboardApi, LeaderboardItem, MyBest } from '../api/leaderboard';
import './LeaderboardCard.css';

export default function LeaderboardCard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [myBest, setMyBest] = useState<MyBest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await leaderboardApi.getLeaderboard(10);
        if (response.data) {
          setLeaderboard(response.data.leaderboard);
          setMyBest(response.data.my_best);
        }
      } catch (err) {
        console.error('获取排行榜失败:', err);
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank.toString();
    }
  };

  const formatReturnRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="leaderboard-card card">
        <div className="leaderboard-header">
          <h3>🏆 收益率排行榜</h3>
        </div>
        <div className="leaderboard-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-card card">
        <div className="leaderboard-header">
          <h3>🏆 收益率排行榜</h3>
        </div>
        <div className="leaderboard-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-card card">
      <div className="leaderboard-header">
        <h3>🏆 收益率排行榜</h3>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((item, index) => (
          <div
            key={`${item.username}-${index}`}
            className={`leaderboard-item ${item.is_mock ? 'mock' : 'real'} ${item.rank <= 3 ? 'top3' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="rank-badge">
              {item.rank <= 3 ? (
                <span className="rank-icon">{getRankIcon(item.rank)}</span>
              ) : (
                <span className="rank-number">{item.rank}</span>
              )}
            </div>

            <div className="user-info">
              {item.avatar ? (
                <span className="user-avatar">{item.avatar}</span>
              ) : (
                <span className="user-avatar default">👤</span>
              )}
              <span className="user-name" title={item.strategy_name || undefined}>
                {item.username}
              </span>
              {item.is_mock && <span className="mock-badge">AI</span>}
            </div>

            <div className={`return-rate ${item.return_rate >= 0 ? 'profit' : 'loss'}`}>
              {formatReturnRate(item.return_rate)}
            </div>
          </div>
        ))}
      </div>

      {myBest && (
        <div className="my-ranking">
          <div className="my-ranking-label">👤 你的最佳</div>
          <div className="my-ranking-info">
            <span className="my-rank">第 {myBest.rank} 名</span>
            <span className={`my-rate ${myBest.return_rate >= 0 ? 'profit' : 'loss'}`}>
              {formatReturnRate(myBest.return_rate)}
            </span>
          </div>
        </div>
      )}

      <div className="leaderboard-footer">
        <p>保存策略参与排行，展示你的交易实力！</p>
      </div>
    </div>
  );
}
