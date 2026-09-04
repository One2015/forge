# Postman UI 优化版 · 评审依据

用户要求整体视觉与信息组织重做，实际产品优先，不改业务含义，不部署或合并。主参考为实际浏览到的 Mobbin Postman 浅色请求编辑器和 Collection 详情，按用户最新截图使用橙色导航、黑色任务 CTA、青柠与鲜绿图表、中性选中态、细分隔线与连续工作面；新版官方 Postman 博文提供工作台分区参考。Aether 公共资源已确认是可检索的 SVG 图标目录，不假设完整组件库。

工作区：全局 40px 工具条、176px 模块侧栏、生产 40px 二级标签；常规主体 padding24px，控件32px，标题20px，正文13px，辅助12px。交付详情是代表页：对象标题与任务按钮同层，履约数据带，局部筛选与列表。全局推广覆盖概览、交付清单/详情、生产运行、Pipeline、数据集、资源、审核队列/工作台、成本与模型状态、创建/编辑弹窗、个人面板。

源码入口 `public/forge-postman.html` 由 `scripts/postman-ui/build.mjs` 从内部模板 `scripts/templates/forge-base.html` 定向生成；当前设计资产在 `public/postman-ui`。内部模板不作为独立页面发布，业务方法沿用。`routes.js` 保留页面壳的完整路由和独立 HTML 入口的路由编码，以及交付筛选器的映射。

构建是 code-led，无生成图或获批静态效果图。事实截图在 ../output/postman-ui/before 与 after。请以实拍截图判断比例、可读性、对齐和完整性。未接入产物、资源schema、真实模型监控、批量导出属于原有原型限制，不允许制造业务内容。

静态 detector 已运行一次，降级为 regex（缺 htmlparser2/css-select/css-tree/domutils），输出 []，不代表自动可访问性通过。实际浏览器补充测量与操作。

本轮修正：预览 sr-only 空状态改为视觉可见；折叠导航取消隐藏宽点击区，提供真正的展开按钮；数据集默认详情660px，<=1100上下布局；390px的表格保留局部横向滚动；原型统一导出尚无回调，现禁用并带说明。目录式画布的节点/边保留业务颜色，未添加动画。

已知新增源路由限制：少数审核队列的历史 Item 与 Run 的 itemIds 校验不一致，队列点击可进入，但这些深链接直接刷新可能显示明确的“Item 不属于该运行”错误；不放宽数据归属校验。此问题在原始 prototype 路由中存在。

FORM：用户明确锁定 Postman 产品工作台，优先于概念抽签。concept-seed 在实施前已运行，degraded seed c2a75804 / index5，无 challengers。主参考完整地址见最终规范。


最新配色：用户提供的 Genova Lab 截图 14、16、11 分别约束导航/黑色 CTA、Billing 和 Latency 的色相关系。后续实现以 DESIGN.md 为准。
