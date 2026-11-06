# 小知（XiaoZhi）— 知识产权律师 AI 办案助理

「小知」取自"知产"，是一位面向知识产权律师的私人 AI 办案助理。它能像承办律师一样贴着案情作答：结合你上传的卷宗分析证据、草拟辩论意见与法律文书、检索法条与典型案例、查询商标注册状态、计算赔偿数额。

---

## 一、这是什么 Agent

小知是一个**领域垂直的法律 AI Agent**，聚焦知识产权业务（商标、专利、著作权、商业秘密、不正当竞争）。与通用聊天机器人相比，它的特点是：

- **案情卷宗驱动**：上传判决书、起诉状或案件叙述后，自动提取「当事人 / 案由 / 核心事实 / 诉讼请求 / 证据清单」五项结构化信息，后续所有回答都结合这份卷宗；
- **律师口吻与规范表达**：引用法条必须写明制定机关与文号，引用案例必须写明法院、案号与裁判要旨，无法确认的内容明确标注"需进一步核实"，严禁编造；
- **卷宗库**：识别过的卷宗自动归档，随时翻阅、搜索，一键挂载到当前对话；
- **工具增强**：联网搜索、商标检索、计算器、日期时间四个内置工具，模型按需调用。

### 功能清单

| 功能 | 说明 |
| --- | --- |
| AI 对话 | 流式输出（SSE），9 个免费模型可切换，单模型故障自动降级到下一个 |
| 卷宗智能识别 | 上传 PDF / Word / 图片 / 粘贴文本 → LLM 提取五要素 + 本地章节标题兜底解析 |
| 卷宗库 | 自动归档、搜索、重命名、删除、一键"用于当前对话" |
| 知识库 | 用户自建核心法条与典型案例库，作答时优先引用 |
| 联网检索 | 调用搜索 API 查法条、案例、最新资讯，附来源链接 |
| 商标查询 | 按关键词检索商标注册状态、近似商标、申请人等 |
| 合同起草/审核 | 知识产权合同起草与风险审核专用面板 |
| 法条/案例检索面板 | 结构化输入（关键词/法条编号/案由）直接检索 |
| 图片识别 | 商标图样、判决书截图、侵权实物照片等多模态识别 |
| 外观定制 | 头像、名称、明暗主题（默认锁定浅色，可手动跟随系统） |

---

## 二、Agent 框架

**没有使用 LangChain / LlamaIndex 等现成框架**，而是基于 **OpenAI Function Calling（Tool Use）协议** 自研了一个轻量 Agent 循环，核心在 `backend/src/modules/agent/`：

```
用户消息 ──► 组装 System Prompt + 卷宗 + 知识库 ──► LLM（流式）
                     ▲                                │
                     │                        tool_calls？
                     │                                ▼
                     └──── 工具结果回填 ◄──── executeTool()（calculator / datetime /
                                              web_search / trademark_search）
```

- **ReAct 式工具循环**：模型决定何时调用哪个工具，后端执行后把结果回填进上下文继续生成，工具调用总次数由 System Prompt 约束（原则上 ≤4 次），避免过度检索；
- **多模型容错链（Provider Chain）**：`providers.ts` 中注册 9 个模型，请求失败按链自动切换下一个，免费额度抖动时用户无感；
- **流式与心跳**：SSE 推送 token，每 15 秒发 `: ping` 注释行防止代理断连；首字节 60s / 空闲 30s 超时自动熔断重试。

---

## 三、前端技术

- **React 19 + TypeScript**（`frontend/src/`）
- **Vite 7** 构建与开发服务器（`/api` 代理到后端 `:3000`）
- **Tailwind CSS 4 + shadcn/ui 风格组件**，主题用 CSS 变量（oklch）+ `.dark` 类切换
- 本地持久化用 **localStorage**（会话 `agent_sessions_v1`、知识库、卷宗库 `agent_dossiers_v1`、外观设置）
- 自研组件：`MessageList / ChatInput / CaseDossier / KnowledgePanel / Workbench / ContractPanel / Sidebar / AppearancePanel` 等

---

## 四、后端技术

- **Node.js + Express 4 + TypeScript**（ESM，`tsx` 直接跑 TS）
- **Multer** 处理文件上传（20MB 上限）、**pino** 结构化日志、**zod** 校验环境变量与请求体、**compression**（SSE 路由除外）
- 关键接口：

| 接口 | 用途 |
| --- | --- |
| `POST /api/agent/chat` | SSE 流式对话（带工具循环） |
| `POST /api/agent/extract-dossier` | 卷宗结构化提取（文本/图片） |
| `POST /api/agent/files` | 文件解析，返回纯文本 |
| `GET /api/agent/models` | 模型清单与可用性 |

- 生产模式下单端口部署：Express 同时静态托管 `frontend/dist`。

---

## 五、数据库构造

**本项目不依赖任何数据库服务。** 所有用户数据（对话会话、知识库、卷宗库、外观设置）以 JSON 形式存储在**浏览器 localStorage** 中，键值如下：

| localStorage 键 | 内容 |
| --- | --- |
| `agent_sessions_v1` | 全部会话（含消息、卷宗引用） |
| `agent_dossiers_v1` | 卷宗库（结构化五要素 + 原始材料） |
| 知识库键 | 用户自建法条/案例条目 |
| `agent-appearance` | 外观设置 |

这样设计的取舍：**0 成本、零运维、随开随用**；代价是数据绑定在单台设备的浏览器里，清除浏览器数据会丢失（可在浏览器设置中导出，或自行扩展接入云端存储）。后端本身**无状态**，方便任意部署。

---

## 六、数据处理流程

### 1. 文件解析（`files.ts`）

- `.txt / .md` → 按 UTF-8 直接读取
- `.pdf` → `pdf-parse` 提取文本
- `.docx` → `mammoth` 提取纯文本
- 图片 → 转 base64 data URL，走视觉模型识别

### 2. 卷宗信息提取（`llm.ts`）

双层机制保证五要素尽可能填满：

1. **LLM 提取**：`EXTRACT_PROMPT` 要求模型主动从叙述体中归纳（禁止因无小标题留空），案由映射到固定枚举，温度 0.2、非流式、强制 JSON 输出（带 ``` 围栏剥离与 `{...}` 截取容错）；
2. **本地启发式兜底**（`heuristicExtract`）：按中文法律文书的章节标题正则（当事人/原被告、案由、本院查明、诉讼请求、判令、证据清单等）切分原文，补齐 LLM 留空的字段。

### 3. 知识注入与检索

- **知识库**：用户手动维护的条目全文拼入 System Prompt（小规模场景下不向量化，避免引入向量库成本）；
- **卷宗**：结构化五要素序列化为文本块（`dossierToText`）随每次请求注入；
- **联网检索**：通过 Tavily / SerpAPI 等 REST 搜索接口实时检索，结果由模型消化后引用并标注来源；本项目未做传统意义的文档切分（chunking）与向量检索（RAG），是面向课堂演示的轻量取舍。

### 4. 上下文管理

- 会话历史按消息完整传递，超长自动截断；
- 流式输出中断时自动续写（`continueBrokenStream`），max_tokens 由环境变量控制。

---

## 七、模型选择与接入方式

### 模型清单（9 个，全部免费额度）

| 提供商 | 模型 | 说明 |
| --- | --- | --- |
| 智谱 BigModel | GLM-4.7 / 4.7-FlashX / 4.6V-Flash（视觉）/ 4.5-Air | 国内直连，Flash 系列免费无日限 |
| 硅基流动 SiliconFlow | Qwen3-8B、DeepSeek-R1-Distill-7B、GLM-4-9B | OpenAI 兼容接口 |
| OpenRouter | Qwen 27B (free)、Ling 3.0 Flash VL（视觉） | 免费额度模型 |

### 接入方式

统一走 **OpenAI 兼容 Chat Completions 协议**（`/v1/chat/completions`），无需各家 SDK：

1. 在 `backend/.env` 配置各家 API Key：

```bash
ZHIPU_API_KEY=xxx          # 智谱 open.bigmodel.cn
SILICONFLOW_API_KEY=xxx    # 硅基流动 cloud.siliconflow.cn
OPENROUTER_API_KEY=xxx     # openrouter.ai
WEB_SEARCH_PROVIDER=tavily # 可选，联网搜索
WEB_SEARCH_API_KEY=xxx
```

2. `providers.ts` 中每个模型是一个 `{ label, baseUrl, model, apiKey }` 记录；
3. 前端模型选择器从 `GET /api/agent/models` 拉取清单，切换模型只影响下一次请求；
4. 提取类调用（卷宗识别）自动沿容错链降级，视觉类请求自动只路由到视觉模型。

---

## 八、MCP 与 Skills 支持情况

- **MCP（Model Context Protocol）：暂不支持。** 当前工具是硬编码在后端 `tools.ts` 中的四个内置工具（calculator / get_datetime / web_search / trademark_search），以 OpenAI Function Calling 形式暴露。若需接入 MCP，可在 `executeTool` 处增加 MCP Client 转发层，把 MCP server 的 tools 映射为同一协议。
- **Skills：暂不支持。** 无插件/技能加载机制，扩展新工具需在 `TOOLS` 数组中登记定义并在 `executeTool` 中实现执行逻辑（两处改动即可）。

---

## 九、本地运行

```bash
# 1. 安装依赖（推荐 pnpm）
pnpm install

# 2. 配置后端环境变量
cp backend/.env.example backend/.env   # 填入至少一个 LLM API Key

# 3. 开发模式（前端 :5173 代理 /api 到 :3000）
pnpm --dir backend dev
pnpm --dir frontend dev

# 4. 生产构建（单端口 :8080，Express 托管前端）
pnpm --dir frontend build
NODE_ENV=production PORT=8080 pnpm --dir backend start
```

---

## 十、目录结构

```
.
├── backend/
│   └── src/
│       ├── app.ts              # Express 应用装配
│       ├── config/env.ts       # zod 环境变量校验
│       ├── middleware/         # 日志、错误处理
│       └── modules/
│           ├── agent/
│           │   ├── llm.ts      # Agent 循环、SSE、卷宗提取
│           │   ├── providers.ts# 9 模型注册与容错链
│           │   ├── tools.ts    # 四个内置工具
│           │   ├── files.ts    # PDF/Word/图片解析
│           │   └── router.ts   # HTTP 路由
│           └── system.ts       # 健康检查
├── frontend/
│   └── src/
│       ├── pages/Index.tsx     # 主页面（会话/卷宗/知识库状态中枢）
│       ├── components/assistant/  # 聊天、卷宗、知识库等组件
│       ├── lib/                # 会话/卷宗/知识库持久化、API 客户端
│       └── types/agent.ts      # 共享类型
└── README.md
```

## License

Apache License 2.0 — 详见 [LICENSE](./LICENSE)。
