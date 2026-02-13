import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStrategyStore } from '../../stores/strategyStore';
import NavBar from '../../components/NavBar';
import './Backtest.css';

export default function BacktestSetup() {
  const navigate = useNavigate();
  const { currentStrategy, currentParams, updateParams, runBacktest, isLoading, error, clearError } = useStrategyStore();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [form, setForm] = useState({
    startDate: thirtyDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    symbol: (currentParams?.params?.symbol as string) || 'SHFE.rb2505',
    fastPeriod: (currentParams?.params?.fast_period as number) || 5,
    slowPeriod: (currentParams?.params?.slow_period as number) || 20,
  });

  useEffect(() => {
    if (!currentStrategy) {
      navigate('/dashboard');
    }
  }, [currentStrategy, navigate]);

  const symbols = [
    { code: 'SHFE.rb2505', name: '螺纹钢2505' },
    { code: 'SHFE.au2506', name: '黄金2506' },
    { code: 'SHFE.cu2505', name: '铜2505' },
    { code: 'DCE.i2505', name: '铁矿石2505' },
    { code: 'CZCE.MA505', name: '甲醇505' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    updateParams({
      fast_period: form.fastPeriod,
      slow_period: form.slowPeriod,
      symbol: form.symbol,
    });

    const success = await runBacktest({
      strategy_name: currentStrategy?.name || 'ma_strategy',
      symbol: form.symbol,
      start_date: form.startDate,
      end_date: form.endDate,
      params: {
        fast_period: form.fastPeriod,
        slow_period: form.slowPeriod,
        symbol: form.symbol,
      },
    });

    if (success) {
      navigate('/backtest/result');
    }
  };

  if (!currentStrategy) {
    return null;
  }

  return (
    <div className="page">
      <NavBar />
      
      <main className="container backtest-content">
        <div className="page-header">
          <button onClick={() => navigate('/dashboard')} className="back-link">
            ← 返回策略选择
          </button>
          <h1>回测配置</h1>
          <p>策略：{currentStrategy.name}</p>
        </div>

        <div className="card backtest-form-card">
          {error && (
            <div className="error-box">
              {error}
              <button onClick={clearError}>✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>回测区间</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">开始日期</label>
                  <input
                    type="date"
                    className="input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">结束日期</label>
                  <input
                    type="date"
                    className="input"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>期货品种</h3>
              <select
                className="input"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              >
                {symbols.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <h3>策略参数</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">快线周期</label>
                  <input
                    type="number"
                    className="input"
                    value={form.fastPeriod}
                    onChange={(e) => setForm({ ...form, fastPeriod: parseInt(e.target.value) || 5 })}
                    min={1}
                    max={100}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">慢线周期</label>
                  <input
                    type="number"
                    className="input"
                    value={form.slowPeriod}
                    onChange={(e) => setForm({ ...form, slowPeriod: parseInt(e.target.value) || 20 })}
                    min={1}
                    max={100}
                    required
                  />
                </div>
              </div>
              <p className="form-hint">提示：快线应小于慢线周期</p>
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? '提交回测中...' : '开始回测'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
