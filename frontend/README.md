# 小知前端

从仓库根目录安装依赖并启动：

```sh
npm ci
npm run dev --workspace frontend
```

配置参考 [前端环境变量模板](.env.example)。Vite 在 `localhost:5173` 提供页面，并将 `/api` 转发至本地后端 3000 端口。页面入口在 `src/App.tsx`，工作空间在 `src/pages/Index.tsx`，界面模块在 `src/components/assistant/`。修改 CloudBase 前端变量后需要重启本地开发服务，或者重新构建生产页面。

普通附件的选择、拖放和粘贴交互在 `ChatInput.tsx`，三者共用当前对话的上传与附件预览流程。四个业务表单的文件导入由 `WorkflowUpload.tsx` 单独处理。注册表单位于 `RegisterDialog.tsx`，校验新邮箱后创建账号，再返回登录。登录和账号设置分别由 `CloudAccount.tsx` 与 `LoginSettings.tsx` 管理。账号菜单从登录账号的用户名读取显示名，未设置时显示邮箱。

完整的环境、项目结构与验证命令见 [开发与部署](../docs/dev.md)。
