import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const template = JSON.parse(fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8').split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const click = {stopPropagation() {}, preventDefault() {}};
const item = '9f2a7c1b5e8d4036a1c4e7b209d6f8a3';
const key = item + ':Run 3';
function component() {
  const context = vm.createContext({URLSearchParams, window: {location: {search: ''}},
    document: {querySelector: () => null}, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {props = {panelWidth: 460, hasRuns: true, hasResources: true}; setState(patch) {Object.assign(this.state, patch);}}
  });
  vm.runInContext(code + ';globalThis.c = new Component();', context);
  context.c.setState({view: 'itemlife', lifeItem: item, sheetKey: 'ant200'});
  return context.c;
}
function node(c, kind = 'Run 3') {return c.renderVals().life.nodes.find(n => n.kind === kind && n.canFork);}
function submit(c, text = '保留结构，优化屋顶材质') {
  c.branchFormValues().onNote({target: {value: text}});
  assert.equal(c.branchFormValues().disabled, false, c.branchFormValues().configError);
  c.createBranchRun();
  return c.state.submittedRuns.at(-1);
}
function ready(c, run) {run.status = 'success'; run.done = 1;}
function root(c) {node(c).append(click); return submit(c);}

test('history replaces the inline comment editor with separate expand and append controls', () => {
  const c = component(), n = node(c);
  assert(n); n.toggle(click);
  assert.equal(c.state.branchAsk, undefined);
  assert(node(c).expanded);
  n.append(click);
  assert.equal(c.branchFormValues().title, '从 Run 3 追加修改');
  assert.equal(c.branchFormValues().disabled, true);
  assert.equal(c.branchFormValues().invalidConfig, false);
  assert.equal(c.state.branchAsk.historyKey, key);
  assert.equal(c.state.branchAsk.origin.run, 'Run 3');
  assert(!template.includes('{{ n.forkClosed }}'));
  assert(!template.includes('添加评论'));
  assert(template.includes('aria-label="分支修改树"'));
  assert(template.includes('disabled="{{ n.appendDisabled }}"'));
  assert(!c.renderVals().life.nodes.filter(n => n.badge === '失败' || ['数据集', '交付'].includes(n.kind)).some(n => n.canFork));
});

test('append queues one independent run, snapshots images, and exposes a child under the exact source', () => {
  const c = component(), before = JSON.stringify(c.itemStateOf(item)), quota = c.renderVals().life.quota;
  node(c).append(click);
  c.setFeedbackImages(c.state.branchAsk.attachmentKey, [{id: 'ref', name: 'roof.png', url: 'data:image/png;base64,test', status: 'ready', size: 120}], '');
  const run = submit(c), record = c.state.forks[key][0];
  c.createBranchRun();
  assert.equal(c.state.submittedRuns.length, 1);
  assert.equal(record.parent, null); assert.equal(record.runId, run.id);
  assert.equal(record.attachments[0].name, 'roof.png');
  assert.equal(c.state.branches[item][0].runId, run.id);
  assert.equal(JSON.stringify(c.itemStateOf(item)), before);
  assert.equal(c.renderVals().life.quota, quota);
  assert(node(c).hasForks); assert(node(c).expanded);
  const tree = node(c).tree;
  assert.equal(tree.length, 1); assert.equal(tree[0].depth, 0);
  assert.equal(tree[0].stateLabel, '排队中'); assert(tree[0].appendDisabled);
  assert.equal(c.state.branchAsk, null);
});

test('follow-up modifications nest under their actual parent and keep the parent run/config', () => {
  const c = component(), first = root(c); ready(c, first);
  node(c).tree[0].append(click);
  assert.equal(c.state.branchAsk.runId, first.id);
  assert.equal(c.state.branchAsk.parentName, c.state.forks[key][0].name);
  assert.match(c.state.branchName, /修改 1$/);
  assert.equal(c.branchFormValues().configHeading, '沿用来源配置');
  const second = submit(c, '完善台阶'); ready(c, second);
  node(c).tree[1].append(click); const third = submit(c, '调整标注');
  assert.equal(third.branchSource.runId, second.id);
  assert.deepEqual(Array.from(node(c).tree, n => n.depth), [0, 1, 2]);
  assert.match(node(c).tree[2].origin, /修改 1/);
  assert.equal(node(c).tree[2].runId, third.id);
});

test('changing source Item config is inherited by later changes without changing the owner Item', () => {
  const c = component(); node(c).append(click);
  const form = c.branchFormValues(), alternative = form.items.find(value => value.value !== item);
  assert(alternative); form.onItem({target: {value: alternative.value}});
  const run = submit(c); ready(c, run); node(c).tree[0].append(click);
  assert.equal(c.state.branchAsk.item, item);
  assert.equal(c.branchFormValues().item, alternative.value);
  assert.equal(c.branchFormValues().configHeading, '沿用来源配置');
});

test('running, queued, failed or removed sources cannot be appended even via direct callbacks', () => {
  const c = component(), run = root(c);
  for (const status of ['queued', 'running', 'failed']) {
    run.status = status;
    const n = node(c).tree[0]; assert(n.appendDisabled); n.append(click);
    assert.equal(c.state.branchAsk, null);
  }
  ready(c, run); node(c).tree[0].append(click);
  c.branchFormValues().onNote({target: {value: '后续修改'}});
  assert.equal(c.branchFormValues().disabled, false);
  c.state.forks[key] = [];
  assert(c.branchFormValues().disabled);
  assert.match(c.branchFormValues().configError, /已移除/);
  c.createBranchRun(); assert.equal(c.state.submittedRuns.length, 1);
});

test('names remain unique across the old history and shared dialog branch stores', () => {
  const c = component(); c.state.forks = {[item + ':审核 1']: [{name: '已有分支'}]};
  node(c).append(click); c.branchFormValues().onName({target: {value: '已有分支'}});
  c.branchFormValues().onNote({target: {value: '修改'}});
  assert(c.branchFormValues().duplicate); assert(c.branchFormValues().disabled);
});

test('legacy parent links, disconnected drafts and cycles render once; deep trees cap indentation only', () => {
  const c = component();
  const records = Array.from({length: 9}, (_, i) => ({name: '修改 ' + i, parent: i ? '修改 ' + (i - 1) : null, state: 'review', at: Date.now()}));
  records.push({name: '并行分支', derivedFrom: '修改 0', state: 'review'});
  records.push({name: '失联草稿', parent: '已删除', state: 'review'});
  records.push({name: '循环 A', parent: '循环 B', state: 'review'}, {name: '循环 B', parent: '循环 A', state: 'review'});
  c.state.forks = {[key]: records};
  const tree = c.historyBranchTree(item, key, {kind: 'Run 3'});
  assert.equal(tree.length, records.length);
  assert.equal(new Set(tree.map(n => n.name)).size, records.length);
  assert.equal(tree[8].depth, 8); assert.equal(tree[8].visualDepth, 5);
  assert.equal(tree[8].origin, '源自 修改 7');
  assert.equal(tree[9].name, '并行分支'); assert.equal(tree[9].depth, 1);
  const otherKey = item + ':审核 1'; c.state.forks[otherKey] = [records[0]];
  assert.notEqual(tree[0].detailsId, c.historyBranchTree(item, otherKey)[0].detailsId);
});

test('complete branch record matches queued/completed state and only shows its descendants', () => {
  const c = component(), run = root(c);
  node(c).tree[0].openRecord(click);
  assert.equal(c.renderVals().life.state, '排队中');
  assert.equal(c.renderVals().life.nodes.find(n => n.title === '分支执行').hasPreview, false);
  assert(c.renderVals().life.nodes.find(n => n.title === '分支执行').appendDisabled);
  ready(c, run);
  let branch = c.renderVals().life;
  assert.equal(branch.state, '待审核');
  branch.nodes.find(n => n.title === '分支执行').append(click); submit(c, '后续迭代');
  branch = c.renderVals().life;
  assert.equal(branch.nodes.filter(n => n.hasForks).length, 1);
  assert(branch.nodes.find(n => n.hasForks).expanded);
  assert.equal(branch.nodes.find(n => n.hasForks).tree.length, 1);
  branch.nodes.find(n => n.hasForks).tree[0].openRecord(click);
  assert.equal(c.state.lifeBranch.trunkKind, 'Run 3');
  branch.backToTrunk(); assert.equal(node(c).tree.length, 2);
});

test('run navigation and task association retain exact branch identity', () => {
  const c = component(), run = root(c); ready(c, run);
  const tree = node(c).tree[0]; tree.openRun(click);
  assert.equal(c.state.activeRun, run.id); assert.equal(c.state.view, 'run');
  let linked; c.openTaskLink = source => {linked = source;};
  tree.link(click);
  assert.equal(linked.forkKey, key); assert.equal(linked.forkName, c.state.forks[key][0].name);
  assert.equal(linked.itemId, item);
});

test('removal requires confirmation, removes descendants, and never deletes actual runs', () => {
  const c = component(), run = root(c); ready(c, run);
  node(c).tree[0].append(click); submit(c, '后续修改');
  const first = node(c).tree[0]; first.discard(); assert.equal(node(c).tree.length, 2);
  first.askDiscard(); first.cancelDiscard(); first.discard(); assert.equal(node(c).tree.length, 2);
  first.askDiscard(); first.discard();
  assert.equal(node(c).tree.length, 0); assert.equal(c.state.submittedRuns.length, 2);
  assert.equal(c.state.branches[item].length, 0);
});

test('derived branches use neutral cards, orange accents and the reference two-column layout', () => {
  const css = fs.readFileSync(new URL('./templates/history-branch-tree.css', import.meta.url), 'utf8');
  const c = component(); root(c);
  assert.equal(node(c).forkGroupLabel, '派生分支 · 1 条');
  assert(template.includes('class="forge-life-node-layout" data-branches="{{ n.hasForks }}" data-expanded="{{ n.expanded }}"'));
  assert.match(css, /@media\(min-width:1040px\).*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\.forge-branch-tree-content\{[^}]*border:1px solid var\(--forge-border\)[^}]*background:var\(--forge-panel\)/);
  assert.match(css, /\.forge-branch-tree-heading\{[^}]*color:var\(--forge-accent\)/);
  assert.doesNotMatch(css, /#6a4bb8|#54399c|#f7f4fd|--forge-branch\)/);
  const badge = template.match(/<button type="button" class="forge-life-branch-shortcut"[\s\S]*?<\/button>/)[0];
  assert(badge.includes('life.jumpBranch')); assert(!badge.includes('#6a4bb8'));
  assert(template.includes('aria-label="查看分支完整记录"'));
  assert(template.includes('aria-label="移除分支记录"'));
});

test('branch progress retains true queued/running/review/deliverable states and source metadata', () => {
  const c = component(), run = root(c), record = c.state.forks[key][0];
  assert.equal(node(c).tree[0].steps[0].label, '排队中');
  for (const [status, stepIndex] of [['running', 0], ['success', 1], ['failed', 0]]) {
    run.status = status;
    const n = node(c).tree[0];
    assert.equal(n.steps.findIndex(s => s.active), stepIndex);
    assert.equal(n.sourceVersion, 'Run 3');
    assert.equal(n.creator, '一万');
    assert.equal(n.branchItemId, c.branchIid(item, record.name));
    if (status === 'running') assert.equal(n.stateFg, 'var(--forge-accent)');
  }
  record.state = 'deliverable';
  const n = node(c).tree[0];
  assert(n.steps[2].active); assert(n.steps[1].complete); assert(n.canLink);
});

test('branch previews use only branch assets and show an honest missing/loading state', () => {
  const c = component(), run = root(c);
  let n = node(c).tree[0];
  assert(n.noPreviewImage); assert.equal(n.previewLabel, '等待分支产物');
  ready(c, run); n = node(c).tree[0];
  assert.equal(n.previewLabel, '暂无分支预览');
  run.previewImage = 'data:image/png;base64,preview';
  n = node(c).tree[0]; assert(n.hasPreviewImage); assert.equal(n.previewImage, run.previewImage);
});
