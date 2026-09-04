import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const click = { stopPropagation() {}, preventDefault() {} };
const key = value => ({ ...click, key: value });
function component(document = { activeElement: null }) {
  const context = vm.createContext({
    URLSearchParams, document, window: { location: { search: '' } },
    setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true };
      setState(patch) { this.state = { ...this.state, ...patch }; }
    },
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance;
  c.setState({ view: 'review', reviewOwner: 'all' });
  return c;
}
const focused = c => c.renderVals().review.items.find(i => i.expanded);
const open = c => { const row = c.renderVals().review.items.find(i => i.shortName === '布达拉宫'); row.start(click); return focused(c); };

test('开始审核 only opens the workbench and never creates a repair run or verdict', () => {
  const c = component();
  const before = JSON.stringify({ repairs: c.state.repairRuns, decisions: c.state.reviewDecisions });
  const row = c.renderVals().review.items.find(i => i.shortName === '布达拉宫');
  let stopped = false;
  row.start({ stopPropagation() { stopped = true; } });
  assert(stopped); assert.equal(c.state.reviewOpen, row.key); assert.equal(c.state.reviewTab, '预览');
  assert.equal(JSON.stringify({ repairs: c.state.repairRuns, decisions: c.state.reviewDecisions }), before);
});

test('opening a review keeps the full queue for position and navigation', () => {
  const c = component();
  const queue = c.renderVals().review.items;
  const row = open(c);
  assert.equal(c.renderVals().review.positionLabel, '4 / 19');
  assert.equal(c.renderVals().review.items.length, 1);
  assert.equal(row.dialogRole, 'dialog');
  c.renderVals().review.next();
  assert.equal(focused(c).key, queue[4].key);
  c.renderVals().review.previous();
  assert.equal(focused(c).key, row.key);
  c.handleReviewKey(key('ArrowUp'));
  assert.equal(focused(c).key, queue[2].key);
});

test('a single filtered result cannot switch to another Item', () => {
  const c = component(); c.setState({ reviewQuery: '布达拉宫' });
  const row = open(c);
  assert.equal(c.renderVals().review.positionLabel, '1 / 1');
  assert.equal(c.renderVals().review.cannotSwitch, true);
  c.renderVals().review.next();
  assert.equal(focused(c).key, row.key);
});

test('an Item-specific pending action opens the workbench directly', () => {
  const c = component();
  const target = c.renderVals().review.items.find(i => i.shortName === '布达拉宫');
  c.setState({ view: 'run', activeRun: target.runId, reviewQuery: 'unrelated previous search' });
  c.openReview(target.runId, { deepReview: { runId: target.runId, itemId: target.id } });
  assert.equal(focused(c).id, target.id);
  assert.equal(c.state.reviewQuery, '');
  c.renderVals().review.closeFocus();
  assert.equal(c.state.deepReview, null);
  c.openReview('all');
  assert.equal(c.state.reviewOpen, null);
  assert.equal(c.renderVals().review.items.length, 19);
});

test('case marks are exclusive and independent of review decisions', () => {
  const c = component(); const row = open(c);
  row.markGood(click);
  assert.equal(focused(c).goodCase, true);
  assert.equal(focused(c).badCase, false);
  focused(c).markBad(click);
  assert.equal(focused(c).goodCase, false);
  assert.equal(focused(c).badCase, true);
  assert.equal(c.state.sampleLabels[row.id], 'bad');
  assert.equal(c.state.reviewDecisions?.[row.key], undefined);
  assert.equal(focused(c).pending, true);
});

test('both case marks can be cleared by clicking the selected option again, without losing context', () => {
  const c = component(), row = open(c);
  c.setState({ sampleLabels: { unrelated: 'good' } });
  const before = JSON.stringify(c.state.reviewDecisions);
  for (const action of ['markGood', 'markBad']) {
    // Reuse the callback to cover rapid repeat clicks before a render completes.
    const toggle = focused(c)[action];
    toggle(click);
    assert.equal(c.state.sampleLabels[row.id], action === 'markGood' ? 'good' : 'bad');
    toggle(click);
    assert(!focused(c).goodCase && !focused(c).badCase);
    assert(!Object.hasOwn(c.state.sampleLabels, row.id));
    assert.equal(focused(c).key, row.key);
  }
  assert.equal(c.state.sampleLabels.unrelated, 'good');
  assert.equal(JSON.stringify(c.state.reviewDecisions), before);
  assert.equal(focused(c).pending, true);
});

test('marking and clearing stay synchronized between review and delivery for the same Item', () => {
  const c = component(), row = open(c);
  row.markGood(click);
  c.setState({ view: 'sheet', sheetKey: 'ant200', sheetRow: row.id });
  let tabs = c.renderVals().sheet.pick.sampleTabs;
  assert(tabs[0].selected); tabs[0].pick(click);
  c.setState({ view: 'review' });
  assert(!focused(c).goodCase && !focused(c).badCase);
  focused(c).markBad(click);
  c.setState({ view: 'sheet' });
  tabs = c.renderVals().sheet.pick.sampleTabs;
  assert(tabs[1].selected); tabs[1].pick(click);
  c.setState({ view: 'review' });
  assert(!focused(c).goodCase && !focused(c).badCase);
  assert.equal(focused(c).pending, true);
});

test('A opens confirmation; R submits directly from the inline panel with a required note', () => {
  const c = component(); const row = open(c);
  c.handleReviewKey(key('a'));
  assert.equal(c.state.passAsk, row.key);
  assert.equal(c.state.reviewDecisions?.[row.key], undefined);
  c.handleReviewKey(key('ArrowDown'));
  assert.equal(focused(c).key, row.key, 'No navigation through an active confirmation');
  c.setState({ passAsk: null });
  c.handleReviewKey(key('r'));
  assert.equal(focused(c).needsNote, true);
  assert.equal(focused(c).cannotSubmitNote, true);
  focused(c).submitNote(click);
  assert(!c.state.reworkAsk);
  focused(c).onNote({ target: { value: '请修复模型比例。' } });
  assert.equal(focused(c).canSubmitNote, true);
  focused(c).submitNote(click);
  assert.equal(c.state.reworkAsk, null);
  assert.equal(c.state.reviewDecisions?.[row.key], 'rework');
  assert.equal(c.state.repairRuns[row.key].note, '请修复模型比例。');
  assert.equal(c.state.reviewOpen, null);
});

test('typing never triggers navigation or a review shortcut', () => {
  const document = { activeElement: { tagName: 'TEXTAREA' } };
  const c = component(document); const row = open(c);
  for (const value of ['a', 'r', 'ArrowDown', 'ArrowUp']) c.handleReviewKey(key(value));
  assert.equal(focused(c).key, row.key);
  assert(!c.state.passAsk);
  assert(!focused(c).needsNote);
});

test('switching and returning to the queue preserve unfinished notes', () => {
  const c = component(); const row = open(c);
  row.rework(click);
  focused(c).onNote({ target: { value: '保留这份尚未提交的返工说明。' } });
  c.renderVals().review.next();
  c.renderVals().review.previous();
  assert.equal(focused(c).noteText, '保留这份尚未提交的返工说明。');
  c.handleReviewKey(key('Escape'));
  assert.equal(c.state.reviewOpen, null);
  assert.equal(c.state.reworkDrafts[row.key], true);
  assert.equal(c.renderVals().review.items.length, 19);
  open(c);
  assert.equal(focused(c).needsNote, true);
});

test('metadata comes from the selected Item, with truthful missing-asset states', () => {
  const c = component(); const row = open(c);
  assert.equal(row.assetType, '建筑');
  assert.equal(row.fileFormat, 'Three.js');
  assert.equal(row.submitter, 'yokiguan');
  assert(row.pipelineLabel && !row.pipelineLabel.includes('undefined'));
  assert.match(row.promptText, /布达拉宫/);
  assert.equal(row.referenceCount, '0/0 可用');
  assert.equal(row.referenceSlots.filter(r => r.available).length, 0);
  assert.equal(row.noPreviewImage, true);
  row.previewFiles(click);
  assert.equal(focused(c).showFiles, true);
  focused(c).returnPreview(click);
  assert.equal(focused(c).showPreview, true);
  focused(c).openLife(click);
  assert.equal(c.state.view, 'itemlife');
  assert.equal(c.state.lifeItem, row.id);
});

test('review metadata names the project owner without renaming submission history', () => {
  const metadata = template.match(/<dl class="review-workbench-metadata">([\s\S]*?)<\/dl>/)[1];
  assert(metadata.includes('<dt>项目负责人</dt><dd>{{ it.submitter }}</dd>'));
  assert(!metadata.includes('<dt>提交人</dt>'));
  assert(template.includes('· 提交了 {{ it.artifactVersion }}'));
  const sourceTemplate = fs.readFileSync(new URL('./templates/review-workbench.html', import.meta.url), 'utf8');
  assert(sourceTemplate.includes('<dt>项目负责人</dt><dd>{{ it.submitter }}</dd>'));
});

test('workbench is outside the hidden queue header with balanced HTML', () => {
  const start = template.indexOf('<div data-review-workbench=');
  const end = template.indexOf('<sc-if value="{{ review.empty }}"', start);
  const markup = template.slice(start, end);
  const stack = [];
  const voids = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
  for (const tag of markup.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/g)) {
    const [full, name] = tag;
    if (name === 'header' && !full.startsWith('</')) assert.deepEqual(stack.slice(-2), ['div', 'sc-if']);
    if (voids.has(name) || full.endsWith('/>')) continue;
    if (full.startsWith('</')) {
      // The slice closes the containing queue and pending condition after the card.
      if (stack.length) assert.equal(stack.pop(), name, full);
    } else stack.push(name);
  }
  assert.equal(stack.length, 0);
  assert(markup.includes('review-workbench-actions'));
  assert(markup.includes('aria-pressed="{{ it.goodCase }}"'));
  assert(!markup.includes('未标注'));
});
