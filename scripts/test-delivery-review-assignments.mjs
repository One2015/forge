import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import { updateDeliverySkillWorkspace } from './update-delivery-skill-workspace.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });
function component() {
  const context = vm.createContext({ URLSearchParams, TextEncoder, TextDecoder, Blob, DecompressionStream, structuredClone,
    window: { location: { search: '' } }, setTimeout() {}, clearTimeout() {},
    DCLogic: class {
      props = { currentUser: '一万', currentRole: 'member', hasRuns: true, hasResources: true,
        memberDirectory: [{ accountName: '一万', name: '一万' }, { accountName: 'reviewer', name: '审核员' }, { accountName: 'lead', name: '负责人', role: 'lead' }] };
      setState(patch) { Object.assign(this.state, patch); }
    }
  });
  vm.runInContext(code + ';globalThis.c = new Component()', context);
  const c = context.c;
  c.openDeliveryEditor();
  c.patchDeliveryEditor({ name: '审核分配测试单', customer: '客户', target: '2' });
  c.setDeliveryList('布达拉宫\n天坛');
  return c;
}
const panel = c => c.deliveryDatasetReviewValues();
const save = c => { confirmDelivery(c); assert.equal(c.deliveryEditorIssue(), ''); c.saveDeliveryEditor(); return c.deliverySheet(c.state.sheetKey); };

test('creation defaults each dataset to its owner, includes self and Lead, and retains sheet roles', () => {
  const c = component();
  assert.equal(panel(c).rows[0].reviewer, '一万');
  assert.match(panel(c).rows[0].options.find(person => person.accountName === 'lead').label, /Lead/);
  panel(c).rows[0].onReviewer(change('lead'));
  assert.equal(c.state.deliveryEditor.members[0].role, 'owner');
  assert.equal(c.state.deliveryEditor.members[1].accountName, 'lead');
  const sheet = save(c);
  assert.equal(sheet.datasetReviews.list.reviewer, 'lead');
  assert.equal(c.profileIdentity().key, 'member');
  c.props.currentUser = 'lead'; c.props.currentRole = 'lead';
  assert(c.profileDeliveryTasks().some(row => row.key === sheet.key));
  assert(c.deliveryNotificationItems().some(row => row.sheetKey === sheet.key));
});

test('outsourcing contacts appear as external experts and keep their external sheet role', () => {
  const c = component(), view = panel(c);
  const expert = view.rows[0].options.find(person => person.accountName === 'outsourcing:stepfun');
  assert(expert?.external); assert.match(expert.label, /^外部专家 · 陈安 · 维象制作$/);
  view.rows[0].onReviewer(change(expert.accountName));
  const member = c.state.deliveryEditor.members.find(person => person.accountName === expert.accountName);
  assert.equal(member.role, 'reviewer-outsourcing');
  assert.equal(member.detail, '外部专家 · 维象制作');
  assert.equal(c.deliveryMembersValues().rows.find(person => person.accountName === expert.accountName).detail, '外部专家 · 维象制作');
  const preview = c.deliveryWizardValues().memberPreview.find(person => person.name === '陈安');
  assert.equal(preview.roleLabel, '外部专家'); assert.equal(preview.summaryLabel, '外部专家 · 维象制作');
});

test('existing supplier sheets include their external expert team in members', () => {
  const c = component(); c.state.deliveryEditor = null; c.openDeliveryEditor('ant200');
  const expert = c.deliveryMembersValues().rows.find(person => person.accountName === 'outsourcing:ant');
  assert(expert); assert.equal(expert.name, '李木'); assert.equal(expert.detail, '外部专家 · 灵犀三维'); assert.equal(expert.role, 'reviewer-outsourcing');
});

test('production groups by Pipeline × dataset, deduplicates Items and survives resync and source mode changes', () => {
  const c = component(), tasks = c.deliveryProductionTasks().filter(task => !task.disabled);
  c.syncDeliveryProductionTasks(tasks.slice(0, 2).map(task => task.id));
  const expected = new Set(c.state.deliveryEditor.entries.map(entry => JSON.stringify([entry.sourcePipeline, entry.sourceDataset])));
  assert.equal(panel(c).count, expected.size);
  const row = panel(c).rows[0]; row.onReviewer(change('reviewer'));
  c.syncDeliveryProductionTasks(tasks.slice(0, 2).map(task => task.id));
  assert.equal(panel(c).rows.find(group => group.key === row.key).reviewer, 'reviewer');
  c.setDeliveryImportMode('zip', c.state.deliveryEditor.id);
  assert.equal(panel(c).count, 0);
  c.setDeliveryImportMode('production', c.state.deliveryEditor.id);
  assert.equal(panel(c).rows.find(group => group.key === row.key).reviewer, 'reviewer');
  c.patchDeliveryEditor({ target: String(c.state.deliveryEditor.entries.length) });
  const sheet = save(c), keys = Object.keys(sheet.datasetReviews);
  c.openDeliveryEditor(sheet.key);
  assert.deepEqual(Array.from(panel(c).rows, group => group.key), keys);
  c.patchDeliveryEditor({ desc: '仅编辑说明' }); c.saveDeliveryEditor();
  assert.deepEqual(Array.from(c.deliverySheet(sheet.key).sourceRunIds), Array.from(sheet.sourceRunIds));
});

test('uploaded ZIP forms one assignable dataset and removed sources are not persisted', () => {
  const c = component();
  c.patchDeliveryEditor({ importMode: 'zip', archive: { name: '验收数据集.zip', size: 100 } });
  assert.equal(panel(c).count, 1);
  assert.equal(panel(c).rows[0].name, '验收数据集.zip');
  panel(c).rows[0].onReviewer(change('reviewer'));
  c.patchDeliveryEditor({ archive: { name: '另一个数据集.zip', size: 100 } });
  assert.equal(panel(c).rows[0].reviewer, '一万');
  const sheet = save(c);
  assert.deepEqual(Object.keys(sheet.datasetReviews), ['zip:另一个数据集.zip']);
});

test('a deduplicated Item retains all dataset review scopes, while duplicate runs share one dataset assignment', () => {
  const c = component(), entry = c.state.deliveryEditor.entries[0];
  c.patchDeliveryEditor({ entries: [{ ...entry, sourceType: 'production', sourcePipeline: 'Web', sourceDataset: 'A', sourceRefs: [
    { runId: 'run1', itemId: entry.itemId, pipeline: 'Web', dataset: 'A' },
    { runId: 'run2', itemId: entry.itemId, pipeline: 'Web', dataset: 'A' },
    { runId: 'run3', itemId: entry.itemId, pipeline: 'Web', dataset: 'B' }
  ] }] });
  assert.equal(panel(c).count, 2);
  assert.deepEqual(Array.from(panel(c).rows, row => row.count), [1, 1]);
  panel(c).rows[0].onReviewer(change('lead'));
  assert.equal(panel(c).rows[1].reviewer, '一万');
});

test('a missing reviewer blocks final creation with an actionable reason', () => {
  const c = component(); panel(c).rows[0].onReviewer(change(''));
  confirmDelivery(c);
  assert.equal(c.state.deliveryEditor.step, 4);
  assert(c.deliveryWizardValues().disabled);
  assert.match(c.deliveryWizardValues().issue, /分配 Reviewer/);
  c.saveDeliveryEditor(); assert(!c.state.deliverySheets?.length);
  panel(c).rows[0].onReviewer(change('一万'));
  assert.equal(c.deliveryEditorIssue(), '');
  c.saveDeliveryEditor(); assert(c.deliverySheet(c.state.sheetKey));
});

test('saved sheets expose editing, cancellation is inert, and reassignment creates a scoped local notice', () => {
  const c = component(), sheet = save(c), before = JSON.stringify(sheet.datasetReviews);
  const edit = c.deliverySheetExtras(sheet).reviewAssignment.edit;
  edit(); assert.equal(c.state.deliveryEditor.tab, 'reviewers');
  panel(c).rows[0].onReviewer(change('reviewer'));
  panel(c).rows[0].onStatus(change('repair'));
  c.closeDeliveryEditor(); assert.equal(JSON.stringify(c.deliverySheet(sheet.key).datasetReviews), before);
  edit();
  panel(c).rows[0].onReviewer(change('reviewer')); panel(c).rows[0].onStatus(change('repair'));
  const decisions = JSON.stringify(c.state.reviewDecisions), runs = JSON.stringify(c.state.repairRuns);
  c.saveDeliveryEditor();
  const updated = c.deliverySheet(sheet.key);
  assert.equal(updated.datasetReviews.list.reviewer, 'reviewer');
  assert.equal(updated.datasetReviews.list.status, 'repair');
  assert.equal(updated.datasetReviewHistory.length, 2);
  assert.equal(JSON.stringify(c.state.reviewDecisions), decisions);
  assert.equal(JSON.stringify(c.state.repairRuns), runs);
  assert.equal(c.state.deliveryNotifications.length, 1);
  assert.equal(c.state.deliveryNotifications[0].channels.feishu, 'not-connected');
  c.openDeliveryEditor(sheet.key); c.patchDeliveryEditor({ desc: '普通更新' }); c.saveDeliveryEditor();
  assert.equal(c.state.deliveryNotifications.length, 1);
  c.props.currentUser = 'reviewer';
  assert.match(c.deliveryNotificationItems()[0].body, /审核分配给你.*Repair/);
});

test('a Reviewer can also be an owner and reassigning does not downgrade an existing role', () => {
  const c = component();
  c.updateDeliveryMember('lead', 'add', '', c.state.deliveryEditor.id);
  c.updateDeliveryMember('lead', 'role', 'owner', c.state.deliveryEditor.id);
  panel(c).rows[0].onReviewer(change('lead'));
  assert.equal(c.state.deliveryEditor.members.find(member => member.accountName === 'lead').role, 'owner');
  panel(c).rows[0].onReviewer(change('一万'));
  const sheet = save(c);
  assert.equal(sheet.members.filter(member => member.role === 'owner').length, 2);
});

test('removing an assigned member requires explicit reassignment before saving', () => {
  const c = component(); panel(c).rows[0].onReviewer(change('reviewer'));
  const sheet = save(c); c.openDeliveryEditor(sheet.key);
  c.updateDeliveryMember('reviewer', 'remove', '', c.state.deliveryEditor.id);
  assert.match(c.deliveryEditorIssue(), /先重新分配/);
  c.saveDeliveryEditor(); assert.equal(c.deliverySheet(sheet.key).datasetReviews.list.reviewer, 'reviewer');
  panel(c).rows[0].onReviewer(change('一万')); c.saveDeliveryEditor();
  assert.equal(c.deliverySheet(sheet.key).datasetReviews.list.reviewer, '一万');
});

test('permission, actor, invalid values and stale editor callbacks are checked at mutation and commit', () => {
  const c = component(), originalRow = panel(c).rows[0];
  originalRow.onReviewer(change('unknown')); originalRow.onStatus(change('pass'));
  assert.equal(panel(c).rows[0].reviewer, '一万'); assert.equal(panel(c).rows[0].status, 'pending');
  const sheet = save(c); c.openDeliveryEditor(sheet.key);
  originalRow.onReviewer(change('reviewer')); assert.equal(panel(c).rows[0].reviewer, '一万');
  const row = panel(c).rows[0]; c.props.currentUser = 'reviewer';
  row.onReviewer(change('reviewer')); assert.match(c.deliveryEditorIssue(), /账号已变更/);
  c.closeDeliveryEditor(); c.openDeliveryEditor(sheet.key);
  assert(panel(c).readonly); panel(c).rows[0].onStatus(change('repair'));
  assert.equal(panel(c).rows[0].status, 'pending');
  c.patchDeliveryEditor({ datasetReviews: { list: { reviewer: 'reviewer', status: 'repair' } } });
  assert.match(c.deliveryDatasetReviewIssue(), /仅数据单所有者/);
  c.saveDeliveryEditor(); assert.equal(c.deliverySheet(sheet.key).datasetReviews.list.status, 'pending');
});

test('concurrent source or assignment changes cannot be overwritten by an old editor', () => {
  const c = component(), sheet = save(c); c.openDeliveryEditor(sheet.key);
  panel(c).rows[0].onStatus(change('repair'));
  c.state.deliverySheets[0] = { ...c.state.deliverySheets[0], datasetReviews: { list: { reviewer: '一万', status: 'paused' } } };
  assert.match(c.deliveryDatasetReviewIssue(), /已更新/);
  c.saveDeliveryEditor(); assert.equal(c.deliverySheet(sheet.key).datasetReviews.list.status, 'paused');
});

test('concurrent member removal invalidates a saved review assignment even when the local roster was untouched', () => {
  const c = component(); panel(c).rows[0].onReviewer(change('reviewer'));
  const sheet = save(c); c.openDeliveryEditor(sheet.key);
  c.state.deliverySheets[0] = { ...c.state.deliverySheets[0], members: c.state.deliverySheets[0].members.filter(member => member.accountName !== 'reviewer') };
  panel(c).rows[0].onStatus(change('repair'));
  assert.match(c.deliveryEditorIssue(), /已更新/);
  c.saveDeliveryEditor();
  assert.equal(c.deliverySheet(sheet.key).datasetReviews.list.status, 'pending');
});

test('whitespace and reorder edits preserve production provenance, assigned reviewer and source runs', async () => {
  const c = component(), task = c.deliveryProductionTasks().find(task => task.count > 1);
  c.syncDeliveryProductionTasks([task.id]); c.patchDeliveryEditor({ target: String(c.state.deliveryEditor.entries.length) });
  panel(c).rows[0].onReviewer(change('reviewer'));
  const sheet = save(c), key = Object.keys(sheet.datasetReviews)[0];
  c.openDeliveryEditor(sheet.key);
  const oldEntries = c.state.deliveryEditor.entries.map(entry => ({ ...entry }));
  c.setDeliveryList(c.state.deliveryEditor.listText.split('\n').reverse().join('\n') + '\n');
  assert.equal(panel(c).rows[0].key, key);
  assert.equal(panel(c).rows[0].reviewer, 'reviewer');
  for (const entry of c.state.deliveryEditor.entries) {
    const old = oldEntries.find(value => value.key === entry.key);
    assert.equal(entry.itemId, old.itemId);
    assert.equal(JSON.stringify(entry.sourceRefs), JSON.stringify(old.sourceRefs));
  }
  c.saveDeliveryEditor();
  assert.equal(c.deliverySheet(sheet.key).datasetReviews[key].reviewer, 'reviewer');
  assert.deepEqual(Array.from(c.deliverySheet(sheet.key).sourceRunIds), [task.id]);
  // Explicitly replacing the source with an uploaded ZIP must instead create
  // an upload dataset, even when its filenames match existing production IDs.
  c.openDeliveryEditor(sheet.key);
  c.zipDirectory = () => oldEntries.map(entry => ({ path: entry.source }));
  await c.uploadDeliveryList({ name: 'replacement.zip', size: 20, arrayBuffer: async () => new ArrayBuffer(0) });
  assert.equal(panel(c).rows[0].key, 'zip:replacement.zip');
  assert.equal(panel(c).rows[0].reviewer, '');
  panel(c).rows[0].onReviewer(change('一万')); c.saveDeliveryEditor();
  assert.equal(c.deliverySheet(sheet.key).sourceRunIds.length, 0);
});

test('new controls are labelled, transient changes are dirty, and generators preserve the extension', () => {
  const c = component(); c.state.deliveryEditor.draftBaseline = c.deliveryDraftSignature(c.state.deliveryEditor);
  assert(!c.deliveryDraftDirty()); panel(c).rows[0].onStatus(change('reviewing')); assert(c.deliveryDraftDirty());
  assert(template.includes('aria-label="{{ dataset.reviewerLabel }}"'));
  assert(template.includes('disabled="{{ deliveryEditor.reviewAssignment.readonly }}"'));
  assert(template.includes('@container (max-width:520px)'));
  assert(template.includes('Repair 不会自动运行返工'));
  assert(!template.includes('[[dataset-review-assignments]]'));
  assert.equal(updateDeliverySkillWorkspace(source), source);
});
