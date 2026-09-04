# Forge 设计系统 · Geist v1

第一阶段，2026-09-03。模式：Operate。统一基础并迁移「运行记录」，不重构生产／审核／交付的状态机。

## 工作副本与范围

- 外层工作区：`codex/forge-production-merged`；运行项目 `forge-ia-refresh/` 自身为独立 Git 仓库，分支 `main`，已有大量本地修改。原有压缩包、源码快照、业务修改均保留。
- React 19 / Next 16 / vinext + Vite 8；`app/page.tsx` 是 iframe 壳，实际真源是 `public/forge.html` 的 JSON 编码 DCLogic 模板。已有 Phosphor 图标、Radix Tooltip、React 产物查看器、自定义账单图表、Node 测试；没有 Storybook 或可直接复用的完整控件库。
- 旧系统已有 `--forge-*`、组件 CSS 和局部交互说明，但页面还混用大量内联颜色、38/40px 高度、6/10/14px 圆角。橙色同时承担 CTA、选中、错误提示；运行进度绿色容易与审核通过混淆。
- 样板选择运行记录：稳定的状态筛选、只看我的、搜索、分组、进度、费用和详情跳转。新增运行依然进入 Pipeline，保留原有操作顺序。
- 新规范优先于旧文档中的暖橙要求，仅在已迁移区域生效。通过 `.fg-theme`、`.fg-runs` 与受样板页存在条件约束的导航适配，逐页迁移。全站其他页面尚未完成 CTA 统一。

## 参考映射与可用性

| 参考 | 实际观察 | 采用规则 |
| --- | --- | --- |
| [Geist Introduction](https://vercel.com/geist/introduction) | 已读取官方基础与组件目录 | 基础 tokens → 原生共享组件 → 业务组合 |
| [Colors](https://vercel.com/geist/colors) | 两级背景；1–3 用作组件背景、4–6 边框、9–10 文字 | 白色工作区、浅灰分区、深浅文字、单独的状态语义 |
| [Typography](https://vercel.com/geist/typography) | 标题、按钮、Label、Copy、Mono 分工 | 24px 页面标题；14px 操作／正文；12–13px 辅助和 ID；数字等宽 |
| [Button](https://vercel.com/geist/button) | 实际展开 Show code；导入 `@vercel/geistcn/components` | 中性主次层级、loading 保留几何与焦点、disabled、图标可访问名称 |
| [Analytics 截图](https://mobbin.com/screens/172f9834-0e6a-4fa8-abd4-6e91b02b5ef4) | 已实际查看公开截图：侧栏、指标 tabs、右侧环境与日期、轻网格蓝色趋势、下方并列数据区、图中 tooltip | 控件与数据区分离；中性边框与导航；仅数据系列用图表色；tooltip 展示时间与数值 |
| [查询截图](https://mobbin.com/screens/900a1f2b-eb37-43b0-9992-3533b4d91c7d) | 已实际查看公开截图：Metric／Group By／Filter、图表、搜索和结果表；只读提示有独立 CTA | 筛选分组明确、搜索紧贴结果、状态提示独立于查询控件 |
| [Vercel Flows](https://mobbin.com/apps/vercel-web-815f3776-f008-4fa2-af93-cabfff0bd479/9495ac57-4988-473b-ad4f-99bbfcd30b63/flows) | 链接转向登录／介绍内容，未能查看真实流程 | 不推断热点、hover、键盘顺序、下钻和过渡细节 |

公开截图只提供静态证据；没有把截图中的 tooltip 当作已经实测的 Vercel 交互。2026-09-03 查询公共 npm 的 `@vercel/geistcn` 得到 HTTP 404，无法确认公共可安装组件包，因此不安装同名替代库、不声称复制官方实现。使用原生 HTML 控件和现有 DCLogic 回调构建 Forge 适配层。

Geist 字体本地自托管，来自已安装 Next 16.2.6 的官方 devtools 字体资源（Sans Latin、Mono Latin），不增加依赖。中文回退 PingFang SC / Hiragino Sans GB / Microsoft YaHei。[字体官方仓库与授权](https://github.com/vercel/geist-font)；OFL 与来源记录位于 `public/design-system/fonts/`。不使用 Geist Pixel。

## 最小规范

| 类别 | 规则 |
| --- | --- |
| 文字／背景 | 主文字 #171717，次文字 #666；背景 #fff，弱背景 #fafafa |
| 边框 | 容器 #eaeaea，控件 #c9c9c9；统一 1px，区分容器与输入可操作性 |
| CTA | primary 黑底白字；secondary 中性描边；tertiary 透明／弱底；link 文字下划线；danger 红底白字 |
| 状态 | success 绿，running 低饱和橄榄绿，info 蓝，partial/warning 琥珀，failed/danger 红；必须同时输出状态文字 |
| 排版 | Geist Sans + 中文回退；24/32 标题，20/28 区块，14/22 正文，14/20 控件，13/20 与 12/18 辅助；400/500/600 字重 |
| 数据 | Geist Mono 仅 ID、Pipeline 标识、费用；tabular-nums 保持列对齐；费用靠右 |
| 间距 | 4、8、12、16、20、24、32、40、48；控件内部 8–16，区域之间 24–32 |
| 圆角 | 小标签 4、控件 6、容器 8；普通容器不叠加阴影 |
| 尺寸 | sm 32、md 40、lg 48；触摸目标至少 44；输入与相邻按钮同高 |
| 焦点／交互 | 2px 蓝色 focus-visible，3px 间隔；hover 浅灰、pressed 更深；状态选择用 aria-pressed／原生 checked |
| Loading | aria-busy + aria-disabled，保留原标签宽度和键盘焦点，阻止点击／键盘重复激活；上层状态区宣布进展 |
| Disabled | 原生 disabled，用统一灰色前景／背景／边框；业务页面需在邻近说明不可用原因 |

每个独立任务区域通常只有一个明显的主操作。不能根据页面或功能给 CTA 自选颜色；成功动作不使用“成功色按钮”。技术成功不等于审核通过：运行列表的待审核进度使用中性灰，运行中用低饱和橄榄绿，失败用红，排队为轨道底色；数量与文字保持原样。

## 实现与维护入口

- `public/design-system/tokens.css`：共享语义 tokens 与本地字体。
- `public/design-system/components.css`：共享控件样式。
- `scripts/design-system/components.mjs`：Button、SearchInput、Checkbox、SegmentedControl、Panel、Badge、EmptyState；生成真正的原生控件，DCLogic 保留事件绑定。`content` 仅允许可信源码 HTML，业务文本用 `{{ binding }}` 安全输出。
- `public/design-system/behavior.mjs`：loading 防重入；`setButtonBusy(button, true/false)`。
- `scripts/design-system/runs.mjs` / `public/design-system/runs.css`：迁移样板，只有进度宽度继续作为数据驱动的内联几何值。
- `scripts/update-geist-design-system.mjs`：有边界、幂等地同步 CSS 和运行记录片段；只添加 selected、mineSelected、tone 三类展示字段。
- `scripts/design-system/gallery.mjs`：用同一组组件生成 `/design-system.html` 与 `/design-system-responsive.html`。复用现有静态原型与 Node 工具，不新装 Storybook。

在运行项目目录执行 `npm run design-system`；`dev/build` 已包含同步。不要重放全部历史迁移脚本。

```js
Button({ content: '保存设置', variant: 'primary', onClick: '{{ save }}' })
Button({ content: '取消', variant: 'secondary', onClick: '{{ cancel }}' })
Button({ content: '删除草稿', variant: 'danger', onClick: '{{ remove }}' })
// HTML type 独立于视觉 variant；不采用官方示例 type/typeName API。
Button({ content: '验证名称', attributes: { type: 'submit' } })
```

展示入口提供默认、disabled、loading，表单校验、原生 select、Badge 与容器 loading/empty/error/retry。这里的状态显式标为演示。样板页本身为同步内存数据，不人为加入网络等待或假错误。

## 动效约定

动画相关工作直接使用 `animate` skill；涉及减弱动态效果时同时使用 `animation-accessibility`，实现 CSS 动效时读取 `animate/css-techniques.md`。以该技能决定是否需要动画、缓动、时长和中断方式，Geist 负责基础视觉规范。

- 高频筛选、搜索、列表选中和键盘操作即时反馈；运行记录行不做按压缩放。当前共享 Button 保留即时 hover / pressed / focus 反馈，与展示入口一致。
- 弹层、菜单、Toast 按需延续现有动效实现；新增或迁移时优先采用短小的 transform / opacity 过渡，一般 125–250ms，退出更短，菜单从触发位置展开。不能照静态参考截图推断动画。
- 交互过渡需要能从当前状态反向衔接；不使用 `transition: all`、整页逐项入场或无意义循环。Loading 以文字与 `aria-busy` 表达，骨架保持静态。
- `prefers-reduced-motion: reduce` 移除位移／缩放与循环，保留必要的短淡入或即时状态反馈；键盘操作即时完成。改动过的动效需要实际检查普通与 reduce 两种模式、快速反复开关及焦点返回。
- 当前已有的 `surface-motion` / `panel-motion` / `flow-motion` 按需复用。迁移区用小范围 CSS 边界隔离旧的全局按钮效果，避免业务页面与组件展示入口产生不同动效；本阶段未重写其他流程的动效。

## 复杂组件扩展

- 数据表／分组列表：Panel → 筛选工具栏 → 分组标题 → 记录；首要动作可键盘触达，保留真实 ID，禁止用索引关联操作。长标识截断但保留可访问文本；窄屏重排为两列和整行进度，不能隐藏费用、身份和状态。
- 审核工作台／多步表单：复用基础控件，保留原生 dialog、现有焦点返回、退出保护、权限、版本关系和提交顺序；为一次任务明确指定主操作，危险确认用 danger。待流程稳定后逐个迁移。
- 图表：沿用 `billing` 现有图表能力；容器采用 Panel、轴标签使用 secondary text、网格 `--fg-chart-grid`；tooltip 白底、紧凑时间／系列／值，遵循既有指针和键盘读取；legend 的系列名称、单位与颜色稳定对应；颜色使用 chart-1…4，并用线型／标记补充区分。保留时间范围、聚合、过滤、金额与 Token 口径、下钻。此阶段仅提供 tokens 与组合契约，未迁移 Analytics 图表。
- dark artifact canvas 是预览内容专属区域，不能直接套用浅色页面变量。暗色全站主题不在本阶段范围。

## 迁移顺序与边界

1. 运行详情与 Pipeline 列表：直接复用运行样板；随后迁移概览的导航入口与列表。
2. 审核队列：保留归属、阶段、排序、搜索和进入指定版本；审核工作台待操作顺序稳定后迁移。
3. 交付列表／详情，再迁移创建、编辑、成员与 Skill；当前草稿流程仍有并行迭代，避免全量覆盖。
4. 模型状态和用量费用：先筛选／空错状态，再图表容器、坐标轴、legend、tooltip；不改指标定义。
5. 个人面板、全局工具、复杂弹窗及暗色主题。

当前未覆盖：全站 CTA 批量替换、Analytics 整体迁移、暗色主题、真实请求／后端持久化、支付与通知服务。保留旧搜索算法：当前 Run 查询实际匹配 name / id / owner；占位文案沿用原型，不在视觉迁移中扩展查询数据范围。

验证结果与截图见 [VALIDATION.md](VALIDATION.md)。
