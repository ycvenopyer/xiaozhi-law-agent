# XiaoZhi — AI Assistant for Intellectual Property Lawyers

[English](./README.md) | [简体中文](./README-zh.md)

XiaoZhi (小知) is a case-aware AI assistant for intellectual property work, including trademarks, patents, copyright, trade secrets, and unfair competition. It combines uploaded case materials, a user-maintained knowledge base, streaming conversations, and tools for research and calculations.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Local deployment](#local-deployment)
- [Configuration](#configuration)
- [Usage](#usage)
- [API](#api)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Case dossiers:** extract parties, cause of action, facts, claims, and evidence from case materials; save and attach dossiers to conversations.
- **Streaming chat:** SSE responses, model selection, and fallback between configured providers.
- **Document analysis:** extract text from PDF, DOCX, and text files; send images to a vision-capable model.
- **Knowledge base:** maintain statutes and cases and include them in the assistant's context.
- **Legal workbench:** dedicated entry points for contract drafting/review and statute/case research.
- **Built-in tools:** arithmetic, date/time, web search, and trademark research through public web sources.
- **Browser persistence:** store conversations, dossiers, knowledge entries, and appearance settings locally.

## Architecture

The frontend uses React 19, TypeScript, Vite 7, and Tailwind CSS 4. The backend uses Express 4 and TypeScript. A custom OpenAI-compatible function-calling loop lives in `backend/src/modules/agent/`; it does not use LangChain or LlamaIndex.

```text
Browser UI → Express API → system prompt + dossier + knowledge + conversation
                                ↓
                         model provider
                                ↓ tool calls
                         execute built-in tools
                                ↓
                         feed results back → SSE response
```

No database, Redis, vector store, CloudBase account, or GPU is required for the core local app. Knowledge and dossier text are injected into the prompt; this is not a vector-search RAG pipeline. MCP servers and dynamically loaded Skills are not currently supported.

**Local deployment runs the web app and agent backend on your computer. Model inference still uses external APIs.** Submitted material is sent to the selected model provider, and research queries go to the configured search service. Browser data is tied to its origin/profile and can be lost when site data is cleared; changing ports also changes the storage origin.

## Local deployment

### 1. Prerequisites

- Node.js **22.17.1 or newer in the 22.x series** (the repository's EdgeOne configuration pins 22.17.1).
- npm 10+ and Git.
- Network access and a valid API key for at least one provider registered in `backend/src/modules/agent/providers.ts`: Zhipu BigModel, SiliconFlow, or OpenRouter.

You do not need to install pnpm. The repository uses npm workspaces and a root `package-lock.json`.

### 2. Clone and install

Run from PowerShell, macOS Terminal, or a Linux shell:

```sh
git clone https://github.com/ycvenopyer/xiaozhi-law-agent.git
cd xiaozhi-law-agent
node --version
npm --version
npm ci
```

Run `npm ci` in the repository root; it installs both workspaces, including the `tsx` runtime. Keep development dependencies installed for the source-based deployment below.

### 3. Configure the backend

Copy the template **only if `backend/.env` does not already exist**.

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

macOS / Linux:

```sh
cp backend/.env.example backend/.env
nano backend/.env
```

For example, add your Zhipu key to `backend/.env` and keep the default API prefix and port:

```dotenv
NODE_ENV=development
PORT=3000
API_PREFIX=/api
CORS_ORIGIN=*
ZHIPU_API_KEY=replace_with_your_actual_key
```

Alternatively, add `SILICONFLOW_API_KEY` or `OPENROUTER_API_KEY`. Provider keys are not included in the current template; add the needed lines yourself. Restart the backend after editing `.env`.

**Setting only `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` does not enable chat in the current implementation.** Chat resolves providers from the registry and requires one of the three provider-specific keys above. The legacy `/api/agent/config` response does not represent registry availability; use `/api/agent/models` instead. Model access, billing, quotas, and availability depend on your provider account; registry `free` labels are not a pricing guarantee.

Keep credentials in `backend/.env`, which is ignored by Git. Do not put model/search secrets in frontend environment variables.

### 4. Recommended: build and run on one local port

Build the frontend from the repository root:

```sh
npm run build
```

Then start the backend from the repository root.

Windows PowerShell:

```powershell
$env:NODE_ENV="production"
$env:PORT="8080"
npm exec --workspace backend -- tsx src/index.ts
```

macOS / Linux:

```sh
NODE_ENV=production PORT=8080 npm exec --workspace backend -- tsx src/index.ts
```

Open **http://localhost:8080**. Express serves `frontend/dist` and `/api` from the same port. Keep the terminal running; press `Ctrl+C` to stop. Re-run `npm run build` after changing the frontend.

This command deliberately runs TypeScript through the installed `tsx` runtime. The current backend TypeScript configuration targets CommonJS while the package uses ESM and source files use `import.meta`; `npm run build --workspace backend` followed by `npm start --workspace backend` is not a working deployment path without fixing that configuration.

### 5. Alternative: development with two terminals

From the repository root in terminal A:

```sh
npm run dev --workspace backend
```

From the repository root in terminal B:

```sh
npm run dev --workspace frontend
```

Open **http://localhost:5173**. Vite proxies `/api` to `http://localhost:3000`. Use fresh terminals after the production example so `PORT=8080` and `NODE_ENV=production` are not inherited.

The Vite HMR configuration currently targets a hosted development environment. If local hot reload reports a WebSocket error, remove the `server.hmr` block from `frontend/vite.config.ts` to use Vite's local defaults and restart Vite, or use the single-port deployment above.

### 6. Verify the service

In a second terminal (replace `8080` with `3000` for the development backend):

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/api/health
Invoke-RestMethod http://localhost:8080/api/agent/models
```

macOS / Linux:

```sh
curl http://localhost:8080/api/health
curl http://localhost:8080/api/agent/models
```

The health response should contain `"status":"ok"`. At least one model should report `"available":true`; this means a key was loaded, not that the remote provider accepted it. In the UI, select an available model and send a short message to verify actual inference. If needed, select a different available model.

## Configuration

All backend settings go in `backend/.env`; shell environment variables take precedence. Commands above use the backend workspace as the working directory so `dotenv` finds that file.

| Variable | Purpose / default |
| --- | --- |
| `ZHIPU_API_KEY` | Enables registered Zhipu text/vision models. |
| `SILICONFLOW_API_KEY` | Enables registered SiliconFlow models. |
| `OPENROUTER_API_KEY` | Enables registered OpenRouter models. |
| `WEB_SEARCH_PROVIDER` | Optional: `tavily` or `serpapi`. |
| `WEB_SEARCH_API_KEY` | Key for the selected search service. |
| `NODE_ENV` | `development`, `production`, or `test`; default `development`. |
| `PORT` | Backend port; default `3000`. |
| `API_PREFIX` | Default `/api`; keep it because the frontend uses `/api`. |
| `CORS_ORIGIN` | Default `*`; supports one explicit origin URL. |
| `LOG_LEVEL` | Default `info`. |
| `LLM_TEMPERATURE` | Default `0.7`. |
| `LLM_MAX_TOKENS` | Default `2000`. |
| `WEB_DIST` | Optional path to built frontend assets; defaults to `frontend/dist`. |

For web research and trademark search, add:

```dotenv
WEB_SEARCH_PROVIDER=tavily
WEB_SEARCH_API_KEY=replace_with_your_search_key
```

General web search also supports SerpAPI. **The trademark tool specifically requires Tavily** and searches public web pages; it is not a direct official trademark-registry integration. Without a search key, local chat can still run, but live research is unavailable. Image analysis requires access to a registered vision-capable model. To add a different OpenAI-compatible endpoint or a self-hosted model, update `providers.ts`; generic `LLM_*` settings alone do not register it.

## Usage

1. Start a conversation and select a configured model.
2. Upload materials or paste case text into the dossier panel, extract the five fields, review them, and attach the dossier to the current conversation.
3. Add relevant statutes/cases to the knowledge panel to supply reference context.
4. Ask for case analysis, a draft, or a calculation; use the workbench for focused tasks.

Uploads are limited to **4 MiB per file** and JSON request bodies to **5 MiB**. Extracted file text is capped at **40,000 characters**. PDF extraction reads embedded text; scanned PDFs need OCR outside this pipeline or images submitted to a vision-capable model. Use `.docx` for Word documents; legacy `.doc` is not supported.

Legal drafts, citations, and search results require professional review before use. The current backend has no application-level authentication; add access control before exposing a deployment to other users.

## API

Default base path: `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process health check. |
| GET | `/api/agent/models` | Registered models and key availability; no secrets returned. |
| POST | `/api/agent/chat` | SSE chat with tool calls. |
| POST | `/api/agent/extract-dossier` | Extract structured dossier information. |
| POST | `/api/agent/files` | Parse uploaded files. |

## Project structure

```text
.
├── backend/src/
│   ├── config/               # Environment validation and logging
│   ├── modules/agent/        # Agent loop, providers, tools, files, API routes
│   ├── app.ts                # Express and frontend static hosting
│   └── index.ts              # Local server entry point
├── frontend/src/             # React UI and browser persistence
├── cloud-functions/          # EdgeOne API entry point
├── scripts/edgeone.test.ts   # EdgeOne integration checks
├── docs/                     # Product and development material
├── edgeone.json              # EdgeOne build/deployment configuration
├── package.json              # npm workspaces and root commands
├── README.md
└── README-zh.md
```

## Troubleshooting

| Symptom | Check / solution |
| --- | --- |
| Every model is unavailable | Add a provider-specific key to `backend/.env`, then restart the backend. |
| 401 / 403 / 429 from a provider | Check credentials, model access, balance, and quotas; try another configured model. |
| UI loads but `/api` fails | Start the backend; development proxy expects port `3000`. Keep `API_PREFIX=/api`. |
| Port already in use | Stop the conflicting process. Vite uses strict port `5173`; single-port deployment can use another `PORT`. |
| Root page returns 404 | Run `npm run build` before starting the single-port service; check `frontend/dist`. |
| `import.meta` / ESM / CommonJS build error | Use the documented `tsx` source command for the backend. |
| Local hot reload fails | See the `server.hmr` workaround in the development section. |
| Search or trademark lookup unavailable | Configure search keys; trademark lookup needs Tavily specifically. |
| Large upload or scanned PDF produces no useful text | Reduce file size; OCR scanned PDFs first or use image input. |

## Contributing

Open an issue describing the problem or proposed change, then submit a focused pull request with reproduction steps and validation results. Do not include credentials or private case materials.

Useful commands from the repository root:

```sh
npm run build
npm run test:edgeone
```

The root build checks and bundles the frontend; it does not compile the backend. The EdgeOne test suite covers the cloud entry point and shared integration behavior. Local deployment uses Express directly and does not require an EdgeOne account.

## License

[Apache License 2.0](./LICENSE).
