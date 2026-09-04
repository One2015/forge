import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateOverviewSummary } from './update-overview-summary.mjs';
import { updateReviewQueueLayout } from './update-review-queue-layout.mjs';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
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

test('overview uses explicit units and preserves destinations and item-based calculations', () => {
  const c = component(), cards = c.renderVals().over.stats;
  assert.deepEqual(Array.from(cards, card => card.k), ['待审核', '运行中', '交付缺口', '昨日成本', '模型状态']);
  const queue = c.pendingQueue().filter(q => c.assignmentOf(String(q.id), c.roundsOf(q.id)).mine);
  assert.equal(cards[0].v, queue.length);
  assert.equal(cards[0].unit, '项');
  assert.equal(cards[1].v, c.runsData().filter(run => run.running > 0).length);
  assert.equal(cards[1].unit, '个任务');
  assert.equal(cards[1].note, '正在处理 3 项内容');
  assert.equal(cards[2].v, c.deliveryData().flatMap(group => group.sheets).reduce((sum, sheet) => sum + Math.max(0, sheet.target - sheet.passed), 0));
  assert.equal(cards[3].v, c.billingYesterday().value);
  cards[0].go(); assert.equal(c.state.view, 'review'); assert.equal(c.state.reviewOwner, 'mine');
  cards[1].go(); assert.equal(c.state.view, 'runs');
  cards[2].go(); assert.equal(c.state.view, 'delivery');
  assert(cards.every(card => card.description.length > 15));
  assert(cards[3].actionable); cards[3].go(); assert.equal(c.state.view, 'billing');
  assert(cards[4].actionable); cards[4].go(); assert.equal(c.state.view, 'models');
});

test('review summary removes the assignment label but preserves its scope in help and empty states', () => {
  const c = component(), review = c.renderVals().over.stats[0];
  assert.equal(review.note, '布达拉宫、黄鹤楼等');
  assert(!review.note.includes('指派给你'));
  assert.equal(review.assignment, undefined);
  assert.equal(review.assignmentDetail, undefined);
  assert.match(review.description, /指派给你 6 项.*别人名下/);
  const markup = template.match(/<!-- overview-summary:start -->[\s\S]*?<!-- overview-summary:end -->/)[0];
  assert(!markup.includes('s.assignment'));
  assert(!template.includes('forge-summary-assignment'));
  assert(markup.includes('class="forge-summary-title">{{ s.k }}</h3>'));
  assert(markup.includes('class="forge-summary-info"'));
  c.pendingQueue = () => [];
  const empty = c.renderVals().over.stats[0];
  assert.equal(empty.v, 0); assert.equal(empty.note, '暂无指派给你的待审内容');
});

test('review name preview is bounded without inventing a project name or dropping duplicate-titled Items', () => {
  const c = component();
  c.assignmentOf = () => ({ mine: true });
  c.pendingQueue = () => [
    { id: '123456789', meta: [] },
    { id: '2', meta: ['2', '', '', '', '同名内容'] }
  ];
  let card = c.overviewSummary([], [])[0];
  assert.equal(card.note, 'Item 12345678、同名内容');
  c.pendingQueue = () => [
    { id: '1', meta: ['1', '', '', '', '同名内容'] },
    { id: '2', meta: ['2', '', '', '', '同名内容'] },
    { id: '3', meta: ['3', '', '', '', '第三项不应堆进卡片'] }
  ];
  card = c.overviewSummary([], [])[0];
  assert.equal(card.v, 3);
  assert.equal(card.note, '同名内容、同名内容等');
  assert.match(template, /\.forge-summary-note\{[^}]*-webkit-line-clamp:2/);
});

test('running counts tasks, not Items or queued work, and describes an idle state', () => {
  const c = component();
  const card = c.overviewSummary([
    { running: 2 }, { running: 1 }, { running: 0, status: 'queued' }
  ], [])[1];
  assert.equal(card.v, 2); assert.equal(card.note, '正在处理 3 项内容');
  assert.match(card.description, /一个任务可以处理多项内容/);
  const idle = c.overviewSummary([{ running: 0, status: 'queued' }], [])[1];
  assert.equal(idle.v, 0); assert.equal(idle.note, '暂无运行中的任务');
});

test('delivery shortage means quantity to complete, not failed quality or every sheet', () => {
  const c = component();
  const sheets = [{ target: 200, passed: 150 }, { target: 100, passed: 100 }, { target: 10, passed: 12 }];
  const card = c.overviewSummary([], sheets)[2];
  assert.equal(card.v, 50); assert.equal(card.note, '1 张数据单待补齐');
  assert.match(card.description, /不代表质量不合格或交付逾期/);
  const complete = c.overviewSummary([], sheets.slice(1))[2];
  assert.equal(complete.v, 0); assert.equal(complete.note, '交付数量已满足目标');
  assert.equal(c.overviewSummary([], [])[2].note, '暂无交付数据单');
  const overview = template.slice(template.indexOf("if (view === 'overview') {"), template.indexOf("if (view === 'resources') {"));
  assert(overview.includes("'待补齐 ' + gap + ' 项' : '数量已齐'"));
  assert(!overview.includes('今天的健康度'));
  assert(!overview.includes('未达标'));
});

test('yesterday cost is event-based and never reuses the rolling Run cohort', () => {
  const c = component();
  const card = c.overviewSummary([
    { h: 0, cost: '$1.40' }, { h: 23.99, cost: '$10.60' }, { h: 24, cost: '$100' },
    { h: -1, cost: '$100' }, { h: null, cost: '$100' }, { cost: '$100' }
  ], [])[3];
  assert.equal(card.v, c.billingYesterday().value); assert.match(card.note, /示例账单/);
  assert.match(card.description, /费用发生时间/);
  assert.match(card.description, /不是按运行创建时间/);
  const empty = c.overviewSummary([], [])[3];
  assert.equal(empty.v, card.v); assert.equal(empty.note, card.note);
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

function liveModelCard(props) {
  const c = component(props);
  c.state.modelSource = 'live';
  return c.renderVals().over.stats[4];
}

test('overview shares the labelled model-page mock snapshot and issue totals', () => {
  const c = component();
  const card = c.renderVals().over.stats[4];
  assert.equal(card.v, 100);
  assert.equal(card.unit, '% 当前可用');
  assert.equal(card.note, '示例数据 · 5 / 5 个模型可用');
  assert.equal(card.detail, '5 个待处理问题 · 最高延迟 3.5×');
  assert.match(card.description, /示例快照，非真实监测结果/);
  card.go();
  const detail = c.modelStatusValues();
  assert.equal(detail.isDemo, true);
  assert.equal(detail.rate, card.v);
  assert.equal(detail.checked, card.checked);
  assert.equal(detail.allLines.length, 8);
  assert.match(card.detail, new RegExp('^' + detail.issueCount + ' 个待处理问题'));
  c.setState({ modelQuery: '不存在的线路', modelProvider: 'openai', modelFilter: 'normal' });
  assert.equal(c.modelStatusValues().lines.length, 0);
  const filteredCard = c.overviewSummary([], [])[4];
  assert.equal(filteredCard.detail, card.detail);
  assert.equal(filteredCard.checked, card.checked);
});

test('overview respects the model-page source switch without disguising live errors as demo data', () => {
  const c = component();
  c.openModelStatus();
  c.modelStatusValues().sourceToggle();
  assert.equal(c.overviewSummary([], [])[4].note, '可用性检测待接入');
  c.modelStatusValues().sourceToggle();
  assert.match(c.overviewSummary([], [])[4].note, /^示例数据/);
  for (const modelMonitoring of [{ status: 'loading' }, { status: 'error' }, {}, []]) {
    const live = component({ modelMonitoring });
    const card = live.renderVals().over.stats[4];
    assert.equal(card.v, '—');
    assert(!card.note.includes('示例数据'));
    assert.equal(card.note, live.modelStatusSnapshot().note);
  }
  const expired = c.modelDemoInput();
  expired.catalogCheckedAt = Date.now() - 2 * 86400000;
  const card = component({ modelMonitoring: expired }).renderVals().over.stats[4];
  assert.equal(card.v, '—');
  assert(!card.note.includes('示例数据'));
});

test('live model availability never invents missing data or trusts legacy counts without evidence', () => {
  for (const count of [undefined, null, -1, NaN, '8', 1.5, 0, 8]) {
    const card = liveModelCard({ availableModelCount: count });
    assert.equal(card.v, '—'); assert.equal(card.note, '可用性检测待接入');
    assert.equal(card.actionable, true);
    assert.match(card.description, /延迟、质量和账户状态单独衡量/);
  }
});

test('legacy numerator and denominator alone cannot establish current availability', () => {
  for (const [available, total] of [[8, 10], [1, 3], [0, 8], [8, 8]]) {
    const card = liveModelCard({ availableModelCount: available, configuredModelCount: total });
    assert.equal(card.v, '—'); assert.equal(card.unit, '');
    assert.match(card.description, /至少一条生产可路由且协议匹配/);
    assert.match(card.description, /清单不完整、检测过期或存在未知模型/);
    assert.equal(card.actionable, true);
  }
});

test('invalid, empty and inconsistent model denominators do not render a misleading percentage', () => {
  for (const total of [undefined, null, NaN, -1, '10', 2.5, Infinity]) {
    const card = liveModelCard({ availableModelCount: 2, configuredModelCount: total });
    assert.equal(card.v, '—'); assert.equal(card.unit, '');
  }
  for (const available of [null, undefined, -1, 2.5, '2']) {
    assert.equal(liveModelCard({ availableModelCount: available, configuredModelCount: 10 }).v, '—');
  }
  const empty = liveModelCard({ availableModelCount: 0, configuredModelCount: 0 });
  assert.equal(empty.v, '—'); assert.equal(empty.note, '可用性检测待接入');
  const inconsistent = liveModelCard({ availableModelCount: 9, configuredModelCount: 8 });
  assert.equal(inconsistent.v, '—'); assert.equal(inconsistent.note, '可用性检测待接入');
});

test('info controls are separate from card navigation and supported in the standalone page', () => {
  const markup = template.match(/<!-- overview-summary:start -->[\s\S]*?<!-- overview-summary:end -->/)[0];
  assert(markup.includes('data-forge-tooltip="{{ s.description }}"'));
  assert(markup.includes('data-tooltip-label="{{ s.k }}说明"'));
  assert(markup.includes('data-phosphor="info"'));
  assert(markup.includes('class="forge-summary-link" sc-camel-on-click="{{ s.go }}"'));
  assert(!markup.includes('<article sc-camel-on-click'));
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
