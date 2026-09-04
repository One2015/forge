---
name: Forge · Postman UI 优化版
description: 以 Postman 浅色产品界面为参考的生产、审核与交付工作台评审变体。
colors:
  canvas: "#ffffff"
  sidebar: "#fcfcfc"
  subtle: "#fafafa"
  border: "#e9e9e9"
  control: "#cccccc"
  hover-border: "#999999"
  text: "#222222"
  muted: "#696969"
  faint: "#737373"
  hover: "#f7f7f7"
  selected: "#ffffff"
  pressed: "#ededed"
  action: "#222222"
  action-hover: "#383838"
  action-pressed: "#111111"
  on-action: "#ffffff"
  action-border: "#222222"
  focus: "#525252"
  nav: "#cd3d10"
  nav-soft: "#ffffff"
  brand-soft: "#eeeeee"
  link: "#404040"
  link-hover: "#222222"
  info: "#626262"
  info-soft: "#ffffff"
  action-soft: "#ffffff"
  brand: "#ff4f20"
  brand-deep: "#c93612"
  brand-mid: "#df6947"
  brand-light: "#f0a18a"
  brand-pale: "#f5a188"
  success: "#2c7b46"
  success-soft: "#ffffff"
  success-mark: "#41b46a"
  warning: "#8b6511"
  warning-soft: "#fff9e8"
  warning-mark: "#eabb45"
  danger: "#bf3d4b"
  danger-soft: "#fff0f2"
  danger-mark: "#f46b77"
  data-1: "#afd51c"
  data-2: "#d6ed77"
  data-3: "#60a63a"
  data-4: "#a1d783"
  data-soft: "#f0f0f0"
  data-ink: "#476e27"
  data-line: "#578f31"
  data-line-alt: "#94a93c"
typography:
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "0"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    lineHeight: "1.55"
  mono:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
rounded:
  control: "4px"
  overlay: "8px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.on-action}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "32px"
  navigation-selected:
    backgroundColor: "{colors.nav-soft}"
    textColor: "{colors.nav}"
    rounded: "{rounded.control}"
---

# Design System: Forge · Postman UI 优化版

## Overview

本文件仅约束 `/forge-postman.html` 评审变体。用户已明确选择 Postman 竞品式工作台：紧凑、中性、连续分区，以对象和当前任务组织界面。不另造营销身份、宣传叙事或品牌隐喻。

结构参考已实际查看的 Mobbin Postman 浅色请求编辑器与 Collection 详情；色彩按用户最新提供的 Genova Lab 截图，采用橙色导航、黑色 CTA、轻灰背景和青柠/鲜绿图表。这一规则覆盖前两轮蓝色和橙色主按钮。Aether 仅核实了公共图标资源，未安装完整设计系统。来源和实现边界见 [IMPLEMENTATION.md](./IMPLEMENTATION.md)。这里的数值是 Forge 的实现规则，不是官方 token 导出。

当前界面统一使用本文件的 Postman 工作台规则。业务含义与已有方法继续沿用：目标、已关联、已跑完、待审核、可交付不能因重排而改义；费用分析继续遵守 `PRODUCT.md` 的自然日与示例账单约束。

## Colors

白色正文面、近白色导航面与中性浅灰分隔线构成基础。旧组件的 `--forge-accent` 同时控制链接和普通状态，因此映射到深灰 `link`；主按钮通过稳定的类名和 `data-pm-primary` 显式映射到黑色。色彩主参考为用户截图 14（导航/CTA）、16（Billing）、11（Latency）。

2026-09-03 中性灰修订：背景、hover、边框、普通文字和黑色 CTA 均去除绿调；所有 selected/highlight 表面使用纯白。绿色仅限表达数据的图形和成功语义标记，不用于页面或卡片底色。此规则覆盖上一轮灰绿色表面。

颜色原语对应 `public/postman-ui/tokens.css` 的 `--pm-*` 同名变量；修改时先更新 CSS，再同步本文。

- **黑色主操作 `action`**：创建、保存、提交、通过审核等当前任务按钮统一黑底白字。默认 #222222，hover #383838，pressed #111111。
- **导航橙 `brand` / `nav`**：图标和侧边定位条使用鲜橙 #FF4F20，导航文字使用深橙 #CD3D10 保证小字号对比；配合纯白底、图标和字重表达选中。普通入口和草稿使用深灰 `link`。
- **详情与审核 CTA**：待审核 Case 的要求返工、追加返工和提交返工是黑底白字主操作；通过审核及取消返工为白底次操作。旧原型类名可能与角色不一致，由生成器按业务 handler 添加 `data-pm-primary` / `data-pm-secondary`，不改变业务逻辑。
- **样本标注**：Good Case 使用 `success` 绿，Bad Case 使用 `danger` 红，文字、图标与边框保持语义一致。未选中为白底；选中使用对应的低饱和语义底色、加深边框和实心图标，不使用通用强调色。详情和审核工作台共享同一规则。
- **中性色**：`text` 用于正文，`muted` 用于说明，`faint` 用于更低强调文字；`control` 描绘输入和次按钮边界，`border` 分隔内容。
- **悬停细节**：行和次按钮悬停使用极浅中性灰 #F7F7F7；输入框、次按钮边框在 hover 加深至 #999999，保持 1px 宽度。选中标签继续白底，hover 只加深边框。focus 使用更深的 #525252，不用增加线宽表达悬停；不添加彩色背景或布局位移。
- **交互态**：普通控件悬停、选中、按下使用中性浅灰层次，选中高亮为纯白底并使用边框、字重或指示线；主导航使用纯白底。生产、编辑、分析等局部标签统一用深灰 1px 下划线，橙色仅用于全局导航。焦点统一为深灰 #525252、1px 细线，文本选区为中性浅灰。
- **语义色**：成功、警告、危险用文字、图标和标记表达业务状态，成功提示底色为纯白。不要仅靠颜色传达结果。
- **数据色**：费用金额、输入、输出和贡献者系列使用 Postman 橙色阶 `brand`、`brand-deep`、`brand-mid`、`brand-light`、`brand-pale`，以明度区分系列；模型延迟柱使用无描边浅青柠表示基线范围、无描边 Postman 橙表示延迟升高。两类图表都提供文字图例、浅灰网格、稳定数值格式、键盘读数与 tooltip；鼠标 hover 只改变填充色，键盘 focus-visible 才显示 1px 深灰焦点线。`data-1` 至 `data-4` 及 `data-line` / `data-line-alt` 供非费用型进度和折线数据使用，不添加虚构的监控数据。
- **状态标记**：`success-mark`、`warning-mark`、`danger-mark` 用于进度细条，正文状态使用更深的语义色和明确文本。

## Typography

使用系统 UI 字体和中文回退，不依赖额外字体下载。ID、版本等可使用 `mono`；表格数字和图表读数使用 `font-variant-numeric: tabular-nums`。

页面标题为 20/28px、600；分区标题通常 14–15px；正文为 13px、约 20–21px 行高；辅助信息为 12px、18–20px 行高。概览主数值为 26/36px、600，账单指标为 24/32px、500，交付行计数为 16/22px、500。不要把指标字号扩展为通用标题层级。

字重以 400/500/600 区分层级。描述允许换行；稳定标识可截断，但完整值应可访问。金额保留 USD 和两位小数，数量与 Token 保留单位和分隔符。

## Layout

固定全局工具条高 40px；模块侧栏宽 176px，折叠宽 56px；生产二级标签高 40px。页面正文通常为 `22px 24px 40px` 内边距、最大宽 1600px。创建页最大宽 1120px。标题和对象操作共用一层，下接局部工具栏与实际内容。

间距以 4、8、12、16、24px 为基础，允许页面模式已有的 20px 等细调。优先复用连续行、指标带、分隔线和并列面板。数据单详情是代表模式：对象标题与动作 → 履约指标带 → 筛选/搜索 → Item 列表。

数据集桌面为资源列表与详情并列，详情默认宽 660px，沿用拖动及键盘调整。审核工作台和产物详情为主预览加右侧依据/活动区，右栏通常 392px。

窗口适配遵循当前 CSS：

- ≤1100px：正文留白收至 20px，审核右栏收至 360px；数据集改上下两区并隐藏分隔拖柄；Pipeline 宽内容局部横向滚动。
- ≤760px：正文留白为 `18px 14px`；导航保留 56px 轨道并可显式展开至 176px；审核改上下分区，底部判断区保持可达；交付行重排为单列。
- 窄窗数据单表格保留至少 600px 内容宽和局部滚动。390px 用于适应性检查，画布与宽表仍保留专业工作内容的空间需求。
- 触控目标以 44px 为适配方向；当前粗指针规则覆盖常用控件，兼容覆盖层仍需按具体组件检查，不能据此宣称所有目标均已达标。

## Elevation & Depth

常驻工作区主要靠底色、边界和分隔线表达层级，不为每条对象增加悬浮卡片。按钮和普通行不使用阴影。覆盖层可保留阴影；个人面板现有值为 `0 8px 30px #0002`，不能推广为内容容器的默认样式。

媒体预览保留深色背景 `#202124`，其作用是承载文件。无文件状态必须显示可见说明，不用装饰纹理替代业务内容。

## Shapes

常规控件和独立轻量容器使用 4px 圆角，弹窗使用 8px；个人面板保留 6px 的现有特例。连续指标和工作面不另加圆角外壳。常规线框为 1px；进度细条按模式使用 4–5px 高度和 2px 圆角。

沿用 Phosphor 图标，常规 16px、主导航 18px，统一视觉中心与文字基线。图标须表达已有动作，不为取得 Aether 外观重复引入另一套图标库。

## Components

- **按钮与输入**：常规高 32px、紧凑 28px；审核判断按钮保留 34px。主操作黑底白字，次操作白底边框，低强调操作用文字。禁用须使用真实禁用属性及原因，不能只降低透明度。
- **焦点与反馈**：主应用 `:focus-visible` 为 1px 深灰色外框（`--pm-focus-width` / `--pm-focus`）、偏移 2px；文本输入焦点线与边框重合，避免双圈；规范页示例使用相同 1px 深灰线、偏移为 3px。Case 语义色不覆盖焦点颜色。仅用于滚动定位的页面分区 `tabindex="-1"` 不显示整块外框，内部可操作控件继续保留键盘焦点。hover 使用浅灰，路由选中即时显示。常用导航和按钮不增加延迟动画；减少动态效果偏好下关闭动画、过渡和顺滑滚动。
- **导航与标签**：模块选中用纯白底、橙色图标/侧边条和 600 字重；Profile、消息、下载打开时沿用整项选中样式，不另加灰色描边，关闭时恢复。路由归属与面板开关分别跟随 `aria-current` 和 `aria-expanded`；展开与收起侧栏均保留左侧标记。导航点击不缩放，键盘焦点使用内嵌 1px 中性轮廓。生产、费用与编辑局部标签统一为纯白选中底和深灰细线。数据集归属“生产”，创建数据单归属“交付”，选中态跟随当前页面归属。
- **审核队列范围筛选**：待审核／审核结果为一级 Tabs；全部／我的移入“审核范围”下拉筛选。六列表格、摘要及工作流操作规范见 [REVIEW-QUEUE.md](REVIEW-QUEUE.md)。
- **交付列表**：客户分组条下接连续行，依次组织名称/标识、计数、履约进度和入口。使用现有 `pm-delivery-*` 模式；行 hover 不缩放或漂浮。
- **数据单与数据集**：复用指标带、局部筛选和 Item 行。数据集保留列表/详情关系及分隔器，不把每一层信息再包进卡片。
- **审核与产物**：优先保留预览面积，依据和活动在辅助区，判断动作位于任务区底部。无产物文件时明确说明；不伪造缩略图或加载进度。
- **创建与编辑**：创建为完整页面，编辑沿用三标签弹窗；保留成员、List、Tag、Skill 和草稿逻辑，统一必填提示、保存与取消。
- **分析与画布**：图表沿用键盘选柱和筛选联动，统一刻度、浅网格、图例与读数。Pipeline 画布使用中性点阵，节点为白底、1px 中性边框和 4px 圆角；Agent、Function、Review 的青柠、绿色、橙色仅用于节点标记和进度，不使用紫色底或粗彩色侧边。画布保留节点、连线、缩放和检查器。

## Do's and Don'ts

- **Do** 从 `--pm-*`、既有共享组件和已验证页面模式扩展，新增结构使用 `pm-*` 语义类。
- **Do** 以真实浏览器中的比例、可读性、对齐、长内容和操作结果判断完成度。
- **Do** 明确示例数据与未接入服务，维持原有路由归属校验。
- **Don't** 将该变体扩展为营销站；后续页面保持橙色导航、黑色 CTA、鲜绿数据的角色分工，不把导航色直接填充到主按钮。
- **Don't** 重新引入大圆角嵌套卡片、装饰渐变或常用导航动画来改变已确认的连续工作台语言。
- **Don't** 因视觉调整改写指标含义，或把本轮局部审核与测试结果称为完整可访问性认证。

### 表头与低强调操作统一规则

表头及列表分组头统一使用 `--pm-table-heading`（`#FAFAFA`），文字 `#696969`、分隔线 `#E9E9E9`。不要以暖灰或绿灰表示不同模块。二级按钮白底、`#CCCCCC` 细边框；三级操作透明底、灰色文字；hover 使用 `#F7F7F7`，边框加深至 `#999999`。局部 tab、筛选和分段控件选中保持白底，使用 `#525252` 的 1px 指示线或内描边。菜单保留选中勾选，行保留定位线。

实现入口：`public/postman-ui/controls.css`；生成器为旧内联表头与操作补充 `data-pm-table-heading`、`data-pm-secondary`、`data-pm-tertiary`、`data-pm-option` 等呈现标记，不修改业务方法。状态和图表不套用二三级 CTA 配色。


### 跨页面状态与操作等级（2026-09-03）

状态与交互颜色分开：状态标签统一白底，文字、1px 边框和小圆点表达结果；表头、hover、selected 不继承业务状态色。

| 语义 | 适用状态 | 文字 | 边框 | 进度 / 圆点 |
| --- | --- | --- | --- | --- |
| 成功 | 成功、通过、可交付、已达标、可下载、Good Case | `#2C7B46` | `#AED2BA` | `#41B46A` |
| 待处理 | 运行中、待审核、要求返工、部分失败、打包中 | `#8B6511` | `#E2CA91` | `#EABB45` |
| 失败 | 失败、超时、打包失败、校验错误、Bad Case | `#BF3D4B` | `#E6B8BF` | `#F46B77` |
| 中性 | 排队、未开始、暂停、停止、取消 | `#696969` | `#CCCCCC` | `#737373` |

运行成功和通过人工审核是不同业务状态：成功运行的标签用绿色，尚待人工审核的 Item 及其指标、进度条用琥珀色，不因运行成功变成“已通过”。数值为 0 不改变该指标的语义颜色。

主 CTA 黑底白字；次按钮白底深灰字、灰边；三级操作透明底灰字。详情下载与列表下载同级；数据集页的导入入口与新建运行、新建 Pipeline 同为页面主操作。嵌套成员、Skill、关联任务选择器的 selected 同样是白底、1px 深灰轮廓，不使用绿色或橙色填充。

新增状态组件使用 `data-pm-tone="success|warning|danger|neutral"` 和共享 `--pm-*` tokens。旧原型通过 `scripts/postman-ui/semantic-colors.mjs` 给原有展示绑定添加 `data-pm-status`、`data-pm-metric` 及颜色兼容标记；`public/postman-ui/states.css` 统一表现。颜色适配只处理模板和样式，不改写业务方法。客户自定义 Tag、作者头像、图表数据系列和预览画布不作为业务状态重新着色。

审核队列的 repair（现为“开始审核”）及“继续填写返工说明”属于每条任务的主入口，使用 filled 黑底白字主按钮；全部／我的筛选保持一致。通过 `cta-repair` 映射到 `data-pm-primary`，不再归入描边次按钮。默认 `#222222`、hover `#383838`、按下 `#111111`，沿用共享焦点和禁用规则。

背景与交互灰阶必须 R=G=B，包括旧组件的 `--forge-surface`（白色）、`--forge-soft`（hover 灰）、弹窗遮罩和按下阴影；不能仅更新 `--pm-*` 后留下旧色回退。RGBA 中性适配保留透明度。当前预览是生成的静态 HTML，构建后已打开的标签不会自动更新；验收时需重新加载该标签并检查实际计算颜色，不能只验证新开的标签。

费用汇总的四张指标卡为静态信息，不设置 selected/pressed 状态。标题右侧使用 16px information 图标（28px 点击区域）；默认描边，hover、键盘 focus 或 tooltip 打开时使用深灰实心图标。通过现有 `data-forge-tooltip` 组件展示各指标的统计口径，支持 Esc 关闭、键盘和触屏访问；卡片背景始终为白色。

原生单选下拉框同时定制触发器与 `::picker(select)`，采用 `appearance: base-select`，保留原生值、change 事件和键盘行为。选项白底、深灰文字，选中以深灰勾标识；hover 为 `#F7F7F7`，键盘焦点和打开的触发器为内嵌 1px 深灰线，不使用系统蓝色高亮或橙色焦点圈。规则位于 `controls.css`，覆盖费用筛选及其他单选下拉控件。当前预览浏览器已确认支持；不支持该能力的浏览器通过 `@supports` 回退原生菜单，其弹出选项仍受系统外观控制。依据：[MDN Customizable select elements](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)。

费用筛选区采用等宽网格：窗口大于 1100px 时四项单排，521–1100px 时按“时间／项目、供应商／模型”排列为 2×2，520px 及以下为单列。不使用固定字段宽度自动换行，避免孤立的第三／第四项。重置操作独立靠右；下拉菜单与触发器等宽，保留视口边界和列表滚动。

本轮浏览器检查涵盖概览、运行列表/详情、Pipeline、数据集、资源、交付列表/详情、Item/分支弹窗、审核队列/结果、创建页、费用、模型空状态、个人与下载面板；验证成功筛选、详情导航、表单输入/启用、键盘焦点及 1024px 窄窗口。真实模型监控与实际下载服务仍沿用原型接入边界，未宣称完成真实服务测试。

所有主要旧页面均由生成器附加稳定入口类：`pm-page-overview`、`pm-page-pipelines`、`pm-page-pipeedit`、`pm-page-datasets`、`pm-page-resources`、`pm-page-itemlife`、`pm-page-review`、`pm-page-submitted`、`pm-page-run`、`pm-page-error`。页面级修订应优先挂在这些入口下，避免通过文案或行内颜色猜测页面。


## 运行记录局部规范

五张 78px 白底 Summary、70px 连续表格行、数据集进入任务上下文。核心数字统一黑色，运行状态与 Item 状态分别计算。每行只保留一个主操作，次操作进入更多菜单。完整计算口径、Mock 接口和颜色规则见 [RUN-RECORDS.md](RUN-RECORDS.md)。

## 概览汇总局部规范

五项汇总的核心数字统一使用 `#222` 和等宽数字，不随业务状态变色。模型状态主数值展示“可用数 / 总数”，下方独立一行显示“模型可用”，移除百分比、问题数量、延迟和检查时间；统计口径及示例数据说明保留在 Tooltip，未知数据仍展示原有说明。

运行数量使用“个运行”，处理中的内容数量使用“共 N 个 Item 处理中”。Tooltip 解释一个运行可包含多个 Item，处理中数量不包含排队或待审核内容。保持原有卡片跳转和计算逻辑，展示文案由 `scripts/postman-ui/overview-summary.mjs` 集中转换。

## 交付 Item 详情局部规范

详情面板移除版本关系树，元信息后复用现有「相关 Skill」组件，只显示当前数据单已保存且与 Item 关联的 Skill；没有绑定时隐藏。Skill 下载、评估会话及审核历史行为保留。Hover 只落在具体可交互控件上，不为整块右侧面板增加背景。

Good / Bad Case 是互斥、可取消的样本标注，与审核结论独立。未选中采用白底语义色描边，选中采用成功绿／失败红实底白字与反色图标，单层 1px 边框；选中效果不随 hover 退回浅色。这是语义标注控件的局部规则，不改变导航和筛选器的白底选中样式。

分支、交付返工和审核返工表单共用 6 个参考图片槽位。槽位保持正方形，空位白底灰色虚线，仅使用加号与 Add Photo；每个槽位下方按位置显示 1/6 至 6/6，已有图片也保留编号；粘贴和文件选择共用原有图片验证、读取和移除流程，缩略图自动占用空位，删除后恢复。宽面板六列单排，窄面板自动三列两排；极窄面板两列，编号始终完整显示，不横向滚动。格式、大小限制与粘贴快捷键放在同一条可换行的灰色说明中。「选填」为普通次级文字，提交提示不使用卡片背景或强调边框。

分支配置的 Item 使用名称／ID 搜索框，复用当前 Pipeline 和数据集的 Item 集合，最多渲染 20 条匹配结果。支持方向键、Enter 选择、Esc 收起；未匹配文字不能作为 Item 提交。更换数据集或新建分支时重置搜索上下文，不引入新接口。

关联成功 Toast 提供「查看关联 Item」链接，使用本次操作的目标数据单与 Item ID 构造路由，直接打开目标详情并清除旧筛选。复用现有 Toast 的 12 秒停留、hover／焦点暂停和关闭行为；点击前检查目标仍存在。分支创建的「查看分支状态」链接保持原有行为。

交付子项列表的操作说明收进工具栏，复用信息图标 Tooltip，支持 hover、键盘焦点与点击查看；不再显示整行常驻提示或「知道了」。状态筛选为同一组分段控件：浅灰轨道、白底深灰文字选中项、浅边框；保留原有筛选与搜索联动，窄屏工具栏自然换行。

创建／编辑数据单的 Tag 预览与配置摘要使用 Tag 原色的 16% 浅底、50% 边框和加深文字，避免仅靠小圆点表达颜色。

审核分配支持「按数据集」与「按 Item」两种保存方式；草稿分别保留对应分配，保存当前方式。Item 按 ID 去重，支持名称／ID 搜索，每页 20 条。复用原有成员权限、Reviewer 校验、处理状态、保存与本地通知流程；搜索只影响可见行，校验始终覆盖全部对象。保存并重新编辑保留分配方式及人员。

交付 Item 详情采用铺满视口的页面式工作区。顶部左侧返回清单，中间是 Case 名称与 Preview／文件切换，右侧为上下项、当前位置与 Esc 提示；有文件 URL 时显示打开原始预览链接。复用产物组件的 React Portal，将同一视图切换器移到顶部，避免复制状态。预览画布铺满剩余空间，3D 视角控制与手势说明占用独立底栏，不覆盖模型。右侧详情、审核记录和底部审核操作保持原有流程；窄屏顶部换行，详情区独立滚动。
