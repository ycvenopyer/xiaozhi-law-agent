# 小知 · 知识产权办案助理

[English](README.md) · [在线工作空间](https://xiaozhi-law-agent.top)

小知帮助知识产权从业者整理证据、起草文书，以及在自建知识库与已提供材料中查找相关法条和案例。支持邮箱验证码登录，也可使用邮箱或用户名加密码登录。首次邮箱验证后可在「设置 → 登录账号」设置密码和用户名。对话和文件按账号保存。

## 功能入口

| 位置 | 功能 |
| --- | --- |
| 侧边栏 | 按标题或消息正文搜索对话，新建、重命名、置顶、删除对话和按项目整理 |
| 左下角账号菜单 | 设置、帮助和退出登录。设置包含第三方模型授权、旧浏览器资料导入、文件原件下载和界面外观 |
| 右上角 | 知识库和事务台。事务台提供检索比对、侵权识别、合规提示、知产文书、今日知产新闻和文件起草 |
| 对话输入框 | 上传普通附件、检索法条、检索案例、合同起草与审核，以及选择内置或自定义模型 |

法条与案例检索以启用的知识库和提交的材料为依据。今日知产新闻使用你在「设置 → 联网搜索」填写的 Tavily API Key，按北京时间筛选当天的新闻并展示原文链接。搜索消耗你的 Tavily 额度。法律引用和文书草稿需人工核对。卷宗界面已下线，旧卷宗记录仍可随旧资料导入，当前界面不会将其注入对话。

## 本地开发

需要 Node.js 22.x（建议使用 EdgeOne 配置的 22.17.1 或更新的 22.x）和 npm。在仓库根目录执行 `npm ci`。从 `frontend/.env.example` 和 `backend/.env.example` 分别创建 `frontend/.env.local` 和 `backend/.env`。前后端配置同一 CloudBase 环境及 Publishable Key，并在 CloudBase 添加本地页面来源。首次配置、旧环境检查和长 Key 分段见 [CloudBase 配置](docs/cloudbase.md)。

从仓库根目录开启两个终端：

```sh
# 终端 A
npm run dev --workspace backend

# 终端 B
npm run dev --workspace frontend
```

访问 `http://localhost:5173`。Vite 将 `/api` 转发到本机 Express 的 3000 端口。真实登录和云端保存依赖 CloudBase，推理由所选模型服务提供。单端口预览与 EdgeOne 部署见 [开发与部署](docs/dev.md)。

## 模型与数据

- **内置模型**为智谱 GLM-4.7、GLM-4.7-Flash、GLM-4.6V-Flash 和 GLM-4.5-Air，通过后端的 `ZHIPU_API_KEY` 启用。菜单中的「已配置」表示 Key 已被读取，模型实际可用性以调用结果为准。
- **自定义模型**从输入框的模型菜单添加。填写厂商、Base URL、API Key 和模型 ID，可先做连通测试。接口须支持公网 HTTPS 和 OpenAI 兼容流式响应。配置按账号保存在当前浏览器，Key 保存在当前标签页会话，退出登录时清除。
- **CloudBase** 管理认证与 PostgreSQL 业务记录，文件原件存放在私有桶。外观、模型等偏好保留在浏览器。第三方模型处理默认关闭，开启后对话、附件和启用的知识库可能发送给所选模型服务。

## 项目结构

```text
frontend/        React 工作空间、CloudBase 客户端与静态资源
backend/         Express API、认证校验、模型执行和文件解析
cloud-functions/ EdgeOne Node.js 云函数入口，复用 Express API
database/        CloudBase 首次迁移与只读配置检查
shared/          前后端共用的 Publishable Key 拼接逻辑
scripts/         接口、数据库、浏览器验收与 Key 分段脚本
docs/            开发部署、CloudBase、域名和功能说明
edgeone.json     根目录安装、构建和云函数配置
package-lock.json  npm 工作区共用锁文件
```

完整目录、功能对应的源码和 API 见 [开发与部署](docs/dev.md)。其他说明包括 [当前功能](docs/product-features.md)、[域名配置](docs/domain.md)和[后续研发合规方案](docs/项目升级文档/小知合规方向-项目说明.md)。

## 验证

```sh
npm run build
npm run test:edgeone
npm run test:database
npm run test:cloudbase-key
```

测试使用模拟服务或本地内存数据库。发布后，应在目标环境用测试账号验收登录、数据隔离、文件下载和模型调用。

许可证为 [Apache License 2.0](LICENSE)。
