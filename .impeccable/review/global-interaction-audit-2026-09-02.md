# 全局交互状态评审

日期：2026-09-02。结论：**未通过交互一致性验收；2 项 P1、2 项 P2，未发现本范围内的 P0。**

本轮仅评审，未修改产品代码或业务数据。采用 Impeccable 的证据验证流程与 Animate 的轻量交互反馈原则。

## 范围与证据

- 源码：全局状态样式、Item 详情弹窗、模型状态页、个人面板、侧栏、现有交互测试。
- 浏览器：工具实际提供的现有标签为 `http://localhost:3007/`，iframe `/forge.html`；已确认该服务的工作目录是本项目 `forge-ia-refresh`。不是对截图中 3001 端口的直接验证。
- 桌面环境：1159 × 802，`hover: hover`、`pointer: fine`。抽查生产、交付、Item 弹窗、概览、模型状态、个人面板和空白创建页。
- 只进行了导航、打开/关闭、鼠标移动及 Tab / Shift+Tab；没有提交审核、返工、上传或创建数据。
- 按下瞬间的视觉样式为源码检查，未模拟持续鼠标按住或触屏长按。没有改动视口。
- 检查末段页面从空白创建页切换至审核队列；未再导航或强行恢复页面，以免干扰其他操作。禁用按钮的 hover 对比未完成，不列为已通过项。

## 已确认的问题

### P1 · 部分点击控件无法通过键盘访问

位置：[关闭按钮迁移入口](../../scripts/refine-forge-styles.mjs:27)、[当前页面模板](../../public/forge.html)中的 `sheet.closePick` 和 `delivery.toggleSort`。

运行时证据：

- Item 详情右上角关闭控件是 `DIV`，没有 `role` 或 `tabindex`，`tabIndex === -1`。它不进入 Tab 顺序，也没有原生 Enter / Space 激活能力。
- 交付页“最新”排序触发器同样是 `DIV`，`role === null`、`tabIndex === -1`。审核队列的排序已经是原生 `select`，两页行为不一致。

影响：鼠标看起来能操作，键盘用户却无法访问相同入口；为关闭按钮添加 hover 不能解决这一问题。

建议：关闭按钮改为原生 `button type="button"`；交付排序复用原生 `select`，或使用完整键盘行为的菜单组件。不要只给 div 增加 `cursor:pointer`。

推荐处理：`$impeccable harden`。

### P1 · Item 弹窗没有隔离背景焦点

位置：[弹窗结构](../../scripts/refine-sheet-modal.mjs:39)、[当前页面模板](../../public/forge.html)中的 `.forge-sheet-overlay`。

复现：

1. 交付 → 蚂蚁 Web3D 首批 200 条 → 布达拉宫。
2. 弹窗打开后，document 的 activeElement 仍为 `BODY`。
3. 按 Tab，焦点进入预览选项。
4. 按 Shift+Tab，焦点移到弹窗后面的“知道了”按钮；`closest('[role="dialog"],dialog') === null`。

影响：弹窗视觉遮挡了页面，但背景控件仍可通过键盘访问和触发。设置 `aria-modal="true"` 本身不会实现焦点隔离。

建议：使用真正的模态行为；打开时将焦点移入弹窗，限制 Tab / Shift+Tab 在弹窗内循环，让背景 inert，关闭后恢复到可聚焦的触发按钮。保留 Esc 关闭。

推荐处理：`$impeccable harden`。

### P2 · 同类控件的 hover 反馈不一致

位置：[Item 关闭按钮样式](../../scripts/templates/forge-refinement.css:30)、[全局 hover 列表](../../scripts/templates/interaction-states.css:22)、[模型页返回按钮](../../scripts/templates/model-status.css:3)。

| 控件 | 默认 | 实际 hover | 结论 |
| --- | --- | --- | --- |
| Item 弹窗关闭 | 白底，图标 `rgb(102,107,97)` | 白底不变，图标变为 `rgb(39,42,37)` | 有变化，但只有小图标变深，反馈弱 |
| 个人工作区关闭 | 透明底 | `rgb(240,241,237)` 灰底 | 有清楚的背景反馈 |
| 模型状态“返回概览” | 透明底，文字 `rgb(102,107,97)` | 背景、文字均不变 | 没有 hover 视觉反馈 |

更正初步推断：Item 关闭按钮的颜色没有被完全覆盖。运行时框架生成 `.scp7:hover { color: var(--forge-text) !important; }`，其优先级高于 `.forge-sheet-close`。因此这里应判为“弱反馈、样式不统一”，不是“hover 完全失效”。

建议：复用一致的图标按钮状态：默认透明，hover 轻灰背景，pressed 更深灰，focus-visible 清晰描边。文字返回按钮也应有轻量 hover / pressed 区别。高频控件即时响应即可，不需要弹跳或位移动画。

推荐处理：`$impeccable polish`。

### P2 · pressed 状态没有覆盖同一批可点击控件

位置：[全局状态规则](../../scripts/templates/interaction-states.css:22)、[pressed 白名单](../../scripts/templates/interaction-states.css:27)、[个人关闭按钮](../../scripts/templates/forge-profile.css:11)、[模型返回按钮](../../scripts/templates/model-status.css:3)。

证据：全局 hover 覆盖个人关闭等多种控件，而 pressed 只覆盖少量类名。读取运行时样式表后，个人关闭按钮没有任何适用的 `:active` 规则；模型返回按钮的源码同样没有 pressed 定义。

另有待修复时重点回归的源码风险：全局中性 hover 的选择器比现有通用 active 选择器更具体，并且包含 `.forge-detail-action` 这种同时用于主按钮的类名。必须检查默认 / hover / active 的最终层叠结果，不能以“源码已有 :active”作为验收依据。本轮没有将这个风险描述为已实测的所有主按钮故障。

建议：将基础样式与主按钮、次按钮、图标按钮的状态按语义分开，确保 active 在 hover 同时存在时仍有区别；disabled / busy 不继承可操作反馈。触屏环境单独验收 pressed，不依赖 hover。

推荐处理：`$impeccable polish`。

## 已有的正确实现

- 个人面板关闭按钮为原生 button，且 hover 背景明确，可以作为统一实现的参照。
- 模型页“统计口径”的键盘焦点有 2px 橙色轮廓；不能因为缺 hover 就误判为没有键盘支持。
- 侧栏有 selected / expanded / focus-visible 区分，且高频 hover 展开没有多余过渡动画。
- 预览上一项 / 下一项已有独立的深色背景 hover、active 和 focus-visible 规则；不应被浅色按钮规则覆盖。
- 空白创建页在可访问性树中将创建、移除唯一 Owner 等控件正确标为 disabled；其鼠标 hover 视觉仍需后续补测。

## 自动检查与边界

- `node --test scripts/test-interaction-states.mjs`：8 / 8 通过。
- Impeccable detector 对 `interaction-states.css`、`forge-refinement.css`、`detail-actions.css`、`model-status.css` 的一次扫描返回 `[]`。
- 以上测试和静态扫描不验证最终 CSS 层叠、真实键盘焦点路径或视觉状态差异，不能代替浏览器验收。

本次是交互状态专项，不给出虚假的全站 20 分健康总分。范围内的可访问性为 2 / 4、实现一致性为 2 / 4；性能、完整响应式和主题切换没有完成专项测试，记为未评估。

## 推荐顺序与验收

1. **P1 · `$impeccable harden`**：先修原生语义、弹窗初始焦点、焦点循环与关闭后的焦点恢复。
2. **P2 · `$impeccable polish`**：统一 hover / pressed / focus-visible / selected / disabled / busy，不添加不必要的运动。

修复后逐一验证：鼠标移入与移出、鼠标按住与释放、Enter / Space、Tab / Shift+Tab、Esc、disabled、busy、窄屏与粗指针。可逐项或一起处理，再运行 `$impeccable audit` 复核。
