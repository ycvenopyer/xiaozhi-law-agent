# CloudBase PG 接入与上线

本项目使用 EdgeOne Pages 托管前端和 Node.js Cloud Functions。业务数据通过 HTTPS 访问 CloudBase PG 网关，不开放 PostgreSQL 公网 SQL 端口，也不需要 CVM。

环境：`xiaozhi-law-agent-d3d75m0c534925`，上海 `ap-shanghai`。

## 1. 执行一次数据库迁移

在 CloudBase 控制台选择此 PG 环境，打开 **数据库 → SQL 编辑器**，完整执行：

[`database/migrations/001_cloudbase.sql`](../database/migrations/001_cloudbase.sql)

这是新环境的首次迁移，包含事务，不要拆开逐条执行，也不要重复执行。出错时先检查错误信息；不要通过开放所有用户权限解决。

迁移创建：

- `public.user_records`：每个用户的对话、卷宗、私有知识条目、台账、设置和文件关联。
- 基于验证后身份的 RLS 读取隔离。
- 受限写入 RPC、版本冲突检查和对话生成锁。
- `private-files` 私有存储桶、4 MiB 文件限制、格式白名单。
- 文件读写、路径与所有者隔离，以及避免其他宽泛策略放开本桶的限制性策略。

第一版使用 **逐条 JSONB 文档**，不是把整个账号保存为一个大 JSON：每份对话一条记录，按顺序包含该对话的消息；每份卷宗、每条私有知识、每个台账项目独立存储。数据库按 `owner_id + kind + id` 建主键，每条文档有 revision。单条文档上限 8 MiB，大规模对话可进一步拆分消息表、分页和检索索引。原始文件字节不存 JSONB。

CloudBase 认证服务维护 `auth.users`；业务记录引用其用户 ID，不创建另一套密码系统。认证表在不同环境中的 ID 类型可能不同，迁移从实际 `auth.users.id` 自动取得字段类型；RPC 使用 `%TYPE` 跟随该类型，RLS 与文件路径比较时统一转换为文本。不会修改平台认证表，也不会通过删除外键绕过校验。

若旧版首次迁移报 `user_records_owner_id_fkey cannot be implemented`（SQLSTATE 42804），先在 SQL 编辑器单独执行 `ROLLBACK;` 结束可能残留的失败事务，再完整执行修正后的首次迁移。该错误出现在业务表创建阶段，后续函数和桶尚未由本次失败执行创建；不要删除平台的 `auth` 或 `storage` 表。

若报 `relation "user_records" already exists`（SQLSTATE 42P07），表示同名对象已经存在，可能是之前已执行迁移，也可能只完成了部分配置。不要直接删表，也不要继续重复执行首次建表脚本。先单独执行 `ROLLBACK;`，再运行 [`database/check_cloudbase.sql`](../database/check_cloudbase.sql)。该文件只读取结构和权限状态，不读取业务资料或修改数据。15 项均为 `PASS` 表示核心对象和权限标志齐备；它不验证完整函数实现或任意额外策略，仍需真实账号的登录、保存、私有文件及两账号隔离验收。有 `CHECK` 时按结果补充后续修复迁移。

## 2. 配置 Publishable Key

### EdgeOne Pages 项目环境变量

在 EdgeOne 项目设置中配置生产环境：

```dotenv
VITE_CLOUDBASE_ENV_ID=xiaozhi-law-agent-d3d75m0c534925
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_PUBLISHABLE_KEY=实际的PublishableKey

CLOUDBASE_ENV_ID=xiaozhi-law-agent-d3d75m0c534925
CLOUDBASE_PUBLISHABLE_KEY=同一个PublishableKey

# 模型使用下方的平台 API Key；不需要额外配置模型白名单。
```

前端与后端必须指向同一环境。前端变量在构建时注入，修改后必须重新构建部署。预览部署需要单独核对环境变量与访问来源。

### Key 超过 EdgeOne 单变量 1000 字节限制

EdgeOne [官方构建指南](https://pages.edgeone.ai/document/build-guide)规定单个环境变量值最多 1000 字节。长 Publishable Key 使用连续编号的分段变量，前后端会在初始化时拼接完整值，不改变 Key 本身。

1. 在 CloudBase 控制台复制完整 **Publishable Key** 到本机剪贴板。
2. 在本项目根目录的 PowerShell 中执行：

   ```powershell
   powershell -NoProfile -File .\scripts\split-cloudbase-key.ps1
   ```

3. 工具读取剪贴板，确认 Key 类型是 `anon`，按每段最多 900 个 ASCII 字符拆分，将前端和后端变量行放回剪贴板。终端仅显示段数，不打印 Key。
4. 移除 Pages 中旧的 `VITE_CLOUDBASE_PUBLISHABLE_KEY` 与 `CLOUDBASE_PUBLISHABLE_KEY`，使用生成的分段变量：

   ```dotenv
   VITE_CLOUDBASE_PUBLISHABLE_KEY_PART_1=第1段
   CLOUDBASE_PUBLISHABLE_KEY_PART_1=相同的第1段
   VITE_CLOUDBASE_PUBLISHABLE_KEY_PART_2=第2段
   CLOUDBASE_PUBLISHABLE_KEY_PART_2=相同的第2段
   # 按工具生成的实际段数继续，不要把示例中文当作变量值。
   ```

5. 如果使用控制台批量导入，可粘贴生成的 `.env` 行；否则逐项填写。环境 ID 和地域变量保持原值。
6. 重新部署包含这次分段支持的代码。仅更新变量不会改变旧部署。

支持最多 16 段，编号必须从 1 连续递增。不能同时填写完整 Key 和分段，不能缺段或截断 Key。更换 Key 时要移除上一次多余的分段。此工具不上传网络、不写磁盘；剪贴板中仍有完整配置，粘贴后可自行清理。账号的第三方模型处理开关默认关闭。

这里需要的是 **Publishable Key**，不是 `service_role` API Key，更不是腾讯云 SecretKey。本实现的运行时不使用管理员 Key。服务器读取和写入普通业务记录时转发当前用户的 Access Token，数据库应用该用户的权限。

本地开发：复制 `frontend/.env.example` 到 `frontend/.env.local`；把后端变量放入 `backend/.env`。若从仓库根目录启动后端，需要把变量注入启动进程，或在根目录建立受 Git 忽略的 `.env`。禁止提交真实密钥。

旧 Vite 配置曾把 CloudBase 变量从 `/workspace/.env.tcb` 固定注入并覆盖部署环境。本次已移除此逻辑，改为标准 Vite `VITE_*` 配置。

## 3. 核对认证与域名

- 身份认证 → 登录方式：开启邮箱验证码，配置内置邮件代发或自己的 SMTP。
- HTTP 网关 → 跨域设置：添加 `xiaozhi-law-agent.top`。
- 本地调试补充 `localhost:5173`；其他实际使用的域名、端口单独添加。
- 不需要为了接入前端再购买或开放数据库公网地址。

项目使用根锁文件中现有的 CloudBase JS SDK **3.11.0**，OTP 流程是 `signInWithOtp` 返回 `data.verifyOtp`，不要混用 v4 的调用写法。

## 4. 模型外发策略

初始状态：

- 每个账号的第三方模型处理开关默认关闭。
- 现有模型配置了对应平台 API Key 后即可选择，无需额外的模型 ID 白名单。
- 聊天、卷宗识别都在后端检查账号外发授权。
- 图片不支持时要求用户选择视觉模型，不自动切换。
- 模型错误不转发给其他模型或供应商。
- 不提供网页搜索。输入框中的法条、案例与合同入口，以及事务台中的知产新闻均受账号外发授权控制；检索使用提供的资料，新闻需粘贴正文，生成结果按账号保存到云端对话。
- 本地文件解析不调用模型；禁止外发时，文本卷宗仍可使用前端章节识别，图片不会进行云模型识别。

要使用模型，在 EdgeOne 后端环境配置相应平台的 API Key，并了解供应商的数据处理与留存要求。例如：

```dotenv
# 只配置实际使用的平台，不要在变量名中添加 VITE_。
ZHIPU_API_KEY=你的智谱Key
SILICONFLOW_API_KEY=你的硅基流动Key
OPENROUTER_API_KEY=你的OpenRouterKey
```

然后用户在「账号与隐私」中明确开启第三方处理，并在对话输入框底部的模型按钮中选择模型。菜单按平台分组，缺少对应平台 Key 的模型置灰；图片理解能力单独标注。开启表示本次工作空间内的对话、附件、启用的知识资料及卷宗可能发送给所选模型。此版本是**账号级外发开关**，还没有逐文档的密级策略、脱敏引擎或私有模型部署。严禁外发的资料保持关闭，不要将此开关当作端到端加密或绝对保密保证。

## 5. 首次使用与旧记录导入

1. 邮箱验证码登录。
2. 确认页面显示「私人云端空间」及同步状态。
3. 打开「账号与隐私」预览旧记录数量。
4. 先导出旧浏览器记录备份。
5. 确认这些记录属于当前账号，再点击导入。
6. 导入按 ID 跳过重复记录，成功后重新加载。失败时不会自动清除本地记录，已成功的部分可以幂等重试。
7. 核对云端内容后再次打开导入面板，重复导入会跳过已有 ID；清理按钮可用于删除本浏览器的旧记录。

导入旧记录时，图片 Base64 会迁入私有存储；文本附件只能迁移现有提取文本。原来未保存的 PDF/Word 原件和超过 40,000 字符的截断内容无法恢复，需要重新上传。

新业务资料不再写 localStorage。外观、模型选择等非敏感偏好仍可在本地保留；SDK 登录态采用 session 持久化。退出时卸载整个工作空间并清理内存缓存。该方式仍需防范同源脚本/XSS，不是端到端加密。

## 6. 保存、冲突与限制

- 对话请求前先保存用户消息和回答占位；后端在结束、超时或中断时保存已接收到的回答，再发送完成事件。
- 平台强杀进程或服务不可用时仍可能只留下生成中的占位；重新加载后核对，必要时重新生成。生成锁 150 秒后可恢复。
- 浏览器关闭不能保证云函数继续执行。正常取消和可捕获的错误会尽力保存部分回答。
- 各记录更新使用 revision，过期页面不能静默覆盖。冲突后停止自动写入，先导出未保存资料，再刷新核对。
- 初期聊天上下文最多 60 条，前端 JSON 请求最多 5 MiB，原始文件最多 4 MiB。
- 旧内置法条仍随前端发布；私有新增、修改和删除标记保存云端。当前知识库仍采用启用条目作为上下文，尚未实现 RAG。
- 页面刷新恢复上次打开的对话（含空对话）或项目页。对话标题、手动命名标记、`pinnedAt`、`projectId` 保存在各自 sessions 记录中；项目列表保存在 `settings/sidebar-projects` 的 `projects` 数组，仍使用现有账号 RLS 和版本校验，不需要新增 SQL。删除项目会把其中的对话移回普通列表；删除最后一条对话会创建新的空白对话，旧记录仍会从云端移除。
- 项目用于组织对话，不会自动合并不同对话的上下文、共享附件或改变知识库范围。跨设备同时编辑同一记录会提示冲突，不做自动合并。
- 附件原件可在消息中查看／下载，也可在账号面板浏览。删除对话不会自动删除原件，以免误删其他卷宗引用；当前尚未提供原件清理和自动保留期限，需要后续补充生命周期管理。

## 7. 发布前验证

本地检查：

```powershell
npm run build
npm run test:edgeone
npm run test:database
npm run test:cloudbase-key
npx tsc --noEmit --project backend/tsconfig.json --module esnext --moduleResolution bundler
```

`test:edgeone` 使用模拟的认证、数据库和模型。`test:database` 在内存中的 PostgreSQL/WASM 上真实执行迁移、RLS、版本和生成锁测试，平台的 auth/storage 基础结构使用测试替身；两者都不访问真实账号，不证明云端 RLS 已部署。浏览器模拟验收脚本是 `scripts/cloudbase-ui-qa.py`，需要 Python Playwright 和本机 Edge，测试时的 Vite 进程设置 `VITE_CLOUDBASE_PUBLISHABLE_KEY=synthetic-ui-test-key`；它拦截 SDK 与云网关，不使用真实资料。

后端历史 tsconfig 仍是 CommonJS，而入口使用 ESM；Pages 直接打包 TS，本次检查显式使用 ESM。独立后端的 `tsc → node dist/index.js` 不是本部署方式。

真实环境必须完成：

1. 两个独立浏览器配置分别登录 A、B。
2. A 新建对话、知识条目、卷宗和文件，刷新后仍存在。
3. B 看不到 A 的记录；即使知道 A 的记录 ID，也不能读取、修改、删除。
4. B 访问 A 的文件路径、签名生成接口和上传目录均被拒绝。
5. 未登录调用 `/api/agent/chat`、`/files`、`/extract-dossier` 被拒绝。
6. 未授权时任何模型请求都被阻止；允许后仅能使用白名单模型。
7. 模型失败后检查供应商侧调用日志，没有发生跨模型回退或外部搜索。
8. 两个页面同时改同一条记录，旧版本保存应提示冲突。
9. 测试旧数据重复导入、部分失败重试、文件下载和生成中取消。
10. 核对套餐、备份能力、恢复流程、使用量告警和到期行为，再放入真实敏感资料。

配置好变量、迁移通过后仍需提交代码并触发 EdgeOne 部署；本地修改不会自动更新线上站点。

## 官方接口依据

- [CloudBase PG 权限与身份](https://docs.cloudbase.net/authentication-v2/auth/auth-pg)
- [PostgREST RPC](https://docs.cloudbase.net/http-api/pgdb/rpc-call)
- [PG 私有存储](https://docs.cloudbase.net/storage/pg/introduce)
- [Bucket 管理](https://docs.cloudbase.net/storage/pg/bucket)
