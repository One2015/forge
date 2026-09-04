# Forge redesign v1

Forge 重设计第一版。版本标签：`forge-redesign-v1`。包含生产、审核、交付、Item 详情和 Pipeline 查看／编辑界面。

## 启动

要求 Node.js ≥ 22.13.0。

```sh
npm ci
npm run dev:postman
```

打开 http://127.0.0.1:3011 。`app/page.tsx` 是外层页面，当前界面来自 `public/forge-postman.html`，由 `scripts/postman-ui/build.mjs` 生成。

```sh
node --test scripts/test-postman-ui.mjs scripts/test-artifact-preview.mjs
npm run build:postman
```

数据和大部分操作为内存演示，刷新会清空。Skill 不运行评估引擎。长城示例条目包含本地燃气轮机 Mock 和文件目录；实际 Item + Run 文件清单优先，其他条目不共用该 Mock。

概览「昨日成本」进入用量与费用分析，支持项目／供应商／模型以及小时／日／月／年。当前账单是明确标注的合成示例，尚未连接真实消费数据。口径与接入说明见 [BILLING_ANALYTICS.md](scripts/BILLING_ANALYTICS.md)。

## 修改入口

- `scripts/postman-ui/`、`public/postman-ui/`：当前重设计的生成器、样式和 Mock 资源。
- `public/forge-postman.html`：生成后的当前界面。
- `public/forge.html`：保留的基础原型，内含 JSON 编码的 DCLogic 模板和数据。
- `scripts/templates/`：对应功能的 HTML / CSS / 状态逻辑片段。
- `scripts/ui/`：React 产物查看器和概览 Tooltip。
- `scripts/test-*.mjs`：业务状态、模板、迁移、文件验证测试。
- `assets/phosphor/regular/`：官方图标。
- `public/models/`、`public/model-decoders/`：演示模型、解码器和许可证。

`npm run dev` / `build` 会构建 React 查看器和 Tooltip，**不会批量重放历史迁移脚本**。不要按文件名或时间顺序运行全部 `scripts/*.mjs`；部分旧迁移只适用于当时版本。

公开地址可能落后于本地源码包。部署必须经项目所有者批准，不要覆盖原站点配置或自行发布。

## Geist 设计系统 · 第一阶段

在当前开发端口打开 `/forge.html?view=runs` 使用运行记录迁移样板；`/design-system.html` 展示共享组件与可切换状态；`/design-system-responsive.html` 检查真实原型的 390px 布局。规范、来源、迁移顺序和验证见 [设计系统文档](docs/design-system/README.md)。

`npm run design-system` 定向同步共享基础、样板页与展示入口（已接入 dev/build）；不要批量执行历史迁移。既有服务运行时，可使用 vinext 支持的 `VINEXT_NO_DEV_LOCK=1 npm run dev -- --port 3011` 在另一端口启动当前工作副本，保留原有服务。
