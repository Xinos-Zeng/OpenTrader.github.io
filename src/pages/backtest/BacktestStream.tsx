/**
 * 流式回测页面
 * 
 * 实时显示回测进度和交易信号，支持 Agent 量化助手
 * 支持从 AI 助手传入策略代码直接回测
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { Modal } from '../../components/Modal';
import { Select, DatePicker, Checkbox } from '../../components/FormControls';
import { useStrategyStore } from '../../stores/strategyStore';
import { useBacktestStore, type StreamMessage } from '../../stores/backtestStore';
import { useChatStore, type AttachedStrategy } from '../../stores/chatStore';
import { favoritesApi } from '../../api/favorites';
import { strategyApi } from '../../api/strategy';
import './BacktestStream.css';

// Agent 策略类型
interface AgentStrategy {
  name: string;
  code: string;
  description: string;
}

export default function BacktestStream() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStrategy, showToast } = useStrategyStore();
  
  // 从 Agent 传来的策略
  const agentStrategy = (location.state as { agentStrategy?: AgentStrategy })?.agentStrategy;
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
  
  // 帮助说明弹窗
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 初始化策略配置
  useEffect(() => {
    if (agentStrategy) {
      // 从 AI 助手传入的策略 - 清除其他策略选项
      setConfig({
        strategyCode: agentStrategy.code,
        userStrategyId: undefined,
        presetId: undefined,
      });
    } else if (currentStrategy) {
      // 从 Dashboard 选择的策略
      if (currentStrategy.name.startsWith('user_')) {
        // 用户保存的策略
        const userId = parseInt(currentStrategy.name.replace('user_', ''), 10);
        setConfig({
          userStrategyId: userId,
          strategyCode: undefined,
          presetId: undefined,
        });
      } else {
        // 预置策略
        setConfig({
          presetId: currentStrategy.name,
          strategyCode: undefined,
          userStrategyId: undefined,
        });
      }
    } else {
      showToast('请先选择一个交易策略', 'info');
      navigate('/dashboard');
    }
  }, [currentStrategy, agentStrategy, navigate, showToast, setConfig]);
  
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
  
  const strategyDisplayName = agentStrategy?.name || currentStrategy?.description || currentStrategy?.name || '策略';
  
  const openSaveModal = () => {
    setSaveName(`${strategyDisplayName}_${config.symbol}_回测`);
    setShowSaveModal(true);
  };
  
  const handleSave = async () => {
    if (!stats) return;
    
    setIsSaving(true);
    try {
      await favoritesApi.create({
        name: saveName,
        strategy_name: strategyDisplayName,
        symbol: config.symbol,
        start_date: config.startDate,
        end_date: config.endDate,
        params: {},
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
    setStrategyName(`${strategyDisplayName}_自定义`);
    setStrategyDesc('');
    setShowSaveStrategyModal(true);
  };
  
  const handleSaveStrategy = async () => {
    if (!strategyName.trim()) {
      showToast('请输入策略名称', 'warning');
      return;
    }
    
    // 只有 Agent 策略才能保存（因为需要代码）
    if (!agentStrategy?.code && !config.strategyCode) {
      showToast('只能保存带有代码的策略', 'warning');
      return;
    }
    
    setIsSavingStrategy(true);
    try {
      let return_rate: number | undefined;
      if (stats && config.initBalance > 0) {
        return_rate = ((stats.final_balance - config.initBalance) / config.initBalance) * 100;
      }
      
      await strategyApi.createUserStrategy({
        name: strategyName,
        code: agentStrategy?.code || config.strategyCode || '',
        description: strategyDesc || agentStrategy?.description,
        return_rate: return_rate,
        total_profit: stats?.total_profit,
        win_rate: stats ? parseFloat(stats.win_rate) : undefined,
        max_drawdown: stats?.max_drawdown,
        backtest_symbol: config.symbol,
        backtest_start: config.startDate,
        backtest_end: config.endDate,
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
  
  // 优化策略 - 跳转到 AI 助手
  const handleOptimizeStrategy = () => {
    // 获取当前策略代码
    const strategyCode = agentStrategy?.code || config.strategyCode;
    
    if (!strategyCode) {
      showToast('当前策略没有代码，无法优化', 'warning');
      return;
    }
    
    // 计算收益率
    let return_rate: number | undefined;
    if (stats && config.initBalance > 0) {
      return_rate = ((stats.final_balance - config.initBalance) / config.initBalance) * 100;
    }
    
    // 构建附加策略
    const attachedStrategy: AttachedStrategy = {
      name: strategyDisplayName,
      description: agentStrategy?.description,
      code: strategyCode,
      return_rate: return_rate,
      win_rate: stats ? parseFloat(stats.win_rate) : undefined,
      max_drawdown: stats?.max_drawdown,
    };
    
    // 跳转到 AI 助手，携带策略信息
    navigate('/agent', {
      state: { optimizeStrategy: attachedStrategy },
    });
  };
  
  // 如果既没有预置策略也没有 Agent 策略，不渲染
  if (!currentStrategy && !agentStrategy) return null;
  
  return (
    <div className="backtest-stream-page">
      <NavBar />
      
      <div className="stream-container">
        {/* 配置区域 */}
        <div className="config-section">
          <h2>回测配置</h2>
          
          <div className="config-row">
            <label>策略：{strategyDisplayName}</label>
            {agentStrategy && <span className="agent-strategy-badge">🤖 AI 生成</span>}
          </div>
          
          <div className="config-row">
            <label>期货品种</label>
            <Select
              value={config.symbol}
              onChange={(value) => setConfig({ symbol: value })}
              disabled={isRunning}
              options={[
                { value: 'SHFE.rb2505', label: '螺纹钢 rb2505' },
                { value: 'SHFE.au2506', label: '黄金 au2506' },
                { value: 'DCE.m2505', label: '豆粕 m2505' },
                { value: 'CZCE.CF505', label: '棉花 CF505' },
              ]}
            />
          </div>
          
          <div className="config-row dates">
            <div>
              <label>开始日期</label>
              <DatePicker
                value={config.startDate}
                onChange={(value) => setConfig({ startDate: value })}
                disabled={isRunning}
                max={config.endDate}
              />
            </div>
            <div>
              <label>结束日期</label>
              <DatePicker
                value={config.endDate}
                onChange={(value) => setConfig({ endDate: value })}
                disabled={isRunning}
                min={config.startDate}
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
              <Checkbox
                  checked={config.agentEnabled}
                onChange={(checked) => setConfig({ agentEnabled: checked })}
                  disabled={isRunning}
                label="启用 Agent 量化助手"
                />
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
              <h3>
                交易信号 
                {config.agentEnabled && <span className="agent-badge">🤖 Agent 已启用</span>}
                <button 
                  className="help-btn" 
                  onClick={() => setShowHelpModal(true)}
                  title="查看字段说明"
                >
                  ?
                </button>
              </h3>
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
              {(agentStrategy?.code || config.strategyCode) && (
                <button className="btn btn-optimize" onClick={handleOptimizeStrategy}>
                  🔧 优化策略
                </button>
              )}
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
            <span className="value">{strategyDisplayName}</span>
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
        title="保存策略"
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
            <span className="label">策略</span>
            <span className="value">{strategyDisplayName}</span>
          </div>
          <div className="info-item">
            <span className="label">回测品种</span>
            <span className="value">{config.symbol}</span>
          </div>
          <div className="info-item">
            <span className="label">回测区间</span>
            <span className="value">{config.startDate} ~ {config.endDate}</span>
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
      
      {/* 帮助说明弹窗 */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="📊 字段说明"
      >
        <div className="help-content">
          <h4>交易卡片字段</h4>
          <div className="help-section">
            <div className="help-item">
              <span className="help-label">余额 (Balance)</span>
              <span className="help-desc">当前账户权益 = 初始资金 + 累计平仓盈亏 + 浮动盈亏 - 手续费</span>
            </div>
            <div className="help-item">
              <span className="help-label">平仓盈亏 (Trade PnL)</span>
              <span className="help-desc">本次平仓交易的盈亏，只有平仓时才显示。开仓时不显示此字段</span>
            </div>
            <div className="help-item">
              <span className="help-label">累计盈亏 (Realized PnL)</span>
              <span className="help-desc">所有已平仓交易的盈亏总和（不包含当前持仓的浮动盈亏）</span>
            </div>
            <div className="help-item">
              <span className="help-label">浮动盈亏 (Floating PnL)</span>
              <span className="help-desc">当前持仓的未实现盈亏，随市场价格实时变动</span>
            </div>
            <div className="help-item">
              <span className="help-label">持仓市值 (Market Value)</span>
              <span className="help-desc">当前持仓的市场价值 = |持仓量| × 价格 × 合约乘数</span>
            </div>
          </div>
          
          <h4>统计结果字段</h4>
          <div className="help-section">
            <div className="help-item">
              <span className="help-label">总交易次数</span>
              <span className="help-desc">回测期间产生的所有交易信号数量（包含开仓和平仓）</span>
            </div>
            <div className="help-item">
              <span className="help-label">胜率</span>
              <span className="help-desc">盈利平仓次数 / 总平仓次数 × 100%（只计算平仓交易）</span>
            </div>
            <div className="help-item">
              <span className="help-label">总盈亏</span>
              <span className="help-desc">最终权益 - 初始资金（包含已实现和未实现盈亏）</span>
            </div>
            <div className="help-item">
              <span className="help-label">最大回撤</span>
              <span className="help-desc">从最高点到最低点的最大跌幅百分比，衡量风险水平</span>
            </div>
          </div>
          
          <div className="help-note">
            <span className="note-icon">💡</span>
            <span>所有数据均来自 TqSdk 模拟交易引擎的真实计算结果</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
