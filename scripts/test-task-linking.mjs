import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const raw = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(raw.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function component() {
  const context = vm.createContext({ URLSearchParams, setTimeout: () => 0, clearTimeout() {}, window: { location: { search: '' } },
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { this.state = { ...this.state, ...patch }; } } });
  vm.runInContext(code + ';globalThis.c = new Component();', context); return context.c;
}
const change = value => ({ target: { value } });
const sourceId = 'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f', sourceRef = { sheetKey: 'ant200', itemId: sourceId };
const targetId = '4c8e1f9a2b7d5e3016a9c2f4b8d7e0a1';
function choose(c, id = targetId) { c.taskLinkValues().items.find(item => item.id === id).choose(); }
function confirm(c) { c.taskLinkValues().onAck({ target: { checked: true } }); c.submitTaskLink(); }
function fork(c, state = 'deliverable') {
  const ref = { itemId: sourceId, sheetKey: 'ant200', forkKey: sourceId + ':Run 2', forkName: '分支 A' };
  c.state.forks = { [ref.forkKey]: [{ name: ref.forkName, state, runId: 'branch-result', previewImage: '/test-preview.png' }] }; return ref;
}
function custom(c) {
  c.openDeliveryEditor(); c.patchDeliveryEditor({ name: '测试数据单', customer: '客户', target: '2' }); c.setDeliveryList('客户模型\n第二个模型'); c.saveDeliveryEditor(); return c.deliverySheet(c.state.sheetKey);
}

test('all source detail entry points are wired and use a labelled native dialog', () => {
  for (const field of ['sheet.pick.link', 'life.link', 'run.link', 'it.link']) assert(template.includes('{{ ' + field + '.open }}'));
  assert(template.includes('<dialog class="forge-task-link-dialog"'));
  assert(template.includes('label="{{ option.label }}"'));
  assert(template.includes('aria-label="{{ option.label }}"'));
  assert(template.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert(template.includes("if (this.state.taskLink) {"));
  assert(template.includes('本地演示 · 刷新后清空'));
  assert(template.includes('sc-camel-on-error="{{ item.imageError }}"'));
});

test('search covers all sheet IDs including not-started Items and does not escape the sheet', () => {
  const c = component(); c.openTaskLink(sourceRef);
  assert.equal(c.taskLinkValues().items.length, 6);
  assert(c.taskLinkValues().items.some(row => row.name === '客家土楼'));
  c.taskLinkValues().onQuery(change(targetId.slice(10, 20).toUpperCase())); assert.equal(c.taskLinkValues().items.length, 1);
  c.taskLinkValues().onQuery(change('莫高窟')); assert(c.taskLinkValues().empty);
  c.taskLinkValues().onSheet(change('step300')); assert.equal(c.taskLinkValues().query, ''); assert.equal(c.taskLinkValues().items.length, 4);
  assert(c.taskLinkValues().disabled);
});

test('updating a delivered slot requires confirmation, retains its ID/history and source decisions', () => {
  const c = component(), before = JSON.stringify(c.state.reviewDecisions), count = c.deliverySheet('ant200').passed;
  c.openTaskLink(sourceRef); choose(c); assert(c.taskLinkValues().needsAck); assert(c.taskLinkValues().disabled);
  c.submitTaskLink(); assert(!c.state.deliveryLinks);
  confirm(c);
  const link = c.state.deliveryLinks.ant200[targetId];
  assert.equal(link.current.label, 'v3'); assert.equal(link.history[0].source.itemId, targetId);
  assert.equal(link.current.source.itemId, sourceId);
  const row = c.sheetRows(c.deliverySheet('ant200')).find(value => value[2] === targetId);
  assert.equal(row[0], '大昭寺'); assert.equal(row[2], targetId); assert.equal(row[6].currentDeliverableVersion.label, 'v3');
  assert.equal(c.deliverySheet('ant200').passed, count); assert.equal(JSON.stringify(c.state.reviewDecisions), before);
  assert.match(c.state.taskLinkToast.text, /旧版本已保留/); assert.equal(c.state.taskLinkToast.tone, 'success');
  assert.equal(c.taskLinkHistory(c.deliverySheet('ant200'), targetId).length, 2);
});

test('duplicate association is blocked without adding a version or increasing totals', () => {
  const c = component(); c.openTaskLink(sourceRef); choose(c); confirm(c);
  c.openTaskLink(sourceRef); choose(c); assert.match(c.taskLinkValues().issue, /已经关联/);
  c.submitTaskLink(); assert.equal(c.state.deliveryLinks.ant200[targetId].revision, 1);
  assert.equal(c.state.taskLinkToast.tone, 'warning');
});

test('cancel and sheet changes never save selection or confirmation', () => {
  const c = component(); c.openTaskLink(sourceRef); choose(c); c.taskLinkValues().onAck({ target: { checked: true } });
  c.taskLinkValues().onSheet(change('step300')); assert.equal(c.state.taskLink.selectedId, ''); assert(!c.state.taskLink.acknowledged);
  c.closeTaskLink(); assert(!c.state.deliveryLinks); assert(!c.state.taskLink);
});

test('stale target versions cannot be overwritten by an old confirmation', () => {
  const c = component(); c.openTaskLink(sourceRef); choose(c); c.taskLinkValues().onAck({ target: { checked: true } });
  c.state.deliveryLinks = { ant200: { [targetId]: { revision: 99, current: null, candidate: null, history: [] } } };
  c.submitTaskLink(); assert.equal(c.state.deliveryLinks.ant200[targetId].revision, 99);
  assert.equal(c.state.taskLink.selectedId, ''); assert.match(c.state.taskLinkToast.text, /版本已变化/);
});

test('first association resolves an imported unlinked Item without changing its assigned ID', () => {
  const c = component(), sheet = custom(c), id = c.deliveryEntries(sheet)[0].deliveryItemId;
  assert.match(id, /^ITEM_/);
  c.openTaskLink(sourceRef); c.taskLinkValues().onSheet(change(sheet.key)); choose(c, id);
  assert(!c.taskLinkValues().needsAck); c.submitTaskLink();
  const updated = c.deliverySheet(sheet.key); assert.equal(updated.linked, 1); assert.equal(updated.passed, 1);
  assert.equal(c.sheetRows(updated)[0][2], id); assert.equal(c.sheetRows(updated)[0][0], '客户模型');
  assert.equal(c.deliverySheetExtras(updated).entries[0].status, '已关联最终版本');
  c.openDeliveryEditor(sheet.key); const originalId = c.state.deliveryEditor.entries[0].deliveryItemId; c.setDeliveryList('客户模型\n第二个模型');
  assert.equal(c.state.deliveryEditor.entries[0].deliveryItemId, originalId);
});

test('branch creation assigns a new delivery ID and v1 without mutating trunk', () => {
  const c = component(), ref = fork(c), before = c.deliverySheet('ant200').passed;
  c.openTaskLink(ref); assert(c.taskLinkValues().allowNew); c.taskLinkValues().newMode();
  assert(!c.taskLinkValues().disabled); c.submitTaskLink();
  const entry = c.state.deliveryNewItems.ant200[0]; assert.match(entry.deliveryItemId, /^ITEM_/); assert.notEqual(entry.deliveryItemId, sourceId);
  assert.equal(c.state.deliveryLinks.ant200[entry.deliveryItemId].current.label, 'v1');
  assert.equal(c.deliverySheet('ant200').passed, before + 1); assert.equal(c.baseSheetRows(null).find(row => row[2] === sourceId)[6].currentDeliverableVersion.label, 'Run 2');
  assert.match(c.state.taskLinkToast.text, /已创建/);
  c.openDeliveryEditor('ant200'); assert(c.state.deliveryEditor.entries.some(value => value.deliveryItemId === entry.deliveryItemId));
});

test('branch new-Item mode blocks empty/duplicate names and cannot be used by main tasks', () => {
  const c = component(), ref = fork(c); c.openTaskLink(ref); c.taskLinkValues().newMode();
  c.taskLinkValues().onName(change('')); assert(c.taskLinkValues().disabled);
  c.taskLinkValues().onName(change('天坛')); assert(c.taskLinkValues().nameDuplicate); assert(c.taskLinkValues().disabled);
  c.closeTaskLink(); c.openTaskLink(sourceRef); assert(!c.taskLinkValues().allowNew);
  c.patchTaskLink({ mode: 'new' }); c.submitTaskLink(); assert(!c.state.deliveryNewItems);
});

test('pending branch links as candidate, does not replace delivery, and promotes only its exact decision', () => {
  const c = component(), ref = fork(c, 'review'), before = c.deliverySheet('ant200').passed;
  c.openTaskLink(ref); choose(c); assert(!c.taskLinkValues().needsAck); c.submitTaskLink();
  let link = c.deliveryLinkState(c.deliverySheet('ant200'), c.deliveryEntries(c.deliverySheet('ant200')).find(entry => entry.itemId === targetId));
  assert.equal(link.current.label, 'Run 2'); assert.equal(link.candidate.label, 'v3'); assert.equal(c.deliverySheet('ant200').passed, before);
  assert.equal(c.state.taskLinkToast.tone, 'info'); assert.match(c.state.taskLinkToast.text, /候选/);
  c.state.forks[ref.forkKey][0].state = 'deliverable';
  link = c.deliveryLinkState(c.deliverySheet('ant200'), c.deliveryEntries(c.deliverySheet('ant200')).find(entry => entry.itemId === targetId));
  assert.equal(link.current.label, 'v3'); assert.equal(link.candidate, null);
});

test('ready/failed/queued run states recheck at entry and before saving', () => {
  const c = component();
  const ref = { runId: '20260824-163805-814774', index: 0 }; c.openTaskLink(ref); assert(!c.state.taskLink); assert.equal(c.state.taskLinkToast.tone, 'warning');
  const branch = fork(c); c.openTaskLink(branch); choose(c); c.taskLinkValues().onAck({ target: { checked: true } });
  c.state.forks[branch.forkKey][0].state = 'running'; c.submitTaskLink(); assert(!c.state.deliveryLinks);
  c.state.forks[branch.forkKey] = []; assert(c.taskLinkValues().disabled);
});

test('missing/invalid previews show explicit fallback and failed images do not remain broken', () => {
  const c = component(); assert.equal(c.taskLinkPreview('javascript:alert(1)'), '');
  assert.equal(c.taskLinkPreview('//unsafe.test/p.png'), ''); assert.equal(c.taskLinkPreview('/preview.png'), '/preview.png');
  c.taskLinkImageError('/preview.png'); assert.equal(c.taskLinkPreview('/preview.png'), '');
  c.openTaskLink(sourceRef); assert(c.taskLinkValues().items.every(item => item.noPreview));
});

test('association and review skills are scoped to sheet, target ID and source run', () => {
  const c = component(), sheet = custom(c), ref = fork(c, 'review');
  c.state.deliverySheets[0].skills = [{ id: 's', command: '3d trajectory', content: 'test' }];
  c.openTaskLink(ref); c.taskLinkValues().onSheet(change(sheet.key)); choose(c, c.deliveryEntries(sheet)[0].deliveryItemId); c.submitTaskLink();
  const ctx = { itemId: c.branchIid(sourceId, ref.forkName), runId: 'branch-result' };
  assert.equal(c.boundReviewSkills(ctx).length, 1); assert.equal(c.boundReviewSkills({ ...ctx, runId: 'unrelated' }).length, 0);
  assert.equal(c.boundReviewSkills({ ...ctx, sheetKey: 'ant200' }).length, 0);
});

test('reviewing a linked candidate uses its source task identity and promotes only that slot', () => {
  const c = component(), sheet = custom(c), ref = fork(c, 'review'), id = c.deliveryEntries(sheet)[0].deliveryItemId;
  c.openTaskLink(ref); c.taskLinkValues().onSheet(change(sheet.key)); choose(c, id); c.submitTaskLink();
  c.state.view = 'sheet'; c.state.sheetKey = sheet.key; c.state.sheetRow = id;
  assert(c.renderVals().sheet.pick.needsReview); c.renderVals().sheet.pick.confirmPass();
  assert.equal(c.state.reviewDecisions['branch-result:' + c.branchIid(sourceId, '分支 A')], 'pass');
  assert.equal(c.deliverySheet(sheet.key).passed, 1); assert.equal(c.sheetRows(c.deliverySheet(sheet.key))[0][6].candidateVersion, null);
});

test('rejected linked candidates never become deliverable and preserve an existing final version', () => {
  const c = component(), ref = fork(c, 'review'); c.openTaskLink(ref); choose(c); c.submitTaskLink();
  c.state.view = 'sheet'; c.state.sheetKey = 'ant200'; c.state.sheetRow = targetId;
  c.openSheetFeedback(targetId, 'review'); c.state.sheetReworkText = '需要重做材质'; c.renderVals().sheet.pick.submitRework();
  const row = c.sheetRows(c.deliverySheet('ant200')).find(value => value[2] === targetId);
  assert.equal(row[6].currentDeliverableVersion.label, 'Run 2'); assert.equal(row[6].candidateVersion.reviewStatus, 'rework'); assert(!row[6].hasPendingCandidate);
  assert(c.taskLinkSource({ sheetKey: 'ant200', itemId: targetId }).approved);
});

test('a rejected candidate without a prior final cannot be linked again from its delivery detail', () => {
  const c = component(), sheet = custom(c), ref = fork(c, 'review'), id = c.deliveryEntries(sheet)[0].deliveryItemId;
  c.openTaskLink(ref); c.taskLinkValues().onSheet(change(sheet.key)); choose(c, id); c.submitTaskLink();
  c.state.reviewDecisions = { ['branch-result:' + c.branchIid(sourceId, '分支 A')]: 'rework' };
  assert.equal(c.deliverySheetExtras(c.deliverySheet(sheet.key)).entries[0].status, '已关联候选 · 要求返工');
  const source = c.taskLinkSource({ sheetKey: sheet.key, itemId: id });
  assert(!source.ready); assert.match(source.issue, /已要求返工/);
  c.openTaskLink({ sheetKey: sheet.key, itemId: id }); assert(!c.state.taskLink);
  assert.equal(c.state.taskLinkToast.tone, 'warning'); assert.match(c.state.taskLinkToast.text, /已要求返工/);
  c.openTaskLink(sourceRef); c.taskLinkValues().onSheet(change(sheet.key));
  assert.match(c.taskLinkValues().items[0].candidate, /要求返工/);
});
