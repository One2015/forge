# Postman UI 优化版 · 实现说明

该变体是独立的本地可操作评审入口。持久视觉规则见 [DESIGN.md](./DESIGN.md)，评审边界见 [REVIEW-CONTRACT.md](./REVIEW-CONTRACT.md)。本文记录实际构建，不代表新增功能承诺。

## 源码与复用边界

实际项目位于 `forge 2/forge-ia-refresh`，本轮分支为 `codex/forge-postman-ui`；外层 `forge 2` 另有仓库，执行构建前应确认目录。

| 入口 | 职责 |
| --- | --- |
| `scripts/templates/forge-base.html` | 内部业务模板与模拟数据，生成器只读；不作为独立页面发布。 |
| `scripts/postman-ui/build.mjs` | 解析原型内嵌 JSON 模板，通过明确锚点生成变体，追加样式与行为入口，并检查业务脚本语法。 |
| `scripts/postman-ui/delivery-rows.html` | 交付连续行的替换模板，沿用业务数据与回调。 |
| `scripts/postman-ui/routes.js` | 包装现有路由读写，将变体地址保留在 `/forge-postman.html?route=…`，保留 hash、原路由 codec、历史行为和归属校验，并适配交付筛选枚举。 |
| `public/postman-ui/tokens.css` | `--pm-*` 色彩、字体、尺寸与间距源；通过 `--forge-*`、`--fg-*` 别名接入既有组件。 |
| `public/postman-ui/workspace.css` | 全局工作区、旧原型兼容规则、数据单与产物详情。 |
| `public/postman-ui/pages.css` | 概览、交付行、运行、审核、分析、创建/编辑、数据集与画布等页面模式。 |
| `public/postman-ui/behavior.mjs` | 修正同源路由链接；为适合增强的旧点击容器补 `role`、Tab、Enter/Space，复用原点击回调，不复制业务逻辑。 |
| `public/forge-postman.html` | 生成产物，不直接手工维护。 |
| `public/postman-ui/guide.html`、`review/index.html` | 可浏览规范与修改前后截图索引。 |

CSS 按 primitives → tokens → workspace → pages 的顺序追加到内部业务模板的基础样式之后。`primitives.css` 仅保留当前运行页实际使用的原生控件与布局，使用当前 UI tokens。默认 dev/build 与 Postman 兼容命令统一生成当前入口。保留既有表单、预览器、绘图能力和 Phosphor 图标。

兼容层含 `!important`、旧类名和少量行内样式匹配。新的结构优先添加 `pm-*` 或明确的 `data-pm-*` 钩子；不要继续扩大脆弱的行内字符串匹配。原模板锚点变化可能使生成器明确报错，需核对上游结构后修正，而非直接编辑产物。`behavior.mjs` 会跳过已有内部控件、SVG、覆盖层及停止传播的点击区域，其增强范围并非整站语义重构。

## 已采用的参考

| 参考 | 实际采用与边界 |
| --- | --- |
| [Mobbin：Postman 请求编辑器](https://mobbin.com/screens/0702e74a-f408-436e-b75a-bbdb6b34c776) | 已实际查看的主参考：浅色连续工作面、紧凑控件、灰色选中态和细边框。 |
| [Mobbin：Postman Collection 详情](https://mobbin.com/screens/7ebea719-ca93-4f41-bf09-727b4a49ad9c) | 已实际查看的主参考：对象标题 → 局部标签/工具栏 → 正文及活动记录。 |
| [Postman 新版产品介绍](https://blog.postman.com/new-postman-is-here/) | 采用工作区分区与侧面板关系；结构继续参考产品分区；色彩采用最新 Genova 截图的角色分工。 |
| [官方设计资源](https://design.learning.postman.com/) / [Aether Icons](https://design.learning.postman.com/icons) | 已核实公共 SVG 图标目录及资源入口。未取得完整组件源码或全量官方 tokens；继续复用已有图标。 |

用户明确锁定 Postman 产品工作台，优先于概念抽签或新营销身份。`PRODUCT.md` 的成本业务约束仍适用，视觉以用户确认的当前工作台规则为准。

## 页面模式与维护检查

| 模式 | 维护时保留 |
| --- | --- |
| 交付列表 / 数据单详情 | 客户分组与连续行；标题、履约指标带、筛选和 Item 列表；目标、已关联、已跑完、待审核、可交付原义。 |
| 生产运行 / Pipeline / 数据集 | 既有运行行和业务关系；节点/边/缩放/检查器；数据集默认 660px 详情、键盘/拖动分隔器与 ≤1100px 上下布局。 |
| 审核 / 产物 | 主预览与约 392px 依据区、底部判断操作、真实空状态。 |
| 创建 / 编辑 | 完整创建页与三标签编辑弹窗；成员、List、Tag、Skill、草稿与原保存方法。 |
| 概览 / 费用 / 模型 | 指标带、浅网格和读数区；图表键盘选择与筛选；示例账单与未接入监控的明确说明。 |
| 全局导航 | 40px 顶栏、176/56px 侧栏、生产标签；折叠后真实点击范围和展开按钮；即时选中反馈。数据集选中“生产”，创建数据单选中“交付”。 |

生成器为主要旧页面添加 `pm-page-overview`、`pm-page-pipelines`、`pm-page-pipeedit`、`pm-page-datasets`、`pm-page-resources`、`pm-page-itemlife`、`pm-page-review`、`pm-page-submitted`、`pm-page-run`、`pm-page-error` 等稳定入口。Pipeline 节点另使用 `pm-pipeline-node` 与 `data-node-kind`，模型状态标签使用统一 `data-tone` 协议；后续样式应从这些钩子扩展。

最终视觉复审对上述导航归属修正给出局部 `ship` 结论。此结论仅针对该限定修正，不能扩展为完整可访问性认证。

## 本地运行与验证记录

在 `forge-ia-refresh` 目录执行：

```sh
npm run dev:postman
```

独立端口为 3011；既有 3000/3007 开发服务保留。入口为 [可操作预览](http://127.0.0.1:3011/forge-postman.html)、[视觉规范](http://127.0.0.1:3011/postman-ui/guide.html)、[对比截图](http://127.0.0.1:3011/postman-ui/review/index.html)。`npm run postman-ui` 重新生成变体；`npm run build:postman` 生成并执行生产构建。评审阶段不部署、不合并。

本轮全页统一后的关键回归共 83 项通过：Postman 生成器 14 项、路由 12 项、模型状态 31 项、费用 26 项，0 失败；`git diff --check` 通过。静态 detector 因缺少解析依赖降级为 regex，结果 `[]` 只表示其扫描未报告问题。浏览器另逐页复查 17 个代表路由与状态，覆盖 Pipeline 编辑器、模型图表、审核队列/结果、资源空状态、Run 详情、Item 生命周期、创建与错误页；这不是完整自动或人工可访问性审计。

## 已知限制

- 原型尚未接入统一批量导出、完整资源 schema、真实模型监控及部分产物文件；统一导出按钮已禁用并说明原因，空产物显示真实提示。
- 账单为明确标记的示例。原有累计成本缺少逐次 Token 计费明细及发生时间，不能当作真实账单；不接入付款、充值、发票或外部账单服务。
- 部分历史审核 Item 与 Run 的 `itemIds` 不一致。从审核队列点击可进入，但直接链接或刷新可能被原路由拒绝并提示“Item 不属于该运行”。这是既有数据/路由限制，未通过放宽归属校验掩盖。
- 390px 窄窗保留宽表局部滚动；粗指针 44px 规则不构成对所有旧控件的覆盖保证。新增页面需检查具体控件和溢出，不能仅凭媒体查询存在就判定通过。


最新配色：用户提供的 Genova Lab 截图 14、16、11 分别约束导航/黑色 CTA、Billing 和 Latency 的色相关系。后续实现以 DESIGN.md 为准。
