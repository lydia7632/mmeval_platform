# xai-platform-web

**Interpretable Visual Recognition** 平台的前端应用。

## 功能概览

| 路由 | 说明 |
|------|------|
| `/` | 首页（Generation / Evaluation 入口与项目引用） |
| `/generation` | **Generation**：可解释性生成；侧栏切换子功能 |
| `/evaluation` | **Evaluation**：从后端加载论文/方法目录，按 presentation 与分类维度筛选并以表格展示 |

**Generation** 子页面（前端内切换，无独立 URL）：

| 子页 | 状态 |
|------|------|
| Localization Interpret. | 已接入后端（模型、方法、上传、解释流程） |
| Semantic / Comprehensive / VLM Interpret. | 占位 UI |

## 技术栈

- [React 19](https://react.dev/) + [Vite 6](https://vite.dev/)
- [Ant Design 5](https://ant.design/) + [@ant-design/icons](https://ant.design/components/icon/)
- [Tailwind CSS 4](https://tailwindcss.com/)（`@tailwindcss/vite`）
- [React Router 7](https://reactrouter.com/)
- [Axios](https://axios-http.com/)（Localization 等与后端通信）
- [ahooks](https://ahooks.js.org/)（如轮询当前模型状态）

## 环境要求

- [Node.js](https://nodejs.org/)（建议使用当前 LTS）
- [pnpm](https://pnpm.io/)：`package.json` 中通过 `packageManager` 固定为 **pnpm@10.10.0**。请使用 pnpm 安装依赖与运行脚本；勿使用 `npm install`，以免生成 `package-lock.json` 与 `pnpm-lock.yaml` 冲突。若已启用 [Corepack](https://nodejs.org/api/corepack.html)，可在仓库根目录执行 `corepack enable` 后由工具自动选用对应 pnpm 版本。

## 安装与本地开发

```bash
cd xai-platform-web
pnpm install
pnpm run dev
```

默认通过 Vite 启动开发服务器（一般为 `http://localhost:5173`，以终端输出为准）。

### 与后端联调

开发环境下前端会访问 **两个** 可选后端基址（生产构建下均为同源相对路径，见各页常量）：

| 页面 | 开发环境基址 | 典型用途 |
|------|----------------|----------|
| Localization（`page-localization.jsx`） | `http://127.0.0.1:8000` | `/models`、`/methods`、上传与解释相关接口；预览图使用同源 `API_BASE_URL` |
| Evaluation（`page-evaluation.jsx`） | `http://127.0.0.1:8001` | `GET /papers`（返回含 `papers` 数组的 JSON，或论文数组） |

请分别启动与上述端口、路径约定一致的后端服务，否则对应页面会加载失败或列表为空。

生产构建（`pnpm run build`）下上述基址为空字符串，即与前端 **同源** 请求；部署时需将 API 与静态资源置于同一域名或通过反向代理统一路径。

## 其他脚本

| 命令 | 说明 |
|------|------|
| `pnpm run build` | 生产构建，输出至 `dist/` |
| `pnpm run preview` | 本地预览构建产物 |
| `pnpm run lint` | 运行 ESLint |

## 项目结构

- `src/App.jsx` — 路由、Ant Design `ConfigProvider`、主题上下文
- `src/components.jsx` — 站点标题、顶栏（首页 / 明暗切换）、页脚，以及明暗模式 `ColorModeProvider` / `useColorMode`
- `src/page-index.jsx` — 首页
- `src/page-generation.jsx` — Generation 外壳与子页切换（Localization / Semantic / Comprehensive / VLM）
- `src/page-localization.jsx` — 定位可解释性（接入后端）
- `src/page-semantic.jsx` / `page-comprehensive.jsx` / `page-vlm.jsx` — 占位
- `src/page-evaluation.jsx` — Evaluation：论文列表、筛选与表格
