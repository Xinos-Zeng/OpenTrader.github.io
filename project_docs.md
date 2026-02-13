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

## 当前状态

**当前阶段**：阶段三 - 回测模式 ✅ 已完成

---

## 更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-02-13 | v0.1 | 初始化项目文档 |
| 2026-02-13 | v0.2 | 完成阶段一~三 |
| 2026-02-13 | v0.3 | 简化技术栈：移除 Vite/Tailwind，改用 CRA + 原生 CSS |