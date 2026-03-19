## 问题修复记录

如果修复完成，将内容移到已修复中。
修复后不需要你重启服务，我会自己重启。

### 待修复/优化
（暂无）

---

### 已修复

#### 胜率显示不正确 + NaN 替代回退
- **问题**: 胜率前端始终显示50%，后台日志却是66.67%
- **根因**: `_build_stats` 中缺失数据默认为 0 而非 NaN，掩盖了问题；tqsdk_stat 可能不含 win_rate 字段
- **修复**: 
  - BacktestStats 所有统计字段默认 NaN，`to_dict()` 中 NaN → null（JSON）/ "NaN"（win_rate 字符串）
  - 去掉所有回退机制：数据没获取到就显示 NaN，方便排查
  - 添加详细 trade_pnl 逐笔日志和 tqsdk_stat keys 日志
- **文件**: `AgentTrader/src/strategy/backtest.py`, `OpenTrader/src/stores/backtestStore.ts`, `OpenTrader/src/pages/backtest/BacktestStream.tsx`

#### Agent 消息卡片显示原始 JSON 字符串
- **问题**: 回测 Agent 分析结果卡片渲染了 markdown 文本，但末尾还附带了原始 JSON 代码块
- **根因**: `analyze_for_backtest` 中 JSON 解析失败时，把 Agent 完整回复（含 JSON 代码块）作为 analysis 展示
- **修复**: 重写 JSON 提取逻辑 `_extract_json_from_response`，支持三种策略：
  1. 直接解析纯 JSON
  2. 提取 \`\`\`json ... \`\`\` 代码块中的 JSON
  3. 正则匹配含 should_adjust 的 JSON 对象
  4. 全部失败时，去掉 JSON 代码块后返回纯文本 analysis
- **文件**: `AgentTrader/src/agent/react_agent.py`

#### 检测周期输入框 01/012 问题
- **问题**: 删除所有数字后出现不可消除的 0，后续输入变成 01、012
- **根因**: `type="number"` + `Number("")=0` → state 设为 0 → input 显示 "0" → 追加数字变 "01"
- **修复**: 改为 `type="text" inputMode="numeric"`，用独立字符串状态管理输入，失焦时 clamp 到 [5, 365]
- **文件**: `OpenTrader/src/pages/backtest/BacktestStream.tsx`

#### 测试覆盖
- 26 个测试全部通过（`tests/test_backtest_stats.py`），包含：NaN 默认值、JSON 提取策略、各种胜负场景

**回测 Agent 工具调用细节消息卡片** [前端+后端]
   - 问题：回测时 Agent 分析只显示一条笼统的 "正在分析" 消息，没有展示具体调用了哪些工具
   - 修复：
     1. 后端 `run_stream_with_agent` 在 Agent 分析过程中逐步 yield `agent_tool` 事件（get_recent_trades → get_strategy_params → analyze_and_decide），每个工具有 running/done 两个状态
     2. 前端新增 `AgentToolMessage` 类型和 `agent_tool` 消息卡片组件
     3. running 状态显示 spinner 动画 + "调用 xxx 工具中..."
     4. done 状态显示 ✓ + 工具名 + 结果摘要
   - 修改文件：`src/strategy/backtest.py`（后端）、`src/stores/backtestStore.ts`、`src/pages/backtest/BacktestStream.tsx`、`src/pages/backtest/BacktestStream.css`

**回测统计数据前后端不一致（胜率等）** [后端 - 根因修复]
   - 问题：后台日志显示胜率 100% 但前端显示 50%，反复修复未解决
   - **根因**：`tqsdk_stat` 在 `api.close()` **之后**才被访问！TqSim 关闭后统计数据不可用，导致始终走手动回退计算路径。TqSdk 文档明确示例中 `tqsdk_stat` 必须在 `BacktestFinished` 异常中、`api.close()` 之前访问
   - 修复：
     1. 新增 `_capture_tqsim_stat()` 方法，在 `except BacktestFinished` 块中（api.close 之前）捕获统计数据
     2. 新增 `_build_stats()` 方法替代旧的 `_calculate_stats_from_tqsim()`，逻辑更清晰：先手动计算胜率，再用 TqSim 原生数据覆盖
     3. 两个代码路径（run_stream / run_stream_with_agent）都已修复
     4. 添加详细日志：交易统计明细 + 最终发送到前端的 stats 值
   - 测试：20 个单元测试全部通过（`tests/test_backtest_stats.py`）
   - 修改文件：`src/strategy/backtest.py`

**AI对话界面附加策略时报错 toFixed** [前端]
   - 问题：当附加策略后发送消息时报错 `Cannot read properties of null (reading 'toFixed')`
   - 原因：`chatStore.ts` 中检查 `!== undefined` 不能排除 `null`，当 `win_rate` 等值为 `null` 时调用 `toFixed()` 报错
   - 修复：将 `!== undefined` 改为 `!= null`（同时排除 `null` 和 `undefined`）
   - 修改文件：`src/stores/chatStore.ts`

**回测界面 Agent 分析结果 Markdown 渲染 + 工具调用动画** [前端]
   - 问题：Agent 分析结果显示为纯文本，内容挤在一起；调用工具时没有加载提示
   - 修复：
     1. 添加 `formatAgentText` 函数处理 Markdown 格式（加粗、斜体、行内代码）
     2. 为 "analyzing" 状态添加加载动画和 "调用分析工具中..." 提示
     3. 添加相关 CSS 样式（`.agent-tool-loading`、`.tool-spinner`）
   - 修改文件：`src/pages/backtest/BacktestStream.tsx`、`src/pages/backtest/BacktestStream.css`

**回测 Agent 修改策略代码能力说明** [设计说明]
   - 问题：用户询问回测 Agent 能否修改策略代码
   - 说明：当前设计下回测 Agent **只能修改策略参数**，不能修改代码。这是合理的设计：
     1. 回测过程中修改代码需要重新加载策略，会中断当前回测
     2. 参数调整是在线优化的常见做法
     3. 如需修改代码，应先完成回测，然后通过 AI 对话界面的 "优化策略" 功能进行

**回测界面胜率等统计数据显示错误** [前端+后端]
   - 问题：前端显示的胜率一直是 50%，与 TqSim 日志显示的 66.67% 不一致
   - 原因：后端手动计算统计数据，未使用 TqSim 的原生统计 `tqsdk_stat`
   - 修复：
     1. 后端新增 `_calculate_stats_from_tqsim` 方法，优先使用 TqSim 的原生统计数据
     2. 扩展 `BacktestStats` 数据类，添加收益率、年化收益、盈亏比、夏普率、索提诺比率等字段
     3. 前端 `BacktestStats` 类型和统计展示区域支持新字段
   - 修改文件：`src/strategy/backtest.py`（后端）、`src/stores/backtestStore.ts`（前端）、`src/pages/backtest/BacktestStream.tsx`（前端）

**AI 对话界面移动端适配** [前端]
   - 问题：
     1. 左侧历史对话栏在移动端会遮挡主内容，无法输入
     2. 收起按钮在移动端看不到（z-index 低于侧边栏）
     3. 移动端默认展开侧边栏
   - 修复：`src/pages/Agent.tsx` + `src/pages/Agent.css`
     - 移动端默认收起侧边栏
     - 添加窗口大小监听，自动适配
     - 添加遮罩层（`.sidebar-overlay`），点击可关闭侧边栏
     - 发送消息后自动收起侧边栏
     - 收起按钮改为固定位置圆形按钮，z-index 高于侧边栏
     - 侧边栏使用 `transform` 动画滑入滑出
     - 小屏幕（≤480px）侧边栏全屏宽度
   - 效果：移动端可以正常使用 AI 对话功能

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
**GitHub Pages 刷新 404 问题 v3** [前端]
   - 问题：刷新 `/dashboard` 等路由显示 404
   - 原因：之前的 URL 参数方案 (`?p=path`) 可能被某些情况下清除
   - 修复：改用 `sessionStorage` 方案
     - `public/404.html`：将完整路径存入 `sessionStorage`，然后重定向到首页
     - `public/index.html`：读取 `sessionStorage` 恢复路径，然后立即清除
   - 优势：`sessionStorage` 在同一标签页内持久，比 URL 参数更可靠
   - 注意：需要重新 `npm run build` 并部署

**代码复制成功提示** [前端]
   - 问题：点击复制代码后没有反馈
   - 修复：`src/components/CodeBlock.tsx`
     - 添加 `copied` 状态
     - 复制成功后按钮变绿显示"✓ 已复制"，2秒后恢复
   - 样式：`src/components/CodeBlock.css` 添加 `.copied` 状态的绿色样式

**AttachedStrategyCard toFixed 报错** [前端]
   - 问题：优化策略时附加卡片报错 `Cannot read properties of null`
   - 原因：同 StrategyDetailModal，指标值可能是 `null`
   - 修复：`src/components/AttachedStrategyCard.tsx`
     - 将 `!== undefined` 改为 `!= null`

**策略详情弹窗 toFixed 报错** [前端]
   - 问题：点击策略详情弹窗报错 `Cannot read properties of null (reading 'toFixed')`
   - 原因：后端返回的指标值可能是 `null`，使用 `!== undefined` 检查无法过滤 `null`
   - 修复：`src/components/StrategyDetailModal.tsx`
     - 将 `!== undefined` 改为 `!= null`（同时过滤 `undefined` 和 `null`）
   - 效果：策略详情弹窗正常显示，指标为空时不报错

**优化策略未附带代码到 AI 助手** [前端]
   - 问题：点击"优化策略"跳转到 AI 助手，但没有附加策略卡片
   - 原因：
     1. 策略列表 API 没有返回 `code` 字段，需要单独获取详情
     2. Agent.tsx 中未处理 `location.state` 传入的策略
   - 修复：
     - `src/pages/Dashboard.tsx`: `handleOptimizeStrategy` 先获取策略详情再跳转
     - `src/pages/Agent.tsx`: 添加 useEffect 处理 `location.state.optimizeStrategy`
   - 效果：点击优化后，AI 助手页面正确显示附加策略卡片

---

### 历史修复

**Agent 生成策略回测报错 "预置策略不存在: user_1"** [前端]
   - 问题：从 Agent 生成策略后点击回测，报错显示预置策略不存在
   - 原因：设置 `strategyCode` 时没有清除 `presetId` 和 `userStrategyId`，导致后端尝试错误的策略加载方式
   - 修复：`src/pages/backtest/BacktestStream.tsx`
     - 设置策略配置时，同时清除其他策略选项
     - 修复用户策略 ID 解析逻辑（`user_1` → `userStrategyId: 1`）
     - 三种策略互斥：`strategyCode` / `userStrategyId` / `presetId`
   - 效果：Agent 生成的策略可以正常开始回测

**Agent 回复 JSON 策略块应渲染为 Python 代码** [前端]
   - 问题：Agent 回复的 ```json 策略块直接渲染为 JSON 代码框，而不是 Python 代码
   - 原因：ChatMessage 组件没有解析 JSON 内容并提取 `code` 字段
   - 修复：`src/components/ChatMessage.tsx`
     - 新增 `tryParseStrategyJson()` 函数解析策略 JSON
     - 检测到 JSON 策略块时，提取 `code` 字段渲染为 Python 代码框
     - 流式输出时显示 Python 代码，完成后显示策略卡片
   - 效果：用户看到的是格式化的 Python 代码，而不是 JSON 文本

**Agent 策略卡片不显示 / 一直等待后端** [前端]
   - 问题：回答生成完后策略卡片不显示，界面一直显示等待状态
   - 原因：SSE 解析逻辑在流结束时没有正确处理缓冲区中剩余的事件
   - 修复：`src/api/agent.ts`
     - 重构 SSE 事件解析逻辑，提取 `processEvent()` 函数
     - 在流结束后处理缓冲区中剩余的内容
     - 新事件开始时自动处理上一个事件
     - 添加 `receivedDone` 标记检测异常断开
   - 效果：流式完成后正确显示策略卡片和操作按钮

**登录错误提示消失太快** [前端]
   - 问题：登录失败时错误提示一闪而过
   - 原因：登录返回 401 时，axios 响应拦截器会触发重定向到 /login，导致页面刷新，error 状态丢失
   - 修复：`src/api/client.ts` 响应拦截器添加判断，如果是登录/注册请求则不触发 token 刷新和重定向
   - 效果：登录失败时错误信息持续显示，直到用户关闭或重新输入

**Agent 回复代码渲染 bug** [前端]
   - 问题：流式输出时显示 ```json 原始文本，然后内容消失，光标闪烁但看不到输出
   - 原因：ChatMessage 组件的 renderContent 函数在流式输出时过早移除代码块，导致内容消失
   - 修复：
     - 重写 `src/components/ChatMessage.tsx` 使用智能解析逻辑
     - 流式输出时（`isStreaming=true`）不移除代码块，让用户看到完整内容
     - 只有当 `strategy` 存在且流式完成后才移除 JSON 代码块
     - 代码块使用 `CodeBlock` 组件渲染，支持语法高亮
   - 新增：`src/components/ChatMessage.css` 添加代码块和行内代码样式
   - 效果：流式输出时能正确显示代码块，完成后策略卡片正常展示

**AI 助手代码展示和回测流程** [前端+后端]
   - 问题1：点击查看代码弹窗显示不全
   - 问题2：保存策略失败（NOT NULL constraint: base_strategy）
   - 问题3：点击回测应直接进入回测界面，不需要策略参数配置
   - 修复：
     - 移除"查看代码"按钮，直接在 AI 回复中渲染代码块
     - 移除数据库 `base_strategy` 和 `params_json` 字段，`code` 改为必填
     - 回测 API 改为 POST 方式，支持 `strategy_code`/`user_strategy_id`/`preset_id` 三种策略加载方式
     - 回测配置移除策略特定参数（快线/慢线周期），只保留通用配置
     - 从 AI 助手点击"开始回测"直接跳转到回测页面并传递策略代码
   - 涉及文件（后端）：
     - `AgentTrader/src/monitor/database.py`
     - `AgentTrader/src/api/routers/backtest.py`
     - `AgentTrader/src/api/routers/user_strategy.py`
   - 涉及文件（前端）：
     - `src/components/StrategyPreviewCard.tsx`
     - `src/pages/Agent.tsx`
     - `src/pages/backtest/BacktestStream.tsx`
     - `src/stores/backtestStore.ts`
     - `src/api/strategy.ts`
   - 注意：需要删除旧数据库重新初始化

**合约乘数硬编码问题** [后端]
   - 问题：合约乘数写死为 10（螺纹钢），但用户可以选择不同期货品种
   - 原因：不同期货品种合约乘数不同（如黄金 1000、豆粕 10、棉花 5 等）
   - 修复：`AgentTrader/src/strategy/backtest.py`
     - 使用 `api.get_quote(symbol)` 获取合约信息
     - 从 `quote.volume_multiple` 获取真实合约乘数
     - `run_stream` 和 `run_stream_with_agent` 均已更新
   - 效果：自动适配不同期货品种的合约乘数

**自定义表单控件组件** [前端]
   - 问题：原生 select 和 date input 在某些浏览器下会闪现黑框，且样式不现代化
   - 原因：原生控件受系统主题影响，CSS 无法完全覆盖
   - 修复：创建完全自定义的组件替代原生控件
     - 新增 `src/components/FormControls.tsx`：自定义 `Select` 和 `DatePicker` 组件
     - 新增 `src/components/FormControls.css`：组件样式
     - 修改 `src/pages/backtest/BacktestStream.tsx`：使用新组件
   - 特点：
     - 纯 div 实现，不使用原生 select/input[type=date]
     - 下拉框带动画、选中状态、搜索图标
     - 日期选择器带完整日历、年月导航、今天快捷按钮
     - 统一的现代化设计风格

**回测数据统计与 TqSdk 日志不匹配** [后端]
   - 问题：前端显示的余额、累计盈亏、胜率、最大回撤等数据与后端 TqSdk 日志不一致
   - 原因：
     1. `total_profit` 使用了 `final_close_profit`（仅平仓盈亏），而非 `final_balance - init_balance`（总盈亏）
     2. 胜率计算把开仓交易（`trade_pnl=0`）也计入了
     3. `market_value` 计算没有使用合约乘数
   - 修复：`AgentTrader/src/strategy/backtest.py`
     - `total_profit` 改为 `final_balance - init_balance`（总盈亏包含浮动盈亏）
     - 胜率只计算有实际盈亏的平仓交易（`trade_pnl != 0`）
     - `market_value` 正确计算为 `abs(净持仓) * 价格 * 合约乘数`
   - 效果：前端显示数据与 TqSdk 日志一致

**GitHub Pages SPA 刷新 404 问题 v2** [前端]
   - 问题：之前的 sessionStorage 方案在某些情况下不生效
   - 原因：sessionStorage 在跨页面时可能丢失，特别是在 GitHub Pages 上
   - 修复：改用 URL 参数方案
     - `public/404.html`：将原始路径编码到 URL 参数 `?p=` 中，然后重定向到首页
     - `public/index.html`：读取 URL 参数并使用 History API 恢复原始路径
   - 原理：URL 参数在重定向过程中不会丢失，比 sessionStorage 更可靠

**下拉框和日期选择器黑框闪现** [前端]
   - 问题：下拉框和日期选择器在点击时会闪现黑框，样式与现代化设计不匹配
   - 原因：浏览器暗色模式下原生表单控件会先渲染深色样式，再应用自定义样式
   - 修复：
     - `src/index.css`：在 `html` 和 `:root` 添加 `color-scheme: light only` 强制亮色
     - `src/pages/backtest/BacktestStream.css`：
       - 为 select/input 添加 `color-scheme: light only` 和 `forced-color-adjust: none`
       - 添加 `!important` 强制背景色为白色
       - 优化日期选择器图标交互效果
   - 效果：表单控件不再闪黑框，样式统一现代化

**GitHub Pages SPA 刷新 404 问题** [前端]
   - 问题：在 GitHub Pages 上刷新非首页路由（如 `/dashboard`）会显示 404
   - 原因：GitHub Pages 是静态托管，不支持 SPA 路由重写，刷新时会尝试访问不存在的 HTML 文件
   - 修复：
     - 新增 `public/404.html`：捕获 404 请求，将路径存入 `sessionStorage` 后重定向到首页
     - 修改 `public/index.html`：在 React 加载前从 `sessionStorage` 读取路径，使用 History API 恢复原始 URL
   - 原理：利用 GitHub Pages 会自动使用 404.html 处理不存在的路径这一特性

**ngrok 请求返回 HTML 警告页面** [前端]
   - 问题：请求后端返回 200，但响应内容是 ngrok 的浏览器警告页面而非 JSON 数据
   - 原因：ngrok 免费版会在首次访问时显示安全警告页面（ERR_NGROK_6024）
   - 修复：
     - `src/api/client.ts`：在 axios 实例的默认 headers 中添加 `'ngrok-skip-browser-warning': 'true'`，同时为 token 刷新请求也添加此 header
     - `src/stores/backtestStore.ts`：回测流式请求使用原生 fetch API 而非 axios，需单独添加此 header
   - 效果：所有 API 请求（包括流式 SSE）会自动跳过 ngrok 警告页面

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