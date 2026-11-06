# EdgeOne Pages 前后端一体部署指南

核对日期：2026-11-06。适用于本仓库的 React + Vite 前端和 Express + TypeScript 后端。

本仓库已完成本文第 3–7 节的代码适配，以及第 8 节第 1–2 项的本地安装、构建和待提交文件检查。尚未提交、推送代码或在控制台创建项目。平台功能与额度以实际账号控制台及本文末尾官方文档为准。

## 1. 部署方案

前后端可以部署到同一个 EdgeOne Pages 项目，不需要另购服务器：

```text
浏览器 → https://你的域名/
          ├── 页面、JS、CSS、图片 → Pages 静态资源
          └── /api/*             → Node.js Cloud Functions
                                     └── Express → 模型 / 搜索 API
```

使用支持 npm、Express 的 **Cloud Functions（Node.js）**，目录为 `cloud-functions/`。不要混用边缘函数 `functions/` 的开发规范，也不要自行假定 `node-functions/` 是同等入口目录。

后端无需作为常驻进程启动，平台接收请求并调用导出的 Express 实例。前端继续请求同源 `/api/...`，不需要设置外部 API 域名或 `VITE_API_BASE_URL`。

## 2. 适配前的行为与修改目标

| 代码位置 | 当前行为 | 部署调整 |
| --- | --- | --- |
| `backend/src/app.ts` | 已导出 `createApp()`，同时尝试托管前端 | 复用 API 逻辑，给静态托管增加开关 |
| `backend/src/index.ts` | 调用 `app.listen()` | 保留给本地运行，云函数不导入此文件 |
| `frontend/src/lib/agent-client.ts` | 使用同源 `/api/agent/...` | 保留 |
| `frontend/vite.config.ts` | 开发环境代理到本地 3000 端口 | 保留；生产环境由 Pages 函数路由承接 |
| `backend/src/modules/agent/files.ts` | 内存上传，单文件允许 12 MiB | 降至 4 MiB，并在前端限制请求体大小 |
| `backend/src/app.ts` | JSON / URL 编码请求体允许 20 MB | 降至 5 MB，给平台 6 MB 限制留余量 |
| `frontend/src/lib/sessions.ts`、`dossiers.ts`、`knowledge.ts` | 数据保存到浏览器 localStorage | 无需新建数据库 |

会话、卷宗和知识库目前不在后端本地磁盘中。换浏览器、清空站点数据或更换域名，会看到不同的本地数据；如需跨设备同步，再引入数据库或对象存储。

后端目前 `package.json` 使用 ESM，`tsconfig.json` 却输出 CommonJS，且源码包含 `import.meta`。本方案让 Pages 构建器直接处理 TypeScript 函数入口，不执行后端的 `tsc → node dist/index.js` 启动流程；这不代表现有后端独立构建问题已修复。

## 3. 准备统一的安装和构建入口

使用 Node.js 22.17.1 或更新的 22.x 版本进行前端构建，避免 Vite 7 遇到旧版 Node 兼容问题。构建环境版本与云函数运行时版本是两个概念，后者以平台实际支持为准。

在仓库根目录新增 `package.json`：

```json
{
  "name": "xiaozhi-law-agent",
  "private": true,
  "type": "module",
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "build": "npm run build --workspace frontend"
  }
}
```

在仓库根目录执行：

```powershell
npm install
npm run build
```

`npm install` 会根据两个 workspace 的依赖声明安装前后端依赖，并生成根目录 `package-lock.json`。提交这个锁文件，后续云端使用根目录的 `npm ci`。已有子目录锁文件不作为本部署流程的安装入口；统一使用 npm，避免同时修改多个包管理器锁文件。

如果在其他分支上已有根目录 `package.json`，合并以上字段，不要覆盖已有配置。本仓库已新增该文件，并提供 `npm run test:edgeone` 验证脚本。

本次安装发现旧 `node_modules` 中存在失效链接，已将旧依赖目录隔离到被 Git 忽略的 `.dependency-backup/`，再重新生成根目录锁文件并执行干净安装。该目录只作本地备份，不参与构建或提交。

## 4. 让 Express 可以关闭静态托管

编辑 `backend/src/app.ts`，将函数签名修改为：

```ts
export const createApp = (
  { serveFrontend = true }: { serveFrontend?: boolean } = {}
): Application => {
  const app = express()
  // 保留现有中间件、API 路由和错误处理。
```

将现有从 `const __filename = fileURLToPath(import.meta.url)` 到静态托管结束的代码替换为：

```ts
  if (serveFrontend) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const webDist = path.resolve(
      process.env.WEB_DIST || path.join(__dirname, '..', '..', 'frontend', 'dist')
    )
    if (fs.existsSync(webDist)) {
      app.use(express.static(webDist))
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(webDist, 'index.html'))
      })
    }
  }
```

此处使用 `process.env.WEB_DIST`，因为当前环境变量 schema 并未定义 `env.WEB_DIST`。保留末尾的 `app.use(errorHandler)` 和 `return app`。本地 `createApp()` 仍按原方式运行，云函数调用 `createApp({ serveFrontend: false })`。

## 5. 新增 Node.js 云函数入口

在仓库根目录创建 `cloud-functions/api/[[default]].ts`，完整内容如下：

```ts
import express from 'express'
import { createApp } from '../../backend/src/app'

const app = express()

// 兼容适配器将 /api 前缀保留或剥离的情况。
// 本仓库固定 API_PREFIX=/api，内部 Express 路由统一接收 /api/...。
app.use((req, _res, next) => {
  const pathname = req.url.split('?')[0]
  if (pathname !== '/api' && !pathname.startsWith('/api/')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`
  }
  // 现有 SSE 压缩过滤器读取 originalUrl，同步为内部规范路径。
  req.originalUrl = req.url
  next()
})

app.use(createApp({ serveFrontend: false }))

export default app
```

`[[default]].ts` 用于承接 `/api` 下未被其他函数文件匹配的路径，包括 `/api/ping`、`/api/agent/models`、`/api/agent/chat`。只创建 `cloud-functions/api.js` 不能据此认为 `/api/agent/chat` 也会自动匹配。

不调用 `app.listen()`，不导入 `backend/src/index.ts`。官方 Express 模式要求导出框架实例。首次部署必须先验证 `/api/ping`，确认当前平台适配器的实际路由行为。

## 6. 适配上传和流式输出

官方 Cloud Functions 当前通用限制为：请求/响应 body 最多 6 MB，执行时长默认 30 秒、最长 120 秒，单函数代码包包含依赖最多 128 MB。

### 文件与图片

将 `backend/src/modules/agent/files.ts` 中的限制改为：

```ts
limits: { fileSize: 4 * 1024 * 1024 },
```

将 `backend/src/app.ts` 对应两行改为：

```ts
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
```

前端也应在上传前拒绝超过 4 MiB 的文件，并显示明确提示。图片经 Base64 编码后体积通常增加约三分之一，多图和完整历史消息会进一步增大请求；在发送聊天和卷宗识别请求前，以 `new Blob([JSON.stringify(payload)]).size` 检查总 JSON 体积，建议不超过 5 MiB。

仅设置 Multer 限制不能避免平台先返回 413。超过平台限制的原始文件可另行设计 COS 直传，再传对象引用；这是后续扩展，不是当前流程已具备的能力。

### SSE 对话

当前 `backend/src/modules/agent/router.ts` 已设置 SSE 响应头、逐步写入和心跳，`app.ts` 已对聊天接口跳过压缩，保留这些逻辑。心跳不能延长平台的最大执行时长。

已将函数上限设为 120 秒，并为聊天和卷宗识别加入 110 秒主动截止：中止上游模型请求，向前端发送可读错误，结束响应并清理定时器。卷宗识别在取消后不再继续尝试后续模型。仍需在线上实测短对话、长回答和多轮工具调用，不能假设所有任务一定能在上限内完成。长任务需要拆分或采用异步任务方案。

## 7. 根目录新增 edgeone.json

```json
{
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "nodeVersion": "22.17.1",
  "cloudFunctions": {
    "nodejs": {
      "maxDuration": 120
    }
  },
  "rewrites": [
    {
      "source": "/*",
      "destination": "/index.html"
    }
  ]
}
```

精确的 `/* → /index.html` 配置是官方 SPA fallback：优先匹配资源与函数，未命中时才返回首页。不要把 API 用 301/302 重定向到其他地址。

最终结构应为：

```text
xiaozhi-law-agent/
├── package.json
├── package-lock.json
├── edgeone.json
├── cloud-functions/
│   └── api/
│       └── [[default]].ts
├── frontend/
│   ├── package.json
│   └── dist/                 # 云端构建生成，不必提交
├── backend/
│   ├── package.json
│   └── src/
└── docs/dev.md
```

## 8. 提交代码并在控制台创建项目

1. 完成上述修改，在根目录执行 `npm ci`、`npm run build`，解决构建错误。
2. 检查待提交文件，不提交 `.env`、API Key、`node_modules` 或生成的 `dist`。
3. 将代码与根目录锁文件推送到 GitHub 或账号支持的 Git 平台。
4. 打开 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)，创建项目并导入该仓库。
5. 按下表配置，避免自动识别为仅部署 `frontend` 的项目。

| 控制台配置 | 值 |
| --- | --- |
| 根目录 | 仓库根目录 `.`，不要选 `frontend` |
| 框架预设 | 可选 Vite；以手动填写的命令和路径为准 |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run build` |
| 输出目录 | `frontend/dist` |
| 构建 Node.js 版本 | 22.17.1 或支持 Vite 7 的更新版本 |
| 生产分支 | 实际发布分支，例如 `main` |

根目录同时包含前端构建配置与 `cloud-functions/`。函数由平台识别打包，不要把函数目录复制进静态输出目录，也不要填写 `npm start` 作为部署构建命令。

若账号控制台尚未提供 Node.js Cloud Functions，需先确认产品入口、区域和功能开通情况；仅支持静态资源或 Edge Functions 的入口不能直接套用本方案。

## 9. 配置环境变量

在项目环境变量中配置生产环境；需要预览分支测试时，也配置对应预览环境。不要把本地 `.env` 原样全部公开到仓库。

| 变量 | 示例 / 用途 |
| --- | --- |
| `NODE_ENV` | `production` |
| `API_PREFIX` | `/api`，与入口适配逻辑保持一致 |
| `ZHIPU_API_KEY` | 智谱模型密钥，按需填写 |
| `SILICONFLOW_API_KEY` | 硅基流动模型密钥，按需填写 |
| `OPENROUTER_API_KEY` | OpenRouter 密钥，按需填写 |
| `WEB_SEARCH_PROVIDER` | 可选，例如 `tavily` |
| `WEB_SEARCH_API_KEY` | 搜索提供商密钥，可选 |
| `LOG_LEVEL` | 可选，例如 `info` |

至少为实际选用的模型提供商配置有效密钥。模型列表来自 `backend/src/modules/agent/providers.ts`；仅填 `LLM_API_KEY` 不代表列表中的智谱、硅基流动等模型就已配置。模型价格与可用性以提供商为准，不以代码中的 `free` 标签作为计费依据。

同源请求不需要额外跨域配置，`CORS_ORIGIN` 可以先沿用默认值；需要限制允许来源时，填写实际前端 origin（不带路径），并考虑预览域名。云函数不依靠 `PORT` 或常驻进程接收请求。

后端密钥不要加 `VITE_` 前缀，不要在 Vite `define` 中注入。`frontend/vite.config.ts` 当前读取 `/workspace/.env.tcb` 的逻辑属于既有 CloudBase 配置，本方案不依赖该文件；若以后启用相关功能，应单独调整为平台环境变量配置，并核对可公开变量的范围。

保存环境变量后重新部署；已有部署不会自动获得新配置。

## 10. 部署后的验证顺序

不要仅用首页能打开判断部署成功。先记录控制台实际给出的部署 URL，不假定默认域名的固定后缀或长期有效性。

在 Windows PowerShell 中，将示例域名换成真实地址：

```powershell
curl.exe -i https://你的部署域名/api/ping
curl.exe -i https://你的部署域名/api/health
curl.exe -i https://你的部署域名/api/agent/models
```

三个接口应返回接口内容（JSON），而非首页 HTML。然后测试 SSE：

```powershell
$chatBody = '{"messages":[{"role":"user","content":"你好，请简短介绍你的用途"}]}'
$chatBody | curl.exe -N -i https://你的部署域名/api/agent/chat -H "Content-Type: application/json" --data-binary '@-'
```

省略 `model` 时后端按当前策略选用模型；如提示未配置密钥，先查看模型列表，配置对应提供商，或在请求中添加实际可用的模型 ID。

验收清单：

- `/api/ping` 与 `/api/health` 返回正常，控制台能看到函数日志。
- 模型列表至少有一个模型可用，聊天能逐步收到 `data:` 事件。
- 长回答与工具调用可完成；接近上限时有明确错误，而非无提示中断。
- 小型 PDF、Word、文本上传及卷宗识别成功，过大文件在前端被明确拒绝。
- 首页、静态资源与前端子路由刷新正常。
- 预览和生产环境分别检查密钥；国内用户从实际网络测试延迟和上游模型连通性。
- 刷新后会话仍保留；明确数据保存在当前浏览器和当前域名中。

已完成的本地验证：

- 根目录 `npm ci` 成功，`npm run build` 成功生成 `frontend/dist`。
- `npm run test:edgeone` 的 6 项测试通过，覆盖完整和剥离前缀的 API 路由、文本上传、413 错误、前端 UTF-8 请求体积检查、模拟模型 SSE、超时取消和响应结束。
- 待提交文件检查未发现 `.env`、`node_modules`、`dist` 或旧依赖备份；与本地环境文件中的密钥值比对未发现泄漏。
- Vite 提示主 JS 产物大于 500 kB，属于构建警告，后续可按需拆包。

上述 SSE 和超时测试使用模拟上游，不调用真实模型。尚未实际部署，线上函数打包、PDF/Word 解析及真实模型长回答仍需按本节步骤验证。Windows 沙箱阻止 esbuild 访问祖先目录时，需要在获准的环境执行同一构建命令；这不是项目 TypeScript 编译错误。

## 11. 常见故障

| 现象 | 排查方向 |
| --- | --- |
| `/api/...` 返回 HTML | 函数未识别、根目录错误、函数入口未提交，或请求落入 SPA fallback |
| 返回 Express 404 | 检查 `API_PREFIX=/api`、通配入口及前缀处理，先用 `/api/ping` 定位 |
| 找不到 express 或其他模块 | 确认根目录 workspaces、锁文件与 `npm ci`；不要只安装前端依赖 |
| PDF 解析报资源文件缺失 | 看函数打包日志；依赖包含静态资源时，按官方 `externalNodeModules` / `includeFiles` 配置补充打包，并重新测真实 PDF |
| 约 30 秒请求断开 | 确认 `cloudFunctions.nodejs.maxDuration` 已生效并重新部署 |
| 约 120 秒请求断开 | 已达到平台上限，缩短调用、减少重试或拆分任务 |
| 413 请求过大 | 检查完整 multipart/JSON 请求体，尤其 Base64 图片、多图及历史消息 |
| 模型不可用 / 401 / 429 | 检查对应提供商密钥、账户额度、并发限制及函数地域的上游连通性 |
| 代码包超限 | 检查实际打包依赖和资源，不要把前端 dist 或全部 node_modules 手工塞入函数 |

绑定正式域名时，按控制台完成 DNS 与 HTTPS 配置。中国大陆加速区域的自定义域名需要备案，具体要求见官方快速部署说明。公开提供 AI 接口前应落实实际的鉴权、额度和频率控制；代码中声明了限流环境变量并不等于已经接入限流中间件，CORS 也不能替代鉴权。

## 12. 官方参考

- [Node.js 云函数：Express 实例导出、函数入口与路由](https://pages.edgeone.ai/zh/document/node-functions)
- [Cloud Functions：运行时与使用限制](https://pages.edgeone.ai/zh/document/cloud-functions)
- [edgeone.json：安装构建命令、SPA fallback、函数超时与依赖打包](https://pages.edgeone.ai/zh/document/edgeone-json)
- [构建指南：根目录、Node 版本与环境变量](https://edgeone.cloud.tencent.com/pages/document/162936788693114880)
- [快速部署：加速区域与域名要求](https://edgeone.cloud.tencent.com/pages/document/162936836982489088)
