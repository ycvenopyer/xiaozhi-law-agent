# 小知后端

Express 应用由 `src/app.ts` 组装。本地开发在仓库根目录运行 `npm run dev --workspace backend`，读取本目录的 `.env`。云端由 [EdgeOne 函数入口](<../cloud-functions/api/[[default]].ts>) 导入同一个应用工厂。

`src/modules/agent/` 负责模型、文件解析、工具调用和 SSE 对话。`src/modules/cloudbase.ts` 负责身份校验和数据库网关调用。用户名密码登录通过现有查询密钥解析当前绑定的邮箱并核对 UID；注册和邮箱换绑由 CloudBase 认证处理。使用 [.env.example](.env.example) 配置 CloudBase Publishable Key 及按需启用的内置模型平台 Key。

`POST /api/agent/prefill` 将材料映射到四类业务表单；`POST /api/agent/chat` 分流到普通对话、结构化报告或文档工具。报告法条引用以数据库公共目录为核验依据。实现与局限见 [详细技术文档](../docs/详细技术文档.md)。

根目录的 `npm test --workspace backend` 和 `npm run test:edgeone` 都运行同一套接口验证。API、开发运行和部署说明见 [开发与部署](../docs/dev.md)。
