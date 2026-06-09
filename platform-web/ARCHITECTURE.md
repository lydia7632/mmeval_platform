# 前端架构文档（unicapeval-platform-web）

本文档描述 [unicapeval-platform-web/](unicapeval-platform-web/) 的整体结构、依赖、数据流，以及各个页面的职责，方便新加入的人快速找到要改的地方。

> 想跑起来：见 [README.md](README.md)
> 只跑前端 mock：见 [REPRODUCE_FRONTEND_ONLY.md](REPRODUCE_FRONTEND_ONLY.md)

---

## 1. 技术栈

| 类别 | 选型 | 备注 |
|------|------|------|
| 构建工具 | **Vite 6** ([vite.config.js](unicapeval-platform-web/vite.config.js)) | 启动快、HMR 热更新 |
| UI 框架 | **React 19** + JSX | 函数组件 + Hooks，无类组件 |
| 路由 | **react-router-dom 7** | `BrowserRouter`，3 条路由（见下） |
| 组件库 | **antd 5** + `@ant-design/icons` | `Table` / `Select` / `Segmented` / `Button` / `Spin` / `message` 等 |
| 样式 | **Tailwind CSS 4** | 通过 `@tailwindcss/vite` 插件直接接 Vite，无 PostCSS 配置文件 |
| HTTP | **axios** | Localization 页用；Evaluation 页用原生 `fetch` |
| 工具库 | **ahooks**（`useInterval`） | 仅 Localization 页轮询 `/current_model` |
| 包管理 | **pnpm 10** | `packageManager` 字段锁定 10.10.0 |

**入口**：[index.html](unicapeval-platform-web/index.html) → [src/main.jsx](unicapeval-platform-web/src/main.jsx) → [src/App.jsx](unicapeval-platform-web/src/App.jsx)。

---

## 2. 目录结构

```
unicapeval-platform-web/
├── index.html                  # Vite 入口 HTML
├── package.json                # 依赖 + scripts
├── vite.config.js              # Vite + Tailwind 插件
├── eslint.config.js
├── public/                     # 静态资源（字体、favicon 等）
└── src/
    ├── main.jsx                # ReactDOM.createRoot + StrictMode
    ├── App.jsx                 # 路由、主题、Color mode 状态
    ├── App.css                 # 几乎为空（保留位）
    ├── index.css               # Tailwind 入口 + 全局变量、字体、深色模式
    ├── components.jsx          # ColorModeContext / SiteHeader / SiteFooter / SITE_TITLE
    ├── page-index.jsx          # /                ─ 首页：欢迎语 + 两个大按钮
    ├── page-evaluation.jsx     # /evaluation       ─ 评估页（指标 + 模型 二维度）
    ├── page-generation.jsx     # /generation       ─ 生成页：4 个子 Tab 容器
    ├── page-localization.jsx   #   └─ 子 Tab 1：Localization（唯一真实功能）
    ├── page-semantic.jsx       #   └─ 子 Tab 2：Semantic（占位 UI）
    ├── page-comprehensive.jsx  #   └─ 子 Tab 3：Comprehensive（占位 UI）
    └── page-vlm.jsx            #   └─ 子 Tab 4：VLM（占位 UI）
```

> **`page-` 前缀的文件 = 一个路由或子页面**。改某个页面找对应 `page-*.jsx` 就行。

---

## 3. 路由

定义在 [App.jsx](unicapeval-platform-web/src/App.jsx)：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | [page-index.jsx](unicapeval-platform-web/src/page-index.jsx) | 首页：项目简介、Generation/Evaluation 两个大按钮、BibTeX |
| `/generation` | [page-generation.jsx](unicapeval-platform-web/src/page-generation.jsx) | 顶部 4 个 Tab 切换 4 个子组件 |
| `/evaluation` | [page-evaluation.jsx](unicapeval-platform-web/src/page-evaluation.jsx) | 顶部 Segmented 切换"指标对比 / 方法模型对比" |
| `*` | `<Navigate to='/' replace />` | 未匹配重定向回首页 |

---

## 4. 全局状态 / 上下文

### 4.1 主题 / 配色（亮色 / 暗色切换）

实现在 [App.jsx](unicapeval-platform-web/src/App.jsx) 和 [components.jsx](unicapeval-platform-web/src/components.jsx)：

- `ColorModeContext`：保存 `colorMode` (`'light' | 'dark'`) + `toggleColorMode`
- 持久化到 `localStorage`（key `xai-color-mode`）；首次访问跟随 `prefers-color-scheme`
- 切换时给 `<html>` 加/去 `dark` class，配合 [index.css](unicapeval-platform-web/src/index.css) 中的 `@custom-variant dark` 让所有 `dark:*` Tailwind 工具类生效
- antd 通过 `<ConfigProvider theme.algorithm>` 同步切换 `defaultAlgorithm` ↔ `darkAlgorithm`

每个页面顶部的 [SiteHeader](unicapeval-platform-web/src/components.jsx) 自带"日/月"图标按钮。

### 4.2 没有全局 store

没有 Redux / Zustand / Jotai。所有跨页状态都靠 Context（目前只有 ColorMode 一个），单页内部状态用 `useState`。

---

## 5. 共享组件（[components.jsx](unicapeval-platform-web/src/components.jsx)）

| 导出 | 用途 |
|------|------|
| `SITE_TITLE` | `'Interpretable Visual Recognition'`，唯一标题字符串源 |
| `ColorModeProvider` / `useColorMode` | 主题 Context |
| `SiteHeader` | 顶部栏：Logo SVG + 标题 + 可选 badge（`'GEN'` 蓝 / `'EVAL'` 绿） + Home / 主题切换按钮 |
| `SiteFooter` | 页脚：作者署名 + 版权 |

> 加新页面：照抄 `<SiteHeader badge='XXX' />` + `<SiteFooter />` 包住内容即可。

---

## 6. 页面详解

### 6.1 [page-index.jsx](unicapeval-platform-web/src/page-index.jsx) — 首页

无后端依赖。一段欢迎文案 + 两个大按钮（`Generation` / `Evaluation` 路由跳转）+ BibTeX 块。

### 6.2 [page-evaluation.jsx](unicapeval-platform-web/src/page-evaluation.jsx) — 评估页

**当前状态**：完全用前端写死的 mock 数据，**不调任何接口**。

**结构**：
```
Segmented (顶部维度切换)
 ├── 'metric'  → Metric Comparison 卡片（绿色边框）
 │              └─ Table，columns = metricColumns，dataSource = METRICS
 └── 'model'   → Method / Model Comparison 卡片（琥珀色边框）
                └─ Table，columns = modelColumns,   dataSource = MODELS
```

**数据源**：文件顶部两个常量 `METRICS`（10 条评价指标）、`MODELS`（11 条模型分数）。**改数据 = 改这两个数组**。

**未来要接真后端**：替换为：
```js
useEffect(() => {
  fetch(`${EVAL_API_BASE}/papers`).then(r => r.json()).then(setData);
}, []);
```
后端在 [unicapeval-platform-api/evaluation/main.py](unicapeval-platform-api/evaluation/main.py)，端口 8001。原版 git 历史里的旧实现可参考。

### 6.3 [page-generation.jsx](unicapeval-platform-web/src/page-generation.jsx) — 生成页（容器）

只是个 Tab 容器。`pageItems` 数组定义 4 个 Tab，`pageComponent(currentPage, props)` 决定渲染哪个子组件。
向子组件透传两个 prop：`setLoading`（外层 `Spin` 的状态）、`messageApi`（全局消息）。

### 6.4 [page-localization.jsx](unicapeval-platform-web/src/page-localization.jsx) — 唯一真实功能页

调 **Localization 后端**（`http://127.0.0.1:8000`，开发模式硬编码在 `API_BASE_URL`）。
真后端在 [unicapeval-platform-api/localization/main.py](unicapeval-platform-api/localization/main.py)；mock 后端是 [unicapeval-platform-api/localization/mock_main.py](unicapeval-platform-api/localization/mock_main.py)。

**接口调用清单（与 mock_main.py 一致）**：

| 时机 | 方法 | 路径 | 用途 |
|------|------|------|------|
| 组件 mount | GET | `/models` | 拉模型列表 |
| 组件 mount | GET | `/methods` | 拉 CAM 方法列表 |
| 每秒轮询 | GET | `/current_model` | 同步后端当前模型（`useInterval` 1000ms） |
| 用户切换 | POST | `/current_model` | 切到所选模型 |
| 上传图片 | POST | `/upload` | 表单上传，返回 `image_id` |
| 上传成功后自动 | POST | `/ram_process` | 抽取概念候选词 → 喂给 `<AutoComplete>` |
| 点 Generate | POST | `/process` | 传 `{image_id, concept, method_id}`，返回热力图 `image_id` |
| 渲染图片 | GET | `/image/{id}` | 输入/输出图都通过这个接口加载 |

**UI 流程**：选模型 → 选 CAM 方法 → 上传图 → 选/输入概念 → 点 Generate → 右侧出热力图。

### 6.5 [page-semantic.jsx](unicapeval-platform-web/src/page-semantic.jsx) / [page-comprehensive.jsx](unicapeval-platform-web/src/page-comprehensive.jsx) / [page-vlm.jsx](unicapeval-platform-web/src/page-vlm.jsx)

三个**占位页**，每个 12 行，只显示 `<h2>This page is under construction.</h2>`。
未来要做：复刻 Localization 的结构（接自己的后端 / 替换 API_BASE_URL）。

---

## 7. 后端接入约定

| 子模块 | 后端基址（开发） | 对应前端文件 |
|--------|------------------|--------------|
| Evaluation | `http://127.0.0.1:8001` | [page-evaluation.jsx](unicapeval-platform-web/src/page-evaluation.jsx)（当前未调用） |
| Localization | `http://127.0.0.1:8000` | [page-localization.jsx](unicapeval-platform-web/src/page-localization.jsx) |

**生产模式**：前端代码里都是 `process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:80xx' : ''`，部署时空串 = 同源相对路径，靠 nginx/反代解决。

> ⚠️ 没有用 Vite proxy（`server.proxy`），直接跨域请求。后端必须开 CORS 才能用真实模式。

---

## 8. 样式系统

### 8.1 Tailwind 4

- 入口在 [index.css](unicapeval-platform-web/src/index.css) 第一行 `@import "tailwindcss"`
- 通过 [vite.config.js](unicapeval-platform-web/vite.config.js) 的 `@tailwindcss/vite` 插件接入，**没有 `tailwind.config.js`**——主题靠 `@theme` 指令直接写在 CSS 里
- 暗色模式：`@custom-variant dark (&:where(.dark, .dark *))` —— 所以是 **class-based**（在 `<html>` 上加 `dark`），不是 media query

### 8.2 antd 与 Tailwind 共存

- antd 组件用其内置 token（`<ConfigProvider>` 算法切换深浅）
- 外围布局/间距/卡片/边框用 Tailwind utility class
- 偶尔需要穿透 antd 内部样式时用 Tailwind 任意值选择器，例：
  ```jsx
  className='dark:[&_.ant-table]:bg-neutral-900 [&_.ant-table-cell]:!py-3'
  ```
  `[&_.ant-table-cell]` 选 antd 单元格，`!py-3` 用 `!important` 压过 antd 默认。

### 8.3 字号 / 字体

- 全局字体：`'Google Sans'`，本地静态托管在 `/public/fonts/google-sans.css`，HTML 里 `<link>` 加载
- 默认字号通过 `<ConfigProvider theme.token.fontFamily>` 让 antd 也用 Google Sans

---

## 9. 数据流总图

```
┌──────────────────────────────────────────────────────────┐
│                         App.jsx                          │
│  ┌────────────────┐   ┌────────────────────────────────┐ │
│  │ ColorModeCtx   │   │ ConfigProvider (antd theme)    │ │
│  │ light / dark   │   │   defaultAlgorithm | dark...   │ │
│  └────────────────┘   └────────────────────────────────┘ │
│                  Routes (BrowserRouter)                  │
└────┬─────────────────┬────────────────────────────────┬──┘
     │                 │                                │
     ▼                 ▼                                ▼
  /             /generation                       /evaluation
  page-index   page-generation                    page-evaluation
              ├── localization ───── 8000 (Localization API)
              ├── semantic     ─── 占位
              ├── comprehensive ── 占位
              └── vlm          ─── 占位

  page-evaluation: 当前完全前端 mock，未来连 8001
```

---

## 10. 常见任务速查

| 想做什么 | 改哪里 |
|---------|--------|
| 改首页文案 / 跳转按钮 | [page-index.jsx](unicapeval-platform-web/src/page-index.jsx) |
| 改 /evaluation 的指标列表 | [page-evaluation.jsx](unicapeval-platform-web/src/page-evaluation.jsx) 顶部 `METRICS` 常量 |
| 改 /evaluation 的模型分数 | [page-evaluation.jsx](unicapeval-platform-web/src/page-evaluation.jsx) 顶部 `MODELS` 常量 |
| 加一个新的 Generation 子 Tab | [page-generation.jsx](unicapeval-platform-web/src/page-generation.jsx) 的 `pageItems` + `pageComponent` switch + 新建 `page-xxx.jsx` |
| 改顶部栏 logo / 标题 | [components.jsx](unicapeval-platform-web/src/components.jsx) 的 `SiteHeader` / `SITE_TITLE` |
| 改深色模式逻辑 | [App.jsx](unicapeval-platform-web/src/App.jsx)（state） + [index.css](unicapeval-platform-web/src/index.css)（变量） |
| 加新路由 | [App.jsx](unicapeval-platform-web/src/App.jsx) 的 `<Routes>` 块 |
| 改后端地址 | 各 `page-*.jsx` 文件顶部的 `API_BASE_URL` / `EVAL_API_BASE` |

---

## 11. 已知技术债 / 待办

- [page-evaluation.jsx](unicapeval-platform-web/src/page-evaluation.jsx) 的 `METRICS` / `MODELS` 是写死的，需对接真实 `/papers` 或新设计的接口
- 三个占位页 `page-semantic.jsx` / `page-comprehensive.jsx` / `page-vlm.jsx` 等待具体实现
- 后端基址用 `process.env.NODE_ENV` 判断，比较粗——长期看应该用 Vite 的 `import.meta.env.VITE_*` + `.env.development` / `.env.production`
- 跨域目前依赖后端 CORS，没用 Vite `server.proxy`
- 没有单测 / E2E 测试
