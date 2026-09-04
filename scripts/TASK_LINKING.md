# Task linking

本说明只涵盖“关联任务”局部扩展。实现保留交付位置、来源任务和审核决策的不同身份；所有关联、新 Item、Toast 与草稿仅存在当前页面会话，刷新后丢失。无后端写入、持久化或新的授权机制。

## Sources and entry points

- `templates/task-link-dialog.html`：原生 dialog、搜索／选择／确认、新 Item 表单和 Toast。
- `templates/task-link.css`：局部视觉与响应式规则；共享 token 来自 `forge-refinement.css`。
- `templates/task-link-methods.js`：来源解析、关联版本、校验、搜索、历史与通知。
- `templates/delivery-methods.js`：交付清单／指标增量、稳定 List 身份与绑定 Skill 范围。
- `templates/feedback-methods.js`：关联候选反馈沿用来源 Item／Run 身份。
- `implement-task-linking.mjs`：向 `scripts/templates/forge-base.html` 注入代码、HTML、CSS、Phosphor Regular SVG，以及候选审核身份修正。

入口覆盖交付 Item 详情、生命周期／分支详情、单 Item Run、Run Item 及审核工作台。详情入口统一为 Item ID 旁的 Phosphor `pencil-simple` 图标；原生悬停提示和 accessible name 均为“更换关联任务”，modal 标题同名。不再在标题或行操作中显示大号关联按钮。已可交付的分支主操作仍可进入关联；多 Item Run 不把整次运行当作一个来源。入口会重新检查来源，未完成、失败、排队、已返工或不存在的来源以 warning 阻止打开。

`refine-detail-actions.mjs` 和 `templates/detail-{actions.css,footer.html,action-methods.js}` 提供这次局部修正：已通过且没有待审候选的详情显示“已通过审核”，底部为 secondary“追加返工”及下载图标；待审候选保留审核操作。追加沿用右侧内联图片／说明表单，重新检查 20 轮上限与重复提交，不更改原审核结论。追加及下载明确使用已通过版本的来源 Item／Run，而不是保留的已拒绝候选。详情与历史中不再展示导出批次字段。

下载图标只加入现有本地下载列表，记录交付 ID、来源任务、版本，阻止重复入队，并明确提示尚未接入真实下载服务；不生成伪造的产物文件。

### 追加返工与再次审核

`fix-appended-review.mjs` 在紧凑详情更新后接入 `appended-review-methods.js`，是这段流程当前的最终生成器。未创建下一版时不补造 Run 3 或任何缺失中间版本。追加后写入独立运行 ID、真实的下一版本号、来源快照、说明／图片及历史，进入 `submittedRuns` 和 `repairRuns`，而不只添加文字记录。

- 排队／运行中：版本关系显示 Run 2 当前可交付、Run 3 排队／运行中；底部已改为“通过审核 / 要求返工”，暂时 disabled 并解释原因，可查看运行。不显示“查看完整记录”。
- 技术状态 `success`：新候选进入待审核队列，开放审核按钮；运行完成不会自动通过。
- 通过：仅针对新 `runId:itemId` 写入审核结论，晋升当前版本，旧版本记录保留；可以再次追加下一版。
- 要求返工：保留已通过基线，以本轮候选为来源创建下一版；被拒绝候选不覆盖当前交付版本。
- 失败／取消／停止：不允许通过或把不存在的产物提交为候选。

`appendedRework[itemId]` 保存当前追加任务与历史。运行状态由 `runItemTech[runId + ':0']`、提交运行状态或 `repairRuns[repairKey].status` 派生；没有计时器伪造完成。项目仍未接执行引擎，当前手动提交会停留在队列，直到真实状态源或隔离测试数据明确更新。兼容旧 `{note, round}` 会话记录，但不伪造成功。

追加关联记录从稳定交付 ID、来源任务与版本独立派生。若用户重新关联其他任务，绑定 revision 变化使旧追加任务不再覆盖新关联；旧运行不删除。旧通过记录和过期确认不能批准新版本。

## Identity and state

`deliveryEntryId(entry)` 依次取 `deliveryItemId || itemId || key` 并转为字符串。目标 Item 的名称和交付 ID 不随版本替换而改变。导入 List 的稳定交付 ID 与后续关联来源不同；编辑既有 List 时保留已分配 ID。

| State | Meaning |
| --- | --- |
| `deliveryLinks[sheetKey][deliveryItemId].current` | 当前可交付版本，或 null。 |
| `candidate` | 已运行但待审的候选，可带 `rejected` 标记；不冒充当前最终版。 |
| `history` | 被保留的先前 current／candidate，按 `source.key` 去重。 |
| `revision` | 每次关联提交递增；与 current／candidate 来源 key 一起构成过时提交校验。 |
| `deliveryNewItems[sheetKey]` | 本地明确创建的新交付 Item，合并进清单后按稳定 ID 去重。 |
| `taskLink` | 当前草稿：来源 ref／key、数据单、查询、选择、目标 revision、模式、名称与确认。 |

版本记录包含 `number`、`label`、`source`、`ref` 和 `at`。来源保存自己的 `itemId`、`runId`、名称、源版本、路径、预览和 branch 状态。普通来源身份为 `run:<runId>:<itemId>`；分支身份为 `fork:<forkKey>:<forkName>`；`source.key` 再附加源版本。交付版本号独立递增为 `vN`，取 current、candidate、history 中最大 number 加一。

## Version lifecycle

1. 已通过来源关联到现有位置：成为 current，candidate 清空；原 current／candidate 保留到 history。目标 ID、目标名称和来源审核决策不变。
2. 已产出且尚待审核的可关联来源：成为 candidate，保留 current。已有最终版仍可交付，已完成数量不因候选而增加。
3. `deliveryLinkState` 在读取时按精确 `source.runId + ':' + source.itemId` 解析审核决策；pass 派生晋升候选。无显式决策时，匹配分支转为 deliverable 也可晋升。这个解析不自动改写来源审核决策。
4. rework 将候选标为 rejected，不晋升；已有 current 保留。没有 current 的返工候选不能从交付详情再次作为 ready 来源；选择器和清单明确标注“要求返工”。有 current 时详情仍可引用已通过的 current。
5. 新 Item 仅向 branch 来源开放，必须显式选择“创建新 Item”。名称非空且在当前数据单不重名（忽略大小写）；输入控件有 `maxlength=100`。生成 `ITEM_<时间戳36进制>_<本地序号>` 作为新交付 ID，从 v1 开始，不改原 Item／主线。待审来源创建的是候选 v1。

自建数据单指标从关联后的行计算。种子数据单的汇总覆盖范围大于本地样本，只应用受影响行的前后增量，不能用本地几条样本替换整张数据单总数。历史展示先 current／candidate，再反向 history，并按来源 key 去重。

## Guards and interaction

- 搜索仅在选定数据单的合并清单内，对 Item 名称和稳定 ID 做不区分大小写的包含匹配，包含未开始的条目。
- 替换已有 current 的已通过来源，或替换现有 candidate，必须勾选确认。首次候选挂到已有 current 且无 candidate 时不要求替换确认，因为 current 不变。
- 仅当同一 source.key 已在目标 current 或 candidate 中时，判为重复；不增加版本、revision 或指标。历史记录不被当作全局重复集合。
- 提交时重算来源 ready、source.key、数据单、目标、新名称和确认条件；来源版本变动要求重新打开。
- 选择时捕获 `JSON.stringify([revision, current?.source.key, candidate?.source.key])`。目标变化则清空选择／确认，warning 要求重新选择；不会覆盖新状态。`_taskLinkSubmitting` 防止重入。
- 切换数据单、修改搜索或重选 Item 清除相应选择／确认。取消、Escape、关闭按钮或 backdrop 丢弃草稿。
- 原生 dialog 通过 `showModal()` 打开；数据单 select autofocus，动态 option 有显式 accessible name。Ctrl／Cmd+Enter 复用 submit，IME composition 时跳过；主操作旁持续显示 disabled 原因。

实际布局是正文滚动加独立限高结果区，头尾保持可见。短手机屏可能要滚动正文才能见到确认项；不能把方向稿中的单滚动区意图当成实现事实。

## Toast and previews

- `success`：已通过来源的最终关联／替换／新 Item；显示目标名称、ID、版本及旧版本保留信息。
- `info`：待审候选／候选新 Item；明确仍需审核，不宣称可交付。
- `warning`：未就绪／返工／失效来源、验证失败、重复或过时目标；不写关联状态。

Toast 使用 manual popover 和 `role=status`／`aria-live=polite`／`aria-atomic=true`，支持关闭；悬停和焦点暂停，恢复后重新计时 7000ms。这里只计时，不引入动画。

仅接受 http(s)、站点绝对路径（拒绝 //）或 png/jpeg/webp/gif 的 base64 image URL。加载失败的 URL 在本地记为坏图。无有效预览时显示 Phosphor image 图标及“暂无预览”；不创建示意图来冒充产物。

## Bound Skills

`boundReviewSkills(context)` 先按可选 sheetKey 约束数据单，然后接受两种已实现关系：当前交付行的目标 ID 匹配 context.itemId；或 current／candidate 的来源同时匹配 context.itemId 与 context.runId。历史版本不扩展来源匹配。绑定 ID 为 `sheet.key + ':' + skill.id`。

交付候选审核与返工使用来源 Task Item／Run，不把稳定交付 ID 当成任务 ID。关联不调用 Skill；既有审核 Skill 界面只加载关联数据单的指令并记录本地演示上下文，不执行上传脚本、不产生真实评分或自动审核结论。

## Integration and verification

先完成会重写 bundled template 的基础、导航、个人区、交付与样式集成。当前页面已经包含后续历史与状态修正，不要为此次 UI 修改重放旧的全量迁移；用局部生成器更新详情操作，再测试和构建：

```sh
node scripts/fix-appended-review.mjs
node --test scripts/test-*.mjs
npm run build
```

它校验唯一插入锚点，首次安装包装 sheetRows、接入入口／键盘／生命周期；后续按标记刷新关联区块。每次还刷新 delivery／feedback methods 与候选 source 身份修正。Phosphor SVG 从 `assets/phosphor/regular` 读取，无额外依赖。重复运行 hash 一致已由主任务确认。

专项可用 `node --test scripts/test-task-linking.mjs scripts/test-detail-actions.mjs scripts/test-appended-review.mjs`。2026-09-02 追加返工更新后完整测试为 147 项通过，build 成功。本轮尚未获得独立浏览器校验回复，以下历史截图不是此次修改的视觉验证。

需要独立分支 QA 数据时运行 `node scripts/create-task-link-qa-fixture.mjs`，它只生成 `public/task-link-qa-fixture.html`。不得从产品链接该页面；测试用完必须删除生成页面，以及构建已复制的 `dist/client/task-link-qa-fixture.html`。生成脚本可以保留供重建。本次两个生成文件已清理。

## Evidence and limits

独立测试页已检验 1440×1000、390×844 和 816×800，并覆盖替换、重复阻止、空搜索、分支新 Item 与指标增量。截图：

- `../.impeccable/review/task-link-desktop.png`
- `../.impeccable/review/task-link-mobile.png`
- `../.impeccable/review/task-link-user-816.png`
- `../.impeccable/review/task-link-new-mobile.png`
- `../.impeccable/review/task-link-toast-mobile.png`

`../.impeccable/review/task-link-finish-review.md` 给出 ship，但 fresh finish reviewer 因会话 agent thread limit 未能启动；这是本地替代收尾检查，不是 fresh 独立评审。替代检查修正了“无最终版的返工候选再次关联”和“动态 option accessible name”，并由测试／最终浏览器结果验证。Detector 只在 degraded regex 模式返回无发现，不代表完整 computed-style／无障碍审计。

真实预览依赖实际数据；当前种子条目没有预览 URL。汇总不是完整后端列表，历史 Run 摘要的通用“待审核”文案不作为来源审核状态证据。未新增 shipping raster、产品全局 DESIGN.md／PRODUCT.md、持久化或服务端审核。独立 QA tab 已关闭，viewport 已恢复。
