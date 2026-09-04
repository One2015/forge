# 模型状态 · 当前实现与数据契约

状态：已实现 `/models` 异常排查看板。**真实监控接口尚未接入**；按用户要求，在没有监控输入时默认展示明确标注的模拟数据（4 家供应商、6 个模型、8 条线路）。有真实输入时优先使用真实输入，加载/错误不回退为示例。概览的真实可用率仍保持未知，不混入示例数值。没有发送探测请求、联系供应商、切换线路或执行充值。

## 用户要做的判断

先知道哪些生产模型现在能用于生成，再找到异常的供应商线路，决定是否切换线路、联系供应商或核对余额。不是模型排行榜，也不是混合质量、速度、账单的综合健康分。

概览「模型状态」点击进入独立页面，返回按钮回到概览。核心数据「当前可用模型占比」= 已确认可用模型数 / 生产启用模型数，按稳定模型 ID 去重，保留 1 位小数。一个模型至少有一条启用、可路由、协议匹配且近期生成验证通过的供应商线路，才计为可用。多条线路不增加模型数量；停用协议失败不直接影响模型可用性。

未检测、检测过期、未来时间或无效结果均为未知。存在未知模型、清单不完整/冲突/过期时不显示确定百分比；零个生产模型不显示 0% 或 100%。完整且新鲜的目录中，已启用模型没有匹配生产线路时属于不可用。另一条新鲜线路已经通过的模型，不因备用线路未知而失去已确认可用状态。

「需处理线路」按独立线路去重，包含已确认的调用失败、延迟升高、质量下降或明确账单异常。100% 模型可用时仍可有线路需处理；未知验证另列待确认数量。供应商账户问题会影响多条线路，但不会叠加为多个账户余额。

## 详情结构与交互 · 2026-09-03

- 顶部保留 Forge 标题和侧栏，显示数据来源、更新时间及「刷新示例」。可切回真实监控的接入状态。
- 异常分类：全部生产线路、调用失败、延迟 ≥ 2 倍、质量待复测、账户待处理。账户告警按供应商去重。顶部全局汇总不随列表筛选改变。
- 「供应商 / 模型评估」两种维度，关键词、供应商、状态筛选。异常优先；表格展示可用线路、最慢线路 P95 与基线、加权失败率、近 1 小时消费，以及账户余额或固定测试集最低得分。
- 选择一行更新下方诊断，「排查」按钮同时定位到诊断区并移动键盘焦点。可切换分组中的线路；展示性能、错误、质量和余额四类证据。
- 模拟趋势为最近一小时的 12 个五分钟 P95 首字延迟点，有基线、逐点 hover / 键盘读数。失败线路不伪造 0 ms 或 0 分；真实源未提供时间序列时明确留作待接入。
- 「模拟复测」只更新本地示例快照并报告现有问题，不扣费；「整理跟进信息」生成可选中复制的未发送摘要，保留模拟数据警示。
- 维度、筛选、分组与线路选择编码进 `/models` 查询参数，支持刷新与浏览器历史；移动端转为带字段名的堆叠行。
- 延迟与质量不能互相代替。质量下降只标「待复测」，不指控供应商“掺水”。未知账单不默认余额正常。
- 未接入、读取中、读取失败、目录为空、筛选无结果均有明确空态；不存在真实「充值」或付费「重测」按钮。
- 本页面只读。15 秒本地时钟更新检测时效，不发请求；默认有效期 5 分钟，可由接入数据在 1 秒至 24 小时内指定。模型清单与每个指标独立校验时效。

## 只读接入契约

`Component.props.modelMonitoring` 接受下述 JSON 结构。宿主数据服务负责取得有权限的生产目录和监控快照，再更新组件 props；当前宿主尚未连接此服务。不要从 Pipeline 名称推断模型，旧 `availableModelCount` / `configuredModelCount` 两个数量不再足以证明“当前可用”。

```ts
type ModelMonitoring = {
  status: 'ready' | 'loading' | 'error';
  catalogComplete: boolean; // 同一用户权限范围的完整生产目录
  catalogCheckedAt: number | string; // epoch 毫秒或 ISO 时间
  freshnessMs?: number; // 默认 300000，基于客户端当前时钟
  models: Array<{
    id: string; name: string; enabled: boolean;
    requiredProtocol: string; // 当前生产能力所需协议
  }>;
  providers: Array<{
    id: string; name: string;
    billing?: {
      status: 'ok' | 'balance_low' | 'arrears' | 'quota_exhausted';
      checkedAt: number | string;
    };
  }>;
  routes: Array<{
    id: string; modelId: string; providerId: string; protocol: string;
    enabled: boolean; routable: boolean; // 仅 true 算生产线路
    checkedAt?: number | string;
    outcome?: 'passed' | 'failed'; // 缺失为未知，不是 0% 成功率
    errorCode?: string; // 仅允许列表内错误类型映射为用户文案
    latency?: {
      metric: 'total_p95' | 'ttft_p95';
      currentMs: number; baselineMs: number; // 均必须大于 0
      sampleCount: number; baselineSampleCount: number;
      comparable: boolean; // 接入层确认请求类型/长度/指标/配置可比
      checkedAt: number | string;
      windowLabel: string; baselineLabel: string;
    };
    quality?: {
      status: 'normal' | 'regressed'; // 接入层按评测规则判定
      score: number; baselineScore: number; // 同一 0–100 分制
      sampleCount: number; baselineSampleCount: number;
      testSetId: string; baselineTestSetId: string;
      rubricId: string; baselineRubricId: string;
      checkedAt: number | string;
    };
  }>;
};
```

目录应为可序列化 JSON，ID 全局稳定、引用完整；完全相同的重复 ID 去重，冲突 ID 的所有证据被隔离，不取先到的记录为准。受影响的线路显示状态未知，并保留在待确认筛选里，不继续声称已确认可用。协议支持常用显示名 `anthropic-messages`、`openai-chat`、`openai-responses`、`gemini-content`；匹配采用精确协议 ID。

时间状态区分未检测、真正过期与「时间待校验」（格式错误、超出日期范围、未来时间）。无效时间不标过期，并提示检查时间戳和客户端时钟。账户状态正常而当前调用返回计费错误时显示「计费结果不一致」，展开后同时保留账户和调用两项观察及各自时间，要求核对账户映射与时间后复测；不会用账户正常悄悄覆盖调用失败。

显示层当前样本规则：可比延迟的当前/基线各至少 20 个样本，比例达到 2 倍提示延迟升高；质量当前/基线各至少 10 个样本、相同测试集和评分标准才能显示评测结论。这些是可调整的首版展示门槛，**不是已验证的生产 SLA 或持续性告警策略**。模拟趋势、失败率、余额均显式属于演示场景，不表示真实供应商表现。

新增可选字段：每条 `route.usage = { calls, failures, costUsd, checkedAt, windowLabel }`，每个 `provider.billing` 可提供 `balanceUsd` 与 `hourlySpendUsd`。失败次数必须介于 0 与调用数之间；无效/过期数据不显示失败率或消费。总览与明细共用相同的时间校验：仅接受有效毫秒时间戳或非空日期字符串，未来时间无效；超出 1 秒至 24 小时范围的有效期回退至 5 分钟。

分组只在延迟指标一致时显示最慢线路 P95；首字延迟与总耗时混合时显示「指标不同 · 请分线路查看」，保留各线路的独立标签与证据，不做混合排序。示例供应商小时消耗严格来自其全部线路近一小时费用（云桥 $121），不因筛选改变；余额为 0 时直接提示核对账户，不用零消耗推断账户可用。真实源时长按供应商提供的有效小时消耗估算，并明确来源；可用时长不是保证。

错误允许列表：`model_not_found` / `no_available_channel`、`timeout`、`insufficient_balance`、`arrears`、`quota_exhausted`、`rate_limited`、`authentication_failed`。其他错误统一「生成验证失败」。原始错误消息、请求体、密钥等不进入展示数据。计费异常只能由新鲜账户数据或当前明确计费错误提示，不能由超时推断欠费。

## 维护与验证

源文件：`scripts/templates/model-status-{methods.js,dashboard.js,demo.js,html,css}`；运行 `node scripts/update-model-status.mjs` 同步独立详情页和概览摘要到 `scripts/templates/forge-base.html`。真实快照适配器与示例生成器分离，该更新器保留创建数据单、交付和审核逻辑。

`scripts/test-model-status.mjs` 验证真实适配器的去重、备用线路、未知/过期、冲突、指标独立性及示例层的分组、加权汇总、过滤、复测边界。2026-09-03：全量 429 项测试及生产构建通过；本地桌面 1280×900 与手机 390×844 已检查切换、筛选、hover、排查跳转和模拟复测。独立验收对时效校验、延迟指标不可混排、余额时长来源三项修复均判定解决；该结论仅覆盖列出的修复范围。源码设计检测使用降级解析，未取得计算后的对比度认证。真实服务接入与公开发布仍未执行。

后续待接入：权限化模型/供应商目录、生产路由、真实生成验证、可比延迟窗口、版本化评测结果和账单状态。付费重测、线路切换与充值需独立权限与明确用户操作，不能由这张只读卡片自动执行。
