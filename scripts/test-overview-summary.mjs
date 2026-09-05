import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateOverviewSummary } from './update-overview-summary.mjs';
import { updateReviewQueueLayout } from './update-review-queue-layout.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const decode = input => JSON.parse(input.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const template = decode(source);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function component(props = {}) {
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', ...props };
      setState(patch) { Object.assign(this.state, patch); }
    }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}

test('overview exposes six stable core metrics without value prefixes and exact filtered destinations', () => {
  const c = component(), cards = c.renderVals().over.stats;
  assert.deepEqual(Array.from(cards, card => card.k), ['待审核', '运行中', '交付缺口', '昨日成本', '模型状态', '外包供应商表现']);
  assert(cards.every(card => !Object.hasOwn(card, 'prefix')));
  assert(cards.slice(0, 5).every(card => card.actionable && card.description.length > 15 && card.cardLabel));
  assert.equal(cards[4].v, 100); assert.equal(cards[4].unit, '%'); assert.equal(cards[4].auxiliary, '5 / 5 个模型可用');
  assert.equal(cards[5].v, 92.4); assert.equal(cards[5].unit, '%'); assert.equal(cards[5].auxiliary, '较前日 +2.1pp'); assert.equal(cards[5].actionable, true);
  cards[0].go(); assert.equal(c.state.view, 'review'); assert.equal(c.state.reviewOwner, 'mine'); assert.equal(c.state.reviewPhase, 'pending');
  cards[1].go(); assert.equal(c.state.view, 'runs'); assert.equal(c.state.runsFilter, '运行中');
  cards[2].go(); assert.equal(c.state.view, 'delivery'); assert.equal(c.state.delStatus, 'unmet');
  cards[3].go(); assert.equal(c.state.view, 'billing'); assert.equal(c.state.billing.preset, 'yesterday');
  cards[4].go(); assert.equal(c.state.view, 'models'); assert.equal(c.state.modelDimension, 'providers'); assert.equal(c.state.modelSource, '');
  cards[5].go(); assert.equal(c.state.view, 'outsourcing-suppliers');
});

test('review and running metrics dedupe their own entities and exclude other states', () => {
  const c = component();
  c.assignmentOf = id => ({ mine: id !== 'other' });
  c.pendingQueue = () => [{ id: 'a' }, { id: 'a' }, { id: 'other' }];
  const cards = c.overviewSummary([
    { id: 'r1', status: 'running', running: 20 },
    { id: 'r1', status: 'running', running: 20 },
    { id: 'r2', status: 'running', running: 0 },
    { id: 'r3', status: 'queued', running: 8 }
  ], []);
  assert.equal(cards[0].v, 1);
  assert.equal(cards[1].v, 2);
  assert.match(cards[1].description, /Run ID 去重/);
  assert.equal(cards[1].auxiliary, '');
});

test('delivery shortage counts approved linked delivery Item IDs once and clamps each sheet at zero', () => {
  const c = component();
  c.deliveryEntries = sheet => sheet.entries || [];
  c.deliveryEntryId = entry => entry.id;
  c.sheetRows = sheet => sheet.rows;
  const sheets = [
    { target: 3, entries: [{ id: 'a' }, { id: 'b' }], rows: [['A', '', 'a', 'passed'], ['A copy', '', 'a', 'passed'], ['B', '', 'b', 'review']] },
    { target: 1, entries: [{ id: 'c' }, { id: 'd' }], rows: [['C', '', 'c', 'passed'], ['D', '', 'd', 'passed']] },
    { target: 4, passed: 2 }
  ];
  assert.equal(c.overviewFinalDeliveryCount(sheets[0]), 1);
  assert.equal(c.overviewSummary([], sheets)[2].v, 4);
  assert.match(c.overviewSummary([], sheets)[2].description, /按交付 Item ID 去重/);
});

test('yesterday cost uses workspace calendar-day events and only shows a meaningful previous-day change', () => {
  const c = component();
  const start = c.billingStamp(c.billingPreset('yesterday').start);
  c.billingSource = () => ({ kind: 'ready', demo: false, events: [
    { occurredAt: start + 1000, costMicros: 1500000, inputTokens: 0, outputTokens: 0 },
    { occurredAt: start - 1000, costMicros: 1000000, inputTokens: 0, outputTokens: 0 }
  ] });
  let billing = c.billingYesterday();
  assert.equal(billing.value, '$1.50'); assert.equal(billing.delta, '较前日 +50.0%');
  c.billingSource = () => ({ kind: 'ready', demo: false, events: [{ occurredAt: start + 1000, costMicros: 1, inputTokens: 0, outputTokens: 0 }] });
  billing = c.billingYesterday();
  assert.equal(billing.delta, '');
  assert.match(billing.description, /昨日 00:00 至今日 00:00/);
});

test('delivery progress identifies suppliers instead of repeating status dots and keeps quantities and navigation', () => {
  const c = component();
  const sheets = c.deliveryData().flatMap(group => group.sheets);
  const rows = c.renderVals().over.groups[0].rows;
  assert.equal(rows.length, sheets.length);
  rows.forEach((row, i) => {
    const sheet = sheets[i], gap = Math.max(0, sheet.target - sheet.passed);
    assert.equal(row.supplier.name, sheet.customer);
    assert.equal(row.supplier.initial, Array.from(sheet.customer)[0].toUpperCase());
    assert.equal(row.supplier.hasLogo, !!sheet.logo?.url);
    assert.equal(row.supplier.noLogo, !sheet.logo?.url);
    assert.equal(row.dot, undefined);
    assert.equal(row.title, sheet.name);
    assert(row.sub.includes('可交付 ' + sheet.passed + ' / 目标 ' + sheet.target));
    assert.equal(row.right, gap ? '待补齐 ' + gap + ' 项' : '数量已齐');
    row.go(); assert.equal(c.state.view, 'sheet'); assert.equal(c.state.sheetKey, sheet.key);
  });
  assert.equal(c.overviewDeliveryIdentity({ customer: '  acme ' }).initial, 'A');
  assert.equal(c.overviewDeliveryIdentity({ customer: '  ' }).initial, '供');
  assert.equal(c.overviewDeliveryIdentity({}).name, '未设置供应商');
});

test('provided StepFun and Ant logos are shared by overview and order editing without changing other customers', () => {
  const c = component(), sheets = c.deliveryData().flatMap(group => group.sheets);
  const expected = new Map([
    ['阶跃', ['/supplier-logos/stepfun.png', 300]],
    ['蚂蚁', ['/supplier-logos/ant.png', 640]]
  ]);
  for (const sheet of sheets) {
    const logo = expected.get(sheet.customer);
    if (!logo) { assert.equal(sheet.logo, null); continue; }
    assert.equal(sheet.logo.url, logo[0]);
    assert.equal(c.overviewDeliveryIdentity(sheet).logoUrl, logo[0]);
    c.openDeliveryEditor(sheet.key);
    assert.equal(c.state.deliveryEditor.logo.url, logo[0]);
    c.closeDeliveryEditor();
  }
  for (const [url, size] of expected.values()) {
    const image = fs.readFileSync(new URL('../public' + url, import.meta.url));
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(image.readUInt32BE(16), size);
    assert.equal(image.readUInt32BE(20), size);
  }
});

test('each delivery progress row reuses its own saved Logo with independent error fallback', () => {
  const c = component(), sheets = c.deliveryData().flatMap(group => group.sheets);
  const first = sheets[0], second = sheets[1], url = 'data:image/png;base64,dGVzdA==';
  c.state.deliveryOverrides = { [first.key]: { logo: { name: 'supplier.png', url } }, [second.key]: { logo: { name: 'supplier.png', url } } };
  let rows = c.renderVals().over.groups[0].rows;
  assert.equal(rows[0].supplier.logoUrl, url); assert.equal(rows[0].supplier.hasLogo, true);
  assert.equal(rows[1].supplier.hasLogo, true);
  assert.equal(rows[2].supplier.logoUrl, '/supplier-logos/stepfun.png', 'Other orders retain their supplied logo');
  assert.equal(rows[3].supplier.hasLogo, false);
  rows[0].supplier.onError();
  rows = c.renderVals().over.groups[0].rows;
  assert.equal(rows[0].supplier.hasLogo, false); assert.equal(rows[0].supplier.noLogo, true);
  assert.equal(rows[1].supplier.hasLogo, true, 'A failure is scoped to the affected sheet');
});

test('replacing or removing a supplier Logo clears its visual error state without accepting stale errors', () => {
  const c = component(), key = c.deliveryData()[0].sheets[0].key;
  const original = 'data:image/png;base64,b2xk', replacement = 'data:image/png;base64,bmV3';
  c.state.deliveryOverrides = { [key]: { logo: { url: original } } };
  const oldIdentity = c.renderVals().over.groups[0].rows[0].supplier;
  oldIdentity.onError();
  c.state.deliveryOverrides[key].logo = { url: replacement };
  let identity = c.renderVals().over.groups[0].rows[0].supplier;
  assert.equal(identity.hasLogo, true); assert.equal(identity.logoUrl, replacement);
  oldIdentity.onError();
  assert.equal(c.renderVals().over.groups[0].rows[0].supplier.hasLogo, true);
  c.state.deliveryOverrides[key].logo = null;
  identity.onError();
  identity = c.renderVals().over.groups[0].rows[0].supplier;
  assert.equal(identity.hasLogo, false); assert.equal(identity.noLogo, true); assert.equal(identity.logoUrl, '');
  assert.equal(c.state.overviewLogoFailures[key], original, 'Stale callbacks do not record failures for removed or replaced images');
});

test('supplier identities have fixed compact dimensions, uncropped images and decorative semantics', () => {
  const markup = template.match(/<!-- overview-delivery-identity:start -->[\s\S]*?<!-- overview-delivery-identity:end -->/)[0];
  assert(markup.includes('aria-hidden="true"'));
  assert(markup.includes('alt="" width="28" height="28"'));
  assert(markup.includes('sc-camel-on-error="{{ r.supplier.onError }}"'));
  assert(markup.includes('{{ r.supplier.initial }}'));
  assert.match(template, /\.forge-overview-supplier\{[^}]*width:28px;height:28px;flex:none/);
  assert.match(template, /\.forge-overview-supplier img\{[^}]*object-fit:contain/);
  assert(!template.includes('<div style="width:6px;height:6px;border-radius:50%;background:{{ r.dot }};flex:none"></div>'));
});

test('model KPI uses labelled mock data by default while live sources require complete fresh evidence', () => {
  const mockedComponent = component(), mocked = mockedComponent.renderVals().over.stats[4];
  assert.equal(mocked.v, 100); assert.equal(mocked.unit, '%'); assert.equal(mocked.auxiliary, '5 / 5 个模型可用'); assert.match(mocked.description, /演示数据/);
  mocked.go(); assert.equal(mockedComponent.state.view, 'models'); assert.equal(mockedComponent.state.modelSource, '');
  for (const modelMonitoring of [{ status: 'loading' }, { status: 'error' }, {}, []]) {
    const card = component({ modelMonitoring }).renderVals().over.stats[4];
    assert.equal(card.v, '—'); assert.equal(card.cardLabel, '模型状态，待检测');
  }
  const seed = component(), liveInput = seed.modelDemoInput();
  const live = component({ modelMonitoring: liveInput }).renderVals().over.stats[4];
  assert.equal(typeof live.v, 'number'); assert.equal(Object.hasOwn(live, 'prefix'), false); assert.equal(live.unit, '%');
  liveInput.catalogCheckedAt = Date.now() - 2 * 86400000;
  assert.equal(component({ modelMonitoring: liveInput }).renderVals().over.stats[4].v, '—');
});

test('supplier performance uses labelled mock data by default and final risk state ordering when connected', () => {
  const mock = component().renderVals().over.supplierPerformance;
  assert.equal(mock.metric, 3); assert.equal(mock.rows.length, 3); assert.equal(mock.mocked, true); assert.equal(mock.canOpenAll, true);
  assert.equal(mock.passRate, 92.4); assert.equal(mock.passRateDelta, '较前日 +2.1pp');
  assert.deepEqual(Array.from(mock.rows, row => row.id), ['mock-stepfun', 'mock-ant', 'mock-internal']);
  const unavailable = component({ fellowSupplierRisk: { status: 'error' } }).renderVals().over.supplierPerformance;
  assert.equal(unavailable.metric, '待接入'); assert.equal(unavailable.rows.length, 0);
  const input = { status: 'ready', complete: true, yesterdayPassRate: 88.2, previousDayPassRate: 87.9, suppliers: [
    { id: 'm-late', name: '中风险晚', atRisk: true, finalRiskState: 'medium', primaryReason: '产能波动', deadlineAt: '2026-09-20' },
    { id: 'h-late', name: '高风险晚', atRisk: true, finalRiskState: 'high', primaryReason: '关键节点延期', deadlineAt: '2026-09-18' },
    { id: 'h-soon', name: '高风险近', atRisk: true, finalRiskState: 'high', primaryReason: '质量门禁未通过', deadlineAt: '2026-09-10' },
    { id: 'safe', name: '无风险', atRisk: false, finalRiskState: 'critical', primaryReason: '不应出现', deadlineAt: '2026-09-01' }
  ] };
  const c = component({ fellowSupplierRisk: input });
  const data = c.renderVals().over.supplierPerformance;
  assert.equal(data.metric, 3);
  assert.deepEqual(Array.from(data.rows, row => row.id), ['h-soon', 'h-late', 'm-late']);
  const card = c.renderVals().over.stats[5];
  assert.equal(card.v, 88.2); assert.equal(card.unit, '%'); assert.equal(card.auxiliary, '较前日 +0.3pp'); assert.equal(card.actionable, true);
  card.go(); assert.equal(c.state.view, 'outsourcing-suppliers');
  data.rows[0].open(); assert.equal(c.state.supplierVendor, 'h-soon');
});

test('info controls are separate from card navigation and supported in the standalone page', () => {
  const markup = template.match(/<!-- overview-summary:start -->[\s\S]*?<!-- overview-summary:end -->/)[0];
  assert(markup.includes('data-forge-tooltip="{{ s.description }}"'));
  assert(markup.includes('data-tooltip-label="{{ s.k }}说明"'));
  assert(markup.includes('data-phosphor="info"'));
  assert(markup.includes('aria-label="{{ s.cardLabel }}"'));
  assert(markup.includes('class="forge-summary-link" sc-camel-on-click="{{ s.go }}"'));
  assert(markup.includes('class="forge-summary-auxiliary">{{ s.auxiliary }}'));
  assert(markup.includes('hint-placeholder-count="6"'));
  assert(!markup.includes('forge-summary-prefix'));
  assert(!markup.includes('forge-supplier-performance'));
  assert(!markup.includes('forge-summary-note'));
  assert(!markup.includes('s.detail'));
  assert(template.includes("auxiliary: supplier.hasPassRate ? supplier.passRateDelta"));
  assert(!markup.includes('<article sc-camel-on-click'));
  assert(template.includes('.forge-overview-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))'));
  assert(template.includes('@media(max-width:1100px){.forge-overview-summary{grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert(template.includes('@media(max-width:600px){.forge-overview-summary{grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert(template.includes('<script src="/forge-summary-tooltips.js" defer>'));
  const ui = fs.readFileSync(new URL('./ui/summary-tooltips.tsx', import.meta.url), 'utf8');
  assert(ui.includes("from '@radix-ui/react-tooltip'"));
  assert(ui.includes('event.stopPropagation()'));
  assert(ui.includes('mounted.root.unmount()'));
  assert(ui.includes('collisionPadding={12}'));
});

test('focused generators are idempotent and 开始审核 retains the original entry handler', () => {
  assert.equal(updateOverviewSummary(source), source);
  assert.equal(updateReviewQueueLayout(source), source);
  assert.match(template, /<sc-if value="{{ it\.pending }}"[^>]*><button[^>]*sc-camel-on-click="{{ it\.start }}"[^>]*>开始审核<\/button>/);
  const legacy = source.replace('>开始审核<', '>repair<');
  assert.equal(updateReviewQueueLayout(legacy), source);
  assert(template.includes('Reroll'));
  assert(template.includes('继续填写返工说明'));
});
