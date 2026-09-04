---
version: 1
slug: "scripts-templates-billing-html"
primary_target: "scripts/templates/billing.html"
related_targets: ["scripts/templates/billing-methods.js","scripts/templates/billing.css","scripts/update-billing.mjs","public/forge.html"]
---

# 用量与费用

Mode: Operate. Primary target: scripts/templates/billing.html.

用户从“昨日成本”进入总览，按日期、项目、供应商与模型检查费用及输入／输出 Token。参考 StackAI 的汇总、趋势、维度明细；保留 Forge 的浅色后台界面，不复制 Better Stack 的暗色设置页。

## Direction contract

THESIS: 日期范围统领费用与 Token，同一口径可在项目、供应商、模型之间切换，不把消费分析混成付款设置。

OWN-WORLD: Forge 浅灰底、白色数据区、细边界、紧凑系统字体、橙色当前选择；数值右对齐，弱化辅助文字。

STORY: 看总额与同比较周期变化 → 区分调用量和单次成本的影响 → 定位项目／供应商／模型的费用来源 → 选择时段、下钻、导出。

FIRST VIEWPORT: 标题、导出明细、更新时间；总览／按项目／按供应商／按模型；一行时间与维度筛选；计费说明与四项非重复 KPI。主图切换费用／Tokens／调用次数，粒度贴近图表；下方费用构成与可下钻明细。保留既有 Forge 字体、颜色与边框系统。手机 390px 双列 KPI，极窄屏单列，表格／图表内部滚动。

FORM: 用户明确参考及范围，直接扩展现有系统；不运行 seed。Signature interaction: 维度筛选同步更新总额、趋势与明细。Motion grammar: 即时更新，无装饰性进入动画。

时间粒度为次级控件：小时／日／月／年独立于指标 segmented control，容器和按钮均不使用底色、边框或阴影；当前项用深色文字与 1px 下划线识别。Hover 仅加深文字，保留橙色键盘焦点和移动端 44px 点击区域。指标切换、路由和聚合逻辑不变。2026-09-03 定向回归：417 项测试及构建通过，桌面／390px 浏览器确认外观与月／日切换。

FINISH: 2026-09-03 analytics architecture update. Preserves prior complete-month boundaries and endpoint spacing. New focused coverage includes equal-period comparison, explicit missing coverage, zero buckets, selected-period propagation, bidirectional sorting, pagination/search/export, drilldown return and route round trips. Browser QA checks native filters, Radix hover, chart selection and desktop/mobile containment. Real billing remains disconnected; no new raster, motion, external API, dependency or payment workflow.

## Data contract

用户已同意示例数据。示例账单与概览卡片共用同一数据源并在两处标注；默认北京时间 UTC+8。真实数据接入后按费用发生时间聚合，失败请求如产生计费仍计入；不由运行创建时间、请求次数或公开单价反推成本。加载／错误／未接入／无数据与真实零费用明确区分。
