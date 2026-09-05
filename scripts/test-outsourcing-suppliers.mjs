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

test('overview card and sidebar open the single outsourcing supplier destination', () => {
  for (const narrow of [false, true]) {
    const c = component({}, narrow);
    c.setState({ sidebarCollapsed: false, dlOpen: true, notifOpen: true });
    c.renderVals().sidebar.goSuppliers();
    assert.equal(c.state.view, 'outsourcing-suppliers');
    assert.equal(c.renderVals().showSubNav, false);
    assert.equal(c.state.dlOpen, false); assert.equal(c.state.notifOpen, false);
    assert.equal(c.state.sidebarCollapsed, narrow);
  }
  const c = component(), supplierCard = c.overviewSummary([], [])[5];
  assert.equal(supplierCard.k, '外包供应商表现'); assert.equal(supplierCard.actionable, true);
  supplierCard.go(); assert.equal(c.state.view, 'outsourcing-suppliers');
});

test('performance page keeps the required section order and clearly labels mock data', () => {
  const labels = ['整体供应商表现', '供应商表现筛选器', '单家供应商交付情况', '制作供应商达标趋势', '履约明细与风险评估', '高频问题'];
  let cursor = -1;
  for (const label of labels) { const next = page.indexOf(label); assert(next > cursor, label); cursor = next; }
  assert.match(page, /Mock 数据/); assert.match(page, /与模型 API 供应商分开管理/);
  const c = component(); c.openOutsourcingSuppliers(); const v = c.outsourcingSupplierValues();
  assert(v.demo); assert.deepEqual(Array.from(v.metrics, row => row.label), ['总交付目标', '总分配量', '最终有效交付量', '整体完成率', '整体质检通过率', '风险供应商数量']);
  assert(v.hasRows); assert(v.hasTrend); assert(v.hasIssues);
});

test('supplier, sheet and risk filters update all visible modules and empty states', () => {
  const c = component(); c.openOutsourcingSuppliers();
  c.outsourcingSupplierValues().onSupplier({ target: { value: 'stepfun' } });
  let v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 1); assert.equal(v.trendSupplier, '阶跃科技'); assert(v.issues.every(issue => issue.supplier === '阶跃科技'));
  v.onSheet({ target: { value: 'ant200' } }); v = c.outsourcingSupplierValues(); assert(!v.hasRows); assert(!v.hasTrend); assert(!v.hasIssues);
  v.reset(); v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 3);
  v.onRisk({ target: { value: 'low' } }); v = c.outsourcingSupplierValues(); assert.equal(v.detailRows.length, 1); assert.equal(v.metrics.at(-1).value, 0);
  v.reset(); v.onCycle({ target: { value: '7d' } }); v = c.outsourcingSupplierValues(); assert.deepEqual(Array.from(v.detailRows, row => row.id), ['stepfun', 'ant']);
});

test('supplier trend is a labelled three-series line chart with accessible points', () => {
  const c = component(); c.openOutsourcingSuppliers(); const v = c.outsourcingSupplierValues();
  assert.deepEqual(Array.from(v.trendWeeks), ['4 周前', '3 周前', '2 周前', '上周', '本周']);
  assert.equal(v.trendCompletion.length, 5); assert.equal(v.trendEffective.length, 5); assert.equal(v.trendQuality.length, 5);
  assert.match(v.trendCompletionLine, /^0,32 25,26 50,19 75,14 100,9$/);
  assert.match(page, /<polyline data-series="one"/); assert.match(page, /forge-outsourcing-y-axis/); assert.match(page, /forge-outsourcing-x-axis/);
  assert.match(page, /data-forge-chart-tooltip="\{\{ point\.title \}\}"/); assert.match(page, /type="button" data-series="one"/);
});

test('management tab exposes all required fields and adds an in-memory supplier', () => {
  const c = component(); c.openOutsourcingSuppliers('management'); let v = c.outsourcingSupplierValues();
  assert(v.managementTab); assert.match(page, /名称 \*/); assert.match(page, /联系人/); assert.match(page, /联系方式/); assert.match(page, /任务类型/); assert.match(page, /默认产能/); assert.match(page, /合作状态/); assert.match(page, /备注/);
  v.openAdd(); v = c.outsourcingSupplierValues(); assert(v.addOpen); assert(!v.canAdd);
  v.onName({ target: { value: '北辰制作' } }); v = c.outsourcingSupplierValues(); assert(v.canAdd); v.add();
  v = c.outsourcingSupplierValues(); assert.equal(v.managementRows.at(-1).name, '北辰制作'); assert(!v.addOpen);
});

test('supplier generator is idempotent and responsive CSS uses shared tokens', () => {
  assert.equal(updateOutsourcingSuppliers(source), source);
  const css = fs.readFileSync(new URL('./templates/outsourcing-suppliers.css', import.meta.url), 'utf8');
  assert.match(css, /@media\(max-width:1000px\)/); assert.match(css, /@media\(max-width:640px\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}|rgba?\(/i);
  for (const token of ['--forge-border', '--forge-panel', '--pm-brand', '--pm-chart-1']) assert(css.includes('var(' + token + ')'));
});
