import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { addDeliverySkillLibrary } from './add-delivery-skill-library.mjs';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });
const skill = (id, extra = {}) => ({ id, name: 'Skill ' + id, command: id, content: '# Check ' + id, description: '审核说明', ...extra });
function component(props = {}) {
  const context = vm.createContext({ URLSearchParams, TextDecoder, TextEncoder, Blob, DecompressionStream,
    window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', ...props }; setState(patch) { this.state = { ...this.state, ...patch }; } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance;
  c.openDeliveryEditor(); c.patchDeliveryEditor({ tab: 'skills', name: 'Skill 测试交付单', customer: '测试客户', target: '2' });
  return c;
}

test('default platform examples are labelled and searchable by name, slash command and description', () => {
  const c = component();
  assert.equal(c.deliveryEditorValues().library.count, 3);
  assert(c.deliveryEditorValues().library.rows.every(row => row.meta === '平台示例 · v1.0'));
  for (const query of ['轨迹', '/3D TRAJECTORY', '  /3D TRAJECTORY  ', '相机', '3d 连续性']) {
    c.deliveryEditorValues().library.onSearch(change(query));
    assert.equal(c.deliveryEditorValues().library.count, 1, query);
    assert.equal(c.deliveryEditorValues().library.rows[0].key, 'platform:demo-3d-trajectory');
  }
  c.deliveryEditorValues().library.onSearch(change('not present'));
  assert(c.deliveryEditorValues().library.empty);
  assert.match(c.deliveryEditorValues().library.emptyHelp, /上传/);
  c.deliveryEditorValues().library.clear();
  assert.equal(c.deliveryEditorValues().library.count, 3);
});

test('only current-account personal Skills and accessible sheet Skills enter the library', () => {
  const c = component({ platformSkills: [] });
  c.state.personalSkills = [skill('mine', { owner: '一万' }), skill('private', { owner: 'another-user' })];
  c.state.deliverySheets = [
    { key: 'mine', name: '我的数据单', customer: '测试', createdBy: '一万', target: 1, entries: [], skills: [skill('bound')] },
    { key: 'private', name: '其他人的数据单', customer: '测试', createdBy: 'another-user', target: 1, entries: [], skills: [skill('hidden')] }
  ];
  const rows = c.deliveryEditorValues().library.rows;
  assert.deepEqual(Array.from(rows, row => row.command), ['/mine', '/bound']);
  assert(rows.some(row => row.meta === '我的 Skill'));
  assert(rows.some(row => row.meta === '数据单 · 我的数据单'));
  assert(rows.every(row => row.actionLabel.includes(row.command) && row.actionLabel.includes(row.meta)));
  assert(rows.every(row => row.descriptionId));
});

test('multiple selections persist across searches and tabs and can be removed from either place', () => {
  const c = component();
  c.deliveryEditorValues().library.rows[0].toggle();
  c.deliveryEditorValues().library.rows[1].toggle();
  assert.equal(c.state.deliveryEditor.skills.length, 2);
  assert(c.deliveryEditorValues().library.rows.slice(0, 2).every(row => row.selected));
  c.deliveryEditorValues().library.onSearch(change('Web'));
  assert.equal(c.deliveryEditorValues().library.count, 1);
  assert.equal(c.deliveryEditorValues().skillCount, 2);
  c.deliveryEditorValues().tabs[0].pick(); c.deliveryEditorValues().tabs[2].pick();
  assert.equal(c.state.deliveryEditor.skillQuery, 'Web');
  c.deliveryEditorValues().library.clear();
  c.deliveryEditorValues().library.rows[0].toggle();
  assert.equal(c.state.deliveryEditor.skills.length, 1);
  c.deliveryEditorValues().skills[0].remove();
  assert.equal(c.state.deliveryEditor.skills.length, 0);
  assert(c.deliveryEditorValues().library.rows.every(row => !row.selected));
});

test('binding copies a snapshot; editing, cancelling and reopening cannot mutate its source', () => {
  const original = skill('quality', { version: '3.1' });
  const c = component({ platformSkills: [original] });
  c.deliveryEditorValues().library.rows[0].toggle();
  c.deliveryEditorValues().skills[0].onCommand(change('quality custom'));
  assert(c.deliveryEditorValues().library.rows[0].selected, 'origin identity survives a command edit');
  c.saveDeliveryEditor();
  const sheet = c.deliverySheet(c.state.sheetKey);
  assert.equal(sheet.skills[0].command, 'quality custom');
  assert.equal(sheet.skills[0].version, '3.1');
  assert.equal(sheet.skills[0].libraryKey, 'platform:quality');
  assert.equal(original.command, 'quality');
  original.content = '# A newer source';
  assert.equal(sheet.skills[0].content, '# Check quality');
  c.openDeliveryEditor(sheet.key); c.patchDeliveryEditor({ tab: 'skills' });
  assert.equal(c.deliveryEditorValues().library.count, 1, 'do not duplicate bindings in catalog');
  c.deliveryEditorValues().skills[0].remove(); c.closeDeliveryEditor();
  assert.equal(c.deliverySheet(sheet.key).skills.length, 1);
});

test('same-content uploads are shown as selected; command collisions receive an editable unique alias', async () => {
  const c = component({ platformSkills: [skill('same')] });
  await c.uploadDeliverySkills([{ name: 'same.md', size: 12, text: async () => '# Check same' }]);
  assert(c.deliveryEditorValues().library.rows[0].selected);
  c.deliveryEditorValues().library.rows[0].toggle();
  assert.equal(c.state.deliveryEditor.skills.length, 0);
  c.patchDeliveryEditor({ skills: [skill('different', { command: 'same' })] });
  c.deliveryEditorValues().library.rows[0].toggle();
  assert.equal(c.state.deliveryEditor.skills[1].command, 'same-2');
  assert.match(c.state.deliveryEditor.skillNotice, /重复.*same-2/);
  assert.equal(c.deliveryEditorIssue(), '');
});

test('unique aliases stay within the 60-character command limit', () => {
  const command = 'a'.repeat(60), c = component({ platformSkills: [skill('long', { command })] });
  c.patchDeliveryEditor({ skills: [skill('existing', { command })] });
  c.deliveryEditorValues().library.rows[0].toggle();
  assert.equal(c.state.deliveryEditor.skills[1].command.length, 60);
  assert(c.state.deliveryEditor.skills[1].command.endsWith('-2'));
  assert.equal(c.deliveryEditorIssue(), '');
});

test('library and upload share a 12-Skill cap, while selected rows remain removable', async () => {
  const c = component({ platformSkills: Array.from({ length: 13 }, (_, i) => skill('s' + i)) });
  for (let i = 0; i < 12; i++) c.toggleDeliveryLibrarySkill('platform:s' + i);
  let rows = c.deliveryEditorValues().library.rows;
  assert.equal(c.state.deliveryEditor.skills.length, 12);
  assert(rows[12].disabled); assert(!rows[0].disabled);
  assert.match(c.deliveryEditorValues().library.limitNote, /12/);
  c.toggleDeliveryLibrarySkill('platform:s12'); assert.equal(c.state.deliveryEditor.skills.length, 12);
  await c.uploadDeliverySkills([{ name: 'extra.md', size: 5, text: async () => 'Check' }]);
  assert.equal(c.state.deliveryEditor.skills.length, 12);
  c.toggleDeliveryLibrarySkill('platform:s0'); c.toggleDeliveryLibrarySkill('platform:s12');
  assert.equal(c.state.deliveryEditor.skills.length, 12);
});

test('upload locks library mutations and cancellation isolates pending file reads', async () => {
  const c = component(); c.deliveryEditorValues().library.rows[0].toggle();
  let release;
  const pending = c.uploadDeliverySkills([{ name: 'file.md', size: 8, text: () => new Promise(resolve => { release = resolve; }) }]);
  assert(c.deliveryEditorValues().library.rows.every(row => row.disabled));
  c.deliveryEditorValues().library.rows[1].toggle();
  c.deliveryEditorValues().skills[0].remove();
  assert.equal(c.state.deliveryEditor.skills.length, 1);
  c.closeDeliveryEditor(); c.openDeliveryEditor();
  release('Instructions'); await pending;
  assert.equal(c.state.deliveryEditor.skills.length, 0);
});

test('catalog changes recheck availability; empty and invalid catalogs do not invent results', () => {
  const c = component({ platformSkills: [skill('available')] });
  const stale = c.deliveryEditorValues().library.rows[0];
  c.props.platformSkills = []; stale.toggle();
  assert.equal(c.state.deliveryEditor.skills.length, 0);
  assert.match(c.state.deliveryEditor.skillError, /不可用/);
  assert(c.deliveryEditorValues().library.empty);
  c.props.platformSkills = [skill('empty', { content: '' }), skill('bad', { command: '<script>' }), skill('hidden', { available: false })];
  assert.equal(c.deliveryEditorValues().library.count, 0);
});

test('a saved library Skill reaches only its related review session and does not change review decisions', () => {
  const c = component(); c.setDeliveryList('布达拉宫');
  c.deliveryEditorValues().library.rows[0].toggle(); c.saveDeliveryEditor();
  const sheet = c.deliverySheet(c.state.sheetKey), row = c.sheetRows(sheet)[0];
  const ctx = { scope: 'sheet', sheetKey: sheet.key, itemId: row[2], itemName: row[0], runId: row[5] };
  const before = JSON.stringify(c.state.reviewDecisions);
  c.reviewSkillValues(ctx).onText(change('/3d trajectory 检查轨迹')); c.invokeReviewSkill(ctx);
  assert.equal(c.reviewSkillValues(ctx).history[0].content, sheet.skills[0].content);
  assert.equal(c.reviewSkillValues(ctx).history[0].demo, true);
  assert.equal(c.boundReviewSkills({ ...ctx, itemId: 'unrelated' }).length, 0);
  assert.equal(JSON.stringify(c.state.reviewDecisions), before);
});

test('focused generator is idempotent and searchable rows expose keyboard and selection semantics', () => {
  assert.equal(addDeliverySkillLibrary(source), source);
  assert(template.includes('sc-camel-on-input="{{ deliveryEditor.library.onSearch }}"'));
  assert(template.includes('aria-pressed="{{ option.selected }}"'));
  assert(template.includes('aria-describedby="{{ option.descriptionId }}"'));
  assert(template.includes('disabled="{{ option.disabled }}"'));
  assert(template.includes('aria-controls="forge-delivery-skill-results"'));
  assert(template.includes('<pre>{{ skill.content }}</pre>'));
  assert(template.includes('data-phosphor="check"'));
  assert(template.includes('data-phosphor="magnifying-glass"'));
  assert(template.includes('.forge-delivery-library-option:focus-visible'));
});
