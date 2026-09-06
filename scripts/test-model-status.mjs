import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateModelStatus } from './update-model-status.mjs';
import { updateDeliverySkillWorkspace } from './update-delivery-skill-workspace.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const modelStyles = fs.readFileSync(new URL('./templates/model-status.css', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const NOW = Date.UTC(2026, 8, 2, 12);
function component(data) {
  let now = NOW, tick, cleared = 0, changes = 0;
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    Date: class extends Date { static now() { return now; } },
    setInterval(fn, ms) { assert.equal(ms, 15000); tick = fn; return 7; }, clearInterval(id) { assert.equal(id, 7); cleared++; },
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', modelMonitoring: data };
      setState(patch) { changes++; Object.assign(this.state, patch); }
    }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return { c: context.instance, advance(ms) { now += ms; tick?.(); }, get cleared() { return cleared; }, get changes() { return changes; } };
}
// Unit fixtures validate the live adapter independently of the labelled UI demo.
const model = (id, extra = {}) => ({ id, name: '模型 ' + id, enabled: true, requiredProtocol: 'anthropic-messages', ...extra });
const provider = (id, extra = {}) => ({ id, name: '供应商 ' + id, ...extra });
const route = (id, modelId, providerId = 'p', extra = {}) => ({ id, modelId, providerId, protocol: 'anthropic-messages', enabled: true, routable: true, checkedAt: NOW - 1000, outcome: 'passed', ...extra });
const data = (models = [model('m')], routes = [route('r', 'm')], providers = [provider('p')]) => ({ status: 'ready', catalogComplete: true, catalogCheckedAt: NOW - 1000, models, routes, providers });
const snap = input => component(input).c.modelStatusSnapshot();
const latency = extra => ({ metric: 'total_p95', currentMs: 4600, baselineMs: 2000, sampleCount: 20, baselineSampleCount: 20, comparable: true, checkedAt: NOW - 1000, windowLabel: '近 15 分钟', baselineLabel: '前 7 天同类请求', ...extra });
const quality = extra => ({ status: 'regressed', score: 70, baselineScore: 90, sampleCount: 10, baselineSampleCount: 10, testSetId: 'fixed-v1', baselineTestSetId: 'fixed-v1', rubricId: 'rubric-v1', baselineRubricId: 'rubric-v1', checkedAt: NOW - 1000, ...extra });

test('monitoring absent, loading, error and empty catalog do not invent percentages', () => {
  for (const value of [undefined, null, '', [], { status: 'loading' }, { status: 'error' }, { status: 'other' }]) {
    const result = snap(value); assert.equal(result.rate, '—'); assert(!result.hasRate); assert.equal(result.rows.length, 0);
  }
  const empty = snap(data([], [])); assert.equal(empty.rate, '—'); assert.equal(empty.note, '尚未启用生产模型');
  const { c } = component(); c.openModelStatus(); assert(c.modelStatusValues().isDemo);
  c.modelStatusValues().sourceToggle(); assert(c.modelStatusValues().disconnected);
});

test('percentage is deduplicated by production model, not supplier or protocol count', () => {
  const payload = data([model('a'), model('a'), model('b'), model('c'), model('off', { enabled: false })], [route('r1', 'a'), route('r1', 'a'), route('r2', 'a', 'p', { outcome: 'failed' }), route('r3', 'b', 'p', { outcome: 'failed' }), route('r4', 'c', 'p', { outcome: 'failed' }), route('r5', 'off')]);
  const result = snap(payload); assert.equal(result.rate, 33.3); assert.equal(result.total, 3); assert.equal(result.available, 1); assert.equal(result.unavailable, 2); assert.equal(result.rows.length, 5);
  const { c } = component(payload), card = c.overviewSummary([], [])[4];
  assert.equal(card.v, result.rate); assert.equal(Object.hasOwn(card, 'prefix'), false); assert.equal(card.unit, '%'); assert.equal(card.auxiliary, '1 / 3 个模型可用');
});

test('a working production route keeps a model available, failed stopped protocols do not count', () => {
  const result = snap(data(undefined, [route('a', 'm'), route('b', 'm', 'p', { enabled: false, outcome: 'failed' }), route('c', 'm', 'p', { protocol: 'gemini-content', outcome: 'failed' })]));
  assert.equal(result.rate, 100); assert.equal(result.attention, 0); assert.equal(result.rows.filter(row => row.active).length, 1);
});

test('unroutable, unsupported, disabled and unverified successes cannot make a model available', () => {
  for (const extra of [{ routable: false }, { enabled: false }, { protocol: 'openai-chat' }, { checkedAt: null }, { checkedAt: NOW - 300001 }, { checkedAt: NOW + 1 }, { outcome: 'success' }]) {
    const result = snap(data(undefined, [route('r', 'm', 'p', extra)]));
    assert.equal(result.available, 0); assert.notEqual(result.rate, 100);
  }
  const noRoute = snap(data(undefined, [])); assert.equal(noRoute.rate, 0); assert.equal(noRoute.unavailable, 1);
});

test('stale or missing tests are unknown, including a failed route with unknown fallback', () => {
  for (const checkedAt of [undefined, null, '', 'not-a-date', NOW - 300001, NOW + 1]) {
    const result = snap(data(undefined, [route('r', 'm', 'p', { checkedAt })]));
    assert.equal(result.rate, '—'); assert.equal(result.unknown, 1); assert.match(result.issue, /状态未知/);
  }
  const result = snap(data(undefined, [route('r', 'm', 'p', { outcome: 'failed' }), route('fallback', 'm', 'p', { checkedAt: null })]));
  assert.equal(result.rate, '—'); assert.equal(result.attention, 1); assert.equal(result.unknown, 1);
});

test('fresh ISO timestamps and explicit freshness policy work at the boundary', () => {
  const payload = data(); payload.catalogCheckedAt = new Date(NOW - 300000).toISOString(); payload.routes[0].checkedAt = payload.catalogCheckedAt;
  assert.equal(snap(payload).rate, 100);
  payload.freshnessMs = 1000; assert.equal(snap(payload).rate, '—');
  payload.freshnessMs = -1; assert.equal(snap(payload).rate, 100);
});

test('partial, old and inconsistent catalogs withhold a definitive ratio', () => {
  for (const change of [payload => { payload.catalogComplete = false; }, payload => { delete payload.catalogCheckedAt; }, payload => { payload.catalogCheckedAt = NOW - 300001; }, payload => { payload.catalogCheckedAt = NOW + 10; }, payload => { payload.models.push(model('m', { enabled: false })); }, payload => { payload.routes.push(route('r', 'm', 'p', { outcome: 'failed' })); }, payload => { payload.providers.push(provider('p', { name: 'Conflict' })); }]) {
    const payload = data(); change(payload); assert.equal(snap(payload).rate, '—'); assert(snap(payload).issue);
  }
});

test('malformed catalog records, missing protocols and references fail safely', () => {
  for (const change of [payload => { payload.models = null; }, payload => { payload.routes = {}; }, payload => { payload.providers = 'x'; }, payload => { payload.models.push(null); }, payload => { payload.models[0].enabled = 'true'; }, payload => { delete payload.models[0].requiredProtocol; }, payload => { payload.routes[0].routable = 'true'; }, payload => { payload.routes[0].providerId = 'missing'; }, payload => { payload.routes[0].modelId = 'missing'; }, payload => { payload.routes[0].id = ''; }]) {
    const payload = data(); change(payload); assert.equal(snap(payload).rate, '—');
  }
});

test('100 percent availability still exposes independent slow, quality and billing issues', () => {
  const payload = data(undefined, [route('r', 'm', 'p', { latency: latency(), quality: quality() })], [provider('p', { billing: { status: 'arrears', checkedAt: NOW - 1000 } })]);
  const result = snap(payload), row = result.rows[0];
  assert.equal(result.rate, 100); assert.equal(result.attention, 1); assert.equal(row.latencyLabel, '2.3×'); assert(row.slow && row.regressed && row.billingAlert); assert.match(row.qualityLabel, /待复测/);
  assert.match(result.detail, /1 条线路需处理/); assert.match(row.nextStep, /核实供应商账户/);
});

test('overview presents mutually exclusive model availability without a duplicate operations summary', () => {
  const { c } = component(); c.openModelStatus();
  const view = c.modelStatusValues();
  assert.deepEqual(Array.from(view.availabilityMetrics, metric => metric.label), ['可用模型', '稳定模型', '需关注模型', '不可用模型']);
  assert.equal(Number(view.availabilityMetrics[1].value) + Number(view.availabilityMetrics[2].value), view.available);
  assert.equal(Number(view.availabilityMetrics[3].value), view.unavailable);
  const html = template.match(/<!-- model-status:start -->[\s\S]*?<!-- model-status:end -->/)[0];
  assert.match(html, /aria-label="模型可用性"/); assert.doesNotMatch(html, /所选时段运行表现|调用指标按所选时段汇总/);
  assert.match(html, /稳定模型 \+ 需关注模型 = 可用模型/); assert.match(html, /模型可用性按当前生产线路汇总/);
});

test('model overview uses explicit metrics, categorical quality and a working usage window', () => {
  const { c } = component(); c.openModelStatus();
  let view = c.modelStatusValues();
  const oneHour = view.modelOverviewRows.find(row => row.name === 'Claude Opus 4.1');
  assert.equal(view.overviewWindow, '1h'); assert.equal(view.overviewWindowLabel, '近 1 小时');
  assert.equal(oneHour.requests, '540'); assert.equal(oneHour.latency, '3.02s'); assert.equal(oneHour.qualityStatus, '基线内'); assert.equal(oneHour.statusLabel, '余额风险');
  assert(!Object.hasOwn(oneHour, 'error')); assert(!/^\d/.test(oneHour.qualityStatus));
  view.onOverviewWindow({ target: { value: '24h' } }); view = c.modelStatusValues();
  const fullDay = view.modelOverviewRows.find(row => row.name === 'Claude Opus 4.1');
  assert.equal(view.overviewWindowLabel, '近 24 小时'); assert.notEqual(fullDay.requests, oneHour.requests); assert.notEqual(fullDay.cost, oneHour.cost);
  assert.match(view.overviewUsageNote, /可用线路指已启用、可路由且最近生成验证通过/);
  assert.match(modelStyles, /\.forge-model-table-heading>div\{[^}]*min-width:0;flex:1/);
  assert.match(modelStyles, /\.forge-model-table-heading p\{[^}]*white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
  const overviewHtml = template.match(/modelStatus\.overviewTab[\s\S]*?modelStatus\.linesTab/)[0];
  for (const label of ['请求量', '可用线路', '成功率', 'P95 TTFT', '生成速度', '质量状态', '总成本', '运行状态']) assert.match(overviewHtml, new RegExp('>' + label + '<'));
  for (const removed of ['成功 / 错误率', '>质量<', '>成本<', '>趋势<']) assert(!overviewHtml.includes(removed));
  assert.match(overviewHtml, /aria-label="模型表现统计时段"/); assert.match(overviewHtml, /row\.latency/); assert.match(overviewHtml, /row\.qualityStatus/); assert.match(overviewHtml, /row\.statusLabel/);
});

test('error reasons are a filterable percentage summary with direct drill-down', () => {
  const { c } = component(); c.openModelStatus();
  let view = c.modelStatusValues();
  assert.equal(view.errorOverviewRows.length, 4);
  assert.equal(view.errorTotal, '4'); assert(view.errorOverviewRows.every(row => row.count === '1' && row.percentage === '25.0%'));
  assert.deepEqual(Array.from(view.errorProviderOptions, row => row.name), ['Anthropic', '云桥']);
  view.onErrorProvider({ target: { value: 'yunqiao' } }); view = c.modelStatusValues(); assert.equal(view.errorProvider, 'yunqiao'); assert.equal(view.errorTotal, '3');
  const downstream = view.errorOverviewRows.find(row => row.id === 'downstream_error');
  assert.equal(downstream.name, '下游供应商报错');
  downstream.open(); view = c.modelStatusValues();
  assert(view.linesTab); assert.equal(view.filter, 'downstream_error'); assert.equal(view.provider, 'yunqiao'); assert.equal(view.resultCount, '1 条线路');
  assert.deepEqual(Array.from(view.rows, row => row.id), ['production-02']);
  const overviewHtml = template.match(/modelStatus\.overviewTab[\s\S]*?modelStatus\.linesTab/)[0];
  assert(!overviewHtml.includes('模型供应商整体表现')); assert(!overviewHtml.includes('providerOverviewRows'));
  assert.match(overviewHtml, /aria-label="错误原因模型供应商"/); assert.match(overviewHtml, /forge-model-error-list/); assert.match(overviewHtml, /row\.count/); assert.match(overviewHtml, /row\.percentage/); assert.match(overviewHtml, /row\.open/);
});

test('a selected usage window stays unavailable when live monitoring did not provide it', () => {
  const payload = data(undefined, [route('r', 'm', 'p', { usage: { calls: 10, failures: 1, costUsd: 2, checkedAt: NOW - 1000 } })]);
  const { c } = component(payload); c.openModelStatus();
  let view = c.modelStatusValues(); assert.equal(view.modelOverviewRows[0].requests, '10');
  view.onOverviewWindow({ target: { value: '7d' } }); view = c.modelStatusValues();
  assert.equal(view.modelOverviewRows[0].requests, '—'); assert.equal(view.modelOverviewRows[0].success, '—'); assert.equal(view.modelOverviewRows[0].cost, '—');
  assert.match(view.overviewUsageNote, /当前数据源未提供近 7 天调用统计/);
});

test('delay comparison needs recent same-class valid samples and a named metric', () => {
  for (const extra of [{ checkedAt: NOW - 300001 }, { comparable: false }, { sampleCount: 19 }, { baselineSampleCount: 0 }, { baselineMs: 0 }, { currentMs: Infinity }, { metric: 'p50' }, { metric: '__proto__' }]) {
    const row = snap(data(undefined, [route('r', 'm', 'p', { latency: latency(extra) })])).rows[0];
    assert(!row.slow); assert(!row.latencyLabel.includes('×')); assert(!row.attention);
  }
  const row = snap(data(undefined, [route('r', 'm', 'p', { latency: latency({ metric: 'ttft_p95', currentMs: 3990 }) })])).rows[0];
  assert(!row.slow); assert.match(row.latencyCaption, /首字延迟/); assert.match(row.latencyEvidence, /当前样本 20/);
});

test('quality regression requires matching fixed test set, rubric, enough samples and freshness', () => {
  for (const extra of [{ checkedAt: NOW - 300001 }, { baselineTestSetId: 'other' }, { baselineRubricId: 'other' }, { sampleCount: 9 }, { baselineSampleCount: 1 }, { score: -1 }, { baselineScore: 101 }, { status: 'tampered' }]) {
    const row = snap(data(undefined, [route('r', 'm', 'p', { quality: quality(extra) })])).rows[0]; assert(!row.regressed); assert(!row.attention);
  }
  const row = snap(data(undefined, [route('r', 'm', 'p', { quality: quality({ status: 'normal' }) })])).rows[0];
  assert.equal(row.qualityLabel, '未见下降'); assert(!row.regressed);
});

test('billing alerts need explicit recent account data or a current billing error', () => {
  for (const billing of [{ status: 'arrears', checkedAt: NOW - 300001 }, { status: 'arrears' }, { status: '__proto__', checkedAt: NOW }, { status: 'ok', checkedAt: NOW }]) {
    const row = snap(data(undefined, undefined, [provider('p', { billing })])).rows[0]; assert(!row.billingAlert); assert(!row.attention);
  }
  const result = snap(data(undefined, [route('r', 'm', 'p', { outcome: 'failed', errorCode: 'quota_exhausted' })]));
  assert.equal(result.rate, 0); assert.equal(result.rows[0].billingLabel, '额度耗尽（调用返回）'); assert.equal(result.attention, 1);
  assert(!snap(data()).rows[0].qualityLabel.includes('正常'));
});

test('route reasons never expose raw errors, response bodies or credentials', () => {
  for (const errorCode of ['__proto__', 'constructor', 'secret-key=123', 'not_known']) {
    const row = snap(data(undefined, [route('r', 'm', 'p', { outcome: 'failed', errorCode, errorMessage: 'secret-key=123', body: 'sensitive data' })])).rows[0];
    assert.equal(row.reason, '生成验证失败'); assert(!JSON.stringify(row).includes('secret-key')); assert(!row.billingAlert);
  }
});

test('exception-first routes support real supplier, status and text filters and reset', () => {
  const payload = data([model('m')], [route('good', 'm'), route('off', 'm', 'p', { enabled: false }), route('unknown', 'm', 'q', { checkedAt: null }), route('slow', 'm', 'q', { latency: latency() }), route('failed', 'm', 'q', { outcome: 'failed' })], [provider('p'), provider('q')]);
  const { c } = component(payload); c.openModelStatus();
  let view = c.modelStatusValues(); assert.deepEqual(Array.from(view.rows, row => row.id), ['failed', 'slow', 'unknown', 'good']);
  view.onProvider({ target: { value: 'q' } }); assert.equal(c.modelStatusValues().rows.length, 3);
  view.onFilter({ target: { value: 'attention' } }); assert.equal(c.modelStatusValues().rows.length, 2);
  view.onQuery({ target: { value: 'missing' } }); assert(!c.modelStatusValues().hasRows);
  view.reset(); view.onFilter({ target: { value: 'inactive' } }); assert.equal(c.modelStatusValues().rows[0].id, 'off');
  view.reset(); view.onFilter({ target: { value: 'available' } }); assert.equal(c.modelStatusValues().rows.length, 2);
  view.reset(); view.onFilter({ target: { value: 'unknown' } }); assert.equal(c.modelStatusValues().rows[0].id, 'unknown');
});

test('overview opens dedicated details, sidebar stays in overview, and back returns', () => {
  const { c } = component(data()); c.renderVals().over.stats[4].go();
  const view = c.renderVals(); assert.equal(c.state.view, 'models'); assert(view.modelStatus.open); assert(!view.isOverview && !view.showSubNav && !view.isRuns);
  assert.equal(view.sidebar.overviewCurrent, 'page'); assert.equal(view.sidebar.productionCurrent, 'false');
  view.modelStatus.back(); assert.equal(c.state.view, 'overview'); assert(!c.modelStatusValues().open);
});

test('freshness expires while the page is open and interval is cleaned up', () => {
  const harness = component(data()), { c } = harness; c.openModelStatus(); c.mountModelStatusClock(); c.mountModelStatusClock();
  assert.equal(c.modelStatusSnapshot().rate, 100); const before = harness.changes;
  harness.advance(300001); assert(harness.changes > before); assert.equal(c.modelStatusSnapshot().rate, '—');
  c.setState({ view: 'runs' }); const background = harness.changes; harness.advance(15000); assert.equal(harness.changes, background);
  c.unmountModelStatusClock(); c.unmountModelStatusClock(); assert.equal(harness.cleared, 1);
});

test('native controls, labelled metrics, empty states and safe evidence rendering are present', () => {
  const html = template.match(/<!-- model-status:start -->[\s\S]*?<!-- model-status:end -->/)[0];
  assert.match(html, /id="forge-model-title" tabindex="-1"/); assert.match(html, /class="forge-model-table forge-model-routes-table" role="table"/); assert.match(html, /<dl class="forge-model-drawer-metrics">/);
  assert.match(html, /线路配置与验证/); assert.match(html, /modelStatus\.selected\.protocolPath/); assert.match(html, /modelStatus\.selected\.routeState/); assert.match(html, /modelStatus\.selected\.verificationLabel/);
  assert.match(html, /验证结果用于判断线路可用性，不会自动修改启用或路由配置/);
  assert.match(html, /role="dialog"/); assert.match(html, /data-chart="model-trend"/); assert.match(html, /aria-label="模型供应商筛选"/);
  assert.doesNotMatch(html, /forge-model-demo-badge/);
  assert.match(html, /模型监控待接入/); assert.match(html, /页面不会自动切换生产线路/); assert(!html.includes('innerHTML')); assert(!html.includes('80%')); assert(!html.includes('重测</button>'));
  const methods = fs.readFileSync(new URL('./templates/model-status-methods.js', import.meta.url), 'utf8');
  assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(methods));
});

test('route drawer summarizes protocol, production state and recent verification', () => {
  const payload = data(undefined, [
    route('ready', 'm'),
    route('failed', 'm', 'p', { outcome: 'failed' }),
    route('stopped', 'm', 'p', { enabled: false }),
    route('mismatch', 'm', 'p', { protocol: 'openai-chat' })
  ]);
  const { c } = component(payload); c.openModelStatus();
  c.setState({ modelRoute: 'ready' }); let view = c.modelStatusValues();
  assert.equal(view.selected.protocol, 'Anthropic Messages'); assert.equal(view.selected.protocolPath, '/v1/messages');
  assert.equal(view.selected.routeState, '已启用 · 可路由'); assert.equal(view.selected.verificationLabel, '通过');
  view.closeDrawer(); c.setState({ modelRoute: 'failed' }); view = c.modelStatusValues();
  assert.equal(view.selected.verificationLabel, '失败'); assert.equal(view.selected.verificationTone, 'danger');
  view.closeDrawer(); c.setState({ modelRoute: 'stopped' }); view = c.modelStatusValues();
  assert.equal(view.selected.routeState, '已停用'); assert.equal(view.selected.routeStateTone, 'muted');
  view.closeDrawer(); c.setState({ modelRoute: 'mismatch' }); view = c.modelStatusValues();
  assert.equal(view.selected.protocolPath, '/v1/chat/completions'); assert.equal(view.selected.routeState, '已启用 · 协议不匹配');
});

test('benchmark-only evidence is consolidated into the model-lines table', () => {
  const html = template.match(/<!-- model-status:start -->[\s\S]*?<!-- model-status:end -->/)[0];
  for (const label of ['线路 / 标记', '稳定性']) assert(html.includes(label));
  assert.match(html, /class="forge-model-route-badges"[\s\S]*line\.routeBadges/);
  assert.match(html, /class="forge-model-stability" data-tone="{{ line\.stabilityTone }}"/);
  assert(!html.includes('Benchmark 结果'));
  assert(!html.includes('forge-model-line-comparison'));
  assert(!html.includes('modelStatus.comparisonRows'));
  assert.match(modelStyles, /\.forge-model-route-badges\{[^}]*display:flex[^}]*flex-wrap:wrap/);
});

test('overview sections use a consistent vertical rhythm', () => {
  assert.match(modelStyles, /\.forge-model-overview\+\.forge-model-table-section\{margin-top:28px\}/);
  assert.match(modelStyles, /\.forge-model-error-summary\{margin-top:28px\}/);
  assert.match(modelStyles, /\.forge-model-error-list button\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(modelStyles, /\.forge-model-error-bar\{[^}]*position:absolute/);
  assert.match(modelStyles, /\.forge-model-lines-section\{margin-top:24px\}/);
  assert.match(modelStyles, /\.forge-model-lines-section>\.forge-model-filters\{margin:0 0 14px\}/);
});

test('model and existing creation generators remain idempotent', () => {
  assert.equal(updateModelStatus(source), source);
  assert.equal(updateDeliverySkillWorkspace(source), source);
  assert.equal(template.split('this.mountModelStatusClock();').length, 2);
  assert.equal(template.split('this.unmountModelStatusClock();').length, 2);
});

test('conflicting route, model and provider IDs are quarantined independently of record order', () => {
  for (const field of ['routes', 'models', 'providers']) {
    const first = data(), second = data();
    const conflicting = field === 'routes' ? route('r', 'm', 'p', { outcome: 'failed' }) : field === 'models' ? model('m', { enabled: false }) : provider('p', { billing: { status: 'arrears', checkedAt: NOW } });
    first[field].push(conflicting); second[field].unshift(conflicting);
    const a = snap(first), b = snap(second);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), field);
    assert.equal(a.rate, '—'); assert.equal(a.available, 0); assert.equal(a.rows[0].availability, '状态未知'); assert.equal(a.attention, 0);
    assert(a.rows[0].uncertain); assert.match(a.rows[0].reason, /目录记录冲突/);
    const { c } = component(first); c.openModelStatus(); assert.equal(c.modelStatusValues().rows.length, 1);
    c.modelStatusValues().onFilter({ target: { value: 'unknown' } }); assert.equal(c.modelStatusValues().rows.length, 1);
    c.modelStatusValues().onFilter({ target: { value: 'available' } }); assert.equal(c.modelStatusValues().rows.length, 0);
  }
});

test('billing disagreement preserves both account and call observations with independent times', () => {
  const payload = data(undefined, [route('r', 'm', 'p', { outcome: 'failed', errorCode: 'insufficient_balance' })], [provider('p', { billing: { status: 'ok', checkedAt: NOW - 2000 } })]);
  const row = snap(payload).rows[0];
  assert.equal(row.billingLabel, '计费结果不一致'); assert(row.billingAlert && row.billingConflict);
  assert.match(row.billingEvidence, /账户数据：正常/); assert.match(row.billingEvidence, /调用返回：余额不足/);
  assert(row.billingEvidence.includes(new Date(NOW - 2000).toLocaleString('zh-CN', { hour12: false })));
  assert(row.billingEvidence.includes(new Date(NOW - 1000).toLocaleString('zh-CN', { hour12: false })));
  assert.match(row.nextStep, /核对两个来源的时间和账户映射/);
});

test('missing, expired, invalid and future evidence have distinct timestamp labels and guidance', () => {
  for (const [checkedAt, label] of [[undefined, '待检测'], [NOW - 300001, '检测已过期'], ['invalid', '时间待校验'], [-1e20, '时间待校验'], [NOW + 1, '时间待校验']]) {
    const payload = data(undefined, [route('r', 'm', 'p', { latency: latency({ checkedAt }), quality: quality({ checkedAt }) })], [provider('p', { billing: { status: 'ok', checkedAt } })]);
    const row = snap(payload).rows[0]; assert.equal(row.latencyLabel, label); assert.equal(row.qualityLabel, label);
    assert.equal(row.billingLabel, label === '待检测' ? '未接入' : label); assert(!row.slow && !row.regressed && !row.billingAlert);
    if (label === '时间待校验') {
      assert.equal(row.latencyChecked, label); assert.equal(row.qualityChecked, label); assert.match(row.billingEvidence, /时间待校验/); assert.match(row.nextStep, /时间戳与客户端时钟/);
    }
  }
  const payload = data(); payload.catalogCheckedAt = NOW + 1; assert.match(snap(payload).issue, /时间待校验/);
  payload.catalogCheckedAt = 'bad'; assert.match(snap(payload).issue, /时间待校验/);
  const row = snap(data(undefined, [route('r', 'm', 'p', { checkedAt: NOW + 1 })])).rows[0];
  assert.equal(row.availability, '状态未知'); assert.match(row.reason, /时间待校验/); assert(!row.reason.includes('已过期'));
});

test('missing monitoring shows a labelled, stable synthetic dashboard without changing the live snapshot', () => {
  const { c } = component(); c.openModelStatus();
  const view = c.modelStatusValues();
  assert(view.isDemo && view.connected && view.hasRows && !view.hasSelection);
  assert.equal(view.sourceLabel, '示例数据'); assert.equal(view.total, 5);
  assert.equal(view.rows.length, 8); assert.equal(view.allLines.length, 8);
  assert.equal(view.chips.find(v => v.id === 'production').count, 8);
  assert.equal(view.chips.find(v => v.id === 'normal').count, 3);
  assert.equal(view.chips.find(v => v.id === 'severe').count, 2);
  assert.equal(view.chips.find(v => v.id === 'performance').count, 2);
  assert.equal(view.chips.find(v => v.id === 'quality').count, 1);
  assert.equal(view.chips.find(v => v.id === 'billing').count, 1);
  assert.equal(view.anomalySummary, '4 条线路存在异常 · 5 个待处理问题');
  assert.equal(c.modelStatusSnapshot().kind, 'disconnected');
  assert.equal(JSON.stringify(c.modelDemoInput()), JSON.stringify(c.modelDemoInput()));
  view.sourceToggle(); assert(c.modelStatusValues().disconnected); assert(!c.modelStatusValues().isDemo);
  c.modelStatusValues().sourceToggle(); assert(c.modelStatusValues().isDemo);
});

test('live loading, failure and incomplete sources never fall back to synthetic results', () => {
  for (const payload of [{ status: 'loading' }, { status: 'error' }, data([], [])]) {
    const { c } = component(payload); c.openModelStatus(); const view = c.modelStatusValues();
    assert(!view.isDemo); assert.equal(view.allLines.length, 0); assert(!view.hasSelection);
  }
});

test('synthetic line table keeps performance, quality, billing and business evidence distinct', () => {
  const { c } = component(); c.openModelStatus(); const view = c.modelStatusValues();
  const severe = view.rows.find(row => row.id === 'production-02');
  assert.equal(severe.status, '严重'); assert.equal(severe.latencyValue, '11.91s'); assert.equal(severe.taskTime, '18.6s'); assert.equal(severe.failure, '7.0%'); assert.equal(severe.stability, '高风险');
  assert.equal(severe.impactMain, '2 个运行任务'); assert.equal(severe.action, '联系供应商');
  const recommended = view.rows.find(row => row.id === 'official-sonnet');
  assert.deepEqual(Array.from(recommended.routeBadges, badge => badge.label), ['推荐线路', '最快线路', '质量最佳']);
  const drift = view.rows.find(row => row.id === 'proxy-03');
  assert.equal(drift.qualityTitle, '质量漂移'); assert.match(drift.qualityDetail, /Benchmark/);
  const mismatch = view.rows.find(row => row.id === 'proxy-07');
  assert.equal(mismatch.qualityTitle, '疑似模型不一致'); assert.match(mismatch.qualityDelta, /18%/);
  const billing = view.rows.find(row => row.id === 'official-opus');
  assert.equal(billing.status, '余额不足'); assert.equal(billing.action, '去充值');
});

test('issue, supplier, model, line, business and query filters work together', () => {
  const { c } = component(); c.openModelStatus(); let view = c.modelStatusValues();
  view.chips.find(v => v.id === 'performance').select(); view = c.modelStatusValues();
  assert.equal(view.rows.length, 2); assert(!view.drawerOpen);
  view.onQuery({ target: { value: 'missing' } }); view = c.modelStatusValues();
  assert(!view.hasRows && !view.hasSelection);
  view.reset(); view = c.modelStatusValues(); view.onProvider({ target: { value: 'qinghe' } });
  assert.equal(c.modelStatusValues().rows.length, 2);
  c.modelStatusValues().onFilter({ target: { value: 'quality' } });
  view = c.modelStatusValues(); assert.equal(view.rows.length, 1); assert.equal(view.rows[0].id, 'proxy-03');
  view.rows[0].select(); view = c.modelStatusValues(); assert(view.drawerOpen); assert.equal(view.selected.id, 'proxy-03');
  view.closeDrawer(); view = c.modelStatusValues(); view.reset(); view = c.modelStatusValues();
  view.onModel({ target: { value: 'gpt-41' } }); assert.equal(c.modelStatusValues().rows.length, 2);
  c.modelStatusValues().onLine({ target: { value: 'official-gpt' } }); assert.equal(c.modelStatusValues().rows.length, 1);
  c.modelStatusValues().reset(); c.modelStatusValues().onBusiness({ target: { checked: true } }); assert.equal(c.modelStatusValues().rows.length, 7);
});

test('risk notice is dismissible and line filters sit below a static table heading', () => {
  const { c } = component(); c.openModelStatus(); c.setState({ modelPageTab: 'lines' });
  let view = c.modelStatusValues(); assert(view.riskVisible); view.dismissRisk(); view = c.modelStatusValues(); assert(!view.riskVisible);
  const html = template.match(/<!-- model-status:start -->[\s\S]*?<!-- model-status:end -->/)[0];
  assert(html.includes('aria-label="关闭风险提醒"')); assert(!html.includes('modelStatus.issueActionLabel')); assert(!html.includes('modelStatus.showIssues'));
  assert(html.includes('disabled="{{ !modelStatus.hasFilters }}"'));
  for (const id of ['forge-model-status-filter', 'forge-model-provider-filter', 'forge-model-model-filter', 'forge-model-line-filter']) assert(html.includes('id="' + id + '"'));
  const linesSection = html.match(/<section class="forge-model-table-section forge-model-lines-section">[\s\S]*?<\/section>/)[0];
  assert(linesSection.indexOf('id="forge-model-table-title"') < linesSection.indexOf('class="forge-model-filters"'));
  assert(linesSection.indexOf('class="forge-model-filters"') < linesSection.indexOf('class="forge-model-table-scroll"'));
  for (const label of ['筛选状态', '筛选模型供应商', '筛选模型', '筛选线路']) assert(!linesSection.includes('aria-label="' + label + '"'));
  for (const label of ['状态 / 时间', '模型供应商', '模型']) assert(linesSection.includes('<span>' + label + '</span>'));
  assert(linesSection.includes('<span>线路 / 标记</span>'));
});

test('line filters use a full-width search and content-sized select controls', () => {
  assert.match(modelStyles, /\.forge-model-search\{[^}]*flex:1 0 100%[^}]*width:100%[^}]*max-width:none/);
  assert.match(modelStyles, /\.forge-model-filters select\{[^}]*width:auto[^}]*field-sizing:content/);
  for (const selector of ['provider', 'model', 'line', 'status']) assert(!modelStyles.includes('.forge-model-' + selector + '-filter select{width:'));
  assert.match(modelStyles, /\.forge-model-link:disabled\{[^}]*cursor:not-allowed/);
  assert.match(template, /id="forge-model-time-filter" aria-label="问题时间筛选"/);
  assert.match(template, /type="datetime-local" aria-label="问题开始时间"/);
  assert.match(template, /type="datetime-local" aria-label="问题结束时间"/);
});

test('problem-time presets and custom bounds narrow lines by first observation and reset cleanly', () => {
  const { c } = component(); c.openModelStatus(); let view = c.modelStatusValues();
  view.onFilter({ target: { value: 'attention' } }); view = c.modelStatusValues(); assert.equal(view.rows.length, 5);
  view.onTimeRange({ target: { value: '1h' } }); view = c.modelStatusValues(); assert.equal(view.rows.length, 1); assert.equal(view.rows[0].id, 'official-opus');
  view.onTimeRange({ target: { value: '24h' } }); view = c.modelStatusValues(); assert.equal(view.rows.length, 5);
  view.onTimeRange({ target: { value: 'custom' } }); view.onTimeStart({ target: { value: '2026-09-03T10:00' } }); view = c.modelStatusValues(); view.onTimeEnd({ target: { value: '2026-09-02T10:00' } }); view = c.modelStatusValues();
  assert(view.timeRangeInvalid); assert.equal(view.rows.length, 0); assert(view.hasFilters);
  view.reset(); view = c.modelStatusValues(); assert.equal(view.timeRange, 'all'); assert.equal(view.timeStart, ''); assert.equal(view.timeEnd, ''); assert.equal(view.rows.length, 8); assert(!view.hasFilters);
});

test('model filters intersect in any selection order without clearing other dimensions', () => {
  const permute = values => values.length ? values.flatMap((value, index) => permute(values.filter((_, i) => i !== index)).map(rest => [value, ...rest])) : [[]];
  const { c } = component(); c.openModelStatus();
  const target = c.modelStatusValues().allLines.find(line => line.id === 'production-02');
  const controls = [['onLine', target.id], ['onModel', target.modelId], ['onProvider', target.providerId], ['onFilter', 'severe']];
  for (const sequence of permute(controls)) {
    c.modelStatusValues().reset();
    c.modelStatusValues().onQuery({ target: { value: 'Claude' } });
    c.modelStatusValues().onBusiness({ target: { checked: true } });
    for (const [control, value] of sequence) c.modelStatusValues()[control]({ target: { value } });
    const view = c.modelStatusValues();
    assert.equal(view.line, target.id); assert.equal(view.model, target.modelId); assert.equal(view.provider, target.providerId); assert.equal(view.filter, 'severe');
    assert.equal(view.query, 'Claude'); assert(view.businessOnly); assert.equal(view.rows.length, 1); assert.equal(view.rows[0].id, target.id);
  }
});

test('incompatible filter combinations stay selected and recover by changing just one dimension', () => {
  const { c } = component(); c.openModelStatus();
  const target = c.modelStatusValues().allLines.find(line => line.id === 'production-02');
  c.modelStatusValues().onLine({ target: { value: target.id } });
  c.modelStatusValues().onModel({ target: { value: target.modelId } });
  c.modelStatusValues().onProvider({ target: { value: 'qinghe' } });
  let view = c.modelStatusValues(); assert(!view.hasRows); assert.equal(view.model, target.modelId); assert.equal(view.line, target.id);
  view.onProvider({ target: { value: target.providerId } }); view = c.modelStatusValues(); assert.equal(view.rows.length, 1);
  view.onModel({ target: { value: 'gpt-41' } }); view = c.modelStatusValues(); assert(!view.hasRows); assert.equal(view.provider, target.providerId); assert.equal(view.line, target.id);
  view.onModel({ target: { value: target.modelId } }); view = c.modelStatusValues(); assert.equal(view.rows.length, 1);
  view.chips.find(chip => chip.id === 'normal').select(); view = c.modelStatusValues(); assert(!view.hasRows); assert.equal(view.line, target.id);
  view.chips.find(chip => chip.id === 'severe').select(); view = c.modelStatusValues(); assert.equal(view.rows.length, 1);
  view.reset(); view = c.modelStatusValues(); assert.equal(view.rows.length, 8); assert(!view.hasFilters);
});

test('combined model filters survive URL round trips, including a selected diagnostic drawer', () => {
  const core = fs.readFileSync(new URL('./templates/routing-core.js', import.meta.url), 'utf8');
  const codec = vm.runInNewContext(core + ';ForgeRoutes;', { URL, URLSearchParams });
  const { c } = component(); c.openModelStatus();
  const target = c.modelStatusValues().allLines.find(line => line.id === 'production-02');
  c.modelStatusValues().onLine({ target: { value: target.id } }); c.modelStatusValues().onModel({ target: { value: target.modelId } }); c.modelStatusValues().onProvider({ target: { value: target.providerId } });
  c.modelStatusValues().onOverviewWindow({ target: { value: '7d' } });
  c.modelStatusValues().onFilter({ target: { value: 'severe' } }); c.modelStatusValues().onTimeRange({ target: { value: '24h' } }); c.modelStatusValues().rows[0].select();
  const route = codec.write(c.state), parsed = codec.read(route);
  assert.equal(parsed.error, ''); const { c: restored } = component(); restored.setState(parsed.patch);
  const view = restored.modelStatusValues(); assert.equal(view.rows.length, 1); assert.equal(view.line, target.id); assert.equal(view.provider, target.providerId); assert.equal(view.model, target.modelId); assert.equal(view.filter, 'severe'); assert.equal(view.timeRange, '24h'); assert.equal(view.overviewWindow, '7d'); assert.match(route, /period=24h/); assert.match(route, /window=7d/); assert(view.drawerOpen);
});

test('alert reasons filter explicit current failures and remain independent of severity', () => {
  const categories = [
    ['insufficient_balance', 'supplier_balance', '供应商余额不足'],
    ['key_unavailable', 'key_unavailable', 'Key 暂时不可用'],
    ['account_shortage', 'account_shortage', '供应商账号紧缺'],
    ['downstream_error', 'downstream_error', '下游供应商报错']
  ];
  const payload = data(undefined, categories.map(([errorCode], i) => route('r' + i, 'm', 'p', { outcome: 'failed', errorCode })));
  const { c } = component(payload); c.openModelStatus();
  for (const [errorCode, filter, label] of categories) {
    c.modelStatusValues().onFilter({ target: { value: filter } });
    const view = c.modelStatusValues();
    assert.equal(view.rows.length, 1); assert.equal(view.rows[0].raw.errorCode, errorCode);
    assert.equal(view.rows[0].status, '调用失败'); assert.equal(view.rows[0].alertReason, label);
    view.rows[0].select(); assert.equal(c.modelStatusValues().reason, label);
  }
  c.modelStatusValues().reset(); assert.equal(c.modelStatusValues().rows.length, 4);
});

test('stale, inactive, uncertain and ambiguous failures do not invent supplier causes', () => {
  const variants = [
    { checkedAt: NOW - 300001 }, { checkedAt: NOW + 1 }, { enabled: false }, { routable: false },
    { outcome: 'passed' }, { errorCode: 'timeout' }, { errorCode: 'no_available_channel' },
    { errorCode: '__proto__' }, { errorCode: 'sk-secret-from-raw-message' }
  ];
  for (const extra of variants) {
    const { c } = component(data(undefined, [route('r', 'm', 'p', { outcome: 'failed', errorCode: 'key_unavailable', ...extra })]));
    c.openModelStatus(); assert.equal(c.modelStatusValues().allLines[0].alertReasons.length, 0);
    c.modelStatusValues().onFilter({ target: { value: 'key_unavailable' } }); assert(!c.modelStatusValues().hasRows);
  }
  const payload = data(undefined, [route('r', 'm', 'p', { outcome: 'failed', errorCode: 'account_shortage' })]);
  payload.routes.push(route('r', 'm', 'p', { outcome: 'passed' }));
  const { c } = component(payload); c.openModelStatus(); assert(c.modelStatusValues().allLines.every(line => !line.alertReasons.length));
});

test('balance and call reasons can overlap without losing either filter', () => {
  const payload = data(undefined, [route('r', 'm', 'p', { outcome: 'failed', errorCode: 'key_unavailable' })], [provider('p', { billing: { status: 'balance_low', checkedAt: NOW - 1000 } })]);
  const { c } = component(payload); c.openModelStatus();
  for (const filter of ['supplier_balance', 'key_unavailable']) {
    c.modelStatusValues().onFilter({ target: { value: filter } }); assert.equal(c.modelStatusValues().rows.length, 1);
  }
  payload.providers[0].billing.checkedAt = NOW - 300001;
  c.modelStatusValues().onFilter({ target: { value: 'supplier_balance' } }); assert(!c.modelStatusValues().hasRows);
});

test('demo alarm reasons support combined filters, search, reset and URL round trips', () => {
  const core = fs.readFileSync(new URL('./templates/routing-core.js', import.meta.url), 'utf8');
  const codec = vm.runInNewContext(core + ';ForgeRoutes;', { URL, URLSearchParams });
  for (const filter of ['supplier_balance', 'key_unavailable', 'account_shortage', 'downstream_error']) {
    const { c } = component(); c.openModelStatus();
    c.modelStatusValues().onFilter({ target: { value: filter } });
    const target = c.modelStatusValues().rows[0]; assert(target, filter);
    c.modelStatusValues().onProvider({ target: { value: target.providerId } });
    c.modelStatusValues().onModel({ target: { value: target.modelId } });
    c.modelStatusValues().onLine({ target: { value: target.id } });
    c.modelStatusValues().onQuery({ target: { value: target.alertReason.split(' · ')[0] } });
    c.modelStatusValues().rows[0].select();
    const { c: restored } = component(); restored.setState(codec.read(codec.write(c.state)).patch);
    const view = restored.modelStatusValues();
    assert.equal(view.rows.length, 1); assert.equal(view.rows[0].id, target.id); assert.equal(view.filter, filter); assert(view.drawerOpen);
    view.onProvider({ target: { value: 'missing-provider' } }); assert(!restored.modelStatusValues().hasRows);
    restored.modelStatusValues().reset(); assert.equal(restored.modelStatusValues().rows.length, 8);
  }
});

test('two-tab information architecture keeps route comparison evidence in the lines table', () => {
  const { c } = component(); c.openModelStatus();
  let view = c.modelStatusValues();
  assert.equal(view.pageTabs.map(tab => tab.label).join('|'), '运行概览|模型线路');
  view.pageTabs[1].pick(); view = c.modelStatusValues(); assert(view.linesTab);
  c.setState({ modelPageTab: 'compare' }); assert(c.modelStatusValues().linesTab);
  const postmanSource = fs.readFileSync(new URL('../public/forge-postman.html', import.meta.url), 'utf8');
  const postman = JSON.parse(postmanSource.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
  for (const variant of [template, postman]) {
    const html = variant.match(/<!-- model-status:start -->[\s\S]*?<!-- model-status:end -->/)[0];
    for (const label of ['运行概览', '模型线路', '线路 / 标记', '稳定性']) assert(html.includes(label));
    assert(!html.includes('modelStatus.compareTab'));
    assert(!html.includes('Benchmark 结果'));
    assert(html.includes('仅看有业务影响')); assert(!html.includes('forge-model-sort')); assert(!html.includes('modelStatus.onSort'));
    for (const control of ['onProvider', 'onModel', 'onLine', 'onFilter', 'onQuery']) assert(html.includes('modelStatus.' + control));
    assert(html.includes('modelStatus.onBusiness'));
    for (const term of ['Forge Canary v3', 'Prompt', '参数', '并发', '超时', '重试策略']) assert(html.includes(term));
    assert(html.includes('不会自动切换生产线路'));
    const css = variant.match(/\/\* model-status:start \*\/[\s\S]*?\/\* model-status:end \*\//)[0];
    const navigation = css.match(/\.forge-model-issue-filters\{([^}]+)\}/)[1];
    assert.match(navigation, /display:grid/); assert.match(navigation, /repeat\(6,minmax\(0,1fr\)\)/); assert.match(navigation, /overflow:visible/);
    assert.match(css, /@container forge-model-health \(max-width:760px\)\{\.forge-model-issue-filters\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
    assert.match(css, /@container forge-model-health \(max-width:420px\)\{\.forge-model-issue-filters\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
    assert.match(css, /\.forge-model-filters\{[^}]*flex-wrap:wrap/);
    assert.doesNotMatch(css, /\.forge-model-issue-filters[^{}]*\{[^}]*(?:overflow(?:-x|-y)?:auto|scrollbar-width|min-width:(?:112|120)px)/);
  }
});

test('blocked calls have no fake zero latency or zero quality and expose explicit billing evidence', () => {
  const payload = data(undefined, [route('blocked', 'm', 'p', { outcome: 'failed', errorCode: 'insufficient_balance', usage: { calls: 1, failures: 1, costUsd: 0, checkedAt: NOW } })], [provider('p', { billing: { status: 'arrears', balanceUsd: 0, hourlySpendUsd: 1, checkedAt: NOW } })]);
  const { c } = component(payload); c.openModelStatus(); const line = c.modelStatusValues().rows[0];
  assert.equal(line.latencyValue, '—'); assert.equal(line.qualityValue, '—'); assert.equal(line.failure, '100.0%'); assert.equal(line.balance, '$0');
  assert.match(line.reason, /余额不足/); line.select(); const view = c.modelStatusValues(); assert(view.drawerOpen); assert(!view.hasTrend);
});

test('chart point inspection, route switching and simulated retests stay local and labelled', () => {
  const { c, advance } = component(); c.openModelStatus(); let view = c.modelStatusValues();
  view.rows.find(row => row.id === 'production-02').select(); view = c.modelStatusValues();
  assert.equal(view.chartPoints.length, 12); view.chartPoints[11].show(); assert.match(c.modelStatusValues().chartReadout, /11\.91s/);
  view.chartPoints[11].hide(); assert.match(c.modelStatusValues().chartReadout, /最近 1 小时/);
  view.metricTabs.find(tab => tab.id === 'errors').select(); view = c.modelStatusValues(); assert.equal(view.trendTitle, '错误率 趋势');
  view.openRetest(); view = c.modelStatusValues(); assert(view.drawerTest); const before = JSON.stringify(c.props);
  advance(2000); view.runComparison(); view = c.modelStatusValues(); assert(view.testResult); assert.equal(JSON.stringify(c.props), before); assert.match(view.message, /未发起真实调用/);
});

test('unknown, stale and malformed usage cannot produce healthy failure rates or fabricated costs', () => {
  for (const usage of [undefined, { calls: 100, failures: 3, costUsd: 5, checkedAt: NOW - 300001 }, { calls: 2, failures: 3, costUsd: 5, checkedAt: NOW }]) {
    const { c } = component(data(undefined, [route('r', 'm', 'p', { usage })])); c.openModelStatus();
    const view = c.modelStatusValues(); assert.equal(view.rows[0].failure, '—'); assert.equal(view.rows[0].cost, '—'); assert.equal(view.totalCost, '—');
  }
});

test('dashboard and snapshot share validated freshness and timestamp boundaries', () => {
  const payloadAt = checkedAt => data(undefined, [route('r', 'm', 'p', { usage: { calls: 100, failures: 1, costUsd: 1, checkedAt } })], [provider('p', { billing: { status: 'ok', balanceUsd: 42, hourlySpendUsd: 1, checkedAt } })]);
  for (const freshnessMs of [Infinity, NaN, -1, 0, 999, 86400001, '86400000']) {
    const payload = payloadAt(NOW - 600000); payload.freshnessMs = freshnessMs;
    const { c } = component(payload); c.openModelStatus(); const view = c.modelStatusValues();
    assert.equal(c.modelStatusSnapshot().rows[0].billingLabel, '检测已过期');
    assert.equal(view.rows[0].cost, '—'); assert.equal(view.rows[0].balance, '—');
  }
  for (const checkedAt of [undefined, null, '', '  ', false, [], new Date(NOW), 'bad', Infinity, NOW + 1]) {
    const { c } = component(payloadAt(checkedAt)); c.openModelStatus(); const view = c.modelStatusValues();
    assert.equal(view.totalCost, '—'); assert.equal(view.rows[0].balance, '—');
  }
  for (const checkedAt of [NOW - 300000, new Date(NOW - 300000).toISOString()]) {
    const { c } = component(payloadAt(checkedAt)); c.openModelStatus(); const view = c.modelStatusValues();
    assert.equal(view.totalCost, '$1'); assert.equal(view.rows[0].balance, '$42');
  }
});

test('mixed total-time and first-token P95s are incomparable while individual routes retain accurate labels', () => {
  const payload = data(undefined, [route('total', 'm', 'p', { latency: latency() }), route('first', 'm', 'p', { latency: latency({ metric: 'ttft_p95', currentMs: 1800 }) })]);
  const { c } = component(payload); c.openModelStatus(); let view = c.modelStatusValues();
  assert.equal(view.groups[0].latency, '—');
  const total = view.rows.find(row => row.id === 'total'), first = view.rows.find(row => row.id === 'first');
  assert.equal(total.latencyValue, '4.60s'); assert.equal(first.latencyValue, '1.80s');
  total.select(); view = c.modelStatusValues(); assert.equal(view.selected.id, 'total'); assert.equal(view.trendTitle, 'P95 TTFT 趋势');
  payload.routes[1].latency.metric = 'total_p95';
  const sameComponent = component(payload).c; sameComponent.openModelStatus();
  const same = sameComponent.modelStatusValues(); assert.equal(same.groups[0].latency, '4.60 s');
});

test('billing, supplier follow-up and local mitigation actions are explicit and non-destructive', () => {
  const { c } = component(); c.openModelStatus(); let view = c.modelStatusValues();
  view.rows.find(row => row.id === 'official-opus').primary(); view = c.modelStatusValues();
  assert(view.drawerBilling); assert.equal(view.backupLabel, '未配置'); assert.equal(view.billingThreshold, '$50');
  view.closeBilling(); view.closeDrawer(); view = c.modelStatusValues();
  view.rows.find(row => row.id === 'production-02').primary(); view = c.modelStatusValues();
  assert(view.drawerDiagnostic && view.noteOpen); assert.match(view.note, /模拟数据/); assert.match(view.note, /production-02/);
  view.switchRoute(); assert.match(c.modelStatusValues().message, /未修改生产路由/);
});
