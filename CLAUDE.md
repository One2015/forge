# Claude Code 工作入口

先读 `CLAUDE_CODE_HANDOFF.md`、`VALIDATION.md`。这是 Forge 当前本地源码快照，线上可能较旧。

- 当前运行入口是 **public/forge-postman.html**，由 `scripts/postman-ui/build.mjs` 从内部模板 `scripts/templates/forge-base.html` 生成。`app/page.tsx` 是 iframe 页面壳。
- 保留当前未提交修改；不要 reset、批量格式化大文件或运行全部历史迁移。
- HTML/CSS/方法片段位于 `scripts/templates`；React 增强组件位于 `scripts/ui`。修改片段时同步真源，用有断言和幂等测试的定向迁移。
- 启动：`npm ci` → `npm run dev -- --port 3001`。检查：`npm test`、`npm run build`。
- 不把示例模型、Skill 加载演示、内存任务状态或前端权限检查当成真实后端能力。
- 复用 Phosphor Regular 图标、暖橙强调、紧凑字体和既有状态逻辑。无请求不换图标体系或视觉风格。
- 不修改托管项目身份、不获取源凭证、不公开部署，除非用户授权。
- `.impeccable/*-design.md` 是局部设计记录；最新交互规范见 `.impeccable/interaction-states-design.md`。
