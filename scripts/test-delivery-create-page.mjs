import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateDeliverySkillWorkspace } from './update-delivery-skill-workspace.mjs';
import { updateMemberPicker } from './update-member-picker.mjs';
import { addDeliverySkillLibrary } from './add-delivery-skill-library.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const input = value => ({ target: { value } });
function component(narrow = false) {
  const listeners = new Map(), timers = [], effects = [];
  const dialog = { open: false, showModal() { this.open = true; effects.push('show-dialog'); }, close() { this.open = false; } };
  const heading = { focus() { effects.push('focus-heading'); } };
  const trigger = { isConnected: false, focus() { effects.push('focus-trigger'); } };
  const doc = { documentElement: { dataset: {} }, activeElement: trigger, addEventListener() {}, removeEventListener() {}, getElementById: id => id === 'forge-delivery-title' ? heading : null,
    querySelector: query => query === '.forge-delivery-leave-dialog' ? dialog : query === '.forge-delivery-create' ? trigger : null };
  const context = vm.createContext({ URLSearchParams, TextEncoder, TextDecoder, Blob, DecompressionStream,
    document: doc,
    window: { location: { search: '' }, scrollTo() {}, matchMedia: () => ({ matches: narrow }), addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    DCLogic: class { props = { currentUser: '一万', panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance;
  return { c, listeners, effects, dialog, doc, flush: () => { while (timers.length) timers.shift()(); } };
}
function fill(c) {
  const values = c.deliveryEditorValues();
  values.onName(input('新的交付单')); values.onCustomer(input('客户')); values.onTarget(input('1'));
  values.onList(input('天坛'));
}

test('creation enters an exclusive full-page view with four progressive steps and delivery navigation', () => {
  const { c, effects, flush } = component(); c.openDeliveryEditor(); flush();
  const v = c.renderVals(), form = v.deliveryEditor;
  assert.equal(c.state.view, 'delivery-create');
  assert(form.page && !form.modal && form.basic && !form.list && !form.skillTab);
  assert.equal(v.sidebar.deliveryCurrent, 'page'); assert.equal(v.sidebar.productionCurrent, 'false');
  assert(!v.isDelivery && !v.isSheet && !v.isOverview && !v.showSubNav);
  assert.equal(form.library.rows.length, 3);
  assert(effects.includes('focus-heading')); assert(!effects.includes('show-dialog'));
});

test('an untouched form and search-only changes return immediately without a discard prompt', () => {
  const { c, listeners } = component(); c.openDeliveryEditor();
  c.patchDeliveryEditor({ skillQuery: 'search', memberQuery: 'member', skillMode: 'choose', tab: 'skills' });
  assert(!c.deliveryDraftDirty()); assert(listeners.has('beforeunload'));
  c.deliveryEditorValues().cancel();
  assert.equal(c.state.deliveryEditor, null); assert.equal(c.state.view, 'delivery'); assert(!c.state.deliveryLeave);
  assert.equal(listeners.size, 0);
});

test('typing is dirty before blur; cancel and Escape-style keep retain every draft field', () => {
  const { c, dialog, flush } = component(); c.openDeliveryEditor(); fill(c);
  c.patchDeliveryEditor({ desc: '说明', tagName: '待添加', skillDraft: { name: '新 Skill', content: '未创建内容' } });
  const before = c.deliveryDraftSignature(c.state.deliveryEditor);
  c.deliveryEditorValues().cancel(); flush();
  assert(dialog.open); assert.equal(c.state.view, 'delivery-create');
  let prevented = false;
  c.deliveryLeaveValues().keep({ preventDefault() { prevented = true; }, stopPropagation() {} });
  assert(prevented); assert(!dialog.open); assert(!c.state.deliveryLeave);
  assert.equal(c.deliveryDraftSignature(c.state.deliveryEditor), before);
  assert(!c.state.deliverySheets?.length);
});

test('all app view changes are guarded, then resume the exact chosen destination on confirmation', () => {
  for (const view of ['overview', 'runs', 'review', 'sheet', 'itemlife']) {
    const { c } = component(); c.openDeliveryEditor(); fill(c);
    c.setState({ view, sheetKey: 'ant200', lifeItem: 'chosen-item' });
    assert.equal(c.state.view, 'delivery-create'); assert(c.state.deliveryLeave);
    c.deliveryLeaveValues().discard();
    assert.equal(c.state.view, view); assert.equal(c.state.sheetKey, 'ant200'); assert.equal(c.state.lifeItem, 'chosen-item');
    assert.equal(c.state.deliveryEditor, null); assert.equal(c.state.deliveryLeave, null);
  }
});

test('sidebar navigation and profile sheet links use the same guarded destination flow', () => {
  const { c } = component(); c.openDeliveryEditor(); fill(c);
  c.renderVals().sidebar.goReview();
  assert.equal(c.state.view, 'delivery-create'); assert.equal(c.state.deliveryLeave.next.view, 'review');
  c.deliveryLeaveValues().keep();
  const task = c.profileDeliveryTasks()[0]; assert(task); task.open();
  assert.equal(c.state.view, 'delivery-create'); assert.equal(c.state.deliveryLeave.next.sheetKey, task.key);
  c.deliveryLeaveValues().discard(); assert.equal(c.state.sheetKey, task.key); assert.equal(c.state.view, 'sheet');
});

test('Review Back returns to delivery after clean or confirmed creation departure', () => {
  for (const dirty of [false, true]) for (const entry of ['sidebar', 'notification', 'profile']) {
    const { c, flush } = component(); c.openDeliveryEditor(); if (dirty) fill(c);
    if (entry === 'sidebar') c.renderVals().sidebar.goReview();
    else if (entry === 'notification') c.renderVals().notif.items.find(row => row.isDone).go();
    else {
      const task = c.profileTasks().find(row => row.kind === 'review'); assert(task);
      c.openProfileTask(task.key);
    }
    if (dirty) c.deliveryLeaveValues().discard();
    assert.equal(c.state.view, 'review'); assert.equal(c.state.deliveryEditor, null);
    assert.equal(c.state.reviewReturn.view, 'delivery');
    if (entry === 'profile') assert(c.state.reviewOpen, 'resume Item-specific review after confirmation');
    const review = c.renderVals().review;
    assert.equal(review.backLabel, '返回交付'); review.back(); flush();
    assert.equal(c.state.view, 'delivery'); assert(c.renderVals().isDelivery);
  }
});

test('creation Escape closes utilities/sidebar but preserves native popover and dialog priority', () => {
  const { c, listeners } = component(true); c.componentDidMount(); c.openDeliveryEditor(); fill(c);
  const editorId = c.state.deliveryEditor.id;
  let prevented = 0;
  const escape = () => listeners.get('keydown')({ key: 'Escape', preventDefault() { prevented++; } });
  for (const field of ['notifOpen', 'dlOpen']) { c.setState({ [field]: true }); escape(); assert(!c.state[field]); }
  c.setState({ sidebarCollapsed: true, sidebarPeek: true }); escape(); assert(!c.state.sidebarPeek);
  c.setState({ sidebarCollapsed: false }); escape(); assert(c.state.sidebarCollapsed);
  assert.equal(prevented, 4); assert.equal(c.state.deliveryEditor.id, editorId);
  c.patchDeliveryEditor({ memberSearchOpen: true }); c.setState({ sidebarCollapsed: false }); escape();
  assert(!c.state.sidebarCollapsed); assert.equal(prevented, 4);
  c.patchDeliveryEditor({ memberSearchOpen: false }); c.deliveryEditorValues().cancel(); escape();
  assert(c.state.deliveryLeave); assert(!c.state.sidebarCollapsed); assert.equal(prevented, 4);
  c.deliveryLeaveValues().discard(); c.openDeliveryEditor('ant200'); c.setState({ notifOpen: true }); escape();
  assert(c.state.notifOpen); assert.equal(prevented, 4);
});

test('confirmed discard drops sheet drafts but retains already-published personal and platform Skills', () => {
  const { c } = component(); c.openDeliveryEditor(); fill(c);
  c.patchDeliveryEditor({ skillDraft: { name: '保留 Skill', command: 'keep-skill', content: '# 检查步骤' } });
  c.createDeliverySkill();
  assert.equal(c.personalProfileSkills().length, 1); assert.equal(c.state.deliveryEditor.skills.length, 0);
  c.deliveryEditorValues().library.rows.find(row => row.command === '/keep-skill').toggle();
  c.deliveryEditorValues().cancel(); c.deliveryLeaveValues().discard();
  assert(!c.state.deliverySheets?.length); assert.equal(c.personalProfileSkills().length, 1);
  assert(c.platformSkillCatalog().some(skill => skill.command === 'keep-skill'));
  c.openDeliveryEditor(); assert.equal(c.state.deliveryEditor.skills.length, 0);
});

test('Skill subflows preserve the sheet fields and explicit selection, and pristine draft clearing restores clean state', () => {
  const { c } = component(); c.openDeliveryEditor();
  c.deliveryEditorValues().workspace.start(); c.deliveryEditorValues().workspace.write();
  c.deliveryEditorValues().workspace.onName(input('临时'));
  assert(c.deliveryDraftDirty()); c.deliveryEditorValues().workspace.discardForm(); assert(!c.deliveryDraftDirty());
  fill(c); c.deliveryEditorValues().workspace.back();
  const row = c.deliveryEditorValues().library.rows[0]; row.toggle();
  const selected = c.state.deliveryEditor.skills[0].id;
  c.deliveryEditorValues().workspace.start(); c.deliveryEditorValues().workspace.upload(); c.deliveryEditorValues().workspace.back();
  assert.equal(c.state.deliveryEditor.name, '新的交付单'); assert.equal(c.state.deliveryEditor.entries.length, 1);
  assert.equal(c.state.deliveryEditor.skills[0].id, selected);
});

test('in-flight upload and browser document exit are guarded; stale upload cannot recreate a discarded editor', async () => {
  const { c, listeners } = component(); c.openDeliveryEditor();
  let prevented = false; const event = { preventDefault() { prevented = true; } };
  listeners.get('beforeunload')(event); assert(!prevented);
  let finish;
  const pending = c.uploadDeliverySkills([{ name: 'test.md', size: 24, text: () => new Promise(resolve => { finish = resolve; }) }]);
  listeners.get('beforeunload')(event); assert(prevented); assert.equal(event.returnValue, '');
  c.deliveryEditorValues().cancel(); c.deliveryLeaveValues().discard();
  finish('# Uploaded instructions'); await pending;
  assert.equal(c.state.deliveryEditor, null); assert.equal(listeners.size, 0); assert.equal(c.personalProfileSkills().length, 0);
});

test('re-entering creation retains the draft and stale cancel/confirmation actions cannot close a replacement', () => {
  const { c } = component(); c.openDeliveryEditor(); fill(c);
  const id = c.state.deliveryEditor.id, stale = c.deliveryEditorValues();
  c.openDeliveryEditor(); assert.equal(c.state.deliveryEditor.id, id); assert.equal(c.state.deliveryEditor.name, '新的交付单');
  stale.cancel(); const oldLeave = c.deliveryLeaveValues(); oldLeave.discard();
  c.openDeliveryEditor(); fill(c); stale.cancel(); oldLeave.discard();
  assert(c.state.deliveryEditor); assert(!c.state.deliveryLeave);
});

test('save cannot bypass an active leave confirmation; successful creation enters the new sheet detail', () => {
  const { c, listeners } = component(); c.openDeliveryEditor(); fill(c);
  c.deliveryEditorValues().cancel(); c.saveDeliveryEditor(); assert(!c.state.deliverySheets?.length);
  c.deliveryLeaveValues().keep(); confirmDelivery(c); c.saveDeliveryEditor();
  assert.equal(c.state.view, 'sheet'); assert.equal(c.deliverySheet(c.state.sheetKey).name, '新的交付单');
  assert.equal(c.state.deliveryEditor, null); assert.equal(listeners.size, 0);
});

test('existing sheet editing keeps its native dialog and adds the review assignment tab', () => {
  const { c } = component(); c.state.view = 'sheet'; c.state.sheetKey = 'ant200'; c.openDeliveryEditor('ant200');
  const v = c.deliveryEditorValues(); assert(!v.page && v.modal && v.basic && !v.list && !v.skillTab);
  assert.equal(v.tabs.length, 4); v.tabs[2].pick(); assert(c.deliveryEditorValues().skillTab);
  v.tabs[3].pick(); assert(c.deliveryEditorValues().reviewTab);
  v.onName(input('不保存')); v.cancel();
  assert.equal(c.state.view, 'sheet'); assert.notEqual(c.deliverySheet('ant200').name, '不保存');
});

test('shared form is mutually exclusive, readable, live-updated and uses a protected native discard dialog', () => {
  const block = template.split('<!-- delivery-editor:start -->')[1].split('<!-- delivery-editor:end -->')[0];
  const page = block.split('<sc-if value="{{ deliveryEditor.modal }}"')[0];
  assert(page.includes('forge-delivery-create-page')); assert(!page.includes('<dialog') && page.includes('<nav'));
  for (const heading of ['基础信息', '同步条目', '完整配置摘要']) assert(page.includes(heading));
  assert(page.includes('返回交付')); assert(page.includes('<h1 id="forge-delivery-title" tabindex="-1">'));
  assert(block.includes('<dialog class="forge-delivery-editor')); assert(block.includes('<dialog class="forge-delivery-leave-dialog'));
  assert(block.includes('sc-camel-on-cancel="{{ deliveryLeave.keep }}"'));
  assert(block.includes('autofocus sc-camel-on-click="{{ deliveryLeave.keep }}"'));
  for (const name of ['onName', 'onCustomer', 'onTarget', 'onDesc']) assert(page.includes('sc-camel-on-input="{{ deliveryEditor.' + name + ' }}"'));
  assert(template.includes('.forge-delivery-create-page .forge-delivery-editor-footer{position:sticky;bottom:0;'));
  assert(template.includes('.forge-wizard-layout{display:grid;'));
  for (const migration of [updateDeliverySkillWorkspace, updateMemberPicker, addDeliverySkillLibrary]) assert(migration(source) === source, migration.name + ' preserves the creation page');
});
