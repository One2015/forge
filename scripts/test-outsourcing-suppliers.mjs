import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateOutsourcingSuppliers } from './update-outsourcing-suppliers.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const page = template.match(/<!-- outsourcing-suppliers:start -->[\s\S]*?<!-- outsourcing-suppliers:end -->/)[0];

function component(props = {}, narrow = false) {
  const context = vm.createContext({
    URLSearchParams,
    window: { location: { search: '' }, matchMedia: () => ({ matches: narrow }) },
    document: { getElementById: () => null },
    setTimeout: fn => { fn(); return 0; }, clearTimeout() {},
    Date: class extends Date { static now() { return 1788595200000; } },
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', ...props };
      setState(patch) { this.state = { ...this.state, ...patch }; }
    },
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}

test('overview card and sidebar open the single external expert destination', () => {
  for (const narrow of [false, true]) {
    const c = component({}, narrow);
    c.setState({ sidebarCollapsed: false, dlOpen: true, notifOpen: true });
    c.renderVals().sidebar.goSuppliers();
    assert.equal(c.state.view, 'outsourcing-suppliers');
    assert.equal(c.renderVals().showSubNav, false);
    assert.equal(c.state.dlOpen, false); assert.equal(c.state.notifOpen, false);
    assert.equal(c.state.sidebarCollapsed, narrow);
  }
  const c = component(), supplierCard = c.overviewSignalValues().experts;
  assert.match(supplierCard.cardLabel, /外部专家表现/); assert.equal(supplierCard.value, 92.4);
  supplierCard.go(); assert.equal(c.state.view, 'outsourcing-suppliers');
});

test('performance page keeps the required section order without exposing fixture labels', () => {
  const labels = ['外部专家整体表现', '外部专家表现筛选器', '单个专家团队交付情况', '外部专家达标趋势', '高频问题'];
  let cursor = -1;
  for (const label of labels) { const next = page.indexOf(label); assert(next > cursor, label); cursor = next; }
  assert.doesNotMatch(page, /Mock 数据|履约明细与风险评估/); assert.match(page, /与模型 API 供应商分开管理/);
  const c = component(); c.openOutsourcingSuppliers(); const v = c.outsourcingSupplierValues();
  assert(v.demo); assert.deepEqual(Array.from(v.metrics, row => row.label), ['总交付目标', '已分配任务量', '最终有效交付量', '整体完成率', '整体质检通过率', '风险专家团队']);
  assert.equal(v.metrics[0].value, 620); assert.equal(v.metrics[1].value, 602); assert.equal(v.metrics[0].value - v.metrics[1].value, 18);
  assert(v.hasRows); assert(v.hasTrend); assert(v.hasIssues);
});

test('supplier, sheet and risk filters update all visible modules and empty states', () => {
  const c = component(); c.openOutsourcingSuppliers();
  assert.equal(c.outsourcingSupplierValues().resetDisabled, true);
  c.outsourcingSupplierValues().onSupplier({ target: { value: 'stepfun' } });
  let v = c.outsourcingSupplierValues(); assert.equal(v.resetDisabled, false); assert.equal(v.detailRows.length, 1); assert.equal(v.trendSupplier, '维象制作'); assert.equal(v.issueTotal, 22); assert.equal(v.issueRows.length, 2);
  v.onSheet({ target: { value: 'ant200' } }); v = c.outsourcingSupplierValues(); assert(!v.hasRows); assert(!v.hasTrend); assert(!v.hasIssues);
  v.reset(); v = c.outsourcingSupplierValues(); assert.equal(v.resetDisabled, true); assert.equal(v.detailRows.length, 3);
  v.onRisk({ target: { value: 'low' } }); v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 1); assert.equal(v.metrics.at(-1).value, 0);
  v.reset(); v.onCycle({ target: { value: '7d' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant']);
});

test('supplier trend can focus one labelled series with accessible points', () => {
  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendWeeks), ['4 周前', '3 周前', '2 周前', '上周', '本周']);
  assert.equal(v.trendCompletion.length, 5); assert.equal(v.trendEffective.length, 5); assert.equal(v.trendQuality.length, 5);
  assert.match(v.trendCompletionLine, /^0,32 25,26 50,19 75,14 100,9$/);
  assert.deepEqual(Array.from(v.trendCards, card => card.label), ['任务完成率', '有效交付率', '质检通过率']);
  assert.equal(v.trendCards[0].current, '91%'); assert.equal(v.trendCards[0].change, '较上周 +5 个百分点');
  assert.equal(v.trendMetric, 'all'); assert.equal(v.singleTrend, false);
  v.onTrendMetric({ target: { value: 'quality' } }); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendCards, card => card.label), ['质检通过率']); assert.equal(v.trendCards[0].current, '94%'); assert.equal(v.singleTrend, true); assert.equal(v.trendAriaLabel, '质检通过率趋势');
  assert.match(page, /aria-label="趋势指标"/); assert.match(page, /data-single="\{\{ outsourcingSuppliers\.singleTrend \}\}"/); assert.match(page, /forge-outsourcing-mini-chart/); assert.match(page, /目标 90%/);
  assert.match(page, /data-forge-chart-tooltip="\{\{ point\.title \}\}"/); assert.match(page, /data-series="\{\{ series\.series \}\}"/);
});

test('delivery table is concise and supplier names open the merged detail drawer', () => {
  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  for (const label of ['分配量', '已完成', '有效交付', '完成率', '质检通过率', '交付日期', '风险', '数据单']) assert(page.includes('<span>' + label + '</span>') || page.includes('<time') || page.includes(label));
  assert.doesNotMatch(page, /目标 \/ 分配|生产 \/ 上传|<span>计划<\/span>/);
  assert.match(page, /class="forge-outsourcing-supplier-trigger"/); assert.match(page, /class="forge-outsourcing-drawer" role="dialog"/);
  v.detailRows[0].openDetail(); v = c.outsourcingSupplierValues();
  assert(v.detailOpen); assert.equal(v.detail.name, '维象制作'); assert.equal(v.detail.uploaded, 254); assert.equal(v.detail.cycleP95, 61); assert.equal(v.detail.riskLabel, '高风险');
  v.closeDetail(); assert(!c.outsourcingSupplierValues().detailOpen);
});

test('frequent issues are an aggregate percentage list with an expert filter', () => {
  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  assert.equal(v.issueTotal, 28); assert.equal(v.issueTypeCount, 3);
  assert.deepEqual(Array.from(v.issueRows, row => [row.name, row.count, row.percentage]), [['材质与参考图不一致', 14, '50%'], ['交互热点缺失', 8, '28.6%'], ['命名规范不一致', 6, '21.4%']]);
  v.onIssueSupplier({ target: { value: 'stepfun' } }); v = c.outsourcingSupplierValues();
  assert.equal(v.issueTotal, 22); assert.deepEqual(Array.from(v.issueRows, row => [row.name, row.percentage]), [['材质与参考图不一致', '63.6%'], ['交互热点缺失', '36.4%']]);
  assert.match(page, /aria-label="高频问题专家团队"/); assert.match(page, /forge-outsourcing-issue-list/); assert.match(page, /issue\.percentage/);
  assert.match(page, /class="forge-outsourcing-issue-track"/); assert.doesNotMatch(page, /最近出现|issue\.recent/);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  assert.match(css, /\.forge-outsourcing-issue-list article\{[^}]*grid-template-columns:minmax\(220px,\.9fr\) minmax\(180px,1\.3fr\) 72px/);
  assert.match(css, /\.forge-outsourcing-issue-track\{[^}]*height:36px[^}]*background:var\(--pm-subtle\)/);
  assert.match(css, /\.forge-outsourcing-issue-bar\{[^}]*display:block[^}]*height:100%/);
});

test('management tab exposes all required fields and adds an in-memory expert team', () => {
  const c = component(); c.openOutsourcingSuppliers('management'); let v = c.outsourcingSupplierValues();
  assert(v.managementTab); assert.match(page, /专家团队名称 \*/); assert.match(page, /联系人/); assert.match(page, /联系方式/); assert.match(page, /任务类型/); assert.match(page, /目标产能/); assert.doesNotMatch(page, /默认产能/); assert.match(page, /合作状态/); assert.match(page, /备注/);
  assert.match(page, /list="forge-outsourcing-task-types"/); assert.match(page, /placeholder="输入或选择任务类型"/); assert.match(page, /<option value="Web3D"><\/option>/); assert.match(page, /<option value="质量复核"><\/option>/);
  assert.deepEqual(Array.from(v.managementRows, row => row.name), ['维象制作', '灵犀三维', '观澜质检']);
  v.openAdd(); v = c.outsourcingSupplierValues(); assert(v.addOpen); assert(!v.canAdd);
  v.onName({ target: { value: '北辰制作' } }); v.onTaskTypes({ target: { value: 'Web3D' } }); v = c.outsourcingSupplierValues(); assert(v.canAdd); v.add();
  v = c.outsourcingSupplierValues(); assert.equal(v.managementRows.at(-1).name, '北辰制作'); assert.equal(v.managementRows.at(-1).specialties, 'Web3D'); assert(!v.addOpen);
});

test('supplier generator is idempotent and responsive CSS uses shared tokens', () => {
  assert.equal(updateOutsourcingSuppliers(source), source);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  assert.match(page, /class="forge-outsourcing-reset" disabled="\{\{ outsourcingSuppliers\.resetDisabled \}\}"/);
  assert.match(css, /\.forge-outsourcing-reset\{[^}]*border:0;[^}]*background:transparent;[^}]*color:var\(--pm-brand\)/);
  assert.match(css, /\.forge-outsourcing-reset:disabled\{[^}]*color:var\(--forge-muted\)/);
  assert.match(css, /@media\(max-width:1000px\)/); assert.match(css, /@media\(max-width:640px\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}|rgba?\(/i);
  for (const token of ['--forge-border', '--forge-panel', '--pm-brand', '--pm-chart-1']) assert(css.includes('var(' + token + ')'));
});
