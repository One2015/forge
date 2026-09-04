# 用量与费用

Mode: Operate. Primary target: scripts/templates/billing.html.

用户从“昨日成本”进入总览，按日期、项目、供应商与模型检查费用及输入／输出 Token。参考 StackAI 的汇总、趋势、维度明细；保留 Forge 的浅色后台界面，不复制 Better Stack 的暗色设置页。

## Direction contract

THESIS: 日期范围统领费用与 Token，同一口径可在项目、供应商、模型之间切换，不把消费分析混成付款设置。

OWN-WORLD: Forge 浅灰底、白色数据区、细边界、紧凑系统字体、橙色当前选择；数值右对齐，弱化辅助文字。

STORY: 看昨日总额 → 调整日期及小时／日／月／年粒度 → 找到高费用项目、供应商或型号。

FIRST VIEWPORT: 返回概览与页名；全局日期工具栏；总览／供应商／模型切换；四项汇总；并排费用和 Token 趋势；下方维度明细。手机纵向排列、表格独立横向滚动。

FORM: 用户明确参考及范围，直接扩展现有系统；不运行 seed。Signature interaction: 维度筛选同步更新总额、趋势与明细。Motion grammar: 即时更新，无装饰性进入动画。

FINISH: Reviewed with disposition ship at the two-fix verdict scope: complete-month dates and endpoint-label collision resolved. Scoped built-world records are .impeccable/billing-design.md and .impeccable/billing-design.json; 350 tests and build pass. Real billing integration remains disconnected, no new raster or motion shipped. Evidence and limitations: .impeccable/review/billing/review.md.

## Data contract

用户已同意示例数据。示例账单与概览卡片共用同一数据源并在两处标注；默认北京时间 UTC+8。真实数据接入后按费用发生时间聚合，失败请求如产生计费仍计入；不由运行创建时间、请求次数或公开单价反推成本。加载／错误／未接入／无数据与真实零费用明确区分。
