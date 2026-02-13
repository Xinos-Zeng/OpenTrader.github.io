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
