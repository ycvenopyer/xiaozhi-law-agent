# 小知（XiaoZhi）— 知识产权律师 AI 办案助理

[English](./README.md) | [简体中文](./README-zh.md)

小知面向知识产权律师，覆盖商标、专利、著作权、商业秘密与不正当竞争业务。它结合案件卷宗、自建知识库、流式对话和工具调用，辅助分析案件、起草文书、检索资料与计算。

## 目录

- [功能](#功能)
- [技术架构](#技术架构)
- [本地部署](#本地部署)
- [环境变量配置](#环境变量配置)
- [使用流程](#使用流程)
- [API 接口](#api-接口)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

## 功能

- **案件卷宗**：提取当事人、案由、核心事实、诉讼请求与证据清单，支持保存并挂载到当前对话。
- **流式对话**：通过 SSE 输出，支持模型选择与已配置提供商之间的故障降级。
- **文档分析**：解析 PDF、DOCX 和文本文件；将图片交给支持视觉输入的模型。
- **知识库**：维护法条、案例等条目，作为回答的参考上下文。
- **法律工作台**：提供合同起草、合同审核、法条与案例检索入口。
- **内置工具**：计算器、日期时间、联网搜索与基于公开网页的商标检索。
- **本地持久化**：通过浏览器保存会话、卷宗、知识条目与外观设置。

## 技术架构

前端采用 React 19、TypeScript、Vite 7 与 Tailwind CSS 4；后端采用 Express 4 与 TypeScript。Agent 核心位于 `backend/src/modules/agent/`，使用自研的 OpenAI 兼容 Function Calling 循环，未使用 LangChain 或 LlamaIndex。

```text
浏览器界面 → Express API → 系统提示词 + 卷宗 + 知识库 + 会话历史
                                ↓
                             模型服务
                                ↓ 工具调用
                             执行内置工具
                                ↓
                             回填结果 → SSE 流式回答
```

核心本地应用无需数据库、Redis、向量库、CloudBase 账号或 GPU。卷宗与知识条目以文本方式注入提示词，目前没有向量检索 RAG 流程，也不支持 MCP 服务接入或动态 Skills 加载。

**本地部署指在本机运行网页和 Agent 后端，模型推理仍调用外部 API。** 提交的材料会发送至所选模型提供商，检索词会发送至配置的搜索服务。浏览器数据绑定当前站点来源与浏览器配置，清理站点数据会导致丢失；切换访问端口也会切换存储来源。

## 本地部署

### 1. 准备环境

- Node.js **22.x，且版本不低于 22.17.1**；仓库的 EdgeOne 配置固定为 22.17.1。
- npm 10+ 和 Git。
- 至少一个有效的模型 API Key：智谱 BigModel、硅基流动 SiliconFlow 或 OpenRouter，并确保本机能访问相应 API。

不需要安装 pnpm。仓库使用 npm workspaces，依赖版本由根目录 `package-lock.json` 锁定。

### 2. 克隆仓库并安装依赖

以下命令可在 Windows PowerShell、macOS 终端或 Linux Shell 中运行：

```sh
git clone https://github.com/ycvenopyer/xiaozhi-law-agent.git
cd xiaozhi-law-agent
node --version
npm --version
npm ci
```

在**仓库根目录**执行 `npm ci`，一次安装前后端依赖。后面的源码运行方式需要 `tsx`，请保留开发依赖，不要使用 `--omit=dev` 安装。

### 3. 配置后端环境变量

**仅在 `backend/.env` 尚不存在时**复制模板，已有配置时直接编辑，避免覆盖。

Windows PowerShell：

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

macOS / Linux：

```sh
cp backend/.env.example backend/.env
nano backend/.env
```

例如，在 `backend/.env` 中加入自己的智谱 Key，并保留默认 API 前缀和端口：

```dotenv
NODE_ENV=development
PORT=3000
API_PREFIX=/api
CORS_ORIGIN=*
ZHIPU_API_KEY=replace_with_your_actual_key
```

将占位符替换成真实 Key。也可以改用 `SILICONFLOW_API_KEY` 或 `OPENROUTER_API_KEY`。当前模板未列出这些提供商专用 Key，需要自行添加对应行。修改后重启后端。

**当前版本只填写 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 无法启用聊天。** 实际聊天从 `backend/src/modules/agent/providers.ts` 注册表选择模型，至少需要上述三个提供商专用 Key 之一。旧的 `/api/agent/config` 返回值不能代表注册表模型的可用状态，请使用 `/api/agent/models` 检查。模型权限、价格、额度和可用性以提供商账号为准，代码中的 `free` 标记不代表免费承诺。

密钥只放在后端 `backend/.env`，该文件已被 Git 忽略。不要将模型或搜索密钥写入前端环境变量。

### 4. 推荐方式：构建后单端口运行

在仓库根目录构建前端：

```sh
npm run build
```

然后仍在仓库根目录启动后端。

Windows PowerShell：

```powershell
$env:NODE_ENV="production"
$env:PORT="8080"
npm exec --workspace backend -- tsx src/index.ts
```

macOS / Linux：

```sh
NODE_ENV=production PORT=8080 npm exec --workspace backend -- tsx src/index.ts
```

浏览器访问 **http://localhost:8080**。Express 在同一端口提供 `frontend/dist` 静态页面和 `/api` 接口。保持终端运行，按 `Ctrl+C` 停止服务；修改前端代码后需要重新执行 `npm run build`。

这里使用已安装的 `tsx` 直接运行后端 TypeScript。当前后端 TypeScript 配置输出 CommonJS，但包声明为 ESM，源码又包含 `import.meta`，因此修复配置前，不要将 `npm run build --workspace backend` 再接 `npm start --workspace backend` 作为部署流程。

### 5. 开发方式：两个终端分别运行

终端 A，在仓库根目录执行：

```sh
npm run dev --workspace backend
```

终端 B，在仓库根目录执行：

```sh
npm run dev --workspace frontend
```

浏览器访问 **http://localhost:5173**。Vite 将 `/api` 请求代理到 `http://localhost:3000`。

如果刚执行过上面的生产运行示例，请新开终端，避免继承 `PORT=8080` 与 `NODE_ENV=production`，导致开发代理无法连接。

目前 Vite 的 HMR 配置面向托管开发环境。如果本地热更新出现 WebSocket 连接错误，可删除 `frontend/vite.config.ts` 中的 `server.hmr` 配置块，让 Vite 使用本地默认值，然后重启 Vite；也可以直接使用上面的单端口运行方式。

### 6. 检查是否部署成功

在另一个终端运行；开发方式请将下面的 `8080` 改成后端端口 `3000`。

Windows PowerShell：

```powershell
Invoke-RestMethod http://localhost:8080/api/health
Invoke-RestMethod http://localhost:8080/api/agent/models
```

macOS / Linux：

```sh
curl http://localhost:8080/api/health
curl http://localhost:8080/api/agent/models
```

健康检查应返回 `"status":"ok"`；模型列表中应至少有一个模型的 `available` 为 `true`。这只表示后端已读取 Key，不代表远端已验证 Key。最后在页面选择可用模型并发送一条简短消息，确认真实模型调用成功；必要时切换到另一个可用模型。

## 环境变量配置

后端配置统一写在 `backend/.env`。终端环境变量优先于 `.env`；上面的命令会以 backend 工作区为运行目录，让 `dotenv` 正确读取文件。

| 变量 | 用途 / 默认值 |
| --- | --- |
| `ZHIPU_API_KEY` | 启用已注册的智谱文本、视觉模型。 |
| `SILICONFLOW_API_KEY` | 启用已注册的硅基流动模型。 |
| `OPENROUTER_API_KEY` | 启用已注册的 OpenRouter 模型。 |
| `WEB_SEARCH_PROVIDER` | 可选：`tavily` 或 `serpapi`。 |
| `WEB_SEARCH_API_KEY` | 所选搜索服务的 Key。 |
| `NODE_ENV` | `development`、`production` 或 `test`；默认 `development`。 |
| `PORT` | 后端端口，默认 `3000`。 |
| `API_PREFIX` | 默认 `/api`；前端使用固定 `/api` 路径，请保留。 |
| `CORS_ORIGIN` | 默认 `*`；也可以填写一个明确的来源 URL。 |
| `LOG_LEVEL` | 日志级别，默认 `info`。 |
| `LLM_TEMPERATURE` | 默认 `0.7`。 |
| `LLM_MAX_TOKENS` | 默认 `2000`。 |
| `WEB_DIST` | 可选：前端构建产物路径，默认指向 `frontend/dist`。 |

需要联网研究和商标检索时，追加：

```dotenv
WEB_SEARCH_PROVIDER=tavily
WEB_SEARCH_API_KEY=replace_with_your_search_key
```

普通联网搜索也支持 SerpAPI；**商标工具目前只支持 Tavily**，检索对象是公开网页，并非直连官方商标注册数据库。未配置搜索 Key 时仍可聊天，但无法实时联网检索。

图片分析要求账号能够访问注册表中的视觉模型。接入其他 OpenAI 兼容端点或自建模型时，需要修改 `providers.ts` 注册模型，仅修改通用 `LLM_*` 配置不会完成接入。

## 使用流程

1. 新建对话，选择已配置的模型。
2. 在卷宗面板上传材料或粘贴案情，提取五项信息，人工核对后保存并挂载到当前会话。
3. 在知识库中添加相关法条和案例，提供参考上下文。
4. 提出案件分析、文书起草或计算问题，也可通过工作台进入专门任务。

单文件上传上限为 **4 MiB**，JSON 请求体上限为 **5 MiB**，文件提取文本最多保留 **40,000 字符**。PDF 解析读取内嵌文本；扫描版 PDF 需先自行 OCR，或将图片交给视觉模型。Word 文档请使用 `.docx`，不支持旧版 `.doc`。

法律文书、引用和搜索结果在正式使用前需要律师审核。当前后端没有应用级身份验证，如需向其他用户开放部署，请先补充访问控制。

## API 接口

默认前缀为 `/api`。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 进程健康检查。 |
| GET | `/api/agent/models` | 模型注册表与 Key 配置状态，不返回密钥。 |
| POST | `/api/agent/chat` | 带工具调用的 SSE 流式对话。 |
| POST | `/api/agent/extract-dossier` | 提取结构化卷宗信息。 |
| POST | `/api/agent/files` | 解析上传文件。 |

## 目录结构

```text
.
├── backend/src/
│   ├── config/               # 环境校验与日志
│   ├── modules/agent/        # Agent 循环、模型、工具、文件与接口
│   ├── app.ts                # Express 与前端静态托管
│   └── index.ts              # 本地服务入口
├── frontend/src/             # React 界面与浏览器持久化
├── cloud-functions/          # EdgeOne API 入口
├── scripts/edgeone.test.ts   # EdgeOne 集成检查
├── docs/                     # 产品与开发资料
├── edgeone.json              # EdgeOne 构建、部署配置
├── package.json              # npm 工作区与根目录命令
├── README.md                 # 英文文档
└── README-zh.md              # 中文文档
```

## 常见问题

| 现象 | 排查与处理 |
| --- | --- |
| 所有模型均不可用 | 在 `backend/.env` 中添加提供商专用 Key，并重启后端。 |
| 模型返回 401 / 403 / 429 | 检查 Key、模型权限、余额和配额，或切换其他已配置模型。 |
| 页面能打开但 API 失败 | 确认后端已启动；开发代理要求端口为 `3000`，API 前缀保留 `/api`。 |
| 端口被占用 | 停止冲突进程；Vite 固定使用严格端口 `5173`，单端口方式可改 `PORT`。 |
| 单端口访问首页返回 404 | 启动前执行 `npm run build`，确认存在 `frontend/dist`。 |
| 出现 `import.meta`、ESM 或 CommonJS 构建错误 | 后端使用本文提供的 `tsx` 源码运行命令。 |
| 本地热更新失败 | 按开发步骤说明处理 `server.hmr` 配置。 |
| 联网搜索或商标检索不可用 | 检查搜索 Key；商标工具必须使用 Tavily。 |
| 文件过大或扫描 PDF 无文字 | 减小文件；扫描 PDF 先 OCR，或使用图片输入。 |

## 参与贡献

欢迎通过 Issue 描述问题或改进建议，并提交范围清晰的 Pull Request，附上复现步骤和验证结果。请勿提交密钥或真实案件隐私材料。

仓库根目录的常用检查命令：

```sh
npm run build
npm run test:edgeone
```

根目录构建仅检查并打包前端，不编译后端。EdgeOne 测试覆盖云函数入口与共享集成行为；本地部署直接使用 Express，无需 EdgeOne 账号。

## 许可证

[Apache License 2.0](./LICENSE)。
