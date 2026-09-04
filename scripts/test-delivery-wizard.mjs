import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { confirmDelivery } from './test-support/delivery-wizard.mjs';
const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const event = value => ({ target: { value } });
function component() {
  const context = vm.createContext({ URLSearchParams, TextEncoder, TextDecoder, Blob, DecompressionStream, window: { location: { search: '' } }, setTimeout() {}, clearTimeout() {},
    DCLogic: class { props = { currentUser: '一万', hasRuns: true, hasResources: true, memberDirectory: [{ name: '审核员', accountName: 'reviewer' }] }; setState(patch) { Object.assign(this.state, patch); } } });
  vm.runInContext(code + ';globalThis.c = new Component()', context);
  const c = context.c; c.openDeliveryEditor(); return c;
}
const basics = c => c.patchDeliveryEditor({ name: '向导测试', customer: '客户', target: '2' });
const valid = c => { basics(c); c.setDeliveryList('布达拉宫\n天坛'); };

test('wizard exposes exactly one task and blocks jumps and early submission', () => {
  const c = component(); const v = c.deliveryWizardValues();
  assert(v.basic && !v.list && !v.rules && !v.confirm); assert(v.disabled);
  assert.equal(v.steps.length, 4); assert(v.steps.slice(1).every(row => row.disabled));
  c.goDeliveryWizardStep(3); assert.equal(c.state.deliveryEditor.step, 1);
  valid(c); c.saveDeliveryEditor(); assert(!c.state.deliverySheets?.length); assert.match(c.state.deliveryEditor.error, /确认创建/);
  c.goDeliveryWizardStep(4); assert.equal(c.state.deliveryEditor.step, 1);
});

test('all four steps retain inputs and completed steps remain editable', () => {
  const c = component(); valid(c); c.patchDeliveryEditor({ desc: '保留说明' });
  confirmDelivery(c); assert(c.deliveryWizardValues().confirm);
  c.deliveryWizardValues().steps[0].pick(); assert.equal(c.state.deliveryEditor.step, 1);
  assert.equal(c.state.deliveryEditor.desc, '保留说明'); assert.equal(c.state.deliveryEditor.entries.length, 2);
  c.deliveryWizardValues().steps[3].pick(); assert.equal(c.state.deliveryEditor.step, 4);
});

test('count equality, invalid entries and later edits gate steps and final create', () => {
  const c = component(); valid(c); c.goDeliveryWizardStep(2); c.patchDeliveryEditor({ target: '3' });
  assert.match(c.deliveryWizardValues().issue, /还差 1 项/); c.goDeliveryWizardStep(3); assert.equal(c.state.deliveryEditor.step, 2);
  c.deliveryWizardValues().useValidCount(); assert.equal(c.state.deliveryEditor.target, '2');
  confirmDelivery(c); c.patchDeliveryEditor({ target: '1' });
  assert(c.deliveryWizardValues().hasProblems); assert.match(c.deliveryWizardValues().issue, /多出 1 项/);
  c.saveDeliveryEditor(); assert(!c.state.deliverySheets?.length);
  c.goDeliveryWizardStep(1); c.patchDeliveryEditor({ name: '' }); c.goDeliveryWizardStep(4); assert.equal(c.state.deliveryEditor.step, 1);
});

test('parser preserves duplicates including name-ID aliases, errors and unmatched records', () => {
  const c = component(); const id = c.sheetRows(null).find(row => row[0] === '天坛')[2];
  c.setDeliveryList('天坛\n' + id + '\n待核对\n@@@\n' + 'x'.repeat(301));
  const s = c.deliveryWizardStats();
  assert.equal(s.recognized, 5); assert.equal(s.valid, 1); assert.equal(s.duplicate, 1); assert.equal(s.invalid, 2); assert.equal(s.unmatched, 1);
  assert.equal(s.exceptions, 4); assert.equal(c.state.deliveryEditor.entries.length, 5);
  c.patchDeliveryEditor({ target: '1' }); assert.match(c.deliveryWizardListIssue(), /异常/);
});

test('removing a duplicate source reparses remaining rows and retains per-item tags', () => {
  const c = component(); c.setDeliveryList('天坛\n天坛\n布达拉宫');
  c.patchDeliveryEditor({ entries: c.state.deliveryEditor.entries.map((row, i) => ({ ...row, tagId: i === 2 ? 'tag' : '' })) });
  c.removeDeliveryWizardEntry(c.state.deliveryEditor.entries[0].key, c.state.deliveryEditor.id);
  assert.equal(c.deliveryWizardStats().duplicate, 0); assert.equal(c.deliveryWizardStats().valid, 2);
  assert.equal(c.state.deliveryEditor.entries[1].tagId, 'tag'); assert.equal(c.state.deliveryEditor.listText, '天坛\n布达拉宫');
});

test('exception-only pagination has accurate ranges and clamps after deletion', () => {
  const c = component(); c.setDeliveryList(['天坛', ...Array.from({ length: 18 }, (_, i) => '未匹配' + i)].join('\n'));
  c.deliveryWizardValues().onExceptions({ target: { checked: true } });
  assert.equal(c.deliveryWizardValues().rows.length, 8); assert.equal(c.deliveryWizardValues().range, '1–8 / 18 条');
  c.deliveryWizardValues().nextPage(); c.deliveryWizardValues().nextPage();
  assert.equal(c.deliveryWizardValues().range, '17–18 / 18 条');
  c.deliveryWizardValues().rows.forEach(row => row.remove());
  assert.equal(c.deliveryWizardValues().range, '9–16 / 16 条');
});

test('production picker uses shared run identities and never fabricates target-sized Items', () => {
  const c = component(); basics(c); c.goDeliveryWizardStep(2);
  assert.equal(c.state.deliveryEditor.entries.length, 0);
  const task = c.deliveryWizardValues().productionRows.find(task => task.count > 0);
  assert(task.demo); task.toggle();
  assert.equal(c.state.deliveryEditor.entries.length, task.count);
  assert(c.state.deliveryEditor.entries.every(row => row.sourceType === 'production' && row.sourceRunId === task.id));
  c.deliveryWizardValues().useValidCount(); assert.equal(c.deliveryWizardListIssue(), '');
  c.goDeliveryWizardStep(1); c.patchDeliveryEditor({ target: '499' }); c.goDeliveryWizardStep(2);
  assert.equal(c.deliveryWizardStats().valid, task.count); assert.match(c.deliveryWizardListIssue(), /还差/);
  c.deliveryWizardValues().useZip(); assert.equal(c.state.deliveryEditor.entries.length, 0);
  c.patchDeliveryEditor({ entries: c.parseDeliveryWizardLines(['布达拉宫.glb']), listText: '布达拉宫.glb', archive: { name: 'list.zip', size: 1024 } });
  c.deliveryWizardValues().removeArchive(); assert.equal(c.state.deliveryEditor.entries.length, 0);
  c.deliveryWizardValues().useProduction(); assert.equal(c.state.deliveryEditor.entries.length, task.count);
});

test('new production tasks, search, deduplication and removals share exact source references', () => {
  const c = component(); basics(c);
  c.state.submittedRuns = [{ id: 'new-run-a', pipe: 'sample-pipeline', dsName: 'sample-dataset', n: 2, itemMeta: [['ITEM-A', '', '', '', 'Alpha'], ['ITEM-B', '', '', '', 'Beta']] }, { id: 'new-run-b', pipe: 'sample-pipeline', dsName: 'sample-dataset', n: 1, itemMeta: [['ITEM-A', '', '', '', 'Alpha']] }];
  c.deliveryWizardValues().onProductionQuery(event('sample-dataset'));
  let tasks = c.deliveryWizardValues().productionRows; assert.equal(tasks.length, 2); assert(tasks.every(task => !task.demo));
  tasks.forEach(task => task.toggle()); assert.equal(c.deliveryWizardStats().valid, 2);
  assert.equal(c.state.deliveryEditor.entries.find(row => row.itemId === 'ITEM-A').sourceRefs.length, 2);
  c.deliveryWizardValues().rows.find(row => row.itemId === 'ITEM-B').remove(); c.deliveryWizardValues().syncProduction();
  assert.equal(c.deliveryWizardStats().valid, 1);
  c.state.submittedRuns = []; assert.match(c.deliveryWizardListIssue(), /不可用/);
});

test('created sheet preserves production Items and derives review status from the exact source run', () => {
  const c = component(); basics(c);
  c.state.submittedRuns = [{ id: 'wizard-production', pipe: 'sample-pipeline', dsName: 'sample-dataset', n: 2, done: 1, running: 1, failed: 0,
    itemMeta: [['WIZARD-READY', '', '', '', 'Ready Item'], ['WIZARD-RUNNING', '', '', '', 'Running Item']] }];
  c.deliveryWizardValues().productionRows.find(task => task.id === 'wizard-production').toggle();
  confirmDelivery(c); c.saveDeliveryEditor();
  const sheet = c.state.deliverySheets[0], rows = c.sheetRows(sheet);
  assert.equal(rows.length, 2); assert.equal(sheet.sourceRunIds[0], 'wizard-production');
  assert.equal(rows.find(row => row[2] === 'WIZARD-READY')[6].businessStatus, 'pending_review');
  assert.equal(rows.find(row => row[2] === 'WIZARD-RUNNING')[6].technicalStatus, 'running');
  assert.equal(c.deliverySheet(sheet.key).passed, 0);
  c.state.reviewDecisions = { 'wizard-production:WIZARD-READY': 'pass' };
  assert.equal(c.deliverySheet(sheet.key).passed, 1);
});

test('List limits and upload loading prevent stale valid data from passing', () => {
  const c = component(); valid(c); c.setDeliveryList(Array.from({ length: 501 }, (_, i) => '行' + i).join('\n'));
  assert.equal(c.state.deliveryEditor.entries.length, 0); assert.match(c.deliveryWizardListIssue(), /500/);
  c.patchDeliveryEditor({ listLoading: true }); c.setDeliveryImportMode('zip', c.state.deliveryEditor.id); assert.equal(c.state.deliveryEditor.importMode, 'production');
});

test('default Tag auto-selects after creation and per-item overrides persist to final sheet', () => {
  const c = component(); valid(c); c.patchDeliveryEditor({ tagName: '默认标签' }); c.addDeliveryTag(); const first = c.state.deliveryEditor.defaultTagId;
  c.patchDeliveryEditor({ tagName: '单条标签' }); c.addDeliveryTag(); const second = c.state.deliveryEditor.defaultTagId;
  c.deliveryWizardValues().onDefaultTag(event(first)); c.deliveryWizardValues().rows[1].onTag(event(second));
  confirmDelivery(c); assert.equal(c.deliveryWizardValues().tagCount, 2); c.saveDeliveryEditor();
  const sheet = c.deliverySheet(c.state.sheetKey); assert(sheet); assert.equal(sheet.entries[0].tagId, first); assert.equal(sheet.entries[1].tagId, second); assert.equal(sheet.defaultTagId, first);
});

test('Item can explicitly opt out of default Tag; unknown tag blocks submission', () => {
  const c = component(); valid(c); c.patchDeliveryEditor({ tagName: '验收' }); c.addDeliveryTag();
  c.deliveryWizardValues().rows[0].onTag(event('__none__')); assert.equal(c.deliveryWizardRulesIssue(), '');
  c.deliveryWizardValues().rows[1].onTag(event('missing')); assert.match(c.deliveryWizardRulesIssue(), /不可用/);
  c.deliveryWizardValues().rows[1].onTag(event('')); confirmDelivery(c); c.saveDeliveryEditor();
  assert.equal(c.deliverySheet(c.state.sheetKey).entries[0].tagId, '');
});

test('Tag previews and summary update even before entries are selected', () => {
  const c = component(); c.patchDeliveryEditor({ tagName: 'repair', tagColor: '#e09933' }); c.addDeliveryTag();
  let v = c.deliveryWizardValues(); assert.equal(v.tagCount, 1); assert.equal(v.defaultTagName, 'repair'); assert.equal(v.tagPreview[0].color, '#e09933'); assert.equal(v.tagPreview[0].applied, 0);
  c.setDeliveryList('天坛'); v = c.deliveryWizardValues(); assert.equal(v.tagPreview[0].applied, 1);
  v.onDefaultTag(event('')); assert.equal(c.deliveryWizardValues().tagCount, 0); assert(!c.deliveryWizardValues().hasDefaultTag);
});

test('Skill search/category filters retain selected skills at the top with independent viewing', () => {
  const c = component(); valid(c); const web = c.deliveryEditorValues().library.rows.find(row => row.command === '/web review'); web.toggle();
  c.deliveryWizardValues().categories.find(row => row.key === '3d').pick();
  c.deliveryEditorValues().library.onSearch(event('轨迹'));
  const rows = c.deliveryEditorValues().library.rows; assert.equal(rows.length, 2); assert(rows[0].selected); assert.equal(rows[1].name, '3D 轨迹评估');
  rows[1].view(); assert.equal(c.state.deliveryEditor.skills.length, 1); assert(c.state.deliveryEditor.skillDetailKey);
});

test('rules can be explicitly skipped, without overwriting prior selections on continue', () => {
  const c = component(); valid(c); c.goDeliveryWizardStep(2); c.goDeliveryWizardStep(3); assert(c.deliveryWizardValues().canSkip);
  c.deliveryWizardValues().skip(); assert.equal(c.state.deliveryEditor.step, 4); assert.equal(c.state.deliveryEditor.skills.length, 0);
});

test('confirmation exposes members and keeps the sole owner protected', () => {
  const c = component(); valid(c); confirmDelivery(c);
  let members = c.deliveryMembersValues(); assert.equal(members.rows[0].roleLabel, '所有者'); assert(members.rows[0].removeDisabled);
  members.rows[0].remove(); assert.equal(c.state.deliveryEditor.members.length, 1);
  members.onSearch(event('reviewer')); c.deliveryMembersValues().results[0].toggle({ target: { checked: true } });
  members = c.deliveryMembersValues(); assert.equal(members.rows[1].accountName, 'reviewer'); members.rows[1].onRole(event('owner'));
  assert(!c.deliveryMembersValues().rows[0].removeDisabled); assert.equal(c.deliveryWizardValues().memberCount, 2);
  c.saveDeliveryEditor(); assert.equal(c.deliverySheet(c.state.sheetKey).members.length, 2);
});

test('account switch blocks final creation and stale wizard callbacks cannot modify replacement', () => {
  const c = component(); valid(c); confirmDelivery(c); c.props.currentUser = 'other'; c.saveDeliveryEditor(); assert(!c.state.deliverySheets?.length);
  const stale = c.deliveryWizardValues(); c.closeDeliveryEditor(); c.openDeliveryEditor(); stale.useValidCount(); stale.next();
  assert.equal(c.state.deliveryEditor.target, ''); assert.equal(c.state.deliveryEditor.step, 1);
});

test('wizard markup has responsive summary, integrated controls and no draft/autosave actions', () => {
  const page = template.split('<!-- delivery-editor:start -->')[1].split('<sc-if value="{{ deliveryEditor.modal }}"')[0];
  for (const label of ['基础信息', '关联生产任务', '上传 ZIP', '示例', '只看异常', '默认 Tag', '配置摘要', '效果预览']) assert(page.includes(label), label);
  assert.deepEqual(Array.from(component().deliveryWizardValues().steps, step => step.label), ['基础信息', '关联条目', '配置规则', '确认创建']);
  assert(!page.includes('粘贴 List')); assert(!page.includes('id="forge-delivery-list"'));
  assert(!page.includes('List 解析结果')); assert(!page.includes('全部 Item 已匹配')); assert(!page.includes('forge-wizard-target-help'));
  assert(page.includes('<progress')); assert(page.includes('aria-label="创建数据单进度"')); assert(page.includes('forge-wizard-tag-chip'));
  for (const label of ['保存草稿', '存为草稿', '草稿已保存', '自动保存', '草稿仅保存在当前浏览器']) assert(!page.includes(label));
  assert(page.includes('popovertarget="forge-skill-create-menu"'));
  assert(page.includes('role="table"')); assert(page.includes('role="columnheader"')); assert(page.includes('member.accountName'));
  assert(template.includes('@media(max-width:540px)')); assert(template.includes('.forge-wizard-summary{position:sticky;'));
  assert(page.includes('class="forge-wizard-summary-desktop"'));
  assert(page.includes('<details class="forge-wizard-summary-mobile">'));
  assert(!page.includes('<details open>'));
  const c = component(); assert.equal(c.deliveryLeaveValues().save, undefined);
});
