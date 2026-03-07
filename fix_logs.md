## 问题修复记录

如果修复完成，将内容移到已修复中。
修复后不需要你重启服务，我会自己重启。

### 待修复/优化
2. 现在的AI对话界面移动端不友好，主要是左侧的历史对话栏会挡住对话界面导致没办法输入，并且历史对话栏的收起按钮在移动端也看不到。

---

### 已修复

**GitHub Pages 404 问题** [前端+部署]
   - 问题：刷新页面或直接访问子路由（如 `/dashboard`）时返回 404
   - 原因：
     1. `build/index.html` 是压缩版本，丢失了 SPA 路由脚本
     2. `build/404.html` 可能未正确复制
   - 修复：
     - `.github/workflows/deploy.yml`：
       - 构建后显式复制 `public/404.html` 到 `build/404.html`
       - 使用 sed 在 `build/index.html` 的 `</head>` 前注入 SPA 路由脚本
     - `public/404.html`：
       - 添加登录检查逻辑（参考 currency.github.io 项目）
       - 未登录用户访问受保护路由时，先保存目标路径到 sessionStorage，然后重定向到 `/login`
   - 涉及文件：
     - `.github/workflows/deploy.yml`
     - `public/404.html`

**登录后系统策略 loading 无限循环** [前端] 
   - 问题：部署到 GitHub Pages 后登录成功，系统策略一直显示 loading 状态
   - 原因分析：
     1. `strategyStore.ts` 中 `fetchStrategies` 等方法，当 `response.data` 为空时没有重置 `isLoading`
     2. `client.ts` 拦截器存在并发刷新 Token 竞态问题，多个 401 并发刷新导致失败
     3. GitHub Pages 不支持 SPA 路由，拦截器重定向到 `/login` 会 404
     4. GitHub Actions 构建时缺少 `REACT_APP_API_URL` 环境变量
   - 修复：
     - `src/stores/strategyStore.ts`：所有异步方法（`fetchStrategies`、`fetchParams`、`fetchBacktestResults`）确保无论成功失败都重置 `isLoading`
     - `src/api/client.ts`：添加 Token 刷新锁 + 请求队列，防止并发刷新；改进重定向逻辑兼容 GitHub Pages
     - `public/404.html`：新增 SPA 路由重定向支持
     - `public/index.html`：添加路径恢复脚本
     - `.github/workflows/deploy.yml`：构建时添加 `REACT_APP_API_URL` 环境变量

**登录错误提示和用户体验优化** [前端]
   - 问题：
     1. 登录时用户名不存在，错误提示一闪而过
     2. 登录后右上角显示"用户"而不是用户名
     3. 退出后登录按钮显示"登录中"状态
   - 修复：
     - `src/pages/Login.tsx`：添加错误消息自动清除机制（3秒后），提交前清除旧错误
     - `src/stores/authStore.ts`：
       - `login` 方法登录成功后立即获取用户信息
       - `fetchUser` 方法添加更详细的错误日志和空数据处理
       - `logout` 方法同时重置 `isLoading` 和 `error` 状态

**TqSim 回测数据显示修复** [后端]
   - 问题：回测结果中累计盈亏、总盈亏、最大回撤等数据都显示为 0
   - 原因：
     1. `api.close()` 之后再读取 `account` 对象，此时数据已无效
     2. `trade_pnl` 错误地使用累计盈亏，而非本次交易盈亏
   - 修复：`AgentTrader/src/strategy/backtest.py`
     - 在 `BacktestFinished` 异常中保存 `final_balance` 和 `final_close_profit`
     - 跟踪 `prev_close_profit` 来计算每笔交易的真实盈亏：`trade_pnl = current_close_profit - prev_close_profit`
     - 新增 `_calculate_stats_from_trades()` 方法使用保存的数据计算统计
     - `run_stream` 和 `run_stream_with_agent` 均已更新

**回测改用 TqSim 模拟交易** [后端]
   - 问题：之前回测只使用 TqSdk 获取 K 线数据，盈亏计算是手动实现的，TqSdk 日志显示账户数据全为 0
   - 修复：`AgentTrader/src/strategy/backtest.py`
     - 导入并使用 `TqSim` 模拟账户：`sim_account = TqSim(init_balance=init_balance)`
     - 将日线（`60*60*24`）改为小时线（`60*60`），解决"日线时间戳不在交易时段"的下单失败问题
     - 使用 `api.insert_order()` 真实下单，而非手动计算盈亏
     - 从 `api.get_account()` 和 `api.get_position()` 获取真实账户数据
     - `run_stream` 和 `run_stream_with_agent` 均已更新
   - 效果：TqSdk 日志将显示真实的模拟交易数据（余额、盈亏、保证金等）

**信息流延迟问题 - 流式传输优化** [后端]
   - 问题：回测需要等待整个回测完成才能接收消息流，而非逐步流式
   - 原因：之前使用同步 `queue.Queue` 配合 `threading.Thread`，在异步生成器中没有正确释放控制权
   - 修复：`AgentTrader/src/api/routers/backtest.py`
     - 改用 `asyncio.Queue` 替代同步队列
     - 使用 `loop.call_soon_threadsafe()` 线程安全地将事件放入异步队列
     - 使用 `asyncio.create_task()` 在后台运行回测
     - 每次 yield 后添加 `await asyncio.sleep(0.01)` 确保数据被刷新发送
     - 移除了不再需要的 `queue` 和 `threading` 导入

**Agent 工具调用日志增强** [后端]
   - 问题：Agent 调用工具时日志信息不够详细
   - 修复：`AgentTrader/src/agent/trading_agent.py`
     - 工具调用日志添加 emoji 图标 🔧
     - 分行显示工具名、参数、返回结果
     - 结果超过500字符时自动截取并添加省略号

**移除"每次交易手数"配置** [前端]
   - 问题：回测界面不需要再展示"每次交易手数"配置项
   - 修复：`OpenTrader/src/pages/backtest/BacktestStream.tsx`
     - 移除了 `config-row balance-position` 中的"每次交易手数"输入框
     - 保留后端参数支持（默认值为1），保持向后兼容

**绿色数值字号太大** [前端]
   - 问题：交易信号窗口中绿色数值字号太大
   - 修复：`BacktestStream.css` 中 `.finance-value` 添加 `font-size: 12px`

**仓位百分比控制** [前端+后端]
   - 问题：只有每次交易手数设置，缺少仓位百分比控制；买卖只能交替进行
   - 修复：
     - 后端新增 `position_percent` 参数（0-100%），控制最大可用资金比例
     - 后端回测逻辑改为：支持连续同向开仓（加仓），仓位不超过 `资金*百分比/保证金率`
     - 前端新增"仓位比例"输入框（带%后缀），与初始资金同行
     - 默认初始资金改为 200,000
   - 涉及文件：
     - `AgentTrader/src/api/routers/backtest.py`
     - `AgentTrader/src/strategy/backtest.py`
     - `OpenTrader/src/stores/backtestStore.ts`
     - `OpenTrader/src/pages/backtest/BacktestStream.tsx`
     - `OpenTrader/src/pages/backtest/BacktestStream.css`

**信息流延迟问题** [后端]
   - 问题：启用 Agent 后需要等待整个回测完成才能接收消息流
   - 原因：原实现先收集所有事件到列表，再统一发送
   - 修复：使用 `queue.Queue` + 后台线程实现真正的流式传输
     - 回测线程逐个事件放入队列
     - SSE 生成器实时从队列取出并发送
   - 涉及文件：`AgentTrader/src/api/routers/backtest.py`

**仓位控制功能** [前端+后端]
   - 问题：MA策略只能持有1手，买卖交替进行
   - 修复：
     - 后端 `/api/backtest/stream` 新增 `position_size` 参数
     - 后端 `BacktestConfig.volume` 使用 `position_size` 值
     - 前端 `backtestStore` 新增 `positionSize` 配置（默认1手）
     - 前端回测页面新增"每次交易手数"输入框（与初始资金同行）
   - 涉及文件：
     - `AgentTrader/src/api/routers/backtest.py`
     - `OpenTrader/src/stores/backtestStore.ts`
     - `OpenTrader/src/pages/backtest/BacktestStream.tsx`
     - `OpenTrader/src/pages/backtest/BacktestStream.css`

**消息流详情弹窗** [前端]
   - 问题：交易信号窗口太小，不方便查看多条消息
   - 修复：新增"查看详情"按钮，点击弹出全屏详情弹窗
     - 弹窗显示所有交易信号和Agent消息
     - 每条消息显示时间、信号、价格、盈亏等信息
     - 支持滚动查看大量消息
   - 涉及文件：
     - `OpenTrader/src/pages/backtest/BacktestStream.tsx`
     - `OpenTrader/src/pages/backtest/BacktestStream.css`

**Agent API 调用失败 - URL 格式问题** [后端]
    - 问题：启用 Agent 后报错 `'str' object has no attribute 'choices'`，response 返回的是 HTML 页面
    - 原因：OpenAI 客户端的 `base_url` 需要以 `/v1` 结尾，但 `LLM_API_URL` 环境变量只设置了 `http://43.159.131.233:3001`
    - 修复：`AgentTrader/src/agent/trading_agent.py`
        - 在 `_init_client()` 中自动检测并补全 `/v1` 路径
        - 例如：`http://43.159.131.233:3001` → `http://43.159.131.233:3001/v1`

**Agent 未初始化问题** [后端]
    - 问题：启用 Agent 后回测一直显示"Agent 未初始化，跳过分析"
    - 原因：API 服务启动时未调用 `init_agent()` 初始化 Agent 实例
    - 修复：`AgentTrader/main.py`
        - 在 lifespan 中添加 `init_agent(settings.model_dump())` 调用
    - 注意：需要配置 `config.yaml` 中的 `agent.api_key` 才能正常使用 Agent 功能

**Agent 配置区布局跳动问题** [前端]
    - 问题：Agent 勾选框和文本不对齐；勾选后检测周期输入框弹出导致布局改变
    - 修复：`src/pages/backtest/BacktestStream.tsx` + `BacktestStream.css`
        - 将 Agent 配置改为单行布局：左侧勾选框 + 右侧检测周期输入
        - 检测周期输入始终显示，未启用时置灰禁用
        - 避免任何会改变布局高度的动态切换

**策略卡片"已选择"标记布局问题** [前端]
    - 问题：系统策略选中后底部显示"已选择"会改变卡片高度，导致下方内容跳动；用户策略卡片没有选中标记
    - 修复：
        - `src/components/StrategyCard.css`：改用绝对定位，在卡片右上角显示选中标记
        - `src/pages/Dashboard.tsx`：为用户策略卡片添加相同的选中标记
        - `src/pages/Dashboard.css`：添加用户策略选中标记样式

**下拉框和日期选择器黑框闪现问题** [前端]
    - 问题：点击下拉框或日期选择器时会先闪现黑框
    - 原因：浏览器在暗色模式下渲染表单元素
    - 修复：
        - `src/index.css`：在 `:root` 添加 `color-scheme: light` 强制亮色主题
        - `src/pages/backtest/BacktestStream.css`：为表单元素添加 `color-scheme: light` 和 option 样式

**下拉框和日期选择器样式问题** [前端]
    - 问题：期货品种下拉框和日期选择器会闪黑框，样式不协调
    - 修复：`src/pages/backtest/BacktestStream.css`
        - 使用 `-webkit-appearance: none` 移除原生样式
        - 自定义下拉箭头 SVG 图标
        - 添加 focus 状态样式和过渡动画
        - 优化日期选择器的日历图标透明度

**保存策略 404 错误** [后端]
    - 问题：`GET /api/strategies` 返回 404
    - 原因：数据库文件已存在时不会调用 `init_tables()`，导致新增的 `user_strategies` 表未创建
    - 修复：`AgentTrader/src/monitor/database.py`
        - `init_database()` 改为总是调用 `init_tables()`
        - SQLAlchemy 的 `create_all()` 是幂等的，已存在的表不会重建

**登录错误消息一闪而过** [前端]
    - 问题：用户名或密码错误时警告一闪而过
    - 原因：API 错误信息未正确从 axios 响应中提取
    - 修复：`src/stores/authStore.ts` 改进错误提取逻辑，从 `error.response.data.message` 正确获取
   
**未选择策略时无提示** [前端]
    - 问题：点击"回测"直接跳转 Dashboard，用户困惑
    - 修复：添加 Toast 组件，跳转前显示"请先选择一个策略"提示
    - 新增文件：`src/components/Toast.tsx`, `src/components/Toast.css`
    - 修改：`src/stores/strategyStore.ts` 添加 toast 状态，`src/App.tsx` 添加全局 Toast

**回测 API 参数不匹配** [后端]
    - 问题：`run_backtest() got an unexpected keyword argument 'strategy_name'`
    - 原因：API 调用参数与函数签名不匹配
    - 修复：
        - `AgentTrader/src/api/routers/trade.py`：正确构建 config 和 strategy 对象
        - `AgentTrader/src/strategy/backtest.py`：添加 user_id 支持

**回测下单失败 "不在可交易时间段内"** [后端]
    - 问题：日线时间戳（18:00）不在期货交易时段，TqSim 拒绝下单
    - 原因：原回测依赖 TqSim 的订单撮合，但日线数据时间戳超出交易时段
    - 修复：`AgentTrader/src/strategy/backtest.py` 简化回测逻辑
        - 移除 TqSim 账户依赖，直接使用 TqBacktest 获取历史数据
        - 基于策略信号配对计算盈亏（BUY 开多 → SELL 平多，反之亦然）
        - 自行维护权益曲线和统计计算
    - 结果：回测不再出现"下单失败"警告，统计数据准确

**弹窗样式问题**
    - 创建通用 `Modal` 组件 (`src/components/Modal.tsx`)
    - 提供 `Modal` 基础弹窗和 `ConfirmModal` 确认弹窗
    - 现代化样式：圆角、阴影、动画、半透明遮罩
    - 替换 `BacktestStream.tsx` 中的保存弹窗
    - 替换 `Favorites.tsx` 中的 `window.confirm` 为 `ConfirmModal`

**回测财务信息增强**
    - 后端 `backtest.py` `run_stream` 方法增加财务追踪：
    - 每笔交易返回: `balance`(余额), `trade_pnl`(平仓盈亏), `realized_pnl`(累计盈亏), `floating_pnl`(浮动盈亏), `market_value`(持仓市值)
    - 后端 SSE 端点增加 `init_balance` 参数
    - 前端 `backtestStore.ts` 增加 `initBalance` 配置项
    - 前端 `BacktestStream.tsx` 新增初始资金输入框
    - 前端交易消息卡片展示详细财务信息

    **涉及文件**：
    - `src/components/Modal.tsx` (新增)
    - `src/components/Modal.css` (新增)
    - `src/pages/backtest/BacktestStream.tsx` (修改)
    - `src/pages/backtest/BacktestStream.css` (修改)
    - `src/pages/Favorites.tsx` (修改)
    - `src/stores/backtestStore.ts` (修改)
    - `AgentTrader/src/strategy/backtest.py` (修改)
    - `AgentTrader/src/api/routers/backtest.py` (修改)