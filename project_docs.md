# OpenTrader - 量化交易可视化平台

## 项目概述

OpenTrader 是 AgentTrader 自进化量化交易框架的 Web 前端，提供简约清新的可视化界面，让用户能够直观地体验 AI Agent 驱动的量化交易策略优化过程。

## 设计原则

1. **简约清新**：界面保持简洁，信息层次清晰，避免视觉干扰
2. **移动优先**：响应式设计，兼顾移动端体验
3. **卡片化布局**：核心信息以卡片形式呈现，便于浏览和交互
4. **增量开发**：每个阶段交付可运行的完整功能
5. **代码精简**：不过度设计，轻量化优先，能快速跑起来

---

## 技术栈

| 分类 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 | Hooks + TypeScript |
| 构建 | Create React App | react-scripts，零配置 |
| 样式 | 原生 CSS | CSS 变量 + 自定义类 |
| 路由 | React Router | 单页应用路由 |
| 状态 | Zustand | 轻量级状态管理 |
| 请求 | Axios | HTTP 客户端 |
| 图表 | Recharts | 数据可视化 |

---

## 项目结构

```
src/
├── api/              # API 请求封装
│   ├── client.ts     # Axios 实例配置
│   ├── auth.ts       # 认证相关 API
│   ├── strategy.ts   # 策略相关 API
│   └── trade.ts      # 交易相关 API
├── components/       # 通用组件
│   ├── NavBar.tsx    # 导航栏
│   ├── StrategyCard.tsx
│   └── StatsCard.tsx
├── pages/            # 页面组件
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   └── backtest/
├── stores/           # Zustand 状态
│   ├── authStore.ts
│   └── strategyStore.ts
├── types/            # TypeScript 类型
├── index.tsx         # 入口
├── App.tsx           # 路由配置
└── index.css         # 全局样式
```

---

## 运行方式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

---

## 开发阶段

### 阶段一~三：基础功能 ✅ 已完成

- 用户登录/注册
- Dashboard 策略选择
- 回测配置和结果展示

---

### 阶段四：流式回测与收藏功能 ✅ 已完成

**目标**：实现回测过程的实时流式展示，支持收藏回测结果

**功能需求**：
1. 回测发起后实时显示每笔交易信号（消息流）
2. 每用户同时只能进行一个回测
3. 离开页面或手动取消可终止回测
4. 回测完成后可保存到收藏
5. 收藏列表页面展示历史回测
6. 收藏详情页显示完整信息

**页面/组件**：
| 文件 | 说明 |
|------|------|
| `pages/backtest/BacktestStream.tsx` | 流式回测页面 |
| `pages/Favorites.tsx` | 收藏列表页 |
| `pages/FavoriteDetail.tsx` | 收藏详情页 |
| `stores/backtestStore.ts` | 回测状态管理 |
| `api/favorites.ts` | 收藏 API |

---

### 阶段五：参数调整与策略保存 🚧 进行中

**目标**：允许用户调整策略参数并保存为自定义策略，Dashboard 展示用户保存的策略

**功能需求**：
1. 用户可以修改策略参数后保存为自己的策略
2. Dashboard 分为两区：系统策略 + 我的策略
3. 我的策略支持删除操作
4. 用户保存的策略可直接用于回测

**技术方案**：
- 后端新增用户策略表 `user_strategies`
- 后端新增策略 CRUD API
- 前端 Dashboard 分区展示
- 前端回测页面增加"保存策略"功能

**API 设计**：
```
POST   /api/strategies       # 保存策略
GET    /api/strategies       # 获取用户策略列表
DELETE /api/strategies/{id}  # 删除策略
```

**页面/组件**：
| 文件 | 说明 |
|------|------|
| `pages/Dashboard.tsx` | 新增我的策略区域 |
| `components/Modal.tsx` | 保存策略弹窗 |
| `api/strategy.ts` | 策略 CRUD API |

**验收标准**：
- [ ] Dashboard 下方显示"我的策略"区域
- [ ] 用户可以保存自定义策略（自定义名称和参数）
- [ ] 我的策略卡片支持删除
- [ ] 用户策略可以直接选择用于回测

---

### 阶段六：Agent 交互 ✅ 已完成

**目标**：在回测过程中引入 AI Agent 量化助手，实现自动策略优化

**功能需求**：
1. 回测界面新增 Agent 配置选项：
   - 勾选框：启用 Agent 量化助手
   - 输入框：检测周期（每 X 天 Agent 介入分析）
2. 启用 Agent 后的回测流程：
   - 每到达检测周期，暂停回测
   - Agent 分析近期交易数据，判断是否需要调整策略参数
   - 如需调整，应用新参数后继续回测
3. Agent 消息卡片展示：
   - 在消息流中显示 Agent 的分析过程和建议
   - 显示参数调整内容（如有）

**技术方案**：
- 后端 `run_stream` 方法新增 Agent 周期检测逻辑
- 后端调用 `TradingAgent.analyze_and_optimize()` 方法
- SSE 新增 `agent` 类型消息推送 Agent 分析结果
- 前端新增 Agent 消息卡片样式

**API 设计**：
```
# 回测 SSE 端点新增参数
GET /api/backtest/stream
  ?agent_enabled=true       # 启用 Agent
  &agent_interval=30        # 检测周期（天）
```

**SSE 消息类型新增**：
```json
{"type": "agent", "data": {
  "action": "analyzing",    // analyzing | adjusted | no_change
  "message": "正在分析近30天交易数据...",
  "params_before": {...},   // 调整前参数（如有调整）
  "params_after": {...}     // 调整后参数（如有调整）
}}
```

**验收标准**：
- [ ] 回测界面可勾选启用 Agent
- [ ] 可设置 Agent 检测周期
- [ ] 回测过程中 Agent 定期介入分析
- [ ] Agent 分析和调整过程以消息卡片展示
- [ ] Agent 调整参数后回测使用新参数继续

---

### 阶段七：模拟交易 ⏳ 待开始

实时模拟交易监控（类似流式回测，但持续运行），需要后端支持

---

## 当前状态

**当前阶段**：阶段六 - Agent 交互

**进度**：✅ 已完成

---

## 更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-02-13 | v0.1 | 初始化项目文档 |
| 2026-02-13 | v0.2 | 完成阶段一~三 |
| 2026-02-13 | v0.3 | 简化技术栈：移除 Vite/Tailwind，改用 CRA + 原生 CSS |
| 2026-02-14 | v0.4 | 完成阶段四：流式回测与收藏功能 |
| 2026-02-14 | v0.5 | 完成阶段五：参数调整与策略保存 |
| 2026-02-14 | v0.6 | 开始阶段六：Agent 交互