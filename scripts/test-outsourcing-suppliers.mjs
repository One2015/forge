import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateOutsourcingSuppliers } from './update-outsourcing-suppliers.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const page = template.match(/<!-- outsourcing-suppliers:start -->[\s\S]*?<!-- outsourcing-suppliers:end -->/)[0];
const systemCss = fs.readFileSync(new URL('../public/postman-ui/forge-system.css', import.meta.url), 'utf8');

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
  const c = component(), supplierCard = c.renderVals().over.stats.find(card => card.k === '质检通过率');
  assert.match(supplierCard.cardLabel, /质检通过率/); assert.equal(supplierCard.v, 92.4);
  supplierCard.go(); assert.equal(c.state.view, 'outsourcing-suppliers');
});

test('performance page keeps the required section order without exposing fixture labels', () => {
  const labels = ['外部专家整体表现', '单个专家团队交付情况', '外部专家达标趋势', '高频问题'];
  let cursor = -1;
  for (const label of labels) { const next = page.indexOf(label); assert(next > cursor, label); cursor = next; }
  assert.doesNotMatch(page, /Mock 数据|履约明细与风险评估|外部专家表现筛选器|当前筛选范围的交付与风险汇总|点击专家团队名称查看履约、质量与风险详情|仅展示重复出现 3 次及以上的问题/);
  assert.doesNotMatch(page, /跟踪外部专家团队的交付、质量与履约风险，与模型 API 供应商分开管理。/);
  assert.match(page, /<header class="forge-outsourcing-heading"><h1 id="forge-outsourcing-supplier-title" tabindex="-1">外部专家<\/h1><\/header>/);
  assert.match(page, /aria-labelledby="outsourcing-overall"><header><h2 id="outsourcing-overall">外部专家整体表现<\/h2><\/header><dl class="forge-outsourcing-metrics">/);
  assert.match(page, /aria-labelledby="outsourcing-trend"><header><div><h2 id="outsourcing-trend">外部专家达标趋势<\/h2>[\s\S]*?<\/header><div class="forge-outsourcing-trend-toolbar">/);
  assert.match(page, /aria-labelledby="outsourcing-issues"><header><h2 id="outsourcing-issues">高频问题<\/h2><\/header><sc-if/);
  const c = component(); c.openOutsourcingSuppliers(); const v = c.outsourcingSupplierValues();
  assert(v.demo); assert.deepEqual(Array.from(v.metrics, row => row.label), ['总交付目标', '已分配任务量', '最终有效交付量', '整体完成率', '整体质检通过率', '风险专家团队']);
  assert.equal(v.metrics[0].value, 620); assert.equal(v.metrics[1].value, 602); assert.equal(v.metrics[0].value - v.metrics[1].value, 18);
  assert(v.hasRows); assert(v.hasTrend); assert(v.hasIssues);
});

test('supplier and risk filters update all visible modules and empty states', () => {
  const c = component(); c.openOutsourcingSuppliers();
  c.outsourcingSupplierValues().onSupplier({ target: { value: 'stepfun' } });
  let v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 1); assert.equal(v.trendSupplier, '整体专家团队'); assert(v.issues.every(issue => issue.supplier === '维象制作'));
  v.onRisk({ target: { value: 'low' } }); v = c.outsourcingSupplierValues(); assert(!v.hasRows); assert(!v.hasTrend); assert(!v.hasIssues);
  v.onSupplier({ target: { value: '' } }); v.onRisk({ target: { value: '' } }); v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 3);
  v.onRisk({ target: { value: 'low' } }); v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 1); assert.equal(v.metrics.at(-1).value, 0);
  v.onRisk({ target: { value: '' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant', 'internal']);
});

test('supplier trend is a labelled three-series line chart with accessible points', () => {
  const c = component(); c.openOutsourcingSuppliers(); c.outsourcingSupplierValues().onTrendTeam({target:{value:'stepfun'}}); let v = c.outsourcingSupplierValues();
  assert.equal(v.trendTeam, 'stepfun'); assert.equal(v.trendSupplier, '维象制作'); assert.equal(v.trendRange, 'day');
  assert.deepEqual(Array.from(v.trendLabels), ['4 天前', '3 天前', '前天', '昨天', '今天']);
  assert.equal(v.trendCompletion.length, 5); assert.equal(v.trendEffective.length, 5); assert.equal(v.trendQuality.length, 5);
  assert.match(v.trendCompletionLine, /^0,32 25,26 50,19 75,14 100,9$/);
  assert.deepEqual(Array.from(v.trendCards, card => card.label), ['任务完成率', '有效交付率', '质检通过率']);
  assert.equal(v.trendCards[0].current, '91%'); assert.equal(v.trendCards[0].change, '较昨日 +5 个百分点');
  assert.match(page, /forge-outsourcing-trend-cards/); assert.match(page, /forge-outsourcing-mini-chart/); assert.match(page, /目标 90%/);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  const targetRule = css.match(/\.forge-outsourcing-target-line\{([^}]*)\}/)?.[1] || '';
  assert.doesNotMatch(targetRule, /border|left:0/); assert.match(targetRule, /right:0/); assert.match(targetRule, /background:var\(--forge-panel\)/);
  assert.match(page, /data-forge-chart-tooltip="\{\{ point\.title \}\}"/); assert.match(page, /data-series="\{\{ series\.series \}\}"/);
  assert.match(page, /aria-label="筛选趋势专家团队"[^>]*value="\{\{ outsourcingSuppliers\.trendTeam \}\}"/);
  assert.match(page, /class="forge-outsourcing-trend-ranges" role="group" aria-label="趋势时间范围"/);
  assert(page.indexOf('aria-label="筛选趋势专家团队"') < page.indexOf('aria-label="趋势时间范围"'));
  assert.match(page, /trendRangeOptions/); assert.match(page, /aria-pressed="\{\{ option\.active \}\}"/); assert.match(page, /sc-camel-on-click="\{\{ option\.pick \}\}"/);
  assert.doesNotMatch(page, /<select aria-label="趋势时间范围"|outsourcingSuppliers\.onTrendRange/);
  assert.match(page, /<sc-if value="\{\{ outsourcingSuppliers\.trendCustom \}\}"><div class="forge-outsourcing-trend-custom-dates" role="group" aria-label="自定义趋势日期">/);
  assert.match(page, /aria-label="趋势开始日期"/); assert.match(page, /aria-label="趋势结束日期"/);
  assert.deepEqual(Array.from(v.trendRangeOptions, option => [option.id, option.label, option.active]), [['day','日',true],['month','月',false],['year','年',false],['custom','自定义',false]]);
  v.onTrendTeam({ target: { value: 'ant' } }); v = c.outsourcingSupplierValues();
  assert.equal(v.trendSupplier, '灵犀三维'); assert.equal(v.trendCards[0].current, '94%');
  v.trendRangeOptions.find(option => option.id === 'month').pick(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendLabels), ['5月', '6月', '7月', '8月', '9月']); assert.equal(v.trendCards[0].change, '较上月 +5 个百分点');
  assert.deepEqual(Array.from(v.trendRangeOptions, option => option.active), [false,true,false,false]);
  v.trendRangeOptions.find(option => option.id === 'year').pick(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendLabels), ['2022年', '2023年', '2024年', '2025年', '2026年']); assert.equal(v.trendCards[0].change, '较上年 +5 个百分点');
  v.trendRangeOptions.find(option => option.id === 'custom').pick(); v = c.outsourcingSupplierValues(); assert.equal(v.trendCustom, true); assert.deepEqual(Array.from(v.trendRangeOptions, option => option.active), [false,false,false,true]);
  v.onTrendStart({ target: { value: '2026-09-01' } }); v = c.outsourcingSupplierValues(); v.onTrendEnd({ target: { value: '2026-09-05' } }); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendLabels), ['9月1日', '9月2日', '9月3日', '9月4日', '9月5日']); assert.equal(v.trendCards[0].change, '较上一时点 +5 个百分点');
});

test('delivery table is concise and supplier names open the merged detail drawer', () => {
  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  for (const label of ['按专家团队筛选', '按风险等级筛选']) assert(page.includes('aria-label="' + label + '"'));
  for (const key of ['assignedSort', 'producedSort', 'validSort', 'completionSort', 'qualitySort', 'dateSort']) {
    assert(page.includes('aria-label="{{ outsourcingSuppliers.' + key + '.ariaLabel }}"'));
    assert(page.includes('sc-camel-on-click="{{ outsourcingSuppliers.' + key + '.toggle }}"'));
  }
  assert.equal(page.match(/class="forge-outsourcing-column-filter"/g)?.length, 3);
  assert.equal(page.match(/class="forge-outsourcing-column-sort"/g)?.length, 6);
  assert.match(page, /data-phosphor="arrows-down-up"/); assert.match(page, /data-phosphor="arrow-down"/); assert.match(page, /data-phosphor="arrow-up"/);
  assert.doesNotMatch(page, /按交付日期筛选|supplierCycle|onCycle|Sort\.change/);
  assert.match(page, /<span role="columnheader">数据单<\/span>/);
  assert.doesNotMatch(page, /按关联数据单筛选|outsourcingSuppliers\.(?:sheet|sheetActive|sheets|onSheet)/);
  assert.match(page, /class="forge-outsourcing-delivery-section"[^>]*><header><h2[^>]*>单个专家团队交付情况<\/h2><\/header><div class="forge-outsourcing-delivery-surface">/);
  assert.doesNotMatch(page, /重置筛选|forge-outsourcing-reset|outsourcingSuppliers\.(?:reset|resetDisabled)/);
  assert.doesNotMatch(page, /forge-outsourcing-filters|点击专家团队名称查看履约、质量与风险详情|目标 \/ 分配|生产 \/ 上传|<span>计划<\/span>/);
  assert.match(page, /class="forge-outsourcing-supplier-trigger"/); assert.match(page, /class="forge-outsourcing-drawer" role="dialog"/);
  v.detailRows[0].openDetail(); v = c.outsourcingSupplierValues();
  assert(v.detailOpen); assert.equal(v.detail.name, '维象制作'); assert.equal(v.detail.uploaded, 254); assert.equal(v.detail.cycleP95, 61); assert.equal(v.detail.riskLabel, '高风险');
  v.closeDetail(); assert(!c.outsourcingSupplierValues().detailOpen);
});

test('column sort buttons share one active direction and date supports newest and oldest', () => {
  const c = component(); c.openOutsourcingSuppliers(); let v = c.outsourcingSupplierValues();
  for (const control of [v.assignedSort, v.producedSort, v.validSort, v.completionSort, v.qualitySort, v.dateSort]) {
    assert.equal(control.order, ''); assert.equal(control.active, false); assert.equal(control.neutral, true); assert.match(control.ariaLabel, /默认顺序/);
  }
  v.assignedSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant', 'internal']);
  assert.equal(v.assignedSort.descending, true); assert.equal(v.completionSort.active, false); assert.match(v.assignedSort.ariaLabel, /最多优先/);
  v.assignedSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['internal', 'ant', 'stepfun']);
  assert.equal(v.assignedSort.ascending, true);
  v.assignedSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant', 'internal']); assert.equal(v.assignedSort.neutral, true);
  v.producedSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant', 'internal']);
  assert.equal(v.assignedSort.active, false); assert.equal(v.producedSort.active, true);
  v.validSort.toggle(); v = c.outsourcingSupplierValues(); v.validSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['internal', 'ant', 'stepfun']); assert.equal(v.producedSort.active, false);
  v.completionSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['ant', 'internal', 'stepfun']);
  assert.equal(v.validSort.active, false); assert.equal(v.completionSort.active, true);
  v.completionSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'internal', 'ant']);
  v.qualitySort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['ant', 'internal', 'stepfun']);
  assert.equal(v.completionSort.active, false); assert.equal(v.qualitySort.active, true);
  v.qualitySort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'internal', 'ant']);
  v.dateSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['internal', 'ant', 'stepfun']); assert.match(v.dateSort.ariaLabel, /最近优先/);
  v.dateSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant', 'internal']); assert.match(v.dateSort.ariaLabel, /最旧优先/);
  v.dateSort.toggle(); v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant', 'internal']);
  for (const control of [v.assignedSort, v.producedSort, v.validSort, v.completionSort, v.qualitySort, v.dateSort]) {
    assert.equal(control.order, ''); assert.equal(control.active, false);
  }
});

test('frequent issues use one multi-column table with company data in each row', () => {
  const c = component(); c.openOutsourcingSuppliers(); const v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.issues, issue => issue.supplier), ['维象制作', '维象制作', '灵犀三维']);
  assert.equal(v.issues[0].name, '材质与参考图不一致'); assert.equal(v.issues[0].scope, '3 个批次 · 42 项'); assert.equal(v.issues[0].count, 14); assert.equal(v.issues[0].recent, '昨日 18:40');
  assert.equal('issueGroups' in v, false);
  assert.match(page, /class="forge-outsourcing-issues-table" role="table" aria-label="高频问题列表"/);
  const issueHeaders = ['问题', '涉及公司', '影响', '次数', '出现时间'];
  let cursor = page.indexOf('forge-outsourcing-issues-table-head');
  for (const label of issueHeaders) { const next = page.indexOf('<span role="columnheader">' + label + '</span>', cursor); assert(next > cursor, label); cursor = next; }
  assert.match(page, /<sc-for list="\{\{ outsourcingSuppliers\.issues \}\}" as="issue"><div class="forge-outsourcing-issues-table-row" role="row"><strong role="cell">\{\{ issue\.name \}\}<\/strong><span role="cell">\{\{ issue\.supplier \}\}<\/span><span role="cell">\{\{ issue\.scope \}\}<\/span><strong role="cell">\{\{ issue\.count \}\} 次<\/strong><span role="cell">\{\{ issue\.recent \}\}<\/span>/);
  assert.doesNotMatch(page, /forge-outsourcing-issue-groups|group\.supplier|group\.count|group\.items|最近出现：|影响 \{\{ issue\.scope \}\}/);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  assert.match(css, /\.forge-outsourcing-issues-table-scroll\{overflow:auto\}/);
  assert.match(css, /\.forge-outsourcing-issues-table \[role="row"\]\{display:grid;grid-template-columns:minmax\(220px,1\.7fr\) minmax\(120px,1fr\) minmax\(170px,1\.3fr\) minmax\(72px,\.55fr\) minmax\(150px,1fr\)/);
  assert.doesNotMatch(css, /forge-outsourcing-issue-groups|forge-outsourcing-issue-main|forge-outsourcing-issue-meta/);
});

test('management tab exposes all required fields and adds an in-memory expert team', () => {
  const c = component(); c.openOutsourcingSuppliers('management'); let v = c.outsourcingSupplierValues();
  assert(v.managementTab); assert.match(page, /专家团队名称 \*/); assert.match(page, /联系人/); assert.match(page, /联系方式/); assert.match(page, /任务类型/); assert.match(page, /目标产能/); assert.doesNotMatch(page, /默认产能/); assert.match(page, /合作状态/); assert.match(page, /备注/);
  assert.match(page, /<section class="forge-outsourcing-section forge-outsourcing-management-section">/); assert.doesNotMatch(page, /forge-outsourcing-section forge-outsourcing-contained-section/);
  assert.match(page, /list="forge-outsourcing-task-types"/); assert.match(page, /placeholder="输入或选择任务类型"/); assert.match(page, /<option value="Web3D"><\/option>/); assert.match(page, /<option value="质量复核"><\/option>/);
  assert.deepEqual(Array.from(v.managementRows, row => row.name), ['维象制作', '灵犀三维', '观澜质检']);
  v.openAdd(); v = c.outsourcingSupplierValues(); assert(v.addOpen); assert(!v.canAdd);
  v.onName({ target: { value: '北辰制作' } }); v.onTaskTypes({ target: { value: 'Web3D' } }); v = c.outsourcingSupplierValues(); assert(v.canAdd); v.add();
  v = c.outsourcingSupplierValues(); assert.equal(v.managementRows.at(-1).name, '北辰制作'); assert.equal(v.managementRows.at(-1).specialties, 'Web3D'); assert(!v.addOpen);
});

test('supplier generator is idempotent and responsive CSS uses shared tokens', () => {
  assert.equal(updateOutsourcingSuppliers(source), source);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /forge-outsourcing-reset|重置筛选/);
  assert.match(css, /\.forge-outsourcing-delivery-surface\{[^}]*border:0;[^}]*border-radius:0;[^}]*background:transparent/);
  assert.match(css, /\.forge-outsourcing-delivery-table\{[^}]*border-radius:var\(--pm-radius\);[^}]*overflow:hidden/);
  assert.match(css, /\.forge-outsourcing-metrics,\.forge-outsourcing-issues-table\{[^}]*border:1px solid var\(--forge-border\);[^}]*border-radius:var\(--pm-radius\)/);
  assert.doesNotMatch(css, /\.forge-outsourcing-section\{[^}]*border:/);
  assert.doesNotMatch(css, /forge-outsourcing-reset/);
  assert.match(css, /\.forge-outsourcing \.forge-outsourcing-column-filter select\{[^}]*border:1px solid transparent;[^}]*border-radius:var\(--pm-radius\);[^}]*background:transparent;[^}]*field-sizing:content/);
  assert.match(css, /\.forge-outsourcing-sort-button\{[^}]*display:inline-flex;[^}]*border:0;[^}]*background:transparent;[^}]*cursor:pointer/);
  assert.match(css, /\.forge-outsourcing-column-sort\[data-active="true"\] \.forge-outsourcing-sort-button,\.forge-outsourcing-column-sort\[data-active="true"\] \.forge-icon\{color:var\(--pm-brand\)\}/);
  assert.match(css, /\.forge-outsourcing-trend-toolbar\{[^}]*justify-content:space-between/);
  assert.match(css, /\.forge-outsourcing-trend-ranges\{[^}]*display:inline-flex;[^}]*border:1px solid var\(--forge-control-border\)/);
  assert.match(css, /\.forge-outsourcing-trend-ranges button\[data-current="true"\]\{[^}]*background:var\(--pm-selected\);[^}]*color:var\(--pm-brand\)/);
  assert.doesNotMatch(systemCss, /\.forge-postman \.forge-outsourcing-section\{border:1px/);
  assert.match(systemCss, /\.forge-outsourcing-section:not\(\.forge-outsourcing-contained-section\)\{border:0!important;border-radius:0!important;background:transparent!important/);
  assert.match(systemCss, /\.forge-outsourcing-delivery-section \.forge-outsourcing-table-scroll\{border:0!important;border-radius:0!important;background:transparent!important/);
  assert.doesNotMatch(systemCss, /forge-outsourcing-reset/);
  assert.match(systemCss, /\.forge-outsourcing-column-filter select\{[^}]*border:1px solid transparent!important;[^}]*border-radius:var\(--radius-control\)!important;[^}]*background:transparent!important/);
  assert.match(systemCss, /\.forge-outsourcing-column-filter select::picker-icon\{margin-inline-start:4px!important\}/);
  assert.match(css, /@media\(max-width:1000px\)/); assert.match(css, /@media\(max-width:640px\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}|rgba?\(/i);
  for (const token of ['--forge-border', '--forge-panel', '--pm-brand', '--pm-chart-1']) assert(css.includes('var(' + token + ')'));
});

test('category filtering composes with risk and can recover from empty results', () => {
  const c = component();
  c.openOutsourcingSuppliers();
  let v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.categoryOptions, option => option.value), ['金融', '3D', '游戏']);
  v.onCategory({ target: { value: '3D' } });
  v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant']);
  v.onRisk({ target: { value: 'high' } });
  assert.equal(c.outsourcingSupplierValues().detailRows.length, 1);
  v.onCategory({ target: { value: '游戏' } });
  assert.equal(c.outsourcingSupplierValues().hasRows, false);
  v.onRisk({ target: { value: '' } });
  v.onCategory({ target: { value: '' } });
  assert.equal(c.outsourcingSupplierValues().detailRows.length, 3);
  assert(page.includes('aria-label="按品类筛选"'));
  assert(!page.includes('<sc-if value="{{ outsourcingSuppliers.hasRows }}">'));
  v.openAdd();
  c.outsourcingSupplierValues().onName({ target: { value: '游戏测试团队' } });
  c.outsourcingSupplierValues().onCategoryForm({ target: { value: '游戏' } });
  c.outsourcingSupplierValues().add();
  c.outsourcingSupplierValues().onCategory({ target: { value: '游戏' } });
  assert.equal(c.outsourcingSupplierValues().detailRows[0].category, '游戏');
});


test('trend team placeholder restores the weighted overall view after selecting a team', () => {
  const c = component(); c.openOutsourcingSuppliers();
  let v = c.outsourcingSupplierValues();
  assert.equal(v.trendTeam, '');
  assert.equal(v.trendSupplier, '整体专家团队');
  const overall = Array.from(v.trendCards, card => card.current);
  assert.deepEqual(overall, ['93.4%', '84.4%', '95.3%']);
  v.onTrendTeam({target:{value:'stepfun'}});
  v = c.outsourcingSupplierValues();
  assert.equal(v.trendCards[0].current, '91%');
  v.onTrendTeam({target:{value:''}});
  v = c.outsourcingSupplierValues();
  assert.equal(v.trendTeam, '');
  assert.deepEqual(Array.from(v.trendCards, card => card.current), overall);
  assert.equal(v.detailRows.length, 3);
  v.onCategory({target:{value:'金融'}});
  v = c.outsourcingSupplierValues();
  assert.equal(v.trendTeam, '');
  assert.equal(v.trendCards[0].current, '98%');
  v.onCategory({target:{value:'游戏'}});
  assert.equal(c.outsourcingSupplierValues().hasTrend, false);
});
