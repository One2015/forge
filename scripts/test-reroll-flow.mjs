import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const click = { stopPropagation() {}, preventDefault() {} };
const clean = value => JSON.parse(JSON.stringify(value));

function component() {
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' } },
    navigator: { clipboard: { writeText() {} } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true };
      setState(patch) { this.state = { ...this.state, ...patch }; }
    },
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}

function fixture(c) {
  const p = c.pipeData()[0];
  const d = c.dsData().find(d => d.name === p.datasets[0][0]);
  return { runId: 'source-run', itemId: d.items[0][0], subject: d.items[0][4],
    pipe: p.name, ver: p.version, dsName: d.name, dsVersion: d.version };
}
const rows = c => c.renderVals().dsGroups.flatMap(group => group.items);
function choose(c, pipeIndex = 0) {
  const p = c.pipeData()[pipeIndex];
  c.renderVals().pipelines.find(row => row.name === p.name).run(click);
  const d = rows(c)[0];
  assert(d, 'Related dataset should be selectable');
  d.select(click);
  return p;
}

test('run-task Reroll opens Production Pipeline selection without starting a run', () => {
  const c = component();
  const sourceRun = c.runsData().find(r => r.failed > 0);
  c.setState({ view: 'run', activeRun: sourceRun.id });
  const row = c.renderVals().run.items.find(i => i.canRetry && i.retryLabel === 'Reroll');
  assert(row);
  row.retry(click);
  assert.equal(c.state.view, 'pipelines');
  assert.equal(c.renderVals().isPipelines, true);
  assert.equal(c.state.runPipeline, null);
  assert.equal(c.state.selDs, null);
  assert.deepEqual(clean(c.state.picked), {});
  assert.equal(c.state.rerollContext.sourceRunId, sourceRun.id);
  assert.equal(c.state.rerollContext.sourceItemId, row.id);
  assert.equal(c.state.submittedRuns?.length || 0, 0);
});

test('Reroll resets stale configuration and search but retains source context', () => {
  const c = component();
  const ctx = fixture(c);
  c.setState({ runPipeline: 'old v99', selDs: 'old', dsVersion: 'v99', dsVersions: true,
    picked: { old: true }, dsQuery: 'old', pipeQuery: 'old', pipeFilter: '废弃' });
  c.startReroll(ctx);
  assert.equal(c.state.view, 'pipelines');
  for (const key of ['runPipeline', 'selDs', 'dsVersion']) assert.equal(c.state[key], null);
  assert.equal(c.state.dsQuery, '');
  assert.equal(c.state.pipeQuery, '');
  assert.equal(c.state.dsVersions, false);
  assert.equal(c.state.pipeFilter, '全部');
  assert.equal(c.state.rerollFrom, ctx.itemId);
  assert.match(c.renderVals().rerollHintText, /请先选择 Pipeline/);
  assert.doesNotMatch(c.renderVals().rerollHintText, /已沿用/);
});

test('Pipeline, related dataset, and Item must each be explicitly selected', () => {
  const c = component(); c.startReroll(fixture(c));
  const p = c.pipeData()[0];
  c.renderVals().pipelines.find(row => row.name === p.name).run();
  assert.equal(c.state.view, 'datasets');
  assert.equal(c.state.selDs, null);
  assert.equal(c.renderVals().showRunSteps, true);
  const related = new Set(p.datasets.map(d => d[0]));
  assert(rows(c).every(d => related.has(d.name)));
  assert.equal(rows(c).length, p.datasets.length);
  rows(c).find(d => d.name === c.state.rerollDs).select();
  assert.deepEqual(clean(c.state.picked), {});
  assert.equal(c.renderVals().ds.canRun, false);
  c.renderVals().ds.submit();
  assert.equal(c.state.submittedRuns?.length || 0, 0);
  c.renderVals().ds.items[0].toggle(click);
  assert.equal(c.renderVals().ds.canRun, true);
  assert.equal(c.renderVals().ds.runLabel, '确认 Reroll');
  assert.equal(c.renderVals().steps[2].markDone, true);
});

test('changing dataset, version, or Pipeline clears previously selected Items', () => {
  const c = component(); c.startReroll(fixture(c)); choose(c);
  c.renderVals().ds.items[0].toggle(click);
  c.renderVals().ds.versions[0].pick(click);
  assert.deepEqual(clean(c.state.picked), {});
  c.renderVals().ds.items[0].toggle(click);
  rows(c).find(d => d.name !== c.state.selDs).select();
  assert.deepEqual(clean(c.state.picked), {});
  c.renderVals().ds.items[0].toggle(click);
  const sourceItem = c.state.rerollFrom;
  c.renderVals().steps[0].click();
  assert.equal(c.state.view, 'pipelines');
  assert.equal(c.state.selDs, null);
  assert.equal(c.state.runPipeline, null);
  assert.deepEqual(clean(c.state.picked), {});
  assert.equal(c.state.rerollFrom, sourceItem);
  const other = c.pipeData()[1];
  c.renderVals().pipelines.find(p => p.name === other.name).run();
  assert(rows(c).every(d => other.datasets.some(link => link[0] === d.name)));
  assert.equal(c.state.selDs, null);
});

test('missing Pipeline or an unrelated dataset cannot be submitted', () => {
  const c = component(); const ctx = fixture(c);
  c.setState({ view: 'datasets', selDs: ctx.dsName, picked: { [ctx.itemId]: true } });
  assert.equal(c.renderVals().ds.canRun, false);
  c.renderVals().ds.submit();
  assert.equal(c.state.submittedRuns?.length || 0, 0);
  c.selectRunPipeline(c.pipeData()[1]);
  c.setState({ selDs: ctx.dsName, picked: { [ctx.itemId]: true } });
  assert.equal(c.renderVals().hasDs, false);
  c.setState({ runPipeline: 'missing-pipeline v1' });
  assert.equal(c.renderVals().dsEmpty, true);
  assert.match(c.renderVals().dsEmptyHint, /暂无可用/);
});

test('confirmation creates a new Reroll with selected inputs and source provenance', () => {
  const c = component(); const ctx = fixture(c);
  const existing = clean(c.runsData());
  c.startReroll(ctx);
  const selectedPipeline = choose(c, 1);
  const selectedDs = c.state.selDs;
  const selectedItem = c.renderVals().ds.items[1];
  assert(selectedItem.id !== ctx.itemId);
  selectedItem.toggle(click);
  c.renderVals().ds.submit();
  assert.equal(c.state.view, 'submitted');
  const run = c.state.submittedRuns[0];
  assert.equal(run.strategy, 'Reroll');
  assert.equal(run.pipe, selectedPipeline.name);
  assert.equal(run.ver, selectedPipeline.version);
  assert.equal(run.dsName, selectedDs);
  assert.deepEqual(clean(run.itemIds), [selectedItem.id]);
  assert.equal(run.rerollSource.sourceRunId, ctx.runId);
  assert.equal(run.rerollSource.sourceItemId, ctx.itemId);
  assert.equal(c.state.rerollFrom, null);
  assert.equal(c.renderVals().done.title, '已提交 1 条 Item');
  assert.deepEqual(clean(c.runsData().filter(r => existing.some(e => e.id === r.id))), existing);
  c.renderVals().done.openRun();
  assert.equal(c.renderVals().run.items[0].id, selectedItem.id);
});

test('a missing source does not skip selection or block choosing another valid configuration', () => {
  const c = component();
  c.startReroll({ runId: 'old-run', itemId: 'missing', dsName: 'removed', pipe: 'removed', ver: 'v1' });
  assert.equal(c.state.view, 'pipelines');
  assert.equal(c.state.selDs, null);
  assert.match(c.renderVals().rerollHintText, /来源数据集已不可用/);
  choose(c);
  c.renderVals().ds.items[0].toggle(click);
  assert.equal(c.renderVals().ds.canRun, true);
});

test('normal creation uses the same selection flow without stale Reroll attribution', () => {
  const c = component(); c.startReroll(fixture(c));
  c.renderVals().goPipelines();
  assert.equal(c.state.rerollFrom, null);
  assert.equal(c.state.rerollContext, null);
  choose(c);
  assert.equal(c.renderVals().ds.canRun, false);
  c.renderVals().ds.items[0].toggle(click);
  c.renderVals().ds.submit();
  assert.equal(c.state.submittedRuns[0].strategy, '首次生成');
  assert.equal(c.state.submittedRuns[0].rerollSource, null);
});

test('the auto-filled confirmation shortcut is removed', () => {
  assert(!template.includes('rerollCompact'));
  assert(!template.includes('datasetPickerDisplay'));
  assert(!template.includes('系统已沿用原配置'));
  assert(!template.includes('editReroll'));
  assert(!template.includes('沿用原数据集与 Item 发起 Reroll'));
  assert(!template.includes('可直接 Reroll'));
});
