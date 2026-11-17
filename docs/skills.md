# 小知 Skills

参考 [Codex 官方 Skill 文档](https://learn.chatgpt.com/docs/build-skills)，使用独立目录、`SKILL.md` 与按需加载。这里实现的是小知后端的技能运行机制，不需要使用 OpenAI 专属模型，也没有嵌入 Codex CLI。

## 使用

在输入框点击 **Skills** 或发送 `/skills` 打开技能面板。选择后补充输入框中的任务条件、附上材料，再发送；选择本身不会调用模型。技能仅作用于本次请求，后续任务可重新选择，模型也可以依据描述主动加载需要的技能。可在消息开头直接输入：

| 命令 | 能力与数据来源 |
| --- | --- |
| `$statute-research` | 检索法条，核对已提供资料的版本和适用条件 |
| `$case-research` | 检索材料中的类似案例，比较事实和裁判理由 |
| `$ip-news` | 整理新闻、公告正文及其业务影响 |
| `$contract-drafting` | 起草或审核技术开发、许可、转让、保密、竞业限制合同 |

如 `$contract-drafting 请起草一份保密协议，我方为披露方……`。知产新闻不抓取网页，只有网址时需要补充正文。模型匹配与规范遵循取决于所选模型，显式选择更可控；没有启用工具调用能力的模型仍可使用显式选择注入的规范。

## 结构与运行

```text
agent-skills/<skill-id>/
  SKILL.md                  # YAML name/description + Markdown 工作规范
  agents/openai.yaml         # display_name / short_description / default_prompt
scripts/build-skills.mjs     # 校验并生成前后端注册表
shared/skill-catalog.generated.ts                 # 前端元数据
backend/src/modules/agent/skill-instructions.generated.ts # 服务端元数据和完整规范
```

前端只发送技能 ID 和任务数据。服务端验证 ID，仅从构建时注册的规范中取内容；不接受客户端提供的系统指令、文件路径或脚本。

每轮先把技能名称与描述加入模型上下文。显式选择或开头的 `$技能名` 会在首个模型请求前加载该规范；未选择时模型可调用 `load_skill` 获取完整规范。SSE `skill` 事件用于显示技能标签，后端将实际激活的 `skillIds` 与回答一起保存到原有账号隔离的 PG 会话记录。重新生成保留原提问的显式选择，无需新增数据库迁移。

这是第一版内置技能：支持指令型 `SKILL.md` 和界面元数据，不执行脚本，不自动加载 `references/` 或 `assets/`，不支持用户在线安装、上传技能或技能市场。不要直接把客户卷宗、专利技术写入公共 Skill 文件。技能规则不是权限控制，实际权限由认证、RLS、工具白名单和模型授权检查执行。

## 新增或修改

1. 在 `agent-skills/` 新建与 `name` 一致的目录，使用小写英文、数字、连字符，最长 64 字符。
2. 编写 `SKILL.md`：frontmatter 只包含单行 `name`、`description`，正文描述所需输入、工作方法、输出和实际能力边界。
3. 编写 `agents/openai.yaml`，参照现有文件。此版本只解析 `interface` 下三项双引号字符串，换行使用 `\n`；默认提示词开头带 `$技能名`。
4. 执行 `npm run skills:build`、`npm run skills:check`、`npm run test:edgeone` 和 `npm run build`，检查界面并部署。前后端注册表自动生成，不要手改生成文件。开发和构建也会重新生成。

EdgeOne 的云函数从 TypeScript 注册表打包，运行时无需读取本地 Markdown 或额外文件系统。当前按字母顺序显示技能；新增技能会自动出现在面板中。专用图标可在 `SkillIcon` 中补充。

## 搜索与隐私

网页搜索工具、适配器、配置读取与示例变量已删除，本地旧搜索变量也已移除。如果 EdgeOne 控制台仍配置了 `WEB_SEARCH_*` 或历史 Tavily Key，可删除这些失效变量；新版代码不会读取它们。需要重新部署后线上才会更新。

Skill 不是数据库、RAG 或新的信息来源。它组织模型处理现有资料的方法；未接入检索工具就不能核实实时新闻、现行法规或新案例。模型本身的联网产品能力也不等于当前 API 已获得该能力。

Skills 不扩大用户的数据访问范围。使用时仍受现有账号外发开关限制；配置了平台 Key 的现有模型可通过输入框底部的模型按钮选择。开启外发后输入、附件、启用的知识库及卷宗可能交给所选供应商，不能仅因使用 Skill 就认为材料不会外发。
