# 开发、项目结构与 EdgeOne 部署

## 代码入口

```text
frontend/
├── public/                    登录页和工作区用到的网站图标、头像
└── src/
    ├── main.tsx / App.tsx      React 入口、路由和登录门
    ├── pages/Index.tsx         工作空间状态、会话与模型请求
    ├── components/assistant/   登录、对话、侧边栏搜索、模型配置、事务台
    ├── components/ui/          对话框和下拉菜单
    ├── lib/                    API 客户端、云端记录、附件、旧数据导入
    └── types/agent.ts          对话、项目和模型类型
backend/
└── src/
    ├── index.ts                本地 HTTP 服务入口
    ├── app.ts                  Express 应用工厂与认证挂载
    ├── config/                 环境变量与日志设置
    ├── middleware/             请求日志与错误处理
    └── modules/
        ├── cloudbase.ts        认证与 PostgreSQL 网关调用
        ├── system.ts           健康检查、版本和状态
        └── agent/              模型、SSE、授权、新闻搜索、文件解析
cloud-functions/api/[[default]].ts     EdgeOne Node.js 函数入口
database/migrations/001_cloudbase.sql  CloudBase 首次迁移
database/check_cloudbase.sql          云端结构与权限的只读检查
shared/cloudbase-key.mjs              前后端共用的 Key 拼接
scripts/                              接口、数据库和浏览器验收
docs/                                 开发、云端、功能说明与研发合规规划
```

前端使用 React、Vite 和 Tailwind CSS。业务记录和文件由浏览器通过 CloudBase 网关和 SDK 访问，CloudBase 根据当前登录用户执行访问策略。Express 处理同源 `/api`，对话生成先验证身份与外发授权，再向所选模型发送资料。回答经 SSE 返回并在完成前保存到 CloudBase。

| 要维护的功能 | 从哪里开始看 |
| --- | --- |
| 邮箱验证码登录与账号隐私 | `CloudAccount.tsx`、`LoginBrand.tsx`、`frontend/src/lib/cloudbase.ts` |
| 搜索、查看和保存对话 | `ConversationSearch.tsx` 在浏览器搜索已载入的本账号对话。滚动由 `MessageList.tsx` 管理，保存由 `frontend/src/lib/cloud-store.ts` 管理 |
| 内置与自定义模型 | 内置型号在 `backend/src/modules/agent/providers.ts`，厂商预设在 `frontend/src/lib/model-presets.ts`，自定义接口转发在 `backend/src/modules/agent/custom-provider.ts` |
| 今日知产新闻 | `Workbench.tsx` 调用独立新闻接口，`backend/src/modules/agent/ip-news.ts` 向 Tavily 提交固定的公开检索词，并按北京时间筛选当天结果 |

前端组件位于 `frontend/src/components/assistant/`。当前功能清单见 [产品功能](product-features.md)。事务台的业务表单、FTO 回填流程和法规库分别由 `IpWorkflow.tsx`、`PatentScreen.tsx` 和 `shared/law-library.json` 实现。业务规格集中在 [项目升级文档](项目升级文档/小知合规方向-项目说明.md)。

## 默认模型与自定义端点

未保存过模型偏好时，工作区初始选择 GLM-4.7，加载模型列表后根据可用状态更新。智谱内置模型共用后端的 `ZHIPU_API_KEY`。页面中的自定义配置只属于当前浏览器账号，可用来测试支持 OpenAI 兼容流式响应的 HTTPS 端点。若要将自托管端点设为全站默认，需要在后端注册端点，并调整 `pages/Index.tsx` 中的新用户初始选项。

普通对话和文件起草使用已选模型。今日知产新闻使用「设置 → 联网搜索」配置的 Tavily API Key，Key 按账号保存在当前标签页的 `sessionStorage`，退出登录时移除。

## 本地运行

1. 安装 Node.js 22.x 和 npm，在仓库根目录执行 `npm ci`。依赖统一由根目录 `package-lock.json` 管理。
2. 根据 [CloudBase 配置](cloudbase.md) 创建 `frontend/.env.local` 和 `backend/.env`，添加本地访问来源。运行 `npm run dev --workspace backend` 和 `npm run dev --workspace frontend`，打开 `http://localhost:5173`。
3. 如需在一个端口预览，先执行 `npm run build`，再执行 `npm exec --workspace backend -- tsx src/index.ts`，打开 `http://localhost:3000`。Express 会托管 `frontend/dist`。可用后端 `PORT` 与 `WEB_DIST` 覆盖端口与产物目录。
4. 本地后端从 backend 工作区读取 `.env`。如本机出现 Vite WebSocket 提示，当前 `server.hmr` 设置面向托管开发环境，可以使用上述单端口方式预览。独立运行后端使用 `tsx`，现有后端 `tsconfig.json` 的 CommonJS 输出与 ESM 源码入口不兼容。

## EdgeOne 部署

在 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages) 连接代码仓库，选择生产分支，从仓库根目录构建。当前 [edgeone.json](../edgeone.json) 的配置如下：

| 项目 | 仓库配置 |
| --- | --- |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run build` |
| 输出目录 | `frontend/dist` |
| 构建 Node.js 版本 | `22.17.1` |
| 云函数执行上限 | `120` 秒 |
| 前端路由 | SPA 回退到 `/index.html` |

云函数从 `cloud-functions/api/[[default]].ts` 导出 Express 实例，承接 `/api/*`，兼容平台保留或剥离 `/api` 前缀的情况。它复用 `createApp({ serveFrontend: false })`。本地的 `backend/src/index.ts` 才调用 `app.listen()`。参见 [EdgeOne Node.js 云函数](https://pages.edgeone.ai/zh/document/node-functions)及[构建指南](https://pages.edgeone.ai/document/build-guide)。

发布前完成 [CloudBase 迁移和环境变量配置](cloudbase.md)。同一个环境的前端、后端应使用一致的环境 ID 和 Publishable Key。前端构建时读取 `VITE_*` 变量，修改后需触发新部署。自定义模型 Key 通过页面配置，智谱内置模型使用后端的 `ZHIPU_API_KEY`。为预览环境单独核对变量和跨域来源。配置自定义域名见 [域名指南](domain.md)。

发布后先访问 `/api/health`，再用测试账号验证登录、模型列表、流式聊天、今日知产新闻、文件下载和跨账号隔离。健康检查只确认 API 可响应。新闻功能无需为 EdgeOne 配置 Tavily Key 或搜索厂商变量。测试账号在设置中填写自己的 Key 后，检索使用该 Key 对应的 Tavily 额度。

## API

| 方法与路径 | 访问要求与用途 |
| --- | --- |
| `GET /api/health`、`GET /api/ping` | 公开的进程检查 |
| `GET /api/auth/me` | Bearer Token，返回当前用户身份 |
| `GET /api/agent/models` | 登录后获取内置模型列表和配置状态 |
| `POST /api/agent/chat` | 登录及模型外发授权，保存并流式返回模型回答 |
| `POST /api/agent/files` | 登录后解析 multipart 文件，原件由客户端存入 CloudBase 私有桶 |
| `POST /api/agent/custom-model/test` | 登录后向自定义端点发送固定短消息，测试流式响应 |
| `POST /api/agent/ip-news` | 登录后提交当前用户的 `{ apiKey }`，由后端向 Tavily 查询当天的公开新闻 |
| `POST /api/agent/extract-dossier` | 旧客户端兼容接口，仍要求登录和外发授权 |

对话请求须先保存用户消息与回答占位。聊天最多 60 条消息，JSON 请求上限 5 MiB，文件上限 4 MiB，提取文本上限 40,000 字符。PDF 解析读取嵌入文本，扫描件需先 OCR 或作为支持视觉输入的图片提交。Word 请使用 DOCX。聊天在 100 秒主动截止，正常完成、取消或超时都会尽力保存已收到的内容。

业务报告在 `/api/agent/chat` 使用可选的 `workflow` 字段，保留原有认证、外发授权、会话锁和保存流程。服务端核对结构化输出与当前有效条文后才发送结果。`npm run test:workbench` 测试法条选择、跨年切换、引文校验和 CSV 初筛。

法规库更新工具 `scripts/import-law-library.py` 使用 Python、requests、beautifulsoup4 和 PyMuPDF。对需要浏览器访问的官网，可从同一官方 URL 导出正文到临时目录，用 `--texts <目录>` 指定按来源 ID 命名的 `.txt`。合入前核对文号、施行日期、提取首尾和 PDF 跨页分段。

## 验证命令

在仓库根目录运行：

```sh
npm run build
npm run test:edgeone
npm run test:database
npm run test:cloudbase-key
npm run lint --workspace frontend
npx tsc --noEmit --project backend/tsconfig.json --module esnext --moduleResolution bundler
```

`npm test --workspace backend` 也运行共享的接口测试。数据库测试针对内存中的 PostgreSQL 运行 SQL，真实 CloudBase 权限仍需在目标环境验证。

浏览器验收脚本需要 Python Playwright 和本机 Microsoft Edge。启动监听 `127.0.0.1:5173` 的 Vite 服务，为该进程设置 `VITE_CLOUDBASE_PUBLISHABLE_KEY=synthetic-ui-test-key`（且不设置冲突的分段变量），再运行：

```sh
python scripts/cloudbase-ui-qa.py
python scripts/sidebar-ui-qa.py
python scripts/assistant-ui-qa.py
```

三个脚本分别覆盖登录与导入、项目与账号隔离，以及对话搜索、长对话滚动、事务台和模型配置。它们拦截云端、模型和新闻请求。截图存放在 Git 忽略的 `.qa-artifacts/`，构建产物在 `frontend/dist/`，依赖可从根锁文件重新安装。
