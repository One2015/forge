# Forge 最新源码交接 · Claude Code

交接日期：2026-09-02。**这是当前工作区快照，含尚未发布的本地修改，不是旧 v8 文档或线上版本的拷贝。**

## 1. 先做什么

1. 阅读本文件和 `CLAUDE.md`。
2. Node.js ≥ 22.13.0，执行 `npm ci`、`npm run dev -- --port 3001`。
3. 打开终端显示的地址；运行 `npm test` 和 `npm run build`。
4. 保留当前视觉密度与业务状态语义。先定位本次要改的模板/方法，再做小范围补丁。

公开参考：https://forge-production-review-focus.yvonne112.chatgpt.site/ 。**此次没有重新发布，该地址不能作为本源码快照的版本验证。**

## 2. 当前架构与真源

`app/page.tsx` 是 iframe 页面壳；当前 Forge 位于 `public/forge-postman.html`。`scripts/postman-ui/build.mjs` 将内部模板 `scripts/templates/forge-base.html` 与当前页面模块、样式组装为运行入口。内部模板不作为独立页面发布：`<script type="__bundler/template">` 内是一段 JSON 字符串，解码后才是 DCLogic 模板、CSS 与 `Component` 类。

读取方式（不要直接打印完整单行到终端）：

```js
const source = fs.readFileSync('scripts/templates/forge-base.html', 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const logic = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
```

写回必须保持外壳、JSON 编码与 `</script>` 转义。参考 `scripts/update-interaction-states.mjs` 的有边界、幂等实现。

| 范围 | 主要入口 |
| --- | --- |
| 页面壳与元信息 | `app/page.tsx`, `app/layout.tsx`, `app/globals.css` |
| 内部业务模板与模拟数据 | `scripts/templates/forge-base.html` |
| 当前页面生成器与运行入口 | `scripts/postman-ui/build.mjs` → `public/forge-postman.html` |
| 侧栏、hover/选中、临时展开 | `scripts/templates/forge-sidebar*`, `sidebar-interaction-methods.js`, `interaction-states.css` |
| 数据单、成员、List/Tag、Skill | `scripts/templates/delivery-*`, `scripts/DELIVERY_WORKFLOWS.md` |
| 个人面板 | `scripts/templates/forge-profile*`, `profile-methods.js` |
| 审核、返工、分支树 | `scripts/templates/review-*`, `feedback-*`, `history-branch*`, `scripts/HISTORY_BRANCHES.md` |
| 更换关联任务 | `scripts/templates/task-link-*`, `scripts/TASK_LINKING.md` |
| 预览和真实文件清单 | `scripts/ui/artifact-preview.tsx`, `artifact-data.mjs`, `model-viewer*`, `scripts/templates/artifact-preview*` |
| 概览信息提示与交付标识 | `scripts/templates/overview-summary*`, `scripts/templates/overview-delivery-identity.html`, `scripts/ui/summary-tooltips.tsx` |
| 模型状态与只读监控接入 | `scripts/templates/model-status*`, `scripts/update-model-status.mjs`, `MODEL_STATUS_BRIEF.md` |

`scripts/` 中的早期脚本是**历史迁移，不是一键构建链**。不要批量执行。修改模板后，需要用对应的当前定向迁移同步运行真源。React 查看器与 Tooltip 由 `dev/build` 自动生成，生成的 JS 也随源码包保留。

## 3. 最新功能方向

- **左侧导航**：概览 / 生产 / 审核 / 交付；下载、消息、个人资料放底部。固定展开 184px，收起 64px，只留图标。
- **本轮侧栏交互**：无额外默认描边的伸缩图标；图标位置稳定。收起后悬停图标即临时展开，覆盖内容而不挤动页面；鼠标离开收回；临时展开时点击图标固定，再点击收起。操作侧栏内面板、键盘焦点时不意外收回；触屏和 ≤760px 使用点击，保留背景关闭和 Escape。
- **全局反馈**：浅灰 hover、独立 pressed、淡橙选中配橙色图文；下载与个人面板打开时保留细描边，避免选中仅靠鼠标悬停辨认。默认无伸缩按钮外框，键盘仍有焦点框。高频状态不加动画。
- **概览**：待审核 / 运行中 / 交付缺口 / 近 24 小时成本 / 模型状态，卡片附信息提示。待审仍为“指派给你”的内容，仅缩短标题；运行主数是 Run 任务数，副文案为处理中的 Item 数；缺口只表示待补齐的可交付数量。成本是近 24 小时发起的运行累计费用，不是自然日账单。用 `update-overview-summary.mjs` 同步。模型卡片现可进入独立详情页，主指标是按生产模型去重的「当前可用模型占比」，保留需处理线路与检测时间；未知或不完整数据不产生百分比。
- **模型状态详情**：`view: models`，归属概览导航；供应商 × 模型线路按异常优先，筛选关键词/供应商/线路范围，展开生成验证、延迟对比、测试集表现和账户证据。至少一条生产可路由、协议匹配且新鲜验证通过的线路才能确认模型可用；过期/未测不默认健康。数据入口 `props.modelMonitoring`，旧的两个数量 props 不再足以证明当前可用性；真实目录、检测、评测与账单服务尚未连接，默认诚实空态。页面只读，15 秒时效时钟不发请求，无测试/充值/切换动作。用 `node scripts/update-model-status.mjs` 同步模型页及概览；完整契约见 `MODEL_STATUS_BRIEF.md`。
- **交付进度标识**：概览每行使用该数据单已保存的客户/供应商 Logo（28px、完整显示），没有 Logo 或加载失败则用供应商首字占位；不再显示原状态圆点。数量、副文案和数据单跳转不变，替换或移除图片后的晚到失败回调无效。与概览卡片共用定向同步脚本。
- **审核队列**：title → Item ID → 上轮修复/本轮状态；待审核 CTA 为 `repair`，操作语义仍进入审核。最新/最旧排序改为与交付页同尺寸和轮廓的下拉入口，原生 select 保留键盘操作；不改变搜索、归属和审核阶段筛选。定向同步脚本为 `scripts/update-review-sort.mjs`。
- **审核/交付详情**：左大预览、右信息和决定；Item ID 打开完整记录；旁边铅笔打开“更换关联任务”。右栏集中滚动，底部按真实状态给动作。
- **案例标记**：Good Case / Bad Case 独立选中态；再次点击已选按钮取消；与审核结论、交付数量无关。
- **返工与分支**：返工在右栏输入说明、图片；图片用上传框展示已用/剩余数量，可粘贴。历史版本“追加修改”打开独立分支弹窗，树状展示真实父子关系；来源配置可搜索并返回；提交后的 Toast 可跳到确切分支 Run。
- **导航图标**：生产使用 Phosphor Regular `tree-structure` 流程节点，交付使用 `folder-simple` 文件夹；20px，无背景框，保持既有 hover/选中行为。
- **创建交付数据单**：独立的应用内页面，顶部“返回交付 / 创建数据单”，基础信息、List 与 Tag、Skill 三个纵向区块；底部固定取消/创建。名称、客户、目标、至少一项 List 为必填；Logo、说明、Tag、Skill 选填。离开已修改或仍在读取文件的草稿时确认，继续填写保留内容，放弃后才进入目标页面；创建成功进入详情。审核返回不会恢复已经销毁的创建页。仍是内存视图，不是新增 URL 路由，无持久草稿；刷新由浏览器原生离开提醒保护。已有数据单编辑保留三 Tab 弹窗。成员搜索点击/输入展开原生弹层，左侧多选 checklist，点外部或 Esc 关闭。中性灰 hover/选中，48px 紧凑成员行。仅提供 Owner、Reviewer-Forge、Reviewer-Outsourcing，最后一位 Owner 不可移除。创建页守卫在 `delivery-create-page.js`，共用表单由 `render-delivery-editor.mjs` 输出互斥分支，用 `update-delivery-skill-workspace.mjs` 同步。
- **成员提醒**：创建成功后，每位非创建者成员生成一条本地 inbox 提醒，可打开确切数据单；重复提交、编辑保存、失败与取消不生成重复提醒。事件按账号和当前成员权限过滤。飞书没有连接，明确显示未连接而非已发送。此流程仍是内存演示，不是跨账号服务。
- **个人资料**：任务列表仅显示有权限的交付单，点击进入；Skill 标签和任务列表同高，可上传并命名个人 Skill，再可选绑定交付单。
- **Skill**：创建页区块直接叫“Skill”，默认展示一份平台 Skill 搜索勾选列表，没有三个来源 Tab 或“本数据单使用”区。找不到时点“创建 Skill”，选择填写表单或上传文件；上传先读取为可修改、可移除的草稿，再确认创建。成功时立即同步到平台列表和个人 Skill，返回列表但不自动勾选。数据单保存只保存最终选择，取消数据单不删除已成功创建的 Skill。重名同内容复用，异内容必须改名；个人/本单各限 12 个。仍是内存演示。用 `scripts/update-delivery-skill-workspace.mjs` 同步，不重放早期全量迁移。
- **List / Tag / Skill 最新交互**：List ZIP 使用紧凑 CTA。Tag 默认仅显示创建入口，展开后填名称和可选颜色，无预选；自定义颜色有明确文字，添加/取消重置临时颜色，未添加草稿阻止保存。平台 Skill 行默认透明，名称下方显示 `/调用名`；右侧独立“查看”打开共享原生详情弹窗，内容是安全绑定文本，勾选状态不变，已选项可在详情内修改本单调用名。详情关闭返回触发按钮，Ctrl/⌘+Enter 不提交底层数据单。详情只输出一次，`render-delivery-editor.mjs` 必须保持非贪婪提取主 dialog，不能把它复制到创建/编辑的两个分支。
- **生产**：Pipeline、数据集可从任一端开始配置，依赖变更时重校验 Item，不要求固定顺序。
- **产物查看器**：预览 / 文件列表切换；3D 拖拽旋转、滚轮/双指缩放、右键平移、重置。真实文件由 Item + Run manifest 精确对应。没有模型时显示空态；按最新反馈移除示例提示、返回产物、示例入口和本地模型入口，不把无提示的示例当真实产物。
- **交付预览精简**：审核记录标题下直接接轮次，去掉横向分隔线与当前/候选版本摘要；版本关系和竖向时间线保留，无记录时显示“尚未审核”。只隐藏标题旁“待审核候选”，不改业务状态、其他状态标签或审核操作。同步脚本为 `scripts/simplify-sheet-preview.mjs`。
- **本轮 loading**：3D 使用真实进度，图片/网页显示等待、超时和重试；加载期间可切文件列表。文件上传暴露 busy 状态、禁用重复提交，不为同步演示动作伪造加载过程。

## 4. 不可破坏的业务约束

1. 技术运行成功 ≠ 审核通过。已批准版本和新候选分别记录。
2. 已通过后“追加返工”保留原批准版本；新候选运行完成后才可再次“通过审核 / 要求返工”。不能凭历史通过状态自动批准新版本。
3. 没有追加时不能凭空显示下一 Run。运行中、排队或失败版本不得被审核为通过。
4. 独立分支有自己的任务/产物，保留源版本与主线；创建不占主线轮次，也不自动增加交付数量。
5. 分支完成后可手动关联到既有交付 Item，或按显式选择创建新 Item。交付位身份与产物来源身份分离，不改写既有 Item ID。不要采用旧 v8 文档中“所有分支天然共享一个交付位”的笼统规则。
6. 关联时选确切数据单、Item、版本；不把不同 Item 的同一批 Run 文件混用。
7. 取消弹窗不提交，异步文件完成不能恢复已取消/已替换的草稿；保存重校验权限、重复名、容量和当前来源。
8. 数据单角色与全局账号角色分离。旧 reviewer/member 映射为 reviewer-forge，旧 outsourcing 映射为 reviewer-outsourcing；不修改全局 Member 等账号角色。至少保留一位数据单 Owner。真实后端必须另做认证授权。
9. Good/Bad 标记不改变通过/返工、模型结果或交付计数。
10. 下载只允许正确来源版本；本地示例和真实产物状态不可混淆。

## 5. 真实能力与演示边界

- 当前没有真实评估引擎、运行队列、团队权限后端或持久化；多数状态在内存，刷新清空。
- 通知接入点：`deliveryCreationNotifications()` 生成按 `sheetKey + recipient` 唯一标识的演示事件。上线必须由后端在创建事务后校验权限、持久化 outbox、幂等投递 inbox，并通过已配置的飞书账号映射/API 发消息；不能把当前 `not-connected` 改成 `sent` 来模拟成功。
- Skill 支持直接编写指令、读取 `.md` / 含 `SKILL.md` 的 ZIP、命名、绑定、`/调用名` 演示。个人与数据单通过 `personalSkillId + owner` 和 `libraryKey` 关联，保存快照独立，不自动覆盖已有绑定内容；只加载内容和审核上下文，不运行代码、不生成真实评分。生产环境需把当前原子 state patch 替换成有权限检查的后端事务及持久化。
- List ZIP 展示目录，不执行解压后的程序；文件读取有格式/大小/路径/压缩安全校验。
- 没有提供真实 Case 3D 模型。查看器已撤下 Astronaut 示例入口；它不是“布达拉宫”等 Case 产物。原文件和许可保留，见 `public/models/ATTRIBUTION.md`。
- 真实 manifest 接口：`props.artifacts[itemId][runId].files` 或 `run.artifactsByItem[itemId].files`，单文件字段 `id/name/url/size`。查看器按 URL 扩展名判别模型/图片/网页，其他类型只下载；缺失 URL 不编造文件。
- 本地模型支持自包含 GLB/glTF，最大 100 MB；拒绝外部资源引用。文件只在浏览器读取，退出/替换释放 Object URL。
- 3D 库按需加载，解码器自托管；不要把模型 SDK 的全局 decoder 配置改成只设置类静态字段（构造时会覆盖）。不要把 ES module Meshopt 解码器用普通 script 注入。
- HTML 预览沙箱只允许脚本，不授予 same-origin、弹窗或导航权限。跨源 iframe 的 load 事件只能表示导航结束，不能证明网页内部业务正常。
- 原型内部分旧下载/预览链接仍是演示地址，不能等同真实存储接口。要产品化，请先设计统一 API 和状态模型。

## 6. 检查与交付状态

源码包包括运行真源、源模板、React 源码与生成包、模型/解码器及许可、lockfile、测试、交接说明；排除 `node_modules`、构建缓存、Git 历史、环境密钥、浏览器截图和临时文件。

成员改版使用 `node scripts/update-member-picker.mjs` 同步真源，不重放早期全量迁移。已执行 `npm test`、`npm run build`；定向 TypeScript 是上轮查看器检查。详细最终结果见 `VALIDATION.md`。测试包含行为状态与静态模板断言，**不能代替浏览器视觉/拖拽验证**。

浏览器实测和公开发布：本轮尚未获确认，未执行。后续应检查桌面与窄屏的悬停→移入菜单→移出、固定、Escape、键盘、触屏以及 3D/图片/网页加载。不要在交接时声称这些都已实测。

## 7. 建议下一步

先补浏览器回归，再接入真实数据接口；逐步把单文件 DCLogic 状态提取成独立模块。在迁移框架前先保护现有状态测试和页面密度，不要把此次交接变成全站重写。
