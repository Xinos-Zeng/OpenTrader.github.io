/**
 * 流式回测页面
 * 
 * 实时显示回测进度和交易信号，支持 Agent 量化助手
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { Modal } from '../../components/Modal';
import { useStrategyStore } from '../../stores/strategyStore';
import { useBacktestStore, type StreamMessage } from '../../stores/backtestStore';
import { favoritesApi } from '../../api/favorites';
import { strategyApi } from '../../api/strategy';
import './BacktestStream.css';

export default function BacktestStream() {
  const navigate = useNavigate();
  const { currentStrategy, currentParams, showToast } = useStrategyStore();
  const {
    isRunning,
    currentDate,
    trades,
    messages,  // 统一消息流
    stats,
    error,
    config,
    setConfig,
    startBacktest,
    cancelBacktest,
    clearResults,
  } = useBacktestStore();
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // 保存策略弹窗
  const [showSaveStrategyModal, setShowSaveStrategyModal] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDesc, setStrategyDesc] = useState('');
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);
  
  // 消息详情弹窗
  const [showDetailModal, setShowDetailModal] = useState(false);
  const detailListRef = useRef<HTMLDivElement>(null);
  
  // 检查是否已选择策略
  useEffect(() => {
    if (!currentStrategy) {
      showToast('请先选择一个交易策略', 'info');
      navigate('/dashboard');
    } else if (currentParams) {
      // 同步策略配置
      const params = currentParams.params || {};
      setConfig({
        strategy: currentStrategy.name,
        fastPeriod: Number(params.fast_period) || 5,
        slowPeriod: Number(params.slow_period) || 20,
      });
    }
  }, [currentStrategy, currentParams, navigate, showToast, setConfig]);
  
  // 自动滚动到最新消息
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [trades]);
  
  // 离开页面时取消回测
  useEffect(() => {
    return () => {
      if (isRunning) {
        cancelBacktest();
      }
    };
  }, [isRunning, cancelBacktest]);
  
  const handleStart = () => {
    clearResults();
    startBacktest();
  };
  
  const openSaveModal = () => {
    setSaveName(`${config.strategy}_${config.symbol}_回测`);
    setShowSaveModal(true);
  };
  
  const handleSave = async () => {
    if (!stats) return;
    
    setIsSaving(true);
    try {
      await favoritesApi.create({
        name: saveName,
        strategy_name: config.strategy,
        symbol: config.symbol,
        start_date: config.startDate,
        end_date: config.endDate,
        params: {
          fast_period: config.fastPeriod,
          slow_period: config.slowPeriod,
        },
        trades: trades.map(t => ({
          time: t.time,
          signal: t.signal,
          price: t.price,
          reason: t.reason,
        })),
        stats: stats as unknown as Record<string, unknown>,
      });
      
      showToast('保存成功！', 'success');
      setShowSaveModal(false);
    } catch (e) {
      console.error('保存失败:', e);
      showToast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const openSaveStrategyModal = () => {
    setStrategyName(`${config.strategy}_自定义`);
    setStrategyDesc('');
    setShowSaveStrategyModal(true);
  };
  
  const handleSaveStrategy = async () => {
    if (!strategyName.trim()) {
      showToast('请输入策略名称', 'warning');
      return;
    }
    
    setIsSavingStrategy(true);
    try {
      await strategyApi.createUserStrategy({
        name: strategyName,
        base_strategy: config.strategy,
        description: strategyDesc || undefined,
        params: {
          fast_period: config.fastPeriod,
          slow_period: config.slowPeriod,
        },
      });
      
      showToast('策略保存成功！', 'success');
      setShowSaveStrategyModal(false);
    } catch (e) {
      console.error('保存策略失败:', e);
      showToast('保存失败，请重试', 'error');
    } finally {
      setIsSavingStrategy(false);
    }
  };
  
  if (!currentStrategy) return null;
  
  return (
    <div className="backtest-stream-page">
      <NavBar />
      
      <div className="stream-container">
        {/* 配置区域 */}
        <div className="config-section">
          <h2>回测配置</h2>
          
          <div className="config-row">
            <label>策略：{currentStrategy.description || currentStrategy.name}</label>
          </div>
          
          <div className="config-row">
            <label>期货品种</label>
            <select
              value={config.symbol}
              onChange={(e) => setConfig({ symbol: e.target.value })}
              disabled={isRunning}
            >
              <option value="SHFE.rb2505">螺纹钢 rb2505</option>
              <option value="SHFE.au2506">黄金 au2506</option>
              <option value="DCE.m2505">豆粕 m2505</option>
              <option value="CZCE.CF505">棉花 CF505</option>
            </select>
          </div>
          
          <div className="config-row dates">
            <div>
              <label>开始日期</label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ startDate: e.target.value })}
                disabled={isRunning}
              />
            </div>
            <div>
              <label>结束日期</label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig({ endDate: e.target.value })}
                disabled={isRunning}
              />
            </div>
          </div>
          
          <div className="config-row params">
            <div>
              <label>快线周期</label>
              <input
                type="number"
                value={config.fastPeriod}
                onChange={(e) => setConfig({ fastPeriod: Number(e.target.value) })}
                disabled={isRunning}
                min={1}
                max={50}
              />
            </div>
            <div>
              <label>慢线周期</label>
              <input
                type="number"
                value={config.slowPeriod}
                onChange={(e) => setConfig({ slowPeriod: Number(e.target.value) })}
                disabled={isRunning}
                min={1}
                max={100}
              />
            </div>
          </div>
          
          <div className="config-row balance-position">
            <div>
              <label>初始资金</label>
              <input
                type="number"
                value={config.initBalance}
                onChange={(e) => setConfig({ initBalance: Number(e.target.value) })}
                disabled={isRunning}
                min={10000}
                step={10000}
              />
            </div>
            <div>
              <label>仓位比例</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={config.positionPercent}
                  onChange={(e) => setConfig({ positionPercent: Number(e.target.value) })}
                  disabled={isRunning}
                  min={10}
                  max={100}
                  step={5}
                />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>
          
          {/* Agent 配置 - 固定布局避免勾选时跳动 */}
          <div className="config-row agent-config">
            <div className="agent-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.agentEnabled}
                  onChange={(e) => setConfig({ agentEnabled: e.target.checked })}
                  disabled={isRunning}
                />
                <span>启用 Agent 量化助手</span>
              </label>
            </div>
            <div className={`agent-interval-inline ${!config.agentEnabled ? 'disabled' : ''}`}>
              <span className="interval-label">检测周期</span>
              <input
                type="number"
                value={config.agentInterval}
                onChange={(e) => setConfig({ agentInterval: Number(e.target.value) })}
                disabled={isRunning || !config.agentEnabled}
                min={5}
                max={365}
              />
              <span className="interval-unit">天</span>
            </div>
          </div>
          
          <div className="config-actions">
            {!isRunning ? (
              <button className="btn btn-primary" onClick={handleStart}>
                开始回测
              </button>
            ) : (
              <button className="btn btn-danger" onClick={cancelBacktest}>
                取消回测
              </button>
            )}
          </div>
        </div>
        
        {/* 消息流区域 */}
        <div className="message-section">
          <div className="message-header">
            <div className="header-left">
              <h3>交易信号 {config.agentEnabled && <span className="agent-badge">🤖 Agent 已启用</span>}</h3>
              {isRunning && currentDate && (
                <span className="progress-date">正在回测: {currentDate}</span>
              )}
            </div>
            {messages.length > 0 && (
              <button className="btn-detail" onClick={() => setShowDetailModal(true)}>
                📋 查看详情
              </button>
            )}
          </div>
          
          <div className="message-list">
            {messages.length === 0 && !isRunning && !error && (
              <div className="empty-message">
                点击"开始回测"查看实时交易信号
              </div>
            )}
            
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
            
            {messages.map((msg, idx) => 
              msg.type === 'trade' ? (
                <div
                  key={`trade-${msg.data.id}`}
                  className={`trade-message ${msg.data.signal.toLowerCase()}`}
                >
                  <div className="trade-header">
                    <div className="trade-time">{msg.data.time}</div>
                    <div className="trade-info">
                      <span className={`signal ${msg.data.signal.toLowerCase()}`}>
                        {msg.data.signal === 'BUY' ? '📈 买入' : '📉 卖出'}
                      </span>
                      <span className="price">@ {msg.data.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="trade-reason">{msg.data.reason}</div>
                  {/* 财务信息 */}
                  <div className="trade-finance">
                    <div className="finance-item">
                      <span className="finance-label">余额</span>
                      <span className="finance-value">{msg.data.balance?.toLocaleString() ?? '-'}</span>
                    </div>
                    {msg.data.trade_pnl !== undefined && msg.data.trade_pnl !== 0 && (
                      <div className="finance-item">
                        <span className="finance-label">平仓盈亏</span>
                        <span className={`finance-value ${msg.data.trade_pnl >= 0 ? 'profit' : 'loss'}`}>
                          {msg.data.trade_pnl >= 0 ? '+' : ''}{msg.data.trade_pnl.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="finance-item">
                      <span className="finance-label">累计盈亏</span>
                      <span className={`finance-value ${(msg.data.realized_pnl ?? 0) >= 0 ? 'profit' : 'loss'}`}>
                        {(msg.data.realized_pnl ?? 0) >= 0 ? '+' : ''}{msg.data.realized_pnl?.toLocaleString() ?? '0'}
                      </span>
                    </div>
                    <div className="finance-item">
                      <span className="finance-label">持仓市值</span>
                      <span className="finance-value">{msg.data.market_value?.toLocaleString() ?? '-'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={`agent-${msg.data.id}`}
                  className={`agent-message ${msg.data.action}`}
                >
                  <div className="agent-header">
                    <span className="agent-icon">🤖</span>
                    <span className="agent-title">Agent 量化助手</span>
                    <span className="agent-time">{msg.data.time}</span>
                  </div>
                  <div className="agent-content">
                    <p className="agent-text">{msg.data.message}</p>
                    {msg.data.action === 'adjusted' && msg.data.params_before && msg.data.params_after && (
                      <div className="agent-params-change">
                        <div className="params-before">
                          <span className="label">调整前：</span>
                          {Object.entries(msg.data.params_before).map(([k, v]) => (
                            <span key={k} className="param">{k}={v}</span>
                          ))}
                        </div>
                        <div className="params-arrow">→</div>
                        <div className="params-after">
                          <span className="label">调整后：</span>
                          {Object.entries(msg.data.params_after).map(([k, v]) => (
                            <span key={k} className="param">{k}={v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.data.reason && (
                      <p className="agent-reason">💡 {msg.data.reason}</p>
                    )}
                  </div>
                </div>
              )
            )}
            
            {isRunning && (
              <div className="loading-message">
                <span className="spinner"></span>
                回测进行中...
              </div>
            )}
            
            <div ref={messageEndRef} />
          </div>
        </div>
        
        {/* 统计结果区域 */}
        {stats && (
          <div className="stats-section">
            <h3>回测结果</h3>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total_trades}</div>
                <div className="stat-label">总交易次数</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.win_rate}</div>
                <div className="stat-label">胜率</div>
              </div>
              <div className={`stat-card ${stats.total_profit >= 0 ? 'profit' : 'loss'}`}>
                <div className="stat-value">
                  {stats.total_profit >= 0 ? '+' : ''}{stats.total_profit.toFixed(2)}
                </div>
                <div className="stat-label">总盈亏</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.max_drawdown.toFixed(2)}%</div>
                <div className="stat-label">最大回撤</div>
              </div>
            </div>
            
            <div className="stats-actions">
              <button className="btn btn-primary" onClick={openSaveModal}>
                💾 保存到收藏
              </button>
              <button className="btn btn-secondary" onClick={openSaveStrategyModal}>
                ⚙️ 保存策略参数
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/favorites')}>
                📋 查看收藏
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 保存弹窗 */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="保存回测结果"
      >
        <div className="form-group">
          <label>收藏名称</label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="输入收藏名称"
          />
        </div>
        
        <div className="info-list">
          <div className="info-item">
            <span className="label">策略</span>
            <span className="value">{config.strategy}</span>
          </div>
          <div className="info-item">
            <span className="label">品种</span>
            <span className="value">{config.symbol}</span>
          </div>
          <div className="info-item">
            <span className="label">回测区间</span>
            <span className="value">{config.startDate} ~ {config.endDate}</span>
          </div>
          <div className="info-item">
            <span className="label">交易次数</span>
            <span className="value">{stats?.total_trades}</span>
          </div>
          <div className="info-item">
            <span className="label">总盈亏</span>
            <span className={`value ${stats && stats.total_profit >= 0 ? 'profit' : 'loss'}`}>
              {stats && stats.total_profit >= 0 ? '+' : ''}{stats?.total_profit.toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="modal-footer" style={{ margin: '20px -24px -20px', padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: '#f9fafb', display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSaveModal(false)}
            disabled={isSaving}
            style={{ flex: 1 }}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{ flex: 1 }}
          >
            {isSaving ? '保存中...' : '确认保存'}
          </button>
        </div>
      </Modal>
      
      {/* 保存策略弹窗 */}
      <Modal
        isOpen={showSaveStrategyModal}
        onClose={() => setShowSaveStrategyModal(false)}
        title="保存策略参数"
      >
        <div className="form-group">
          <label>策略名称</label>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            placeholder="给策略起个名字"
          />
        </div>
        
        <div className="form-group">
          <label>描述 (可选)</label>
          <input
            type="text"
            value={strategyDesc}
            onChange={(e) => setStrategyDesc(e.target.value)}
            placeholder="简单描述一下这个策略"
          />
        </div>
        
        <div className="info-list">
          <div className="info-item">
            <span className="label">基础策略</span>
            <span className="value">{config.strategy}</span>
          </div>
          <div className="info-item">
            <span className="label">快线周期</span>
            <span className="value">{config.fastPeriod}</span>
          </div>
          <div className="info-item">
            <span className="label">慢线周期</span>
            <span className="value">{config.slowPeriod}</span>
          </div>
        </div>
        
        <div className="modal-footer" style={{ margin: '20px -24px -20px', padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: '#f9fafb', display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSaveStrategyModal(false)}
            disabled={isSavingStrategy}
            style={{ flex: 1 }}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveStrategy}
            disabled={isSavingStrategy}
            style={{ flex: 1 }}
          >
            {isSavingStrategy ? '保存中...' : '保存策略'}
          </button>
        </div>
      </Modal>
      
      {/* 消息详情弹窗 - 全屏展示 */}
      {showDetailModal && (
        <div className="detail-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <h2>交易信号详情</h2>
              <div className="detail-stats">
                <span>共 {messages.length} 条消息</span>
                <span>交易 {trades.length} 笔</span>
              </div>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="detail-modal-body" ref={detailListRef}>
              {messages.map((msg, idx) => 
                msg.type === 'trade' ? (
                  <div
                    key={`detail-trade-${msg.data.id}`}
                    className={`detail-trade ${msg.data.signal.toLowerCase()}`}
                  >
                    <div className="detail-trade-main">
                      <span className="detail-time">{msg.data.time}</span>
                      <span className={`detail-signal ${msg.data.signal.toLowerCase()}`}>
                        {msg.data.signal === 'BUY' ? '📈 买入' : '📉 卖出'}
                      </span>
                      <span className="detail-price">@ {msg.data.price.toFixed(2)}</span>
                      <span className="detail-reason">{msg.data.reason}</span>
                    </div>
                    <div className="detail-trade-finance">
                      <span>余额: {msg.data.balance?.toLocaleString()}</span>
                      {msg.data.trade_pnl !== undefined && msg.data.trade_pnl !== 0 && (
                        <span className={msg.data.trade_pnl >= 0 ? 'profit' : 'loss'}>
                          盈亏: {msg.data.trade_pnl >= 0 ? '+' : ''}{msg.data.trade_pnl.toLocaleString()}
                        </span>
                      )}
                      <span className={(msg.data.realized_pnl ?? 0) >= 0 ? 'profit' : 'loss'}>
                        累计: {(msg.data.realized_pnl ?? 0) >= 0 ? '+' : ''}{msg.data.realized_pnl?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div key={`detail-agent-${msg.data.id}`} className={`detail-agent ${msg.data.action}`}>
                    <span className="detail-time">{msg.data.time}</span>
                    <span className="detail-agent-icon">🤖</span>
                    <span className="detail-agent-msg">{msg.data.message}</span>
                    {msg.data.action === 'adjusted' && msg.data.params_after && (
                      <span className="detail-params">
                        → {Object.entries(msg.data.params_after).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
