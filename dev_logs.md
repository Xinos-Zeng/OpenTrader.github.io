# OpenTrader 开发日志

本文件记录各阶段的开发细节和实现日志。

---

## 阶段一~三：项目初始化、认证、Dashboard、回测

### 开发状态：✅ 已完成

### 完成时间：2026-02-13

### 项目结构

```
OpenTrader.github.io/
├── public/
│   └── index.html
├── src/
│   ├── api/                # API 封装
│   │   ├── client.ts       # Axios 实例
│   │   ├── auth.ts         # 认证 API
│   │   ├── strategy.ts     # 策略 API
│   │   └── trade.ts        # 交易 API
│   ├── components/         # 公共组件 (带独立 CSS)
│   │   ├── NavBar.tsx / NavBar.css
│   │   ├── StrategyCard.tsx / StrategyCard.css
│   │   └── StatsCard.tsx / StatsCard.css
│   ├── pages/              # 页面 (带独立 CSS)
│   │   ├── Login.tsx / Auth.css
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx / Dashboard.css
│   │   └── backtest/
│   │       ├── BacktestSetup.tsx
│   │       ├── BacktestResult.tsx
│   │       └── Backtest.css
│   ├── stores/             # 状态管理
│   │   ├── authStore.ts
│   │   └── strategyStore.ts
│   ├── types/index.ts      # TypeScript 类型
│   ├── App.tsx             # 根组件 + 路由
│   ├── index.tsx           # 入口 (CRA 格式)
│   └── index.css           # 全局样式 + CSS 变量
├── package.json
└── tsconfig.json
```

### 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 4.9.5 | 类型安全 |
| Create React App | 5.0.1 | 构建工具 (react-scripts) |
| 原生 CSS | - | CSS 变量 + 自定义类 |
| React Router | 6.26.0 | 路由 |
| Zustand | 4.5.0 | 状态管理 |
| Axios | 1.7.0 | HTTP 客户端 |
| Recharts | 2.12.0 | 图表 |

### 实现功能

#### 1. 认证模块
- 登录页面：用户名/密码登录
- 注册页面：用户名/邮箱/密码注册
- JWT Token 自动管理和刷新
- 路由守卫：未登录自动跳转登录页

#### 2. Dashboard
- 策略列表展示
- 策略卡片组件（显示名称、描述、默认参数）
- 策略选择功能

#### 3. 回测模块
- 回测配置页面
  - 日期范围选择
  - 期货品种选择
  - 策略参数调整
- 回测结果页面
  - 关键指标卡片（收益、胜率、最大回撤等）
  - 历史回测列表

### 验收清单

- [x] `npm start` 可启动开发服务器
- [x] 用户可以注册新账号
- [x] 用户可以登录并跳转到 Dashboard
- [x] Token 过期自动刷新或跳转登录
- [x] Dashboard 显示所有可用策略模板
- [x] 策略卡片展示名称、描述、默认参数
- [x] 可配置回测的起止日期和品种
- [x] 可调整策略参数后回测
- [x] 回测完成后显示关键指标
- [x] 响应式布局，移动端正常显示

### 启动方式

```bash
# 安装依赖
npm install

# 开发模式 (端口 3000)
npm start

# 构建生产版本
npm run build
```

### 环境变量

创建 `.env` 文件配置后端 API 地址：

```
REACT_APP_API_URL=http://localhost:8000
```

---

## 阶段四：模拟交易模式

### 开发状态：⏳ 待开始

**依赖后端 API**：
- `POST /api/simulation/start`
- `POST /api/simulation/stop`
- `GET /api/simulation/status`

---

## 阶段五：参数调整与策略保存

### 开发状态：⏳ 待开始

---

## 阶段六：Agent 交互

### 开发状态：⏳ 待开始

---

## 阶段七：用户设置与完善

### 开发状态：⏳ 待开始

---

## 阶段四开发记录

### ✅ 流式回测与收藏功能 (2026-02-14)

**已完成功能**：
1. ✅ 每个用户同时只能进行一次回测
2. ✅ 交易记录流式返回（实时显示每笔交易）
3. ✅ 退出页面终止回测
4. ✅ 回测完成后可保存到收藏
5. ✅ 收藏列表和详情页面

**后端改动**：
- `AgentTrader/src/strategy/backtest.py`：新增 `run_stream()` 生成器方法
- `AgentTrader/src/api/routers/backtest.py`：SSE 端点 `/api/backtest/stream`
- `AgentTrader/src/api/routers/favorites.py`：收藏 CRUD API
- `AgentTrader/src/monitor/database.py`：新增 `UserFavorite` 模型和方法
- `AgentTrader/migrations/schema.sql`：新增 `user_favorites` 表

**前端改动**：
- `src/stores/backtestStore.ts`：流式回测状态管理
- `src/pages/backtest/BacktestStream.tsx`：流式回测页面
- `src/pages/backtest/BacktestSave.tsx`：保存回测结果
- `src/pages/Favorites.tsx`：收藏列表
- `src/pages/FavoriteDetail.tsx`：收藏详情
- `src/api/favorites.ts`：收藏 API 封装
- `src/components/NavBar.tsx`：新增收藏导航链接

---

### ✅ 已完成 (2026-02-14 参数调整与策略保存)

**阶段五：参数调整与策略保存**

**1. 弹窗样式修复**
- 修复 Modal 遮罩透明问题
- 添加 `backdrop-filter: blur(4px)` 毛玻璃效果
- 确保弹窗背景不透明 (`background: #ffffff`)
- 添加 CSS 变量：`--color-card-background`, `--color-text`, `--color-border` 等

**2. 后端用户策略 API**
- 新增 `UserStrategy` 模型 (`src/monitor/database.py`)
- 新增策略 CRUD 方法
- 新增 API 路由 (`src/api/routers/user_strategy.py`)
- 注册路由到 `main.py`

**3. 前端功能**
- Dashboard 分区显示：系统策略 + 我的策略
- 我的策略卡片支持删除（使用 ConfirmModal）
- BacktestStream 新增"保存策略参数"功能
- strategyStore 新增 `selectUserStrategy` 方法

**涉及文件**：
- `src/index.css` (新增 CSS 变量)
- `src/components/Modal.css` (修复透明问题)
- `src/pages/Dashboard.tsx` (新增我的策略区域)
- `src/pages/Dashboard.css` (新增样式)
- `src/pages/backtest/BacktestStream.tsx` (新增保存策略功能)
- `src/stores/strategyStore.ts` (新增 selectUserStrategy)
- `src/api/strategy.ts` (新增用户策略 API)
- `AgentTrader/src/monitor/database.py` (新增 UserStrategy 模型)
- `AgentTrader/src/api/routers/user_strategy.py` (新增)
- `AgentTrader/main.py` (注册路由)
- `AgentTrader/migrations/schema.sql` (新增 user_strategies 表)

---

## 阶段六：Agent 交互

### 开发状态：✅ 已完成

### 完成时间：2026-02-14

### 功能概述

在回测过程中引入 AI Agent 量化助手，实现自动策略分析和参数优化。

### 实现细节

**1. 后端 Agent 回测集成**

- `TradingAgent` 新增 `analyze_for_backtest()` 方法
  - 接收最近交易记录和当前参数
  - 计算胜率、盈亏等统计指标
  - 调用 LLM 分析是否需要调整参数
  - 返回结构化的分析结果（JSON）

- `Backtester` 新增 `run_stream_with_agent()` 方法
  - 在指定检测周期（默认30天）触发 Agent 分析
  - 如果 Agent 建议调整参数，更新策略参数
  - 通过 SSE 推送 Agent 事件（analyzing/adjusted/no_change）

- `BaseStrategy` 新增 `update_params()` 方法
- `MAStrategy` 重写 `update_params()` 以重置均线状态

**2. 后端 API 更新**

回测 SSE 端点新增参数：
```
GET /api/backtest/stream
  ?agent_enabled=true       # 启用 Agent
  &agent_interval=30        # 检测周期（天）
```

新增 SSE 消息类型：
```json
{
  "type": "agent",
  "data": {
    "action": "analyzing|adjusted|no_change",
    "message": "分析内容",
    "params_before": {...},  // 调整前参数
    "params_after": {...}    // 调整后参数
  }
}
```

**3. 前端配置 UI**

- 回测配置区域新增：
  - Agent 启用开关（复选框）
  - Agent 检测周期输入框

**4. 前端消息流**

- `backtestStore` 新增：
  - `AgentMessage` 类型定义
  - `messages` 统一消息流数组
  - `agentEnabled` / `agentInterval` 配置

- `BacktestStream.tsx` 更新：
  - 渲染 trade 和 agent 两种消息类型
  - Agent 消息卡片显示分析内容和参数变化

**5. Agent 消息卡片样式**

- 三种状态样式：
  - `analyzing`：黄色边框，分析中
  - `adjusted`：绿色边框，参数已调整
  - `no_change`：灰色边框，保持不变
- 参数变化对比展示（红色→绿色）
- 渐变背景 + 动画效果

### 涉及文件

**后端**：
- `AgentTrader/src/agent/trading_agent.py` (新增 analyze_for_backtest)
- `AgentTrader/src/strategy/backtest.py` (新增 run_stream_with_agent)
- `AgentTrader/src/strategy/base.py` (新增 update_params)
- `AgentTrader/src/strategy/ma_strategy.py` (重写 update_params)
- `AgentTrader/src/api/routers/backtest.py` (新增 agent 参数)

**前端**：
- `src/stores/backtestStore.ts` (新增 Agent 状态和消息)
- `src/pages/backtest/BacktestStream.tsx` (新增 Agent UI)
- `src/pages/backtest/BacktestStream.css` (新增 Agent 样式)