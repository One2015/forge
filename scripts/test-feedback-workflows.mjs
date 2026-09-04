import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateBranchDefaultItem } from './update-branch-default-item.mjs';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const click = { stopPropagation() {}, preventDefault() {} };
function component() {
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' }, addEventListener() {}, removeEventListener() {} },
    document: { activeElement: null, querySelector: () => null },
    FileReader: class {
      readAsDataURL(file) { queueMicrotask(() => { if (file.fail) this.onerror(); else { this.result = 'data:' + file.type + ';base64,' + (file.invalid ? 'invalid' : 'image'); this.onload(); } }); }
    },
    Image: class { naturalWidth = 1; set src(value) { queueMicrotask(() => value.endsWith('invalid') ? this.onerror() : this.onload()); } },
    setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true };
      setState(patch) { this.state = { ...this.state, ...patch }; }
    }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}
const file = (name = 'roof.png', extra = {}) => ({ name, type: 'image/png', size: 256000, ...extra });
test('image box shows used and remaining slots, disables at six and reopens after removal', async () => {
  const c = component(); let view = c.feedbackView('test');
  assert.equal(view.countLabel, '已上传 0/6 张'); assert.equal(view.remaining, 6); assert.match(view.capacityHint, /6 张/);
  await c.addFeedbackImages('test', Array.from({ length: 6 }, (_, i) => file('test-' + i + '.png')));
  view = c.feedbackView('test'); assert.equal(view.countLabel, '已上传 6/6 张'); assert.equal(view.remaining, 0); assert(view.full);
  assert.equal(view.uploadLabel, '已达 6 张上限'); view.images[0].remove();
  view = c.feedbackView('test'); assert.equal(view.remaining, 1); assert(!view.full); assert.equal(view.uploadLabel, '点击上传图片');
});
const focused = c => c.renderVals().review.items.find(row => row.expanded);
function review(c) {
  c.setState({ view: 'review', reviewOwner: 'all' });
  const row = c.renderVals().review.items.find(row => row.shortName === '布达拉宫');
  row.start(click); focused(c).rework(click); return focused(c);
}
function branch(c) {
  const sheet = c.deliveryData().flatMap(customer => customer.sheets).find(sheet => c.sheetRows(sheet).some(row => row[3] === 'passed'));
  const row = c.sheetRows(sheet).find(row => row[3] === 'passed');
  c.setState({ view: 'sheet', sheetKey: sheet.key, sheetRow: row[2] });
  const pick = c.renderVals().sheet.pick;
  pick.rounds.at(-1).branch(click);
  return { row, form: c.branchFormValues() };
}

test('real image data is read with loading and removable preview metadata', async () => {
  const c = component(), row = review(c);
  const upload = c.feedbackView(row.key).upload({ target: { value: 'roof.png', files: [file()] } });
  assert.equal(c.feedbackView(row.key).loading, true);
  await upload;
  const image = c.feedbackView(row.key).images[0];
  assert.equal(image.name, 'roof.png'); assert.match(image.url, /^data:image\/png;base64,/);
  assert.equal(image.sizeLabel, '250 KB'); assert.equal(image.ready, true);
  image.remove(click); assert.equal(c.feedbackImages(row.key).length, 0);
});

test('clipboard image paste is scoped to the active editor; text paste stays native', async () => {
  const c = component(); let prevented = 0;
  const event = { preventDefault: () => prevented++, clipboardData: { items: [{ kind: 'file', getAsFile: () => file() }] } };
  c.handleFeedbackPaste(event); assert.equal(prevented, 0);
  const row = review(c); await c.handleFeedbackPaste(event);
  assert.equal(prevented, 1); assert.equal(c.feedbackImages(row.key).length, 1);
  c.handleFeedbackPaste({ ...event, clipboardData: { items: [{ kind: 'string' }] } });
  assert.equal(prevented, 1);
  c.setState({ view: 'runs' }); c.handleFeedbackPaste(event); assert.equal(prevented, 1);
});

test('invalid, oversized and unreadable files produce inline errors', async () => {
  const c = component();
  await c.addFeedbackImages('test', [file('bad.svg', { type: 'image/svg+xml' }), file('large.png', { size: 11 * 1048576 })]);
  assert.equal(c.feedbackImages('test').length, 0); assert(c.feedbackView('test').hasError);
  await c.addFeedbackImages('test', [file('broken.png', { invalid: true })]);
  assert.equal(c.feedbackImages('test').length, 0); assert.match(c.feedbackView('test').error, /无法读取/);
  await c.addFeedbackImages('test', [file('failed.png', { fail: true })]);
  assert.equal(c.feedbackImages('test').length, 0);
});

test('six-image limit survives concurrent uploads; cancellation does not resurrect images', async () => {
  const c = component();
  const first = c.addFeedbackImages('test', Array.from({ length: 5 }, (_, i) => file(i + '.png')));
  const second = c.addFeedbackImages('test', [file('six.png'), file('seven.png')]);
  assert.equal(c.feedbackImages('test').length, 6); await Promise.all([first, second]);
  assert.equal(c.feedbackView('test').full, true);
  const pending = c.addFeedbackImages('cancelled', [file()]);
  c.setFeedbackImages('cancelled', [], ''); await pending;
  assert.equal(c.feedbackImages('cancelled').length, 0);
});

test('rework submits note and attachments without confirmation, preserving source', async () => {
  const c = component(), row = review(c);
  focused(c).onNote({ target: { value: '   ' } }); focused(c).submitNote(click);
  assert(!c.state.repairRuns);
  focused(c).onNote({ target: { value: '  修复台阶  ' } });
  const upload = c.addFeedbackImages(row.key, [file()]);
  focused(c).submitNote(click); assert(!c.state.repairRuns);
  await upload; focused(c).submitNote(click);
  const run = c.state.repairRuns[row.key];
  assert.equal(run.note, '修复台阶'); assert.equal(run.sourceRun, row.runId);
  assert.equal(run.attachments.length, 1); assert.equal(c.state.reworkAsk, null);
  assert.equal(c.state.reviewDecisions[row.key], 'rework');
  c.submitInlineRework(row.key, row.runId); assert.equal(c.state.repairRuns[row.key], run);
});

test('navigation retains drafts and cancellation clears both notes and actual images', async () => {
  const c = component(), row = review(c);
  focused(c).onNote({ target: { value: '草稿' } }); await c.addFeedbackImages(row.key, [file()]);
  c.renderVals().review.next(); c.renderVals().review.previous();
  assert.equal(focused(c).noteText, '草稿'); assert.equal(focused(c).feedback.images.length, 1);
  focused(c).cancelNote(click); assert.equal(c.feedbackImages(row.key).length, 0); assert.equal(focused(c).pending, true);
});

test('historical branch action opens the new dialog with source context and disabled submit', () => {
  const c = component(), { row, form } = branch(c);
  assert.equal(form.open, true); assert.match(form.title, /创建独立分支/);
  assert.equal(c.state.branchAsk.item, row[2]); assert.equal(c.state.branchAsk.runId, row[5]);
  assert.match(form.name, /分支 B-01$/); assert.equal(form.disabled, true);
  assert.equal(form.invalidConfig, false);
  assert.equal(form.item, row[2]);
  assert.equal(form.items.filter(item => item.selected).length, 1);
  assert.equal(form.items.find(item => item.selected).value, row[2]);
  c.createBranchRun(); assert(!c.state.submittedRuns);
  form.onNote({ target: { value: '修复屋顶材质' } }); assert.equal(c.branchFormValues().disabled, false);
});

test('Mogao branch inherits its source Item even when the dataset picker omits that row', () => {
  const c = component();
  const sheet = c.deliveryData().flatMap(customer => customer.sheets).find(sheet => sheet.key === 'step300');
  const row = c.sheetRows(sheet).find(row => row[0] === '莫高窟');
  const catalogBefore = JSON.stringify(c.dsData());
  c.setState({ view: 'sheet', sheetKey: sheet.key, sheetRow: row[2] });
  c.renderVals().sheet.pick.rounds[1].branch(click);
  let form = c.branchFormValues();
  assert.equal(form.item, row[2]);
  assert.equal(form.items.filter(item => item.selected).length, 1);
  assert.match(form.items.find(item => item.selected).label, /^莫高窟 · /);
  assert.match(form.configuration, /Item  莫高窟$/);
  assert.equal(form.configHeading, '沿用来源配置');
  assert.equal(form.invalidConfig, false);
  form.toggleConfig();
  form = c.branchFormValues();
  form.onPipe({ target: { value: form.pipe } });
  form.onDs({ target: { value: form.ds } });
  assert.equal(c.branchFormValues().item, row[2], 're-emitting the same selection must not clear the Item');
  const alternative = form.items.find(item => !item.selected);
  form.onItem({ target: { value: alternative.value } });
  assert.equal(c.branchFormValues().item, alternative.value);
  form.onItem({ target: { value: row[2] } });
  form.onNote({ target: { value: '优化洞窟细节' } });
  assert.equal(c.branchFormValues().disabled, false);
  c.createBranchRun();
  assert.equal(c.state.submittedRuns[0].itemIds[0], row[2]);
  assert.equal(JSON.stringify(c.dsData()), catalogBefore, 'source fallback must not mutate global datasets');
});

test('source Item fallback is dataset-scoped and does not admit arbitrary or cleared Items', () => {
  const c = component(); branch(c);
  const sourceItem = c.state.branchAsk.item, sourceDs = c.state.branchDs;
  const form = c.branchFormValues();
  const alternativeDs = form.datasets.find(ds => ds.value !== sourceDs);
  assert(alternativeDs);
  form.onDs({ target: { value: alternativeDs.value } });
  let changed = c.branchFormValues();
  assert.equal(changed.item, ''); assert(changed.invalidConfig);
  assert(!changed.items.some(item => item.value === sourceItem));
  changed.onItem({ target: { value: sourceItem } });
  assert(c.branchFormValues().invalidConfig);
  changed.onDs({ target: { value: sourceDs } });
  changed = c.branchFormValues();
  assert.equal(changed.item, '', 'changing datasets is explicit and must not silently select an Item');
  changed.onItem({ target: { value: 'not-in-this-dataset' } });
  assert(c.branchFormValues().invalidConfig);
  c.cancelBranchForm(); branch(c);
  assert.equal(c.branchFormValues().item, sourceItem, 'reopening starts from the source, not a stale draft');
});

test('native branch options declare the exact selection and the focused generator is idempotent', () => {
  for (const name of ['pipeline', 'dataset', 'item']) {
    const select = template.match(new RegExp('<select id="forge-branch-' + name + '"[\\s\\S]*?</select>'))[0];
    assert(select.includes('selected="{{ opt.selected }}"'));
  }
  assert.equal(updateBranchDefaultItem(source), source);
});

test('changing Pipeline resets dependent Dataset and Item; incomplete config stays disabled', () => {
  const c = component(); branch(c);
  c.branchFormValues().onNote({ target: { value: '修复结构' } });
  c.branchFormValues().onPipe({ target: { value: '' } });
  let form = c.branchFormValues(); assert(form.disabled && form.dsDisabled && form.itemDisabled);
  form.onPipe({ target: { value: c.pipeData()[0].name } });
  form = c.branchFormValues(); assert.equal(c.state.branchDs, ''); assert.equal(c.state.branchItem, '');
  form.onDs({ target: { value: form.datasets[0].value } });
  form = c.branchFormValues(); assert(form.disabled); assert.equal(form.itemDisabled, false);
  form.onItem({ target: { value: form.items[0].value } });
  assert.equal(c.branchFormValues().disabled, false);
  c.setState({ branchDs: 'unrelated' }); assert.equal(c.branchFormValues().disabled, true);
});

test('branch creation queues a single independent run, carries attachments and leaves mainline unchanged', async () => {
  const c = component(), { row } = branch(c), sourceVersion = c.state.branchAsk.version;
  const before = JSON.stringify(c.itemStateOf(row[2], { legacy: row[3], runId: row[5] }));
  c.branchFormValues().onNote({ target: { value: '保留结构，优化材质' } });
  await c.handleFeedbackPaste({ preventDefault() {}, clipboardData: { items: [{ kind: 'file', getAsFile: () => file() }] } });
  c.createBranchRun(); c.createBranchRun();
  assert.equal(c.state.submittedRuns.length, 1);
  const run = c.state.submittedRuns[0], record = c.state.branches[row[2]][0];
  assert.equal(run.strategy, '独立分支'); assert.equal(run.status, 'queued');
  assert.equal(run.branchSource.version, sourceVersion); assert.equal(record.attachments.length, 1);
  assert.equal(run.attachments[0].url, record.attachments[0].url); assert.equal(c.state.branchAsk, null);
  assert.equal(JSON.stringify(c.itemStateOf(row[2], { legacy: row[3], runId: row[5] })), before);
});

test('duplicate branch names and pending attachments cannot submit', async () => {
  const c = component(), { row } = branch(c);
  c.branchFormValues().onNote({ target: { value: '迭代' } });
  c.setState({ branches: { [row[2]]: [{ name: c.state.branchName }] } });
  assert.equal(c.branchFormValues().duplicate, true); assert.equal(c.branchFormValues().disabled, true);
  c.branchFormValues().onName({ target: { value: '新分支' } });
  const key = c.state.branchAsk.attachmentKey, upload = c.addFeedbackImages(key, [file()]);
  assert.equal(c.branchFormValues().disabled, true);
  c.cancelBranchForm(click); await upload;
  assert.equal(c.state.branchAsk, null); assert.equal(c.feedbackImages(key).length, 0);
});

test('markup removes confirmation overlay and uses native dialog with labeled file inputs', () => {
  assert(!template.includes('{{ reworkAsk.open }}'));
  assert(!template.includes('{{ sheet.pick.branchAskOpen }}'));
  assert(template.includes('<dialog class="forge-branch-dialog forge-feedback"'));
  assert(template.includes('sc-camel-on-cancel="{{ branch.cancel }}"'));
  assert(template.includes('disabled="{{ branch.disabled }}"'));
  assert(template.includes('aria-label="上传返工参考图片"'));
  assert(template.includes('aria-label="上传分支参考图片"'));
});

test('delivery detail rework stays in its right panel, confirms and retains uploaded images in the task', async () => {
  const c = component(); branch(c); c.cancelBranchForm();
  c.renderVals().sheet.pick.rework(click);
  let pick = c.renderVals().sheet.pick;
  assert.equal(pick.detailDisplay, 'none'); assert.equal(pick.cannotSubmitRework, true);
  pick.onReworkText({ target: { value: '修复材质' } });
  await c.handleFeedbackPaste({ preventDefault() {}, clipboardData: { items: [{ kind: 'file', getAsFile: () => file() }] } });
  pick = c.renderVals().sheet.pick;
  assert.equal(pick.feedback.images.length, 1); assert.equal(pick.canSubmitRework, true);
  pick.submitRework(click);
  pick = c.renderVals().sheet.pick;
  assert.equal(pick.reworkConfirm.open, true); assert.equal(Object.keys(c.state.repairRuns || {}).length, 0);
  pick.reworkConfirm.confirm(click);
  const run = Object.values(c.state.repairRuns)[0];
  assert.equal(run.note, '修复材质'); assert.equal(run.attachments.length, 1);
  assert.equal(c.renderVals().sheet.pick.reworkFormOpen, false);
});

test('all bundled interface markup is balanced after replacing the delivery overlay', () => {
  const markup = template.slice(template.indexOf('<x-dc'), template.indexOf('<script type="text/x-dc"'));
  const voids = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
  const stack = [];
  for (const match of markup.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/g)) {
    const [tag, name] = match;
    if (voids.has(name) || tag.endsWith('/>')) continue;
    if (tag.startsWith('</')) assert.equal(stack.pop(), name, 'Unexpected ' + tag);
    else stack.push(name);
  }
  assert.equal(stack.length, 0);
});
