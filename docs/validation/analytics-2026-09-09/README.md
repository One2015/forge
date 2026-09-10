# Forge 分析界面优化 · 本地验证

参考用户提供的 ChatGPT / Codex Analytics 截图：总量先于图表、筛选靠近图表、浅色边界、淡网格、底部图例。保留 Forge 紫色、现有时间筛选、数据口径和详情入口；未部署、未新增依赖或数据源。

## 本地入口

- [用量与费用](http://127.0.0.1:3010/forge-postman.html?route=%2Fbilling%2Foverview)
- [专家表现](http://127.0.0.1:3010/forge-postman.html?route=%2Foutsourcing-suppliers#outsourcing-trend)
- [模型状态](http://127.0.0.1:3010/forge-postman.html?route=%2Fmodels) → 模型 → production-02 → 线路诊断

## 改动

- 费用：时间范围位于区块标题旁，图表内显示准确总量，费用 / Tokens / 调用次数切换靠近总量，图例移至底部。颜色按同一数据维度的稳定 ID 分配，避免切换指标重新按排名着色。
- 专家：三项趋势改为各自宽幅图表，32px 总量、统一 0–100% 刻度与起中止标签，保留点位提示和原有团队、时间选择。
- 模型诊断：修复标题与指标挤在一行的问题；加入最新检测值、起止时间、图例，曲线与点位沿用品牌色，扩大点位键盘/鼠标目标。
- 共用分析组件样式集中在现有 forge-system.css，手机总量 28px，控件与图例换行；长费用时间序列保持图表内部滚动。

## 截图

| 页面 | 修改前 | 修改后 | 390px 窄屏 |
| --- | --- | --- | --- |
| 费用 | [before](billing-before.jpg) | [after](billing-after.jpg) | [mobile](billing-mobile.jpg) |
| 专家趋势 | [before](experts-before.jpg) | [after](experts-after.jpg) | [mobile](experts-mobile.jpg) |
| 模型诊断 | [before](model-trend-before.jpg) | [after](model-trend-after.jpg) | [mobile](model-trend-mobile.jpg) |

截图展示相应图表区域，修改前后浏览器窗口和滚动位置不完全相同。

## 验证

- 实际浏览器：费用 $199.49、Tokens 1,795,300 与原数据一致；小时→日聚合为一个桶且总 Tokens 不变；键盘 Enter 切换 Tokens，焦点可见。
- 专家：三个最新值 93.4% / 84.4% / 95.3% 不变；月视图显示月份和较上月文案，点位提示可用；390px 无页面横向溢出。
- 模型：production-02 诊断显示最新 11.91 s；键盘切换错误率显示 7%，起止时间、基线、曲线可见；390px 抽屉内排布正常。
- `node --test scripts/test-billing.mjs scripts/test-model-status.mjs scripts/test-outsourcing-suppliers.mjs`：95 / 95 通过。包含新增的总量范围及稳定配色回归检查；旧概览顺序断言改为按指标名称定位。
- `npm run build`、最终 `npm run postman-ui`、`git diff --check` 通过。

未验证 Safari / Firefox、屏幕阅读器和真实后端数据源。专家时间视图沿用现有原型历史与日期映射，本次没有新增真实历史聚合。
