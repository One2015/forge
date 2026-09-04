import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateDeliveryDrafts } from './update-delivery-drafts.mjs';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];

function store() {
  const rows = new Map();
  const call = async (action, record) => {
    const key = record.owner + ':' + record.id, old = rows.get(key);
    if (action === 'list') return structuredClone([...rows.values()].filter(row => row.owner === record.owner));
    if (action === 'get') return structuredClone(old);
    if ((old?.revision || 0) !== (record.revision || 0)) throw Object.assign(new Error('草稿已在其他页面更新或删除'), { code: 'draft-conflict' });
    if (action === 'delete') { rows.delete(key); return; }
    const saved = structuredClone({ schema: 1, ...record, savedAt: Date.now(), revision: (record.revision || 0) + 1 });
    rows.set(key, saved); return saved;
  };
  return { rows, call };
}

function component(storage = store(), owner = '一万', globals = {}) {
  const listeners = new Map();
  const context = vm.createContext({ URLSearchParams, TextEncoder, TextDecoder, Blob, File, DecompressionStream, structuredClone,
    window: { location: { search: '' }, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
    setTimeout: () => 0, clearTimeout() {}, ...globals,
    DCLogic: class { props = { currentUser: owner, panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance;
  const nativeStore = c.deliveryDraftStorage.bind(c);
  c.deliveryDraftStorage = storage.call;
  return { c, storage, listeners, nativeStore };
}

function fill(c, name = '草稿测试') {
  c.openDeliveryEditor();
  c.patchDeliveryEditor({ name, customer: '客户', target: '2', desc: '中文 🎨 description' });
  c.setDeliveryList('天坛\n新的条目');
}

test('incomplete and unnamed sheets save independently of creation validation and notifications', async () => {
  const { c, storage, listeners } = component(); c.openDeliveryEditor();
  assert(c.deliveryEditorIssue()); assert(!c.deliveryDraftControls().disabled);
  assert(await c.saveDeliveryDraft());
  assert.equal(storage.rows.size, 1); assert.equal(c.state.view, 'delivery-create');
  assert(!c.deliveryDraftDirty()); assert.match(c.deliveryDraftControls().status, /草稿已保存/);
  assert.equal(c.state.deliverySheets?.length || 0, 0); assert.equal(c.state.deliveryNotifications?.length || 0, 0);
  let warned = false; listeners.get('beforeunload')({ preventDefault() { warned = true; } }); assert(!warned);
  c.deliveryEditorValues().cancel(); assert.equal(c.state.view, 'delivery');
  assert.equal(c.deliveryDraftListValues().rows[0].name, '未命名数据单');
});

test('fresh component restores fields, members, ZIP bytes, logo, tags, selected Skills and unpublished drafts', async () => {
  const { c, storage } = component(); fill(c);
  c.deliveryEditorValues().library.rows[0].toggle();
  const file = new File(['original zip bytes'], 'list.zip', { type: 'application/zip' });
  c.patchDeliveryEditor({ logo: { name: 'logo.png', url: 'data:image/png;base64,AAA=' }, archive: { name: file.name, size: file.size, file },
    tags: [{ id: 'tag1', name: '验收', color: '#64748b' }], tagName: '待添加', tagColor: '#c44318', tagComposerOpen: true,
    entries: c.state.deliveryEditor.entries.map(e => ({ ...e, tagId: 'tag1' })),
    skillMode: 'create', skillDraft: { name: '新 Skill', content: '<script>inert()</script>' },
    skillUploads: [{ id: 'upload1', name: '上传', command: 'upload', content: '# inert markdown', filename: 'SKILL.md' }] });
  const payload = c.deliveryDraftPayload(c.state.deliveryEditor);
  await c.saveDeliveryDraft();
  const fresh = component(storage).c; fresh.state.view = 'delivery'; await fresh.loadDeliveryDrafts();
  await fresh.deliveryDraftListValues().rows[0].resume();
  assert.equal(fresh.state.view, 'delivery-create'); assert.deepEqual(fresh.deliveryDraftPayload(fresh.state.deliveryEditor), payload);
  assert.equal(await fresh.state.deliveryEditor.archive.file.text(), 'original zip bytes');
  assert(!fresh.state.deliveryEditor.logoLoading && !fresh.state.deliveryEditor.listLoading && !fresh.state.deliveryEditor.skillLoading);
  assert(!fresh.deliveryDraftDirty()); assert.equal(fresh.personalProfileSkills().length, 0, 'unpublished drafts do not publish');
  assert.equal(fresh.state.deliveryEditor.skills.length, 1);
});

test('updating a restored draft retains its ID; new creation creates a separate draft', async () => {
  const { c, storage } = component(); fill(c); await c.saveDeliveryDraft(); const id = c.state.deliveryEditor.savedDraftId;
  c.patchDeliveryEditor({ name: '修改后的标题' }); assert(c.deliveryDraftDirty());
  await c.saveDeliveryDraft(); assert.equal(storage.rows.size, 1); assert.equal(c.state.deliveryEditor.savedDraftId, id); assert.equal(c.state.deliveryEditor.draftRevision, 2);
  c.deliveryEditorValues().cancel(); fill(c, '第二个'); await c.saveDeliveryDraft(); assert.equal(storage.rows.size, 2);
  c.setState({ deliveryDraftsNotice: '草稿已删除，无法恢复。' }); await c.saveDeliveryDraft(); assert.equal(c.state.deliveryDraftsNotice, '');
});

test('leave confirmation can save to chosen destination; discarding changes keeps previous saved revision', async () => {
  const { c, storage } = component(); fill(c); c.setState({ view: 'runs' });
  await c.saveDeliveryDraft({ leave: true }); assert.equal(c.state.view, 'runs'); assert.equal(storage.rows.size, 1);
  await c.deliveryDraftListValues().rows[0].resume(); c.patchDeliveryEditor({ name: '不保存的修改' });
  c.deliveryEditorValues().cancel(); c.deliveryLeaveValues().discard();
  assert.equal([...storage.rows.values()][0].data.name, '草稿测试'); assert.equal(c.state.view, 'delivery');
});

test('upload/save races cannot navigate, create or claim later edits were saved', async () => {
  const { c, storage, listeners } = component(); fill(c);
  c.patchDeliveryEditor({ listLoading: true }); assert(!(await c.saveDeliveryDraft())); assert.equal(storage.rows.size, 0);
  c.patchDeliveryEditor({ listLoading: false });
  let finish; c.deliveryDraftStorage = (...args) => new Promise(resolve => { finish = async () => resolve(await storage.call(...args)); });
  const pending = c.saveDeliveryDraft(); assert(c.state.deliveryEditor.draftSaving);
  let warned = false; listeners.get('beforeunload')({ preventDefault() { warned = true; } }); assert(warned);
  assert(!(await c.saveDeliveryDraft())); c.setState({ view: 'review' }); c.closeDeliveryEditor(); c.saveDeliveryEditor();
  assert.equal(c.state.view, 'delivery-create'); assert.equal(c.state.deliverySheets?.length || 0, 0);
  c.patchDeliveryEditor({ name: '保存期间继续输入' }); await finish(); await pending;
  assert(c.deliveryDraftDirty()); assert.match(c.deliveryDraftControls().status, /未保存的修改/);
  assert.equal([...storage.rows.values()][0].data.name, '草稿测试');
});

test('quota and blocked-storage errors preserve input and leave dialog; retry succeeds', async () => {
  const { c, storage } = component(); fill(c); c.deliveryEditorValues().cancel();
  c.deliveryDraftStorage = async () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); };
  assert(!(await c.saveDeliveryDraft({ leave: true }))); assert(c.state.deliveryLeave); assert(c.state.deliveryEditor); assert(c.deliveryDraftDirty());
  assert.match(c.deliveryDraftControls().error, /空间不足/); assert(!c.state.deliveryEditor.draftSavedAt);
  c.deliveryDraftStorage = storage.call; assert(await c.saveDeliveryDraft({ leave: true })); assert.equal(c.state.view, 'delivery');
  const unsupported = component().nativeStore; await assert.rejects(unsupported('list'), /不支持草稿存储/);
});

test('account isolation and stale resume callbacks do not expose or overwrite another account', async () => {
  const { c, storage } = component(); fill(c); await c.saveDeliveryDraft(); c.deliveryEditorValues().cancel();
  const stale = c.deliveryDraftListValues().rows[0].resume;
  c.props.currentUser = 'allen'; assert.equal(c.deliveryDraftListValues().rows.length, 0); await stale(); assert(!c.state.deliveryEditor);
  await c.loadDeliveryDrafts(); assert.equal(c.deliveryDraftListValues().rows.length, 0);
  assert.equal(storage.rows.size, 1);
});

test('concurrent tab revisions conflict without overwrite and can save as a new draft', async () => {
  const { c, storage } = component(); fill(c); await c.saveDeliveryDraft(); c.deliveryEditorValues().cancel();
  const other = component(storage).c; await other.loadDeliveryDrafts(); await other.deliveryDraftListValues().rows[0].resume();
  await c.deliveryDraftListValues().rows[0].resume(); c.patchDeliveryEditor({ name: '第一处修改' }); await c.saveDeliveryDraft();
  other.patchDeliveryEditor({ name: '第二处修改' }); assert(!(await other.saveDeliveryDraft())); assert(other.deliveryDraftControls().conflict);
  assert.equal([...storage.rows.values()][0].data.name, '第一处修改');
  assert(await other.deliveryDraftControls().saveCopy()); assert.equal(storage.rows.size, 2);
});

test('deletion needs explicit confirmation; formal creation removes only its draft after success', async () => {
  const { c, storage } = component(); fill(c, '保留'); await c.saveDeliveryDraft(); c.deliveryEditorValues().cancel();
  fill(c, '转为正式'); await c.saveDeliveryDraft(); c.setDeliveryList('天坛'); c.patchDeliveryEditor({ target: '1' }); confirmDelivery(c); c.saveDeliveryEditor(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(c.state.view, 'sheet'); assert.equal(storage.rows.size, 1); assert.equal([...storage.rows.values()][0].data.name, '保留');
  const row = c.deliveryDraftListValues().rows[0]; await row.delete(); assert.equal(storage.rows.size, 1);
  row.askDelete(); row.cancelDelete(); await row.delete(); assert.equal(storage.rows.size, 1);
  row.askDelete(); await row.delete(); assert.equal(storage.rows.size, 0); assert.match(c.state.deliveryDraftsNotice, /无法恢复/);
});

test('malformed records are recoverable errors and stale loads cannot replace newly saved drafts', async () => {
  const { c, storage } = component(); fill(c); await c.saveDeliveryDraft(); c.deliveryEditorValues().cancel();
  const record = [...storage.rows.values()][0]; record.data.tags = null;
  await c.deliveryDraftListValues().rows[0].resume(); assert(!c.state.deliveryEditor); assert.match(c.state.deliveryDraftsError, /无法读取/); assert.equal(storage.rows.size, 1);
  const next = component().c; let finish; next.deliveryDraftStorage = async action => action === 'list' ? new Promise(resolve => { finish = resolve; }) : {};
  const pending = next.loadDeliveryDrafts(); next.cacheDeliveryDraft({ owner: next.profileIdentity().accountName, id: 'new', savedAt: Date.now(), data: {} });
  finish([]); await pending; assert.equal(next.deliveryDraftListValues().count, 1);
});

test('draft extension is idempotent, scoped, labeled local, and exposes error/disabled/live states', () => {
  assert.equal(updateDeliveryDrafts(source), source);
  for (const [file, marker] of [['delivery-drafts.js', '// delivery-drafts:start'], ['delivery-drafts.css', '/* delivery-drafts:start */'], ['delivery-drafts.html', '<!-- delivery-drafts:start -->']]) {
    const text = fs.readFileSync(new URL('./templates/' + file, import.meta.url), 'utf8').trimEnd();
    assert(template.includes(text)); assert.equal(template.split(marker).length, 2);
  }
  assert(template.includes('草稿仅保存在当前浏览器，刷新后可继续编辑'));
  assert(template.includes('aria-live="polite"')); assert(template.includes('disabled="{{ deliveryEditor.draft.disabled }}"'));
  assert(!template.includes('离开前保存草稿？')); assert.equal(component().c.deliveryLeaveValues().save, undefined); assert(template.includes('aria-label="确认删除草稿"'));
});
