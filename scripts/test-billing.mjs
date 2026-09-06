import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateBilling } from './update-billing.mjs';
import { updateModelStatus } from './update-model-status.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const themeTokens = fs.readFileSync(new URL('../public/postman-ui/tokens.css', import.meta.url), 'utf8');
const forgeSystem = fs.readFileSync(new URL('../public/postman-ui/forge-system.css', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const NOW = Date.parse('2026-09-03T12:00:00+08:00');
function component(billingUsage, now = NOW, extraProps = {}) {
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    Date: class extends Date { static now() { return now; } },
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', billingUsage, ...extraProps }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}
const event = (id, extra = {}) => ({ id, occurredAt: '2026-09-02T10:15:00+08:00', projectId: 'project-a', projectName: '项目 A', providerId: 'vendor-a', providerName: '供应商 A', brandId: 'brand-a', brandName: '品牌 A', modelId: 'model-a', modelName: '型号 A', inputTokens: 1000, outputTokens: 250, costMicros: 2500000, ...extra });
const ledger = (events = [event('one')]) => ({ status: 'ready', currency: 'USD', complete: true, events });
const values = input => { const c = component(input); c.openBilling(); return c; };

test('billing chart uses the centralized Forge chart sequence', () => {
  const expected = ['#635bff', '#4384d8', '#2f9788', '#8b6bc0', '#c66a8b', '#728096'];
  expected.forEach((color, index) => assert(themeTokens.includes(`--pm-chart-${index + 1}:${color}`)));
  assert.match(template, /const colors=\['var\(--pm-chart-1\)'[\s\S]*'var\(--pm-chart-6\)'\]/);
});

test('time granularity is a secondary unfilled control while metrics retain their segment', () => {
  assert(template.includes('class="forge-billing-granularity" role="group" aria-label="时间粒度"'));
  assert(template.includes('class="forge-billing-segment" role="group" aria-label="趋势指标"'));
  assert.match(template, /<section class="forge-billing-distribution"[^>]*>\s*<header><h2[^>]*>\{\{ billing\.chartTitle \}\}<\/h2><\/header>\s*<div class="forge-billing-chart">\s*<div class="forge-billing-chart-controls">/);
  assert.doesNotMatch(template, /<small>\{\{ billing\.period \}\} · \{\{ billing\.unit \}\}<\/small>/);
  assert.match(template, /class="forge-billing-custom-time"[^>]*aria-haspopup="dialog"[^>]*aria-controls="forge-billing-calendar"[^>]*aria-label="选择自定义时间范围"/);
  assert.doesNotMatch(template, /class="forge-billing-custom-time"[^>]*aria-pressed/);
  assert.doesNotMatch(template, /\{\{ billing\.period \}\}<br>\{\{ billing\.timezoneLabel \}\} · 包含结束日期/);
  assert.doesNotMatch(template, /class="forge-billing-filters"|class="forge-billing-date-trigger"/);
  assert.match(template, /\.forge-billing-custom-time\{anchor-name:--billing-calendar\}/);
  assert.match(template, /#forge-billing-calendar\{position-anchor:--billing-calendar;top:anchor\(bottom\);left:auto;right:anchor\(right\)/);
  assert.match(template, /\.forge-billing-chart-controls\{[^}]*justify-content:flex-start[^}]*width:100%[^}]*margin-bottom:12px/);
  assert.match(template, /\.forge-billing-chart-controls>\.forge-billing-granularity\{margin-left:auto\}/);
  assert.match(template, /\.forge-billing-chart-controls\{flex-direction:column;align-items:stretch;gap:8px\}\.forge-billing-granularity\{align-self:flex-end\}/);
  assert.match(template, /\.forge-billing-distribution>header\{display:block;margin-bottom:8px\}/);
  assert.match(template, /\.forge-billing-granularity\{[^}]*background:transparent/);
  assert.match(template, /\.forge-billing \.forge-billing-granularity button\{[^}]*background:transparent;box-shadow:none/);
  assert.match(template, /\.forge-billing \.forge-billing-granularity button\[aria-pressed="true"\]\{[^}]*text-decoration:underline/);
  assert.match(template, /\.forge-billing \.forge-billing-granularity button\.forge-billing-custom-time\{[^}]*color:var\(--forge-muted\);font-weight:400;text-decoration:none/);
  assert.match(template, /\.forge-billing \.forge-billing-granularity button:is\(:hover,:active\)\{background:transparent/);
});

test('custom time control reuses the existing calendar range state', () => {
  const c = values();
  assert.equal(c.billingValues().custom, false);
  c.billingValues().openCustomTime();
  assert.equal(c.billingValues().preset, 'custom');
  assert.equal(c.billingValues().custom, true);
});

test('yesterday is a UTC+8 calendar day with inclusive start and exclusive end', () => {
  const c = component(ledger([
    event('before', { occurredAt: '2026-09-01T23:59:59.999+08:00', costMicros: 100000000 }),
    event('start', { occurredAt: '2026-09-02T00:00:00+08:00' }),
    event('last', { occurredAt: '2026-09-02T23:59:59.999+08:00' }),
    event('today', { occurredAt: '2026-09-03T00:00:00+08:00', costMicros: 100000000 })
  ]));
  const card = c.overviewSummary([{ h: 1, cost: '$99999' }], [])[3];
  assert.equal(card.k, '昨日成本'); assert.equal(card.v, '$5.00'); assert.match(c.billingYesterday().note, /2026-09-02/);
  card.go(); const view = c.renderVals();
  assert.equal(view.billing.metrics[0].value, card.v); assert.equal(view.billing.grain, 'hour'); assert.equal(view.billing.bars.length, 24);
  assert(view.billing.open && !view.isOverview && !view.showSubNav && !view.isRuns);
  assert.equal(view.sidebar.overviewCurrent, 'page'); assert.equal(view.sidebar.productionCurrent, 'false');
  view.billing.back(); assert.equal(c.state.view, 'overview');
});

test('yesterday follows the configured workspace timezone instead of a rolling 24-hour window', () => {
  const c = component(ledger(), NOW, { workspaceTimezoneOffsetMinutes: -240, workspaceTimezoneName: 'America/Toronto' });
  assert.equal(c.billingDay(Date.parse('2026-09-03T03:30:00Z')), '2026-09-02');
  assert.equal(c.billingStamp('2026-09-02'), Date.parse('2026-09-02T04:00:00Z'));
  assert.match(c.billingYesterday().description, /工作区时区（America\/Toronto）/);
});

test('the authorized demo ledger remains identified in data and overview while the billing banner stays hidden', () => {
  const c = values(), demo = c.billingSource();
  assert(demo.demo); assert.equal(demo, c.billingSource()); assert(demo.events.length > 1000);
  assert(c.billingValues().demo); assert.match(c.billingYesterday().note, /示例账单/);
  assert.doesNotMatch(template, /forge-billing-demo|当前未接入真实账单|<strong>示例数据<\/strong>/);
  assert.match(c.billingYesterday().description, /尚未接入真实消费/);
  assert.equal(c.billingYesterday().value, c.billingValues().metrics[0].value);
  assert(c.billingValues().rows.length > 1);
  const anomaly = c.billingValues().abnormalRuns[0], mock = c.billingRunRecords().find(run => run.id === anomaly.runId);
  assert(mock?.billingMock); assert.equal(mock.cost, anomaly.cost); assert(mock.itemMeta.length > 0);
  assert(!c.runsData().some(run => run.billingMock));
  assert.equal(mock.itemCosts.reduce((sum, value) => sum + Number(value.replace('$', '')), 0).toFixed(2), mock.cost.replace('$', ''));
  let prevented = false; anomaly.open({ preventDefault() { prevented = true; } });
  const detail = c.renderVals(); assert(prevented); assert.equal(c.state.activeRun, anomaly.runId); assert(detail.isRun); assert.match(detail.run.id, new RegExp(anomaly.runId));
  assert.deepEqual(Array.from(detail.run.items, item => item.cost), Array.from(mock.itemCosts));
});

test('real billing input never creates synthetic production runs', () => {
  const c = values(ledger([event('linked', { runId: 'external-run' })]));
  assert.equal(c.billingRunRecords().length, 0);
});

test('same totals across project, supplier, and brand-qualified model views', () => {
  const c = values(ledger([event('a'), event('b', { projectId: 'p2', projectName: '项目 B', providerId: 'p2', providerName: '供应商 B' }), event('c', { brandId: 'other', brandName: '品牌 B', modelName: '另一个同 ID 型号' })]));
  let v = c.billingValues(); assert.equal(v.rows.length, 2); assert.equal(v.metrics[0].value, '$7.50'); assert.equal(v.metrics[1].value, '3,750');
  assert(v.showOverviewSummary);
  assert(!v.tabs.some(tab => tab.id === 'projects'));
  for (const id of ['suppliers', 'models']) { v.tabs.find(t => t.id === id).pick(); v = c.billingValues(); assert.equal(v.rows.length, 2); assert.equal(v.metrics[0].value, '$7.50'); assert(!v.showOverviewSummary); }
  assert(v.rows.every(row => row.subtitle.includes('品牌')));
});

test('filters update metrics, chart and table together; supplier change clears a stale model', () => {
  const c = values(ledger([event('one'), event('two', { projectId: 'project-b', projectName: '项目 B', providerId: 'vendor-b', providerName: '供应商 B', modelId: 'model-b', modelName: '型号 B' })]));
  c.billingValues().onProject({ target: { value: 'project-b' } });
  let v = c.billingValues(); assert.equal(v.metrics[0].value, '$2.50'); assert.equal(v.rows.length, 1); assert.equal(v.rows[0].name, '项目 B');
  assert.equal(v.bars.find(bar => bar.key.endsWith('T10')).cost, '$2.50');
  v.onModel({ target: { value: '["brand-a","model-b"]' } });
  v = c.billingValues(); assert.equal(v.metrics[0].value, '$2.50');
  v.onProvider({ target: { value: 'vendor-a' } });
  v = c.billingValues(); assert.equal(v.model, ''); assert.equal(v.models.length, 1); assert(!v.hasRows); assert.equal(v.metrics[0].value, '$0.00');
  v.reset(); v = c.billingValues(); assert.equal(v.rows.length, 2); assert(!v.filtered); assert.equal(v.metrics[0].value, '$5.00');
});

test('dimension row drilldown narrows existing dates and updates native select state', () => {
  const c = values(); let v = c.billingValues(); const id = v.rows[0].id;
  v.rows[0].inspect(); v = c.billingValues();
  assert.equal(v.project, id); assert(v.tabs.find(tab => tab.id === 'suppliers').active); assert.equal(v.start, '2026-09-02');
  assert(v.projects.find(p => p.id === id).selected);
  v.tabs.find(t => t.id === 'suppliers').pick(); v = c.billingValues(); v.rows[0].inspect();
  v = c.billingValues(); assert(v.provider); assert(v.tabs.find(t => t.id === 'models').active);
  v.rows[0].inspect(); assert(c.billingValues().model); assert(c.billingValues().models.some(m => m.selected));
});

test('hour/day/month/year boundaries aggregate without changing totals', () => {
  const c = values(ledger([event('dec', { occurredAt: '2025-12-31T23:30:00+08:00' }), event('jan', { occurredAt: '2026-01-01T00:00:00+08:00' })]));
  c.updateBilling({ start: '2025-12-31', end: '2026-01-01', grain: 'hour', preset: 'custom' });
  for (const [grain, count] of [['hour', 48], ['day', 2], ['month', 2], ['year', 2]]) {
    c.updateBilling({ grain }); const v = c.billingValues(); assert.equal(v.metrics[0].value, '$5.00'); assert.equal(v.bars.length, count); assert(!v.error);
  }
  c.updateBilling({ start: '2024-02-28', end: '2024-03-01', grain: 'day' });
  assert.equal(c.billingValues().bars.length, 3); assert(c.billingValues().bars.some(b => b.key === '2024-02-29'));
});

test('invalid ranges, future end dates and excessive resolution fail with recovery', () => {
  const c = values();
  for (const patch of [{ start: '' }, { start: '2026-02-30' }, { start: '2026-09-03', end: '2026-09-02' }, { end: '2026-09-04' }, { start: '2026-08-01', grain: 'hour' }, { start: '2024-01-01', grain: 'day' }]) {
    c.billingValues().resetDates(); c.updateBilling(patch); const v = c.billingValues();
    assert(v.error); assert(!v.ready); assert.equal(v.metrics[0].value, '—'); assert.equal(v.bars.length, 0);
  }
  c.billingValues().resetDates(); assert(c.billingValues().ready);
});

test('presets choose meaningful ranges and resolution; manual dates become custom', () => {
  const c = values();
  for (const [preset, grain] of [['week', 'day'], ['month', 'day'], ['year', 'month'], ['years', 'year'], ['yesterday', 'hour']]) {
    c.billingValues().onPreset({ target: { value: preset } }); const v = c.billingValues(); assert.equal(v.grain, grain); assert(!v.error); assert(v.presets.find(p => p.id === preset).selected);
  }
  c.billingValues().onStart({ target: { value: '2026-09-01' } }); assert.equal(c.billingValues().preset, 'custom');
});

test('last 12 months always means exactly 12 complete calendar months, including leap and year boundaries', () => {
  for (const [today, start, end] of [
    ['2026-09-03', '2025-09-01', '2026-08-31'],
    ['2026-09-30', '2025-09-01', '2026-08-31'],
    ['2026-01-01', '2025-01-01', '2025-12-31'],
    ['2024-03-31', '2023-03-01', '2024-02-29'],
    ['2024-02-29', '2023-02-01', '2024-01-31'],
    ['2025-03-01', '2024-03-01', '2025-02-28']
  ]) {
    const c = component(ledger([]), Date.parse(today + 'T12:00:00+08:00'));
    c.openBilling(); c.billingValues().onPreset({ target: { value: 'year' } });
    const v = c.billingValues();
    assert.equal(v.start, start, today); assert.equal(v.end, end, today);
    assert.equal(v.grain, 'month'); assert.equal(v.bars.length, 12, today);
    assert.equal(v.bars[11].axis, end.slice(0, 7));
    assert.equal(v.bars[10].axis, '', 'omit tick next to right-aligned final month');
    assert.equal(v.bars.filter(b => b.axis).length, 6);
  }
});

test('absent, loading, error and incomplete records are not displayed as zero', () => {
  for (const data of [null, { status: 'loading' }, { status: 'error' }, { status: 'ready', currency: 'USD', complete: false, events: [] }, { status: 'ready', currency: 'CNY', complete: true, events: [] }]) {
    const c = values(data), v = c.billingValues(); assert(!v.demo && !v.ready); assert.equal(v.metrics[0].value, '—'); assert.equal(c.billingYesterday().value, '—');
  }
  const empty = values(ledger([])); assert(empty.billingValues().ready); assert.equal(empty.billingYesterday().value, '$0.00');
});

test('malformed, negative, missing or unsafe usage/cost values cannot undercount totals', () => {
  for (const patch of [{ inputTokens: null }, { outputTokens: -1 }, { costMicros: '100' }, { costMicros: Infinity }, { costMicros: -1 }, { costMicros: 0.1 }, { modelName: '' }, { occurredAt: 'bad' }, { occurredAt: '2026-09-02T00:00:00' }, { occurredAt: NOW + 1 }]) {
    assert.equal(values(ledger([event('x', patch)])).billingSource().kind, 'error');
  }
  assert.equal(values(ledger([event('x', { costMicros: Number.MAX_SAFE_INTEGER }), event('y')])).billingSource().kind, 'error');
});

test('duplicate IDs deduplicate exactly, conflicts and inconsistent catalogs quarantine totals', () => {
  assert.equal(values(ledger([event('same'), event('same')])).billingValues().metrics[0].value, '$2.50');
  for (const patch of [{ costMicros: 100 }, { providerName: 'different' }, { modelName: 'different' }, { projectName: 'different' }]) {
    const a = event('same'), b = event(patch.costMicros ? 'same' : 'other', patch);
    for (const rows of [[a, b], [b, a]]) assert.equal(values(ledger(rows)).billingSource().kind, 'error');
  }
});

test('zero-cost usage retains tokens and does not claim a cost share', () => {
  const v = values(ledger([event('free', { costMicros: 0 })])).billingValues();
  assert.equal(v.metrics[0].value, '$0.00'); assert.equal(v.metrics[1].value, '1,250'); assert.equal(v.rows[0].share, '—');
});

test('bars expose exact input/output/cost to keyboard activation and reset when filters change', () => {
  const c = values(), v = c.billingValues(), bar = v.bars.find(b => b.tokens !== '0');
  bar.pick(); let next = c.billingValues(); assert(next.hasFocus); assert.equal(next.focusCost, bar.cost); assert.match(next.focusTokens, /输入.*输出/);
  next.bars.find(b => b.key === bar.key).pick(); assert(!c.billingValues().hasFocus);
  bar.pick(); c.billingValues().onProject({ target: { value: 'finance' } }); assert(!c.billingValues().hasFocus);
});

test('sorting by cost or tokens is functional and deterministic', () => {
  const c = values(ledger([event('x', { projectName: 'Cheap', inputTokens: 9000 }), event('y', { projectId: 'p2', projectName: 'Expensive', costMicros: 5000000 })]));
  assert.equal(c.billingValues().rows[0].name, 'Expensive'); c.billingValues().sortTokens(); assert.equal(c.billingValues().rows[0].name, 'Cheap'); c.billingValues().sortCost(); assert.equal(c.billingValues().rows[0].name, 'Expensive');
});

test('semantic charts, native calendars, hidden demo banner, focus states and updater idempotence', () => {
  const html = template.match(/<!-- billing:start -->[\s\S]*?<!-- billing:end -->/)[0];
  const c = values();
  assert.equal(c.billingValues().tabs[0].current, 'page');
  c.billingValues().tabs.find(tab => tab.id === 'suppliers').pick();
  assert.equal(c.billingValues().tabs.find(tab => tab.id === 'suppliers').current, 'page');
  assert.equal(c.billingValues().tabs[0].current, 'false');
  assert.equal(c.billingValues().costSort, 'descending');
  c.billingValues().sortTokens();
  assert.equal(c.billingValues().tokenSort, 'descending');
  assert.equal(c.billingValues().costSort, 'none');
  assert(!/aria-[\w-]+="\{\{[^}]*\?/.test(html), 'runtime attributes require precomputed values');
  assert.match(html, /type="date"/); assert.match(html, /role="columnheader"/); assert.match(html, /role="rowheader"/); assert.match(html, /role="table"/); assert.match(html, /aria-sort=/); assert.match(html, /aria-pressed=/);
  assert.doesNotMatch(html, /forge-billing-demo|当前未接入真实账单|<strong>示例数据<\/strong>/); assert.match(html, /role="alert"/); assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /forge-billing-metric-detail|metric\.detail/); assert.doesNotMatch(html, /forge-billing-composition/);
  assert.match(html, /showOverviewSummary[^]*forge-billing-metrics/); assert.match(html, /showOverviewSummary[^]*billing-anomaly-title[^]*billing-change-title/);
  assert.match(html, /data-forge-tooltip="\{\{ metric\.help \}\}"/); assert.doesNotMatch(html, /forge-billing-metrics-meta|forge-billing-definition|计费说明/);
  assert.match(html, /class="forge-billing-metric-note"><span>\{\{ metric\.noteLabel \}\}<\/span><sc-if value="\{\{ metric\.noteValue \}\}"><strong class="forge-metric-delta-tag" data-tone="\{\{ metric\.tone \}\}">\{\{ metric\.noteValue \}\}<\/strong>/);
  assert.match(forgeSystem, /\.forge-postman \.forge-metric-delta-tag\{[^}]*display:inline-block[^}]*padding:4px[^}]*border-radius:var\(--radius-xs\)[^}]*line-height:16px/);
  assert.doesNotMatch(html, /class="forge-billing-filters"/); assert.match(template, /\.forge-billing-metrics>div\{[^}]*background:transparent/);
  const methods = fs.readFileSync(new URL('./templates/billing-methods.js', import.meta.url), 'utf8'); assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(methods));
  assert.equal(updateBilling(source), source); assert.equal(updateModelStatus(source), source);
});

const coveredLedger = events => ({ ...ledger(events), coverageStart: '2026-08-01T00:00:00+08:00', coverageEnd: '2026-09-03T12:00:00+08:00', updatedAt: '2026-09-03T11:59:00+08:00' });

test('four nonredundant KPIs compare equal periods with consistent scope and disclose missing coverage', () => {
  const c = values(coveredLedger([event('old', { occurredAt: '2026-09-01T10:00:00+08:00' }), event('new', { costMicros: 5000000 }), event('new2', { costMicros: 5000000 })]));
  const v = c.billingValues();
  assert.deepEqual(Array.from(v.metrics, m => m.label), ['昨日成本', '总 Tokens', '调用次数', '平均调用成本']);
  assert.equal(v.metrics[0].value, '$10.00'); assert.match(v.metrics[0].note, /\+300.0%/); assert.equal(v.metrics[0].tone, 'danger'); assert.equal(v.metrics[0].detail, undefined);
  assert.equal(v.metrics[0].noteLabel, '较前日'); assert.equal(v.metrics[0].noteValue, '+$7.50 · +300.0%'); assert.equal(v.metrics[0].noteSuffix, '');
  assert.equal(v.metrics[3].noteLabel, '较上一周期'); assert.equal(v.metrics[3].noteValue, '+100.0%'); assert.equal(v.metrics[3].noteSuffix, ' · USD / 次');
  assert.equal(v.metrics[2].value, '2'); assert.equal(v.metrics[3].value, '$5.00');
  assert.match(v.metrics[0].help, /UTC\+8/); assert.match(v.metrics[1].help, /输入 Tokens 与输出 Tokens 之和/); assert.match(v.metrics[2].help, /调用记录数/); assert.match(v.metrics[3].help, /总费用 ÷ 调用次数/);
  assert.match(v.insight, /调用量变化贡献 \+\$2.50/); assert.match(v.insight, /模型组合变化贡献 \+\$5.00/);
  assert.match(v.updated, /11:59/); assert(!v.demo);
  assert.match(values(ledger([event('one')])).billingValues().metrics[0].note, /数据不足/);
  assert(!values(ledger([])).billingValues().comparisonKnown);
});

test('zero baseline is new spending, not infinity; the same project filter applies to previous period', () => {
  const c = values(coveredLedger([event('new'), event('other-old', { projectId: 'b', projectName: 'B', occurredAt: '2026-09-01T10:00:00+08:00' })]));
  c.billingValues().onProject({ target: { value: 'project-a' } });
  const v = c.billingValues(); assert.match(v.insight, /本期新增/); assert(!/Infinity|NaN/.test(v.insight));
  assert.equal(v.metrics[0].value, '$2.50');
});

test('cost decrease attribution includes contributors that have no calls in the current period', () => {
  const c = values(coveredLedger([event('current'), event('prior-only', { projectId: 'retired', projectName: '已停止项目', costMicros: 10000000, occurredAt: '2026-09-01T10:00:00+08:00' })]));
  const v = c.billingValues(); assert.match(v.driver, /费用减少最多的是 已停止项目：−\$10.00/); assert.equal(v.rows.length, 1);
});

test('bucket selection filters KPIs, composition, table and exports while retaining full chart', () => {
  const c = values(coveredLedger([event('am'), event('pm', { occurredAt: '2026-09-02T15:00:00+08:00', projectId: 'b', projectName: '下午项目', costMicros: 9000000 })]));
  c.billingValues().bars.find(b => b.key.endsWith('T15')).pick();
  let v = c.billingValues(); assert.equal(v.bars.length, 24); assert.equal(v.metrics[0].value, '$9.00'); assert.equal(v.rows.length, 1); assert.equal(v.contributors[0].name, '下午项目'); assert.match(v.focusLabel, /15:00–16:00/);
  assert.match(v.exportDetails(), /"pm"/); assert(!v.exportDetails().includes('"am"'));
  v.chartMetrics.find(m => m.id === 'tokens').pick(); v = c.billingValues();
  assert(v.hasFocus); assert(v.chartSeries.length > 0); assert(v.bars.some(bar => bar.segments.length > 0));
  v.columns.find(c => c.id === 'calls').pick(); assert(c.billingValues().hasFocus);
  v.tabs.find(t => t.id === 'models').pick(); assert(c.billingValues().hasFocus);
  c.billingValues().clearBin(); assert.equal(c.billingValues().metrics[0].value, '$11.50');
});

test('every zero bucket is explicit and stacked hover details include totals, dimension values and shares', () => {
  const c = values(coveredLedger([event('one')])); let v = c.billingValues();
  assert.equal(v.bars.filter(b => b.zero).length, 23);
  assert.match(v.bars[0].tooltip, /总量.*\$0.00/);
  assert.match(v.bars[10].tooltip, /总量.*\$2.50/); assert.match(v.bars[10].tooltip, /项目构成.*项目 A.*\$2.50.*100%/s);
  v.chartMetrics.find(m => m.id === 'tokens').pick(); v = c.billingValues();
  assert.equal(v.bars[10].segments[0].value, 1250); assert.match(v.bars[10].tooltip, /总量.*1\.3K/);
  v.chartMetrics.find(m => m.id === 'calls').pick(); assert.equal(c.billingValues().unit, '次');
  c.billingValues().bars[0].pick(); assert.equal(c.billingValues().metrics[0].value, '$0.00'); assert(!c.billingValues().hasRows);
});

test('stacked distribution, change reasons and abnormal runs are exposed without line or treemap charts', () => {
  const c = values(coveredLedger([
    event('normal', { runId: 'run-normal', taskName: '常规任务' }),
    event('spike', { runId: 'run-spike', taskName: '大上下文任务', costMicros: 50000000, anomalyReason: '上下文长度异常增长' }),
  ]));
  const v = c.billingValues(), html = template.match(/<!-- billing:start -->[\s\S]*?<!-- billing:end -->/)[0];
  assert(v.chartSeries.length > 0); assert(v.changeReasons.some(row => row.label === '请求量'));
  assert(v.abnormalRuns.some(row => row.runId === 'run-spike'));
  assert.match(html, /forge-billing-stack/); assert.match(html, /变化补充说明/); assert.match(html, /异常成本 Run/);
  assert.match(html, /<ul class="forge-billing-reasons"><sc-for[\s\S]*?<li>/);
  assert.match(html, /<\/sc-if>\s*<\/div>\s*<\/section>\s*<section class="forge-billing-breakdown"/);
  assert.match(html, /<section class="forge-billing-breakdown"[^>]*>\s*<header><div><h2 id="forge-billing-table-title"/);
  assert.match(html, /\{\{ billing\.tableLabel \}\}费用明细/);
  assert.doesNotMatch(html, /\{\{ billing\.groupCount \}\} 个\{\{ billing\.tableLabel \}\} · \{\{ billing\.callCount \}\} 条调用记录/);
  assert.match(html, /<a class="forge-billing-run-link" href="\{\{ run\.href \}\}"[^>]*>查看详情<\/a>/);
  assert.match(template, /\.forge-billing-chart\{[^}]*border-bottom:0/);
  assert.doesNotMatch(template, /\.forge-billing-breakdown header span\{/);
  assert.match(template, /\.forge-postman \.forge-billing \.forge-billing-search input\{padding-inline-start:32px!important\}/);
  assert.match(template, /\.forge-billing-analysis\[aria-labelledby="billing-change-title"\]\{border-top:0\}/);
  assert.doesNotMatch(html, /treemap|line-chart/i);
});

test('all numeric sorts toggle both ways; search and pagination never alter KPI denominators', () => {
  const c = values(coveredLedger(Array.from({ length: 13 }, (_, i) => event('e' + i, { projectId: 'p' + i, projectName: 'Project ' + String(i).padStart(2, '0'), inputTokens: i * 100, outputTokens: i * 10, costMicros: i * 1000000 }))));
  let v = c.billingValues(); assert.equal(v.resultCount, 13); assert.equal(v.rows.length, 10); assert.equal(v.pages, 2);
  v.nextPage(); v = c.billingValues(); assert.equal(v.page, 2); assert.equal(v.rows.length, 3);
  v.onPageSize({ target: { value: '5' } }); v = c.billingValues(); assert.equal(v.page, 1); assert.equal(v.pages, 3);
  for (const id of ['cost', 'share', 'tokens', 'input', 'output', 'calls', 'name']) {
    c.updateBilling({ sort: id, direction: 'asc' }); v = c.billingValues(); assert.equal(v.columns.find(c => c.id === id).state, 'ascending');
    v.columns.find(c => c.id === id).pick(); v = c.billingValues(); assert.equal(v.columns.find(c => c.id === id).state, 'descending');
  }
  const total = v.metrics[0].value; v.onSearch({ target: { value: 'Project 12' } }); v = c.billingValues();
  assert.equal(v.page, 1); assert.equal(v.resultCount, 1); assert.equal(v.metrics[0].value, total); assert.equal(v.rows[0].share, '15.4%');
  assert.equal(v.exportTable().split('\r\n').length, 2); assert.equal(v.exportDetails().split('\r\n').length, 14);
  v.onSearch({ target: { value: 'no such result' } }); v = c.billingValues(); assert(!v.hasRows && v.hasData); v.clearSearch(); assert.equal(c.billingValues().resultCount, 13);
});

test('project and supplier drilldowns preserve time, expose alternative dimensions and restore full prior scope', () => {
  const c = values(); let v = c.billingValues(); const total = v.metrics[0].value;
  v.rows[0].inspect(); v = c.billingValues(); assert(v.canGoBack); assert(v.tabs.find(t => t.id === 'suppliers').active);
  const project = v.project; v.rows[0].inspect(); v = c.billingValues(); assert.equal(v.project, project); assert(v.provider); assert(v.tabs.find(t => t.id === 'models').active);
  v.tabs.find(t => t.id === 'overview').pick(); assert(c.billingValues().rows.every(r => r.id === project));
  c.billingValues().drillBack(); v = c.billingValues(); assert.equal(v.project, project); assert.equal(v.provider, '');
  v.drillBack(); v = c.billingValues(); assert.equal(v.metrics[0].value, total); assert(!v.hasChips && !v.canGoBack);
});

test('CSV exports all filtered pages with exact microcosts, escaped names and formula safety', () => {
  const c = values(coveredLedger([event('csv', { projectName: '=SUM(1,2)', costMicros: 1234 })]));
  const csv = c.billingValues().exportTable();
  assert(csv.startsWith('\uFEFF')); assert.match(csv, /"'=SUM\(1,2\)"/); assert.match(csv, /"0.001234"/);
  assert.match(c.billingCSV([['a"b', 'line\nnext', '  @formula', '\ttab']]), /"a""b","line\nnext","'  @formula","'\ttab"/);
  assert.match(values().billingValues().exportDetails(), /"示例"/);
});

test('reset is conditional and resets dates and filters without changing analysis dimension', () => {
  const c = values(); assert(!c.billingValues().filtered);
  c.billingValues().onPreset({ target: { value: 'week' } }); assert(c.billingValues().filtered);
  c.billingValues().tabs.find(t => t.id === 'models').pick(); c.billingValues().reset();
  const v = c.billingValues(); assert(!v.filtered); assert.equal(v.preset, 'yesterday'); assert(v.tabs.find(t => t.id === 'models').active);
  assert(!/品牌 \/ 型号|全部型号|点击柱形查看该时段/.test(template.match(/<!-- billing:start -->[\s\S]*?<!-- billing:end -->/)[0]));
});
