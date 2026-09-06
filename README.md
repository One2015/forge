# Forge

Forge 生产、审核与交付工作台，包含 Item 详情、Pipeline 查看／编辑和个人 Skill 管理。`main` 包含最新代码；`forge-redesign-v1` 标签保留重设计第一版快照。

## 启动

要求 Node.js ≥ 22.13.0。

```sh
npm ci
npm run dev:postman
```

打开 http://127.0.0.1:3011 。`app/page.tsx` 是外层页面，当前界面来自 `public/forge-postman.html`，由 `scripts/postman-ui/build.mjs` 生成。

### Role-based Access Prototype

独立权限原型不会替换默认 Forge。运行：

```sh
npm run dev:rbac
```

打开 http://127.0.0.1:3008 。页面右下角 Prototype 控件把平台角色（Admin / Internal Member）与项目角色（Project Owner / Member / External Experts）分开切换，并会同步改变 Forge 导航与访问状态。Admin 可在 Profile → Permission 新增自定义项目角色、复制并调整默认权限；创建后会立即进入成员分配和 Prototype 角色切换。Profile 中的 Member、Permission、邮箱邀请及飞书模拟同步只在该入口启用；飞书尚未连接真实 API。

```sh
node --test scripts/test-rbac-prototype.mjs
npm run build:rbac
```

```sh
node --test scripts/test-postman-ui.mjs scripts/test-artifact-preview.mjs
npm run build:postman
```

数据和大部分操作为内存演示，刷新会清空。Skill 不运行评估引擎。长城示例条目包含本地燃气轮机 Mock 和文件目录；实际 Item + Run 文件清单优先，其他条目不共用该 Mock。

概览「昨日成本」进入用量与费用分析，支持项目／供应商／模型以及小时／日／月／年。当前账单是明确标注的合成示例，尚未连接真实消费数据。口径与接入说明见 [BILLING_ANALYTICS.md](scripts/BILLING_ANALYTICS.md)。

## 修改入口

- `scripts/postman-ui/`、`public/postman-ui/`：当前重设计的生成器、样式和 Mock 资源。
- `public/forge-postman.html`：生成后的当前界面。
- `scripts/templates/forge-base.html`：内部业务模板与模拟数据，内含 JSON 编码的 DCLogic 模板，不作为独立页面发布。
- `public/postman-ui/primitives.css`：当前运行页使用的原生控件基础样式，复用当前 UI tokens。
- `scripts/templates/`：对应功能的 HTML / CSS / 状态逻辑片段。
- `scripts/ui/`：React 产物查看器和概览 Tooltip。
- `scripts/test-*.mjs`：业务状态、模板、迁移、文件验证测试。
- `assets/phosphor/regular/`：官方图标。
- `public/models/`、`public/model-decoders/`：演示模型、解码器和许可证。

`npm run dev` / `build` 统一同步路由、构建 React 查看器、Tooltip 和当前界面；`dev:postman` / `build:postman` 是同一构建链的兼容命令。**不要批量重放历史迁移脚本**。不要按文件名或时间顺序运行全部 `scripts/*.mjs`；部分旧迁移只适用于当时版本。

公开地址可能落后于本地源码包。部署必须经项目所有者批准，不要覆盖原站点配置或自行发布。

当前界面规范见 [设计说明](docs/postman-ui/DESIGN.md)，实现入口见 [实现说明](docs/postman-ui/IMPLEMENTATION.md)。

## 历史版本

根目录的 `index.html`、`HumanReview.dc.html` 和 `support.js` 保留自原仓库的 2026-08-21 人工审核原型。当前工作台使用上面的 npm 启动方式与 `public/forge-postman.html` 入口。
