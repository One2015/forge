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
  const c = component(), supplierCard = c.renderVals().over.stats[5];
  assert.match(supplierCard.cardLabel, /外部专家表现/); assert.equal(supplierCard.v, 92.4);
  supplierCard.go(); assert.equal(c.state.view, 'outsourcing-suppliers');
});

test('performance page keeps the required section order without exposing fixture labels', () => {
  const labels = ['外部专家整体表现', '专家交付情况', '外部专家达标趋势', '高频问题'];
  let cursor = -1;
  for (const label of labels) { const next = page.indexOf(label); assert(next > cursor, label); cursor = next; }
  assert.doesNotMatch(page, /Mock 数据|履约明细与风险评估/); assert.match(page, /与模型 API 供应商分开管理/);
  assert.match(page, /class="forge-outsourcing-demo" role="status"/); assert.match(page, /示例数据/);
  const c = component(); c.openOutsourcingSuppliers(); const v = c.outsourcingSupplierValues();
  assert(v.demo); assert.deepEqual(Array.from(v.metrics, row => row.label), ['总交付目标', '已分配任务量', '最终有效交付量', '整体完成率', '整体质检通过率', '风险专家团队']);
  assert.equal(v.metrics[0].value, 620); assert.equal(v.metrics[1].value, 602); assert.equal(v.metrics[0].value - v.metrics[1].value, 18);
  assert.match(page, /class="forge-outsourcing-table-head" aria-label="专家交付筛选与排序"/);
  assert.doesNotMatch(page, /forge-outsourcing-delivery-header|forge-outsourcing-table-filters|forge-outsourcing-filters|外部专家表现筛选器|当前筛选范围的交付与风险汇总|点击专家团队名称查看履约、质量与风险详情|汇总重复出现 3 次及以上的问题|forge-outsourcing-issue-total/);
  for (const id of ['outsourcing-overall', 'outsourcing-delivery', 'outsourcing-trend', 'outsourcing-issues']) assert.match(page, new RegExp('forge-outsourcing-block-heading[^>]*>[\\s\\S]*?id="' + id + '"[\\s\\S]*?</header>\\s*<section class="forge-outsourcing-section(?: [^"]*)?" aria-labelledby="' + id + '"'));
  assert(v.hasRows); assert(v.hasTrend); assert(v.hasIssues);
});

test('supplier, sheet and risk filters update all visible modules and empty states', () => {
  const c = component(); c.openOutsourcingSuppliers();
  assert.equal(c.outsourcingSupplierValues().resetDisabled, true);
  c.outsourcingSupplierValues().onSupplier({ target: { value: 'stepfun' } });
  let v = c.outsourcingSupplierValues(); assert.equal(v.resetDisabled, false); assert.equal(v.detailRows.length, 1); assert.equal(v.trendSupplier, '维象制作'); assert.equal(v.issueTotal, 22); assert.equal(v.issueRows.length, 2);
  v.onSheet({ target: { value: 'ant200' } }); v = c.outsourcingSupplierValues(); assert(!v.hasRows); assert(!v.hasTrend); assert(!v.hasIssues);
  v.reset(); v = c.outsourcingSupplierValues(); assert.equal(v.resetDisabled, true); assert.equal(v.detailRows.length, 3);
  v.onRisk({ target: { value: 'low' } }); v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 1); assert.equal(v.metrics.at(-1).value, 0); assert.equal(v.detailRows[0].tone, 'success');
  v.reset(); v.onCycle({ target: { value: '7d' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant']);
});

test('delivery table headers own every filter and numeric sort', () => {
  const header = page.match(/<div role="row" class="forge-outsourcing-table-head"[\s\S]*?<\/div>/)[0];
  assert.equal((header.match(/class="forge-outsourcing-column-filter"/g) || []).length, 9);
  for (const label of ['筛选专家团队', '分配量排序', '已完成排序', '有效交付排序', '完成率排序', '质检通过率排序', '筛选交付日期', '筛选风险', '筛选数据单']) assert(header.includes('aria-label="' + label + '"'), label);
  assert.match(header, /value="assigned-desc">分配量 · 高到低/);
  assert.match(header, /value="completion-asc">完成率 · 低到高/);
  assert.match(header, /value="pass-desc">质检通过率 · 高到低/);
  assert(page.indexOf('forge-outsourcing-table-head') < page.indexOf('!outsourcingSuppliers.hasRows'), 'Header controls remain available in the empty state');

  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  v.onSort({ target: { value: 'assigned-asc' } }); v = c.outsourcingSupplierValues();
  assert.equal(v.assignedOrder, 'assigned-asc'); assert.equal(v.completionOrder, ''); assert.equal(v.resetDisabled, false);
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['internal', 'ant', 'stepfun']);
  v.onSort({ target: { value: 'completion-desc' } }); v = c.outsourcingSupplierValues();
  assert.equal(v.assignedOrder, ''); assert.equal(v.completionOrder, 'completion-desc');
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['ant', 'internal', 'stepfun']);
  v.reset(); v = c.outsourcingSupplierValues(); assert.equal(v.sort, ''); assert.equal(v.resetDisabled, true);
});

test('supplier trend can focus one labelled series with accessible points', () => {
  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendWeeks), ['4 周前', '3 周前', '2 周前', '上周', '本周']);
  assert.equal(v.trendCompletion.length, 5); assert.equal(v.trendEffective.length, 5); assert.equal(v.trendQuality.length, 5);
  assert.match(v.trendCompletionLine, /^0,27 25,21 50,15 75,10 100,6$/);
  assert.deepEqual(Array.from(v.trendCards, card => card.label), ['任务完成率', '有效交付率', '质检通过率']);
  assert.equal(v.trendSupplier, '全部专家团队'); assert.equal(v.trendCards[0].current, '94%'); assert.equal(v.trendCards[0].change, '较上周 +4 个百分点');
  assert.equal(v.trendMetric, 'all'); assert.equal(v.trendWindow, '5w'); assert.equal(v.trendRangeLabel, '近 5 周'); assert.equal(v.singleTrend, false);
  v.onTrendWindow({ target: { value: '3w' } }); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendWeeks), ['2 周前', '上周', '本周']); assert.equal(v.trendCompletion.length, 3); assert.match(v.trendCompletionLine, /^0,15 50,10 100,6$/);
  v.onTrendMetric({ target: { value: 'quality' } }); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendCards, card => card.label), ['质检通过率']); assert.equal(v.trendCards[0].current, '96%'); assert.equal(v.singleTrend, true); assert.equal(v.trendAriaLabel, '质检通过率趋势');
  assert.match(page, /aria-label="趋势指标"/); assert.match(page, /aria-label="趋势时间范围"/); assert.match(page, /data-single="\{\{ outsourcingSuppliers\.singleTrend \}\}"/); assert.match(page, /forge-outsourcing-mini-chart/); assert.doesNotMatch(page, /forge-outsourcing-target-line|目标 90%/);
  assert.match(page, /forge-outsourcing-trend-filter-metric/); assert.match(page, /forge-outsourcing-trend-filter-window/);
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
  v.onIssueSupplier({ target: { value: '' } }); v.onIssueWindow({ target: { value: '7d' } }); v = c.outsourcingSupplierValues();
  assert.equal(v.issueWindow, '7d'); assert.equal(v.issueTotal, 15); assert.deepEqual(Array.from(v.issueRows, row => row.count), [8, 4, 3]);
  assert.match(page, /aria-label="高频问题专家团队"/); assert.match(page, /aria-label="高频问题时间范围"/); assert.match(page, /forge-outsourcing-issue-list/); assert.match(page, /issue\.percentage/);
  assert.match(page, /class="forge-outsourcing-issue-track"/); assert.doesNotMatch(page, /最近出现|issue\.recent/);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  assert.match(css, /\.forge-outsourcing-issue-list article\{[^}]*grid-template-columns:minmax\(220px,\.9fr\) minmax\(180px,1\.3fr\) 72px/);
  assert.match(css, /\.forge-outsourcing-issue-track\{[^}]*height:8px[^}]*border-radius:999px[^}]*background:var\(--pm-subtle\)/);
  assert.match(css, /\.forge-outsourcing-issue-bar\{[^}]*display:block[^}]*height:100%[^}]*border-radius:inherit/);
});

test('management tab exposes all required fields and adds an in-memory expert team', () => {
  const c = component(); c.openOutsourcingSuppliers('management'); let v = c.outsourcingSupplierValues();
  assert(v.managementTab); assert.match(page, /专家团队名称 \*/); assert.match(page, /联系人/); assert.match(page, /联系方式/); assert.match(page, /任务类型/); assert.match(page, /目标产能/); assert.doesNotMatch(page, /默认产能/); assert.match(page, /合作状态/); assert.match(page, /备注/);
  assert.match(page, /<header class="forge-outsourcing-block-heading"><h2 id="outsourcing-management">专家管理<\/h2>[\s\S]*?<\/header>\s*<section class="forge-outsourcing-section" aria-labelledby="outsourcing-management">/);
  assert.doesNotMatch(page, /维护外部专家团队，与模型 API 供应商分开管理/);
  const managementTable = page.slice(page.indexOf('forge-outsourcing-management-table'));
  const managementHeader = managementTable.match(/<div role="row" class="forge-outsourcing-table-head"[\s\S]*?<\/div>/)[0];
  assert.equal((managementHeader.match(/class="forge-outsourcing-column-filter"/g) || []).length, 7);
  for (const label of ['筛选管理专家团队', '筛选联系人', '筛选合作状态', '筛选擅长任务', '目标产能排序', '质量排序', '筛选管理风险']) assert(managementHeader.includes('aria-label="' + label + '"'), label);
  assert.match(page, /list="forge-outsourcing-task-types"/); assert.match(page, /placeholder="输入或选择任务类型"/); assert.match(page, /<option value="Web3D"><\/option>/); assert.match(page, /<option value="质量复核"><\/option>/);
  assert.deepEqual(Array.from(v.managementRows, row => row.name), ['维象制作', '灵犀三维', '观澜质检']);
  v.onManagementStatus({ target: { value: '合作中' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.managementRows, row => row.id), ['stepfun', 'ant']);
  assert.equal(v.managementResetDisabled, false); assert.match(v.managementSummary, /显示 2 \/ 3 家/); v.resetManagement(); v = c.outsourcingSupplierValues(); assert.equal(v.managementResetDisabled, true);
  v.onManagementSpecialty({ target: { value: '动画' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.managementRows, row => row.id), ['ant']);
  v.onManagementStatus({ target: { value: '' } }); v.onManagementSpecialty({ target: { value: '' } }); v.onManagementRisk({ target: { value: 'low' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.managementRows, row => row.id), ['internal']);
  v.onManagementRisk({ target: { value: '' } }); v.onManagementSort({ target: { value: 'capacity-asc' } }); v = c.outsourcingSupplierValues(); assert.equal(v.managementCapacityOrder, 'capacity-asc'); assert.deepEqual(Array.from(v.managementRows, row => row.id), ['internal', 'ant', 'stepfun']);
  v.onManagementSort({ target: { value: 'quality-desc' } }); v = c.outsourcingSupplierValues(); assert.equal(v.managementQualityOrder, 'quality-desc'); assert.deepEqual(Array.from(v.managementRows, row => row.id), ['ant', 'internal', 'stepfun']);
  v.onManagementSupplier({ target: { value: 'missing' } }); v = c.outsourcingSupplierValues(); assert.equal(v.managementHasRows, false); assert.match(managementTable, /!outsourcingSuppliers\.managementHasRows/);
  v.openAdd(); v = c.outsourcingSupplierValues(); assert(v.addOpen); assert(!v.canAdd);
  v.onName({ target: { value: '北辰制作' } }); v.onTaskTypes({ target: { value: 'Web3D' } }); v = c.outsourcingSupplierValues(); assert(v.canAdd); v.add();
  v = c.outsourcingSupplierValues(); assert.equal(v.managementRows.at(-1).name, '北辰制作'); assert.equal(v.managementRows.at(-1).specialties, 'Web3D'); assert(!v.addOpen); assert.equal(v.managementRows.at(-1).tone, 'neutral');
});

test('supplier generator is idempotent and responsive CSS uses shared tokens', () => {
  assert.equal(updateOutsourcingSuppliers(source), source);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  const controls = fs.readFileSync(new URL('../public/postman-ui/controls.css', import.meta.url), 'utf8');
  assert.match(css, /\.forge-outsourcing-column-filter select\{[^}]*appearance:none[^}]*width:100%[^}]*border:0!important[^}]*background:transparent!important[^}]*text-overflow:ellipsis/);
  assert.match(css, /\.forge-outsourcing-column-filter:after\{[^}]*border-right:1\.5px solid currentColor[^}]*transform:rotate\(45deg\)/);
  assert.match(css, /\.forge-outsourcing-column-filter\[data-filter-active="true"\]\{[^}]*box-shadow:inset 0 -2px var\(--pm-brand\)[^}]*color:var\(--forge-text\)/);
  assert.match(css, /@media\(hover:hover\)\{\.forge-outsourcing-column-filter:hover/);
  assert.match(controls, /\.forge-postman \.forge-outsourcing-column-filter select:not\(\[multiple\],\[size\]\)\{appearance:none!important;-webkit-appearance:none!important;background:transparent!important;border:0!important/);
  assert.match(css, /\.forge-outsourcing-block-heading>button,\.forge-outsourcing-block-actions button,\.forge-outsourcing-section header>button/);
  assert.match(css, /data-tone="success"\][^{]*\{[^}]*background:var\(--outsourcing-status-success-bg\)[^}]*color:var\(--pm-success\)/);
  assert.match(css, /transition-property:scale,background-color,border-color,color,box-shadow[^}]*transition-duration:150ms[^}]*ease-out/);
  assert.match(css, /:active:not\(:disabled\)\{scale:\.96\}/); assert.doesNotMatch(css, /transition:\s*all/);
  assert.match(css, /forge-outsourcing-trend-cards>article\{[^}]*box-shadow:var\(--outsourcing-raised-shadow\)/);
  assert.match(css, /\.forge-outsourcing-trend-section\{[^}]*border:0[^}]*background:transparent/);
  assert.match(page, /class="forge-outsourcing-section forge-outsourcing-trend-section"/);
  assert.match(css, /\.forge-outsourcing-trend-filter-metric\{width:136px\}/);
  assert.match(css, /\.forge-outsourcing-trend-filter-window\{width:104px\}/);
  assert.match(css, /\.forge-outsourcing-trend-filter,\.forge-outsourcing-issue-filter\{width:100%;min-width:0\}/);
  assert.match(css, /@media\(max-width:1000px\)/); assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@container forge-suppliers \(max-width:760px\)/); assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(page, /sc-camel-on-key-down="\{\{ outsourcingSuppliers\.onDetailKeyDown \}\}"/); assert.doesNotMatch(page, /<button role="row"/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}|rgba?\(/i);
  for (const token of ['--forge-border', '--forge-panel', '--pm-brand', '--pm-chart-1']) assert(css.includes('var(' + token + ')'));
});
