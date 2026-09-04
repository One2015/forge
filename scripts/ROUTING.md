# Forge 本地应用路由

所有页面继续使用同一个服务与端口（当前为 `localhost:3007`），用路径区分页面，不需要为每个页面启动服务器。

## 路由表

| 页面 | 路径 |
| --- | --- |
| 概览 | `/overview` |
| 生产 · 运行记录 | `/production/runs` |
| 运行详情 | `/production/runs/:runId` |
| 本次运行回执 | `/production/submitted?run=:runId` |
| Pipeline 列表 / 展开详情 | `/production/pipelines` / `/production/pipelines/:name` |
| Pipeline 编辑 / 节点检查 | `/production/pipelines/:name/edit?node=:nodeName` |
| 数据集列表 / 数据集详情 | `/production/datasets` / `/production/datasets/:name` |
| 资源 | `/production/resources` |
| 审核队列 / 审核结果 | `/review/pending` / `/review/results` |
| 指定 Item 的审核工作台 | `/review/:runId/items/:itemId` |
| 交付列表 | `/delivery` |
| 创建数据单 / 恢复草稿 | `/delivery/new` / `/delivery/new?draft=:draftId` |
| 数据单详情 | `/delivery/:sheetKey` |
| 数据单中的 Item 详情 | `/delivery/:sheetKey/items/:itemId` |
| 编辑数据单 | `/delivery/:sheetKey/edit#basic` |
| Item 完整记录 | `/items/:itemId?run=:runId&sheet=:sheetKey` |
| 费用总览 / 供应商 / 模型 | `/billing/overview` / `/billing/suppliers` / `/billing/models` |
| 模型状态 | `/models` |

`/` 和 `/forge.html` 仍可打开；旧的 `?view=...` 书签会转换为对应路径，不重放审核或提交操作。

## 筛选和 section

- 页面适用的搜索、状态、我的/全部、排序、数据集版本等保存在查询参数中。
- Billing 的 `preset/start/end/grain/project/provider/model/sort` 可以分享；`grain` 支持 `hour/day/month/year`，仍按原页面的 UTC+8 口径校验日期。
- 审核工作台的文件视图使用 `?tab=files`；审核结果上下文使用 `?phase=results`。
- 下载、消息、个人资料面板分别使用 `?panel=downloads|notifications|profile`；个人资料的 Skills 使用 `&profile=skills`。
- 主要 section 使用锚点，并在标题旁提供 `#` 链接。例如 `/overview#delivery-progress`、`/delivery#drafts`、`/delivery/new#basic|members|list|tags|skills`、`/billing/models#cost-trend|token-trend|breakdown`、`/items/:itemId#history`。
- 已有命名 section 也可通过对应锚点定位；动态分组标题的锚点随标题变化。实体详情始终优先使用稳定 ID 的路径。
- 编辑数据单的 `#basic/#list/#skills` 会选中相应配置 tab，`#members/#tags` 会打开其所在 tab。创建页面的 section 切换不会重新初始化表单。

## 行为与边界

- 点击导航、打开/关闭 Item 详情、切换配置 tab 时同步地址栏；支持直接打开、刷新、浏览器前进/后退。
- 框架页面使用顶层窗口的历史记录；直接打开 `forge.html` 时使用当前窗口，避免出现 iframe 内导航而地址栏不变的问题。
- 搜索输入使用 `replaceState`，不会每输入一个字新增一个返回记录。表单输入、勾选、上传、审核确认不会写入 URL。
- 创建数据单的未保存内容继续沿用现有保存/离开确认。取消后退会恢复原地址和历史位置；确认后继续原来的后退动作。
- 无效路径、不存在的 ID、Item 与数据单/审核运行不匹配时显示明确的不可用页面，不回退到其他记录。
- 路由不是持久化或权限系统。演示中新建但未持久保存的运行、数据单和分支刷新后仍不可恢复；草稿 ID 仅在原浏览器和账号下有效。不会把草稿内容写进地址或跨账号恢复。
- 不为删除、通过审核、返工提交等执行动作建立可重放链接；临时确认弹窗和未保存表单不是可分享的实体页面。
- 当前错误提示是客户端页面；通用 catch-all 返回应用外壳，不代表后端已提供实体查询或 HTTP 404 API。

## 实现与验证

- `app/[...route]/page.tsx` 接收直接路径请求，复用原来的应用外壳。
- `scripts/templates/routing-core.js` 是纯路由编解码；`routing-methods.js` 连接导航状态、历史记录、草稿保护及 section 定位。
- `scripts/update-routing.mjs` 幂等同步到 `scripts/templates/forge-base.html`；`npm run dev` 和 `npm run build` 自动执行，也可单独运行 `npm run routes`。
- `node --test scripts/test-routing.mjs` 覆盖编解码、非法输入、实体匹配、框架历史、搜索、草稿离开保护、编辑 tab、草稿缺失和运行回执。
- 本轮浏览器验收：主导航地址同步；创建页面 section 直达；表单继续/离开；交付 Item 下一项/关闭/编辑；费用模型页的日期和维度；无效运行链接。
- 设计沿用 Forge 现有字号与色彩，新增轻量 section 链接和明确的无效地址反馈；没有改动业务审批逻辑或发布线上站点。
