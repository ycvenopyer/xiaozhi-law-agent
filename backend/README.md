# 小知后端

Express 应用由 `src/app.ts` 组装。本地开发在仓库根目录运行 `npm run dev --workspace backend`，读取本目录的 `.env`。云端由 [EdgeOne 函数入口](<../cloud-functions/api/[[default]].ts>) 导入同一个应用工厂。

`src/modules/agent/` 负责模型、文件解析、工具调用和 SSE 对话。`src/modules/cloudbase.ts` 负责身份校验和数据库网关调用。使用 [.env.example](.env.example) 配置 CloudBase Publishable Key 及按需启用的内置模型平台 Key。

根目录的 `npm test --workspace backend` 和 `npm run test:edgeone` 都运行同一套接口验证。API、开发运行和部署说明见 [开发与部署](../docs/dev.md)。
