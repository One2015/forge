import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { deflateRawSync } from 'node:zlib';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });
function component() {
  const context = vm.createContext({
    URLSearchParams, TextDecoder, TextEncoder, Blob, DecompressionStream,
    window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    FileReader: class { readAsDataURL(file) { queueMicrotask(() => { this.result = 'data:' + file.type + ';base64,' + (file.invalid ? 'bad' : 'image'); this.onload(); }); } },
    Image: class { naturalWidth = 10; naturalHeight = 10; set src(value) { queueMicrotask(() => value.endsWith('bad') ? this.onerror() : this.onload()); } },
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true, platformSkills: [] }; setState(patch) { this.state = { ...this.state, ...patch }; } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}
function begin(c) { c.openDeliveryEditor(); c.patchDeliveryEditor({ name: '建筑测试交付', customer: '测试客户', target: '1' }); c.setDeliveryList('天坛'); }
function save(c) { if (!c.state.deliveryEditor.key) c.patchDeliveryEditor({ target: String(c.deliveryWizardStats().valid) }); confirmDelivery(c); c.saveDeliveryEditor(); return c.deliverySheet(c.state.sheetKey); }
function publishAndSelect(c) {
  assert.equal(c.deliveryEditorValues().workspace.uploadIssue, '');
  const commands = c.state.deliveryEditor.skillUploads.map(skill => '/' + skill.command);
  c.deliveryEditorValues().workspace.publishUploads();
  c.patchDeliveryEditor({ tab: 'skills' });
  c.deliveryEditorValues().library.rows.filter(row => commands.includes(row.command) && !row.selected).forEach(row => row.toggle());
}
const skillText = '---\nname: 3d trajectory\ndescription: 检查模型轨迹\n---\n# 轨迹检查\n核对相机和模型朝向。';
const md = (name = 'trajectory.md', text = skillText) => ({ name, size: Buffer.byteLength(text), text: async () => text });
function zip(items) {
  let offset = 0;
  const locals = [], central = [];
  for (const item of items) {
    const name = Buffer.from(item.path), raw = Buffer.from(item.text || 'fixture'), method = item.method || 0;
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30), header = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(item.flags || 0, 6); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26);
    header.writeUInt32LE(0x02014b50); header.writeUInt16LE(20, 6); header.writeUInt16LE(item.flags || 0, 8); header.writeUInt16LE(method, 10);
    header.writeUInt32LE(data.length, 20); header.writeUInt32LE(item.declaredSize || raw.length, 24); header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(item.attrs || 0, 38); header.writeUInt32LE(offset, 42);
    locals.push(local, name, data); central.push(header, name); offset += local.length + name.length + data.length;
  }
  const end = Buffer.alloc(22), directory = Buffer.concat(central);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(items.length, 8); end.writeUInt16LE(items.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...locals, directory, end]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
const zipFile = (items, name = 'items.zip') => { const buffer = zip(items); return { name, size: buffer.byteLength, arrayBuffer: async () => buffer }; };
function contextFor(c, sheet) {
  const row = c.sheetRows(sheet)[0];
  return { itemId: row[2], itemName: row[0], runId: row[5], sheetKey: sheet.key, scope: 'sheet' };
}

test('required fields and loading gate creation; created sheet appears under its customer', () => {
  const c = component(); c.openDeliveryEditor();
  assert(c.deliveryEditorValues().disabled); c.saveDeliveryEditor(); assert(!c.state.deliverySheets?.length);
  c.patchDeliveryEditor({ name: '测试数据单', customer: '客户', target: '2.5' }); assert(c.deliveryEditorValues().disabled);
  c.patchDeliveryEditor({ target: '2', listLoading: true }); assert(c.deliveryEditorValues().disabled);
  c.patchDeliveryEditor({ listLoading: false }); assert(c.deliveryEditorValues().disabled);
  assert.match(c.deliveryEditorIssue(), /生产任务|ZIP/); c.setDeliveryList('布达拉宫\n天坛'); assert(!c.deliveryEditorValues().disabled);
  const sheet = save(c); assert.equal(sheet.target, 2); assert.equal(sheet.passed, 1); assert.equal(c.state.view, 'sheet');
  assert(c.deliveryData().some(group => group.customer === '客户' && group.sheets.some(item => item.key === sheet.key)));
  assert.equal(c.deliveryEditorValues().open, false);
});

test('text list deduplicates lines, matches real fixtures, retains unknown entries and handles invalid lengths', () => {
  const c = component(); begin(c);
  c.setDeliveryList('- 布达拉宫\n天坛\n天坛\n客户新模型\n');
  assert.equal(c.state.deliveryEditor.entries.length, 4);
  assert.equal(c.deliveryWizardStats().valid, 2); assert.equal(c.deliveryWizardStats().duplicate, 1); assert.equal(c.deliveryWizardStats().unmatched, 1);
  assert.match(c.deliveryEditorIssue(), /异常|多出|还差/); c.setDeliveryList('布达拉宫\n天坛');
  const sheet = save(c); assert.equal(sheet.linked, 2); assert.equal(sheet.passed, 1); assert.equal(sheet.review, 1);
  c.openDeliveryEditor(sheet.key); c.setDeliveryList('x'.repeat(301)); assert(c.deliveryEditorValues().disabled);
  c.setDeliveryList(Array.from({ length: 501 }, (_, i) => 'item' + i).join('\n')); assert.match(c.deliveryEditorIssue(), /500/);
  c.setDeliveryList('天坛'); assert(!c.deliveryEditorValues().disabled);
});

test('ZIP list preserves original attachment and safely previews filenames without execution', async () => {
  const c = component(); begin(c);
  const file = zipFile([{ path: 'models/布达拉宫.glb' }, { path: '天坛.glb' }, { path: '__MACOSX/._metadata' }, { path: '.DS_Store' }]);
  const pending = c.uploadDeliveryList(file); assert(c.deliveryEditorValues().disabled); await pending;
  assert.equal(c.state.deliveryEditor.entries.length, 2); assert.equal(c.state.deliveryEditor.archive.file, file);
  assert.equal(c.state.deliveryEditor.entries.filter(entry => entry.itemId).length, 2);
  await c.uploadDeliveryList({ name: 'wrong.txt', size: 10 }); assert.match(c.deliveryEditorIssue(), /ZIP/);
  c.setDeliveryList('天坛'); assert(!c.deliveryEditorValues().disabled);
});

test('ZIP validation rejects corrupted, traversal, encrypted, symlink and expansion-bomb archives', () => {
  const c = component();
  assert.throws(() => c.zipDirectory(new ArrayBuffer(32)), /ZIP/);
  for (const path of ['../outside.md', '/absolute.md', 'C:/file.md', 'x\\file.md']) assert.throws(() => c.zipDirectory(zip([{ path }])), /不安全/);
  assert.throws(() => c.zipDirectory(zip([{ path: 'file', flags: 1 }])), /加密/);
  assert.throws(() => c.zipDirectory(zip([{ path: 'file', attrs: 0xa0000000 }])), /符号链接/);
  assert.throws(() => c.zipDirectory(zip([{ path: 'file', declaredSize: 101 * 1024 * 1024 }])), /100 MB/);
});

test('async upload cannot modify a cancelled or replacement editor', async () => {
  const c = component(); begin(c);
  let resolve; const file = zipFile([{ path: '天坛.glb' }]), bytes = await file.arrayBuffer();
  const pending = c.uploadDeliveryList({ ...file, arrayBuffer: () => new Promise(done => { resolve = done; }) });
  c.closeDeliveryEditor(); begin(c); resolve(bytes); await pending;
  assert.equal(c.state.deliveryEditor.entries.length, 1); assert.equal(c.state.deliveryEditor.entries[0].name, '天坛'); assert.equal(c.state.deliveryEditor.archive, null);
  let resolveSkill; const skill = c.uploadDeliverySkills([{ ...md(), text: () => new Promise(done => { resolveSkill = done; }) }]);
  c.closeDeliveryEditor(); begin(c); resolveSkill(skillText); await skill;
  assert.equal(c.state.deliveryEditor.skills.length, 0);
});

test('logo reads validated image data, supports removal, and rejects invalid types or image bodies', async () => {
  const c = component(); begin(c); const file = { name: 'logo.png', type: 'image/png', size: 100 };
  const pending = c.uploadDeliveryLogo(file); assert(c.deliveryEditorValues().disabled); await pending;
  assert.match(c.state.deliveryEditor.logo.url, /^data:image\/png/);
  c.deliveryEditorValues().removeLogo(); assert.equal(c.state.deliveryEditor.logo, null);
  await c.uploadDeliveryLogo({ ...file, type: 'image/svg+xml' }); assert.match(c.state.deliveryEditor.logoError, /PNG/);
  await c.uploadDeliveryLogo({ ...file, invalid: true }); assert.match(c.state.deliveryEditor.logoError, /有效图片/);
});

test('multiple MD and ZIP Skills retain instructions, stage for creation and validate editable names', async () => {
  const c = component(); begin(c);
  await c.uploadDeliverySkills([md(), zipFile([{ path: 'material/SKILL.md', text: '---\nname: material\n---\n检查材质。', method: 8 }], 'skills.zip')]);
  assert.equal(c.state.deliveryEditor.skillUploads.length, 2);
  assert.equal(c.state.deliveryEditor.skillUploads[0].content, skillText);
  assert.equal(c.state.deliveryEditor.skillUploads[1].command, 'material');
  await c.uploadDeliverySkills([md()]); assert.equal(c.state.deliveryEditor.skillUploads.length, 2); assert.match(c.state.deliveryEditor.skillError, /重复/);
  c.deliveryEditorValues().workspace.uploads[1].onCommand(change('3d trajectory')); assert.match(c.deliveryEditorValues().workspace.uploadIssue, /内容不同/);
  c.deliveryEditorValues().workspace.uploads[1].onCommand(change('quality check')); publishAndSelect(c); assert(!c.deliveryEditorIssue());
  c.deliveryEditorValues().library.rows[1].onCommand(change('3d trajectory'));
  assert.match(c.deliveryEditorIssue(), /重复/);
  assert(c.deliveryEditorValues().library.rows.every(skill => skill.commandInvalid && skill.commandErrorId));
  c.deliveryEditorValues().library.rows[1].onCommand(change('quality check')); assert(!c.deliveryEditorIssue());
  assert.throws(() => c.parseUploadedSkill('---\nname: <script>\n---\nHi', 'bad.md', 'bad.md'), /名称/);
  await c.uploadDeliverySkills([{ ...md(), size: 513 * 1024 }]); assert.match(c.state.deliveryEditor.skillError, /512 KB/);
});

test('Skill capacity is bounded; uploaded HTML is inert text, not evaluated markup', async () => {
  const c = component(); begin(c);
  await c.uploadDeliverySkills(Array.from({ length: 13 }, (_, i) => md('skill' + i + '.md', '# Skill\n<script>alert(1)</script>')));
  assert.equal(c.state.deliveryEditor.skillUploads.length, 12); assert(c.deliveryEditorValues().workspace.uploadDisabled);
  assert.equal(c.state.deliveryEditor.skills.length, 0);
  assert(c.state.deliveryEditor.skillUploads[0].content.includes('<script>'));
  publishAndSelect(c); assert.equal(c.state.deliveryEditor.skills.length, 12); assert(c.deliveryEditorValues().skillsFull);
  assert(template.includes('<pre>{{ skill.content }}</pre>')); assert(!template.includes('innerHTML: skill.content'));
});

test('tags persist and filter custom entries; tag-only seed edits preserve aggregate metrics', () => {
  const c = component(); begin(c); c.setDeliveryList('布达拉宫\n天坛');
  let sheet = save(c); c.openDeliveryEditor(sheet.key);
  c.patchDeliveryEditor({ tagName: '重点验收', tagColor: '#3e744a' }); c.addDeliveryTag();
  const tag = c.state.deliveryEditor.tags[0]; c.deliveryEditorValues().entries[0].onTag(change(tag.id));
  sheet = save(c); assert.equal(sheet.entries[0].tagId, tag.id);
  c.state.sheetTagFilter = tag.id; assert.equal(c.deliverySheetExtras(sheet).entries.length, 1);
  c.openDeliveryEditor('ant200'); const before = c.deliverySheet('ant200').passed;
  c.patchDeliveryEditor({ tagName: '优先' }); c.addDeliveryTag(); c.deliveryEditorValues().entries[0].onTag(change(c.state.deliveryEditor.tags[0].id));
  const seed = save(c); assert.equal(seed.passed, before); assert(!seed.entries); assert(Object.values(seed.entryTags).some(Boolean));
  assert.equal(c.tagForeground('#ffffff'), '#000000'); assert.equal(c.tagForeground('#000000'), '#ffffff');
  assert.equal(c.tagForeground('#777777'), '#000000');
  for (let channel = 0; channel <= 255; channel++) {
    const gray = '#' + channel.toString(16).padStart(2, '0').repeat(3), value = channel / 255;
    const luminance = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    const contrast = c.tagForeground(gray) === '#000000' ? (luminance + .05) / .05 : 1.05 / (luminance + .05);
    assert(contrast >= 4.5, gray + ' text contrast');
  }
});

test('slash invocation loads bound Skill and current Item/Run without fake score or review mutation', async () => {
  const c = component(); begin(c); c.setDeliveryList('布达拉宫'); await c.uploadDeliverySkills([md()]);
  publishAndSelect(c);
  const sheet = save(c), ctx = contextFor(c, sheet), before = JSON.stringify(c.state.reviewDecisions);
  let view = c.reviewSkillValues(ctx); assert.equal(view.count, 1); assert(view.disabled);
  view.onText(change('/3d trajectory 检查正面')); c.reviewSkillValues(ctx).invoke(); view = c.reviewSkillValues(ctx);
  assert.equal(view.history.length, 1); assert.equal(view.history[0].content, skillText); assert.equal(view.history[0].args, '检查正面');
  assert.equal(view.history[0].runId, ctx.runId); assert(view.history[0].demo); assert.equal(JSON.stringify(c.state.reviewDecisions), before);
  assert.equal(c.reviewSkillValues({ ...ctx, runId: 'other-run' }).history.length, 0);
  assert.equal(c.reviewSkillValues({ ...ctx, sheetKey: 'ant200' }).history.length, 0);
  assert.equal(c.boundReviewSkills({ ...ctx, itemId: 'unrelated' }).length, 0);
  view.onText(change('/not-bound')); c.reviewSkillValues(ctx).invoke(); assert.match(c.reviewSkillValues(ctx).error, /已绑定/);
});

test('same-named bindings require explicit selection in cross-sheet review', async () => {
  const c = component(); begin(c); c.setDeliveryList('布达拉宫'); await c.uploadDeliverySkills([md()]); publishAndSelect(c); const one = save(c);
  begin(c); c.patchDeliveryEditor({ name: '第二张数据单' }); c.setDeliveryList('布达拉宫'); await c.uploadDeliverySkills([md()]); publishAndSelect(c); save(c);
  const ctx = { ...contextFor(c, one), sheetKey: null, scope: 'review' };
  c.reviewSkillValues(ctx).onText(change('/3d trajectory')); c.invokeReviewSkill(ctx); assert.match(c.reviewSkillValues(ctx).error, /同名/);
  c.reviewSkillValues(ctx).skills[1].pick(); c.invokeReviewSkill(ctx);
  assert.equal(c.reviewSkillValues(ctx).history[0].sheetName, '第二张数据单');
});

test('editing cancellation preserves saved data and native dialog semantics remain present', () => {
  const c = component(); begin(c); c.setDeliveryList('天坛'); const sheet = save(c);
  c.openDeliveryEditor(sheet.key); c.patchDeliveryEditor({ name: 'unsaved' }); c.setDeliveryList('unknown'); c.closeDeliveryEditor();
  assert.equal(c.deliverySheet(sheet.key).name, sheet.name); assert.equal(c.deliverySheet(sheet.key).linked, 1);
  assert(template.includes('<dialog class="forge-delivery-editor')); assert(template.includes('本地演示 · 刷新后清空'));
  assert(template.includes('<option value="{{ tag.id }}" label="{{ tag.name }}">'), 'Native options need an explicit label because template interpolation inserts spans');
  assert(template.includes('.forge-delivery-editor .forge-delivery-primary'), 'Scope primary color above the legacy feedback reset');
  assert(template.includes('id="forge-delivery-validation"'), 'Save validation must be visible, not tooltip-only');
  assert(template.includes('aria-describedby="forge-skill-detail-command-error"'));
  assert(template.includes('.forge-review-skill-composer>.forge-delivery-primary:disabled{opacity:1}'));
  for (const view of ['delivery', 'sheet', 'review']) { c.state.view = view; assert.equal(typeof c.renderVals(), 'object'); }
});

test('sheet editing has one header entry point while Tag filtering and archive download remain', () => {
  const extras = fs.readFileSync(new URL('./templates/delivery-sheet-extras.html', import.meta.url), 'utf8');
  for (const html of [extras, template]) {
    assert(!html.includes('编辑配置'));
    assert(!html.includes('{{ sheet.extras.edit }}'));
    assert(html.includes('顶部「编辑数据单」'));
    assert(html.includes('{{ sheet.extras.onFilter }}'));
    assert(html.includes('{{ sheet.extras.downloadArchive }}'));
  }
  assert.equal((template.match(/sc-camel-on-click="\{\{ sheet.edit \}\}"/g) || []).length, 1);
  const c = component(); begin(c); const sheet = save(c);
  c.renderVals().sheet.edit();
  assert.equal(c.state.deliveryEditor.key, sheet.key);
  assert.equal(c.deliveryEditorValues().title, '编辑数据单');
});

test('running copy is consistent across delivery filters and Item labels without changing state keys', () => {
  const c = component();
  assert.equal(c.statusOf('item', 'reworking').label, '运行中');
  assert.equal(c.statusOf('item', 'repair').label, '运行中');
  assert.equal(c.statusOf('review', 'rework').label, '要求返工');
  assert.equal(c.statusOf('run', 'failed').label, '失败');
  assert.equal(c.legacyStateOf({ businessStatus: 'reworking' }), 'failed');
  c.setState({ view: 'sheet', sheetKey: 'ant200', sheetFilter: 'all' });
  const filters = c.renderVals().sheet.filters;
  assert.equal(filters.map(filter => filter.label).join(','), '全部,可交付,待审核,运行中');
  filters.find(filter => filter.label === '运行中').pick();
  assert.equal(c.state.sheetFilter, 'failed');
  assert(c.renderVals().sheet.emptyHint.includes('运行中'));
  assert(!template.includes('返工中'));
});
