# UnicapEval 启动流程（已配置好的环境）

如果你已经按照 [README.md](README.md) 把环境装好了，每次重启电脑只需要走这份。3 个终端，**3 条命令，复制粘贴就行**。

> **第一次运行 / 换机器**：先看 [README.md](README.md) 装 Node / pnpm / conda 环境
> **配置说明**：[REPRODUCE_FRONTEND_ONLY.md](REPRODUCE_FRONTEND_ONLY.md)
> **前端架构**：[unicapeval-platform-web/ARCHITECTURE.md](unicapeval-platform-web/ARCHITECTURE.md)

---

## TL;DR — 三条命令

在 VS Code 里 `Ctrl + ~` 打开终端，右上角 `+` 开 3 个 bash，3 个**都留着别关**。

### 终端 A — Evaluation 后端 :8001

```bash
conda activate unicap-mock 
cd "C:/Users/wysq/Desktop/unicapeval/unicapeval-platform-api/evaluation" 
python main.py
```

### 终端 B — Localization Mock 后端 :8000

```bash
conda activate unicap-mock 
cd "C:/Users/wysq/Desktop/unicapeval/unicapeval-platform-api/localization" 
python mock_main.py
```

### 终端 C — 前端 :5173

```bash
cd "C:/Users/wysq/Desktop/unicapeval/unicapeval-platform-web" 
pnpm run dev
```

启动后浏览器打开 → http://localhost:5173
