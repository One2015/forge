---
name: Forge Task Linking Extension
description: Detail-to-delivery Item association within the incumbent compact Forge interface.
colors:
  accent: "#c44318"
  accent-hover: "#a83812"
  accent-soft: "#fff1ea"
  panel: "#fff"
  subtle: "#f6f6f3"
  border: "#e3e5df"
  control-border: "#c9ccc4"
  text: "#272a25"
  muted: "#666b61"
  success: "#3e744a"
  warning: "#94641b"
  danger: "#a5321f"
  disabled-bg: "#eeefeb"
  disabled-text: "#81877b"
typography:
  title:
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "26px"
  body:
    fontFamily: '"Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
    fontSize: "13px"
    lineHeight: 1.5
  label:
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
  helper:
    fontSize: "12px"
    lineHeight: "18px"
  id:
    fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace"
    fontSize: "11px"
    lineHeight: "17px"
rounded:
  thumbnail: "4px"
  icon: "5px"
  control: "6px"
  toast: "8px"
  dialog: "10px"
spacing:
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
  item-selected:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    padding: "10px 12px"
---

# Design System: Forge Task Linking Extension

## Overview

**Creative North Star: "Compact Operate"**

仅固化“关联任务”详情 CTA、交付 Item 选择、版本变更确认和 Toast。沿用 incumbent 的白色工作面、克制橙色、中文友好的 sans 字体和 Phosphor Regular 图标，不建立或替换全局设计系统。

**Key Characteristics:**

- 先选择交付位置，再确认来源产物。
- 来源身份、稳定交付 ID 与版本结果明确分开。
- 缺失预览和本地会话边界如实可见。

权威来源：`scripts/templates/forge-refinement.css`、`task-link.css`、`task-link-dialog.html` 与 `task-link-methods.js`。延续 `delivery-design.md`；行为和集成说明见 `../scripts/TASK_LINKING.md`。

## Colors

橙色用于主操作、圆形单选标记、模式下划线和焦点。Item 行选中后不改变背景，只有支持 hover 的精细指针悬停时显示浅灰背景。绿色表明已通过／成功，警告色表明待审核或阻止操作，错误文本使用 Danger。中性文字区分主体与上下文，不以 Toast 颜色代替完整结果文案。

## Typography

标题使用 18px／26px，正文 13px，辅助信息 12px；Item ID 单独使用 11px／17px 等宽文字。来源标题为 14px、600。长名称、ID、版本后果和 Toast 可以换行。缩略图“暂无预览”标签为 10px／14px；它不是通用辅助字号。粗指针下编辑字段为 16px。

## Layout

原生 modal dialog 桌面宽度为 `min(600px,calc(100vw - 40px))`，最大高度为 `calc(100dvh - 48px)`。头部和底部不收缩；正文可滚动，搜索结果另有 260px 上限并独立纵向滚动。固定底部属于对话框布局，不覆盖视口。

在 600px 及以下，视口边距为 12px，最大高度减去 24px，内容横向内边距为 16px；结果区上限变为 240px。底部说明与操作堆叠，主按钮扩展。短屏上确认项可能需要正文滚动，不能宣称只有一个滚动区。

缩略图桌面为 64×48px，移动端为 52×44px。主／次按钮和 CTA 桌面最小高度 34px，紧凑断点增至 44px；粗指针字段、模式按钮和关闭图标也扩大。

## Elevation & Depth

只有 dialog 与 Toast 使用阴影；结果行、确认区域和历史记录保持平面。原生 backdrop 提供遮罩，Toast 的 manual popover 位于顶层。精确阴影与遮罩值保存在 sidecar。不新增动画。

## Shapes

对话框比控件更柔和，缩略图最紧凑。细边框与行分隔提供结构；左侧原生 radio 的圆形标记表达单选，整行 label 可点击，选中态无额外背景。

## Components

原生 dialog 标题及说明有显式关联，数据单 select 初始 autofocus；动态 option 同时保留标签文本、`label` 与 accessible name。Escape、取消、关闭按钮和点击 backdrop 丢弃草稿。Ctrl／Cmd+Enter 走同一验证入口，输入法组合期间不提交。

Item 可按当前数据单的名称或 ID 搜索。列表使用同名原生 radio，选择控件位于缩略图和文字左侧，支持键盘方向键切换。选中后显示稳定 ID、版本后果和必要的替换确认；该独立确认仍是 checkbox。页脚保留阻止原因及“本地演示 · 刷新后清空”。真实预览缺失、URL 不接受或加载失败时显示“暂无预览”，不伪造图片。仅同步选择器 UI 时使用 `node scripts/update-task-link-selection.mjs`，不重放历史全量迁移。

Toast 区分最终关联成功、待审候选提示及警告，使用 polite status、关闭按钮和悬停／焦点暂停；恢复后重新计时 7 秒。

## Do's and Don'ts

### Do:

- Do 保持稳定交付 ID、来源 Item／Run 身份和版本记录。
- Do 将候选与已通过版本分开，并明确替换后果。
- Do 保留真实缺图占位、可见验证和刷新丢失提示。

### Don't:

- Don't 把分支产物自动变成新的交付 Item。
- Don't 将本地状态描述成服务端持久化、授权或真实 Skill 执行。
- Don't 将本地替代收尾检查描述成 fresh 独立评审。

收尾记录：89 项测试通过，其中关联专项 16 项；最终 build 成功，集成脚本重复运行 hash 一致，`git diff --check` 无输出。独立测试页覆盖 1440／390／816 宽度；因 agent thread limit 无法启动 fresh reviewer，采用本地替代检查并给出 ship。候选返工再次关联与 option accessible name 已修正并验证。完整证据见 `review/task-link-finish-review.md`。无新增 shipping raster。
