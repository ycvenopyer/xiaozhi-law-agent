# XiaoZhi · IP Legal Assistant

[简体中文](README-zh.md) · [Online workspace](https://xiaozhi-law-agent.top)

XiaoZhi helps intellectual property practitioners review evidence, draft documents, and find relevant statutes and cases in supplied materials. Sign in with an email verification code to access your conversations and files.

## Workspace

| Where | What you can do |
| --- | --- |
| Sidebar | Search titles and messages, and create, rename, pin, delete, or organize conversations into projects |
| Account menu | Open Settings or Help, or sign out. Settings contains model consent, legacy data import, saved source files, and appearance |
| Top toolbar | Open the knowledge base or Workbench for document drafting and today's IP news |
| Composer | Attach files, research statutes or cases, draft or review contracts, and switch between built-in and custom models |

Statute and case research uses the enabled knowledge base and supplied materials. The IP news tab uses the selected Zhipu endpoint's native search and displays sources from the current calendar day in Asia/Shanghai. Search may be billed separately. Verify citations and drafts before relying on them. The old dossier interface has been retired. Legacy dossier records remain importable and are no longer attached to chat prompts by the current UI.

## Local development

Use Node.js 22.x (22.17.1 or a later 22.x release) and npm. Run `npm ci` from the repository root. Create `frontend/.env.local` and `backend/.env` from the respective `.env.example` files. Set the same CloudBase environment and Publishable Key for both workspaces and add the local origin to the CloudBase configuration. See [CloudBase setup](docs/cloudbase.md) for the initial migration and long-key splitting.

Run these commands from the repository root in separate terminals:

```sh
npm run dev --workspace backend
npm run dev --workspace frontend
```

Open `http://localhost:5173`. Vite proxies `/api` to Express on port 3000. CloudBase supplies authentication and persistent storage. Model inference uses the selected provider. See the [development and deployment guide](docs/dev.md) for a single-port preview and EdgeOne deployment.

## Models and storage

- The built-in Zhipu models are GLM-4.7, GLM-4.7-Flash, GLM-4.6V-Flash, and GLM-4.5-Air. Set `ZHIPU_API_KEY` on the backend to enable them. Verify availability with a request to the provider.
- For a custom model, open the composer model menu and enter a provider, Base URL, API key, and model ID. You can test the connection before saving. Custom models require a public HTTPS endpoint with OpenAI-compatible streaming. Configurations are saved per account in the browser. The API key lasts for the current tab session and is cleared on sign-out.
- CloudBase manages login, PostgreSQL records, and private file storage. Appearance and model preferences stay in the browser. External model processing is disabled by default. Enabling it allows the selected provider to process conversation content, attachments, and enabled knowledge base entries.

## Repository layout

```text
frontend/         React workspace, CloudBase client, and public assets
backend/          Express API, authentication, models, and file parsing
cloud-functions/  EdgeOne Node.js entry point for the shared Express app
database/         CloudBase migration and read-only deployment checks
shared/           Publishable Key handling shared by browser and server
scripts/          Tests, browser checks, and the key-splitting helper
docs/             Development, deployment, domains, and feature reference
edgeone.json      Install, build, and cloud function settings
package-lock.json Shared npm workspace lockfile
```

See the [source map and deployment guide](docs/dev.md), [current features](docs/product-features.md), and [CloudBase setup](docs/cloudbase.md). The [R&D compliance proposal](docs/项目升级文档/小知合规方向-项目说明.md) describes planned work.

## Verification

```sh
npm run build
npm run test:edgeone
npm run test:database
npm run test:cloudbase-key
```

These checks use mocked services or an in-memory database. Verify authentication, isolation, file downloads, and model calls with test accounts after deploying.

[Apache License 2.0](LICENSE).
