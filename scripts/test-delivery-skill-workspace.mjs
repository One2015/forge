import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateDeliverySkillWorkspace } from './update-delivery-skill-workspace.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });
const md = (command = 'delivery-check', content = '# Delivery check\nOnly inspect.') => {
  const text = '---\nname: ' + command + '\ndescription: Delivery instructions\n---\n' + content;
  return { name: command + '.md', size: Buffer.byteLength(text), text: async () => text };
};
function component(props = {}, environment = {}) {
  const context = vm.createContext({ URLSearchParams, TextEncoder, TextDecoder, Blob, DecompressionStream,
    window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    ...environment,
    DCLogic: class { props = { currentUser: '一万', panelWidth: 460, hasRuns: true, hasResources: true, ...props }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance; begin(c); return c;
}
function begin(c, key) {
  c.openDeliveryEditor(key);
  c.patchDeliveryEditor({ tab: 'skills', name: 'Skill 交付单', customer: '客户', target: '1' });
  if (!key) c.setDeliveryList('天坛');
}
function draft(c) {
  let v = c.deliveryEditorValues().workspace;
  v.start(); c.deliveryEditorValues().workspace.write();
  v = c.deliveryEditorValues().workspace; v.onName(change('交付验收')); v.onCommand(change('delivery-check'));
  v.onDescription(change('用于交付前检查。')); v.onContent(change('# 验收\n核对清单。'));
}
const save = c => { assert.equal(c.deliveryEditorIssue(), ''); confirmDelivery(c); c.saveDeliveryEditor(); return c.deliverySheet(c.state.sheetKey); };


const publishUploads = c => { assert.equal(c.deliveryEditorValues().workspace.uploadIssue, ''); c.deliveryEditorValues().workspace.publishUploads(); };
const select = (c, command = '/delivery-check') => c.deliveryEditorValues().library.rows.find(row => row.command === command).toggle();

test('Skill stays a single checklist until a creation method is chosen; legacy chooser drafts remain usable', () => {
  const c = component();
  assert.equal(c.deliveryEditorValues().tabs[2].label, 'Skill');
  assert.equal(c.deliveryEditorValues().workspace.modes, undefined);
  assert(c.deliveryEditorValues().workspace.existing);
  c.deliveryEditorValues().workspace.start(); assert(c.deliveryEditorValues().workspace.existing);
  c.patchDeliveryEditor({skillMode:'choose'});
  assert(c.deliveryEditorValues().workspace.existing); assert(!c.deliveryEditorValues().workspace.subpage);
  c.deliveryEditorValues().workspace.write(); assert(c.deliveryEditorValues().workspace.creating);
  c.deliveryEditorValues().workspace.back(); assert(c.deliveryEditorValues().workspace.existing);
  c.deliveryEditorValues().workspace.start(); c.deliveryEditorValues().workspace.upload();
  assert(c.deliveryEditorValues().workspace.uploading);
});

test('creation and editing retain the shared form/upload dropdown in both Forge variants', () => {
  const postman = fs.readFileSync(new URL('../public/forge-postman.html', import.meta.url), 'utf8');
  const postmanTemplate = JSON.parse(postman.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
  for (const variant of [template, postmanTemplate]) {
    const editor = variant.split('<!-- delivery-editor:start -->')[1].split('<!-- delivery-editor:end -->')[0];
    const [page, modal] = editor.split('<sc-if value="{{ deliveryEditor.modal }}"');
    for (const surface of [page, modal]) {
      const trigger = surface.match(/<button\b[^>]*id="forge-skill-create-trigger"[^>]*>/)?.[0];
      assert(trigger);
      assert(trigger.includes('popovertarget="forge-skill-create-menu"'));
      assert(!trigger.includes('sc-camel-on-click='), 'Opening the chooser must not enter the form');
      const menu = surface.match(/<div id="forge-skill-create-menu"[\s\S]*?<\/div>/)?.[0];
      assert(menu);
      assert(menu.includes('popover="auto" role="group" aria-label="创建 Skill 的方式"'));
      assert.equal((menu.match(/<button /g) || []).length, 2);
      assert.match(menu, /workspace.write[\s\S]*填写表单/);
      assert.match(menu, /workspace.upload[\s\S]*上传文件[\s\S]*\.md[\s\S]*SKILL.md/);
    }
  }
});

test('chooser actions close the popover, focus their subflow and preserve sheet inputs and Skill drafts', async () => {
  const timers = [], focused = [];
  let open = false, dismissed = 0;
  const c = component({}, {
    setTimeout(callback) { timers.push(callback); return 0; },
    document: { querySelector: () => null, getElementById(id) {
      if (id === 'forge-skill-create-menu') return { matches: () => open, hidePopover() { open = false; dismissed++; } };
      return ['forge-skill-create-name', 'forge-skill-create-trigger', 'forge-skill-upload-input'].includes(id)
        ? { focus() { focused.push(id); } } : null;
    } }
  });
  const flush = () => { while (timers.length) timers.shift()(); };
  flush(); c.deliveryEditorValues().library.rows[0].toggle();
  const signature = c.deliveryDraftSignature(c.state.deliveryEditor);
  open = true;
  assert(c.handleDeliveryEditorKey({ key: 'Escape' }));
  assert(!c.state.deliveryLeave);
  assert.equal(c.deliveryDraftSignature(c.state.deliveryEditor), signature);
  c.deliveryEditorValues().workspace.write(); flush();
  assert(!open); assert.equal(focused.at(-1), 'forge-skill-create-name');
  c.deliveryEditorValues().workspace.onName(change('保留的未完成表单'));
  c.deliveryEditorValues().workspace.back(); flush();
  assert.equal(focused.at(-1), 'forge-skill-create-trigger');
  open = true; c.deliveryEditorValues().workspace.upload(); flush();
  assert(!open); assert.equal(focused.at(-1), 'forge-skill-upload-input');
  await c.uploadDeliverySkills([md()]);
  assert.equal(c.state.deliveryEditor.skillUploads.length, 1);
  assert.equal(c.personalProfileSkills().length, 0, 'Upload still requires explicit creation');
  c.deliveryEditorValues().workspace.back(); c.deliveryEditorValues().workspace.write(); flush();
  assert.equal(c.state.deliveryEditor.skillDraft.name, '保留的未完成表单');
  assert.equal(c.state.deliveryEditor.name, 'Skill 交付单');
  assert.equal(c.state.deliveryEditor.skills.length, 1);
  assert.equal(c.state.deliveryEditor.skillUploads.length, 1);
  assert.equal(dismissed, 2);
});

test('Skill rows have an inline title and shortcut, context beneath, and an independent View in the same row', () => {
  const c=component(), row=c.deliveryEditorValues().library.rows[0];
  assert.equal(row.commandDisplay, '/ ' + row.bindingCommand);
  const markup=fs.readFileSync(new URL('./templates/delivery-editor.html',import.meta.url),'utf8');
  const entry=markup.split('<div class="forge-delivery-library-row">')[1].split('</sc-for>')[0];
  assert.match(entry, /forge-delivery-library-title[\s\S]*option.name[\s\S]*option.commandDisplay/);
  assert.match(entry, /<\/label>\s*<button[^>]*forge-delivery-skill-view/);
  assert(!entry.includes('option.meta'));
  assert(!markup.includes('workspace.choosing'));
  assert.match(markup, /id="forge-skill-create-menu"[^>]*popover="auto"[^>]*role="group"/);
  assert.match(markup, /popovertarget="forge-skill-create-menu"/);
  assert(!markup.includes('forge-delivery-skill-create-options'));
  const css=fs.readFileSync(new URL('./templates/delivery-workflows.css',import.meta.url),'utf8');
  assert.match(css, /\.forge-delivery-library-title\{display:flex;align-items:baseline/);
  assert.match(css, /\.forge-delivery-skill-detail h2\{[^}]*font-size:18px;line-height:26px/);
  assert.match(css, /\.forge-delivery-skill-detail-body\{[^}]*font-size:13px;line-height:21px/);
  assert(!css.includes('.forge-delivery-library-option[data-selected="true"]{background:'));
});

test('creation validates the form, publishes platform and personal copies, but never auto-selects', () => {
  const c = component(); draft(c);
  c.deliveryEditorValues().workspace.onContent(change(' ')); c.createDeliverySkill();
  assert.match(c.state.deliveryEditor.skillError, /指令/); assert.equal(c.platformSkillCatalog().length, 3);
  c.deliveryEditorValues().workspace.onContent(change('<script>neverExecute()</script>'));
  c.patchDeliveryEditor({ skillQuery: 'will not match', name: '' });
  c.deliveryEditorValues().workspace.create();
  assert.equal(c.platformSkillCatalog().length, 4); assert.equal(c.personalProfileSkills().length, 1);
  assert.equal(c.state.deliveryEditor.skills.length, 0);
  assert.equal(c.state.deliveryEditor.skillQuery, ''); assert(c.deliveryEditorValues().workspace.existing);
  assert(!c.deliverySkillDraftDirty()); assert.match(c.state.deliveryEditor.skillNotice, /请在列表中勾选/);
  select(c); const personal = c.personalProfileSkills()[0];
  assert.equal(personal.content, '<script>neverExecute()</script>');
  c.saveDeliveryEditor(); assert(c.state.deliveryEditor, 'Invalid sheet cannot be saved');
  assert.equal(c.personalProfileSkills().length, 1, 'Published Skill is independent of sheet validation');
  c.patchDeliveryEditor({ name: '验收单' }); const sheet = save(c);
  assert.equal(sheet.skills[0].personalSkillId, personal.id); assert.notEqual(sheet.skills[0], personal);
  assert.equal(sheet.skills[0].personalPending, undefined); assert.equal(c.state.skillSessions, undefined);
});

test('upload stages editable files; confirmation publishes and selection binds from the updated list', async () => {
  const c = component(); await c.uploadDeliverySkills([md()]);
  assert.equal(c.state.deliveryEditor.skillUploads.length, 1);
  assert.equal(c.personalProfileSkills().length, 0); assert.equal(c.platformSkillCatalog().length, 3);
  assert.equal(c.state.deliveryEditor.skills.length, 0); assert.match(c.deliveryEditorIssue(), /Skill/);
  publishUploads(c);
  assert.equal(c.state.deliveryEditor.skills.length, 0); assert.equal(c.personalProfileSkills().length, 1);
  select(c); const sheet = save(c), personal = c.personalProfileSkills()[0];
  assert.equal(c.profileSkills().length, 1); assert.match(c.profileSkills()[0].sheetName, /已关联 1 张数据单/);
  begin(c, sheet.key); select(c); save(c);
  assert.equal(c.deliverySheet(sheet.key).skills.length, 0); assert.equal(c.personalProfileSkills()[0].id, personal.id);
  assert.equal(c.platformSkillCatalog().length, 4); assert.equal(c.profileSkills()[0].sheetName, '个人 Skill');
});

test('cancelling unpublished drafts changes no library; cancelling the sheet retains published Skills', async () => {
  const c = component(); draft(c); c.closeDeliveryEditor();
  assert.equal(c.personalProfileSkills().length, 0); begin(c);
  await c.uploadDeliverySkills([md()]); c.closeDeliveryEditor();
  assert.equal(c.personalProfileSkills().length, 0); assert.equal(c.platformSkillCatalog().length, 3);
  begin(c); draft(c); c.createDeliverySkill(); c.closeDeliveryEditor();
  assert.equal(c.personalProfileSkills().length, 1); assert.equal(c.platformSkillCatalog().length, 4);
  begin(c); assert.equal(c.state.deliveryEditor.skills.length, 0); select(c); save(c);
});

test('same-content re-uploads reuse platform and personal identities without duplicate rows', async () => {
  const c = component(); await c.uploadDeliverySkills([md()]); publishUploads(c); select(c);
  const first = save(c), personal = c.personalProfileSkills()[0];
  begin(c, first.key); save(c); begin(c);
  await c.uploadDeliverySkills([md()]); publishUploads(c);
  assert.match(c.state.deliveryEditor.skillNotice, /已复用/); select(c); const second = save(c);
  assert.equal(c.personalProfileSkills().length, 1); assert.equal(c.platformSkillCatalog().length, 4);
  assert.equal(second.skills[0].personalSkillId, personal.id); assert.match(c.profileSkills()[0].sheetName, /已关联 2 张数据单/);
  assert.equal(c.deliverySkillLibrary().filter(skill => skill.command === 'delivery-check').length, 1);
});

test('conflicting content requires explicit rename before publication and never overwrites', async () => {
  const c = component(); await c.uploadDeliverySkills([md()]); publishUploads(c);
  const original = c.personalProfileSkills()[0].content;
  await c.uploadDeliverySkills([md('delivery-check', '# New instructions')]);
  assert.match(c.deliveryEditorValues().workspace.uploadIssue, /内容不同/);
  c.deliveryEditorValues().workspace.publishUploads();
  assert.equal(c.personalProfileSkills().length, 1); assert.equal(c.personalProfileSkills()[0].content, original);
  c.deliveryEditorValues().workspace.uploads[0].onCommand(change('delivery-check-v2')); publishUploads(c);
  assert.equal(c.personalProfileSkills().length, 2); assert.equal(c.platformSkillCatalog().length, 5);
  assert.equal(c.state.deliveryEditor.skills.length, 0);
});

test('capacity failure is atomic and selecting existing Skills remains available', async () => {
  const c = component();
  c.state.personalSkills = Array.from({ length: 12 }, (_, i) => ({ id: 'p'+i, owner:'一万', name:'已有 '+i, command:'p'+i, content:'# Existing '+i }));
  await c.uploadDeliverySkills([md()]); assert.match(c.deliveryEditorValues().workspace.uploadIssue, /个人 Skill 最多/);
  c.deliveryEditorValues().workspace.publishUploads();
  assert.equal(c.personalProfileSkills().length, 12); assert.equal(c.platformSkillCatalog().length, 3);
  c.deliveryEditorValues().workspace.discard(); c.deliveryEditorValues().workspace.back(); select(c, '/p0');
  assert.equal(save(c).skills[0].personalSkillId, 'p0');
});

test('partial file errors retain successful drafts and support rename, remove and retry', async () => {
  const c = component({platformSkills:[]});
  await c.uploadDeliverySkills([md(), {name:'bad.js',size:1}, md('bad/name')]);
  assert.match(c.state.deliveryEditor.skillError, /请选择/);
  assert.equal(c.state.deliveryEditor.skillUploads.length, 2);
  assert(c.deliveryEditorValues().workspace.publishDisabled);
  c.deliveryEditorValues().workspace.uploads[1].onCommand(change('fixed-name'));
  c.deliveryEditorValues().workspace.uploads[1].onName(change('修正名称'));
  publishUploads(c); assert.equal(c.platformSkillCatalog().length, 2);
  await c.uploadDeliverySkills([md('remove-me')]);
  c.deliveryEditorValues().workspace.uploads[0].remove(); assert.equal(c.state.deliveryEditor.skillUploads.length, 0);
  assert.equal(c.state.deliveryEditor.skillNotice, '');
  assert.equal(c.platformSkillCatalog().length, 2);
});

test('search selection survives the create flow; new Skills remain unchecked until explicitly chosen', () => {
  const c = component(); select(c, '/web review');
  c.deliveryEditorValues().library.onSearch(change('missing'));
  assert(c.deliveryEditorValues().library.rows.every(row => row.selected));
  draft(c); c.createDeliverySkill();
  assert.equal(c.state.deliveryEditor.skills.length, 1);
  assert(c.deliveryEditorValues().library.rows.find(row=>row.command==='/web review').selected);
  assert(!c.deliveryEditorValues().library.rows.find(row=>row.command==='/delivery-check').selected);
  select(c); assert.equal(save(c).skills.length, 2);
});

test('unfinished drafts survive returning to the checklist or switching creation methods', async () => {
  const c = component(); draft(c); c.deliveryEditorValues().workspace.back();
  assert(c.deliveryEditorValues().workspace.hiddenDraft); assert.match(c.deliveryEditorIssue(), /Skill/);
  c.deliveryEditorValues().workspace.start(); c.deliveryEditorValues().workspace.upload();
  await c.uploadDeliverySkills([md('another')]); publishUploads(c);
  assert(c.deliverySkillDraftDirty(), 'Publishing upload must not discard the form');
  c.deliveryEditorValues().workspace.start(); c.deliveryEditorValues().workspace.write();
  assert.equal(c.deliveryEditorValues().workspace.command, 'delivery-check');
  c.createDeliverySkill(); assert(!c.deliverySkillDraftDirty()); assert.equal(c.platformSkillCatalog().length, 5);
});

test('account changes and late reads cannot publish into a replacement editor', async () => {
  const c = component(); draft(c); const stale = c.deliveryEditorValues().workspace;
  c.props.currentUser='allen'; stale.create();
  assert.equal(c.personalProfileSkills().length, 0); assert(c.deliveryEditorValues().workspace.locked);
  c.props.currentUser='一万'; c.closeDeliveryEditor(); begin(c);
  let resolve; const file=md(), reading=c.uploadDeliverySkills([{...file,text:()=>new Promise(done=>{resolve=done})}]);
  assert(c.deliveryEditorValues().workspace.locked); assert(c.deliveryEditorValues().library.rows.every(row=>row.disabled));
  c.props.currentUser='allen'; resolve(await file.text()); await reading;
  assert.match(c.state.deliveryEditor.skillError,/账号已切换/); assert(!c.state.deliveryEditor.skillLoading);
  c.props.currentUser='一万'; c.closeDeliveryEditor(); begin(c);
  let finish; const pending=c.uploadDeliverySkills([{...file,text:()=>new Promise(done=>{finish=done})}]);
  c.closeDeliveryEditor(); begin(c); finish(await file.text()); await pending;
  assert.equal(c.state.deliveryEditor.skillUploads.length, 0); assert.equal(c.personalProfileSkills().length, 0);
  stale.create(); assert.equal(c.platformSkillCatalog().length, 3);
});

test('form and file drafts can be cleared independently without losing the other creation method', async () => {
  const c=component(); draft(c); await c.uploadDeliverySkills([md('other')]);
  c.deliveryEditorValues().workspace.discardUploads();
  assert(c.deliverySkillDraftDirty()); assert.equal(c.state.deliveryEditor.skillUploads.length,0);
  await c.uploadDeliverySkills([md('other')]); c.deliveryEditorValues().workspace.discardForm();
  assert(!c.deliverySkillDraftDirty()); assert.equal(c.state.deliveryEditor.skillUploads.length,1);
  c.deliveryEditorValues().workspace.discard(); assert.equal(c.state.deliveryEditor.skillUploads.length,0);
});

test('publication rechecks current catalog and capacity rather than trusting stale enabled actions', () => {
  const c=component(); draft(c); const before=c.deliveryEditorValues().workspace;
  assert(!before.createDisabled);
  c.props.platformSkills=[{id:'race',name:'Another',command:'delivery-check',content:'# Different'}];
  before.create(); assert.match(c.state.deliveryEditor.skillError,/内容不同/);
  assert.equal(c.personalProfileSkills().length,0); assert.equal(c.state.createdPlatformSkills?.length || 0,0);
  c.props.platformSkills=[];
  c.state.personalSkills=Array.from({length:12},(_,i)=>({id:'p'+i,owner:'一万',name:'p'+i,command:'p'+i,content:'# P'+i}));
  before.create(); assert.match(c.state.deliveryEditor.skillError,/最多保存 12/);
  assert.equal(c.state.createdPlatformSkills?.length || 0,0);
});

test('published platform Skills are shared but personal libraries remain account-scoped', async () => {
  const c=component(); await c.uploadDeliverySkills([md()]); publishUploads(c);
  c.props.currentUser='allen'; assert.equal(c.personalProfileSkills().length,0);
  c.closeDeliveryEditor(); begin(c); assert(c.deliveryEditorValues().library.rows.some(row=>row.command==='/delivery-check'));
  assert.equal(c.profileSkills().length,0);
  select(c); save(c);
  assert.equal(c.personalProfileSkills().length,0, 'Selecting a shared Skill does not copy it into personal storage');
});

test('unavailable selected sources stay visible and removable in the same checklist', () => {
  const c=component({platformSkills:[{id:'one',name:'One',command:'one',content:'# One'}]});
  select(c,'/one'); c.props.platformSkills=[];
  const row=c.deliveryEditorValues().library.rows[0];
  assert(row.selected); assert.match(row.meta,/来源不可用/);
  row.toggle(); assert.equal(c.state.deliveryEditor.skills.length,0); assert(c.deliveryEditorValues().library.empty);
});

test('single-list markup uses native controls and escaped previews, with no duplicate selected section', () => {
  const editor=template.split('<!-- delivery-editor:start -->')[1].split('<!-- delivery-editor:end -->')[0];
  assert(!editor.includes('数据单 Skill')); assert(!editor.includes('本数据单使用'));
  assert(!editor.includes('workspace.modes')); assert(!editor.includes('forge-delivery-skill-modes'));
  assert(editor.includes('平台 Skill')); assert(editor.includes('填写表单')); assert(editor.includes('上传文件'));
  assert(editor.includes('sc-camel-on-drop="{{ deliveryEditor.workspace.drop }}"'));
  assert(editor.includes('<p>{{ block.text }}</p>')); assert(editor.includes('<pre>{{ skill.content }}</pre>'));
  assert(editor.includes('aria-describedby="forge-skill-detail-command-error"'));
  assert(editor.includes('{{ deliveryEditor.library.count }} 个结果'));
  assert(!editor.includes('已选 {{ deliveryEditor.skillCount }} / 12'));
  assert(!editor.includes('forge-delivery-tag-reset'));
  assert(!editor.includes('forge-delivery-tag-hint'));
  assert(!editor.includes('最多 30 字，添加后可分配给清单条目。'));
  const stack=[], voids=new Set(['img','input','br','hr','meta','link']);
  for (const [full,name] of editor.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)) {
    if (voids.has(name) || full.endsWith('/>')) continue;
    if (full.startsWith('</')) assert.equal(stack.pop(),name,full); else stack.push(name);
  }
  assert.equal(stack.length,0,'The entire editor remains balanced after replacing its Skill section');
  assert.equal(updateDeliverySkillWorkspace(source), source);
});

test('Tag starts collapsed with no selected color; opening and cancelling are pristine', () => {
  const c=component(); const signature=c.deliveryDraftSignature(c.state.deliveryEditor);
  assert.equal(c.state.deliveryEditor.tagComposerOpen,false);
  assert(c.deliveryEditorValues().palette.every(color=>!color.selected));
  c.deliveryEditorValues().startTag(); assert(c.state.deliveryEditor.tagComposerOpen);
  assert.equal(c.deliveryDraftSignature(c.state.deliveryEditor),signature);
  c.deliveryEditorValues().palette[3].pick(); assert(c.deliveryEditorValues().palette[3].selected);
  c.deliveryEditorValues().resetTagColor(); assert(c.deliveryEditorValues().palette.every(color=>!color.selected));
  c.deliveryEditorValues().onTagName(change('未添加')); assert.match(c.deliveryEditorIssue(),/正在创建的 Tag/);
  c.deliveryEditorValues().cancelTag(); assert.equal(c.deliveryDraftSignature(c.state.deliveryEditor),signature);
});

test('Tag creation uses an optional default, resets draft colors, rejects duplicates and caps at 20', () => {
  const c=component(); c.deliveryEditorValues().startTag(); c.deliveryEditorValues().onTagName(change('验收'));
  c.deliveryEditorValues().addTag(); assert.equal(c.state.deliveryEditor.tags[0].color,'#64748b');
  assert.equal(c.state.deliveryEditor.tagColor,''); assert(!c.state.deliveryEditor.tagComposerOpen);
  c.deliveryEditorValues().startTag(); c.deliveryEditorValues().onTagName(change('验收'));
  assert(c.deliveryEditorValues().tagDisabled); c.deliveryEditorValues().addTag(); assert.equal(c.state.deliveryEditor.tags.length,1);
  c.deliveryEditorValues().onTagName(change('紧急')); c.deliveryEditorValues().onTagColor(change('#123456')); c.deliveryEditorValues().addTag();
  assert.equal(c.state.deliveryEditor.tags[1].color,'#123456'); assert(!c.deliveryEditorValues().hasTagColor);
  for(let i=2;i<20;i++) { c.patchDeliveryEditor({tagName:'Tag '+i}); c.addDeliveryTag(); }
  c.deliveryEditorValues().startTag(); assert(!c.state.deliveryEditor.tagComposerOpen);
  assert(c.deliveryEditorValues().tagsFull); assert.match(c.state.deliveryEditor.tagNotice,/20/);
  c.patchDeliveryEditor({tagName:'Overflow'}); c.addDeliveryTag(); assert.equal(c.state.deliveryEditor.tags.length,20);
});

test('Tag keyboard actions respect composition and stale/account-switched controls cannot change a replacement draft', () => {
  const c=component(), stale=c.deliveryEditorValues(); stale.startTag(); stale.onTagName(change('名称'));
  let stopped=0; const key={key:'Enter',target:{id:'forge-delivery-tag-name'},preventDefault(){stopped++},stopPropagation(){}};
  c.deliveryEditorValues().onTagKey({...key,isComposing:true}); assert.equal(c.state.deliveryEditor.tags.length,0);
  c.deliveryEditorValues().onTagKey(key); assert.equal(c.state.deliveryEditor.tags.length,1); assert.equal(stopped,1);
  c.closeDeliveryEditor(); begin(c); stale.startTag(); stale.onTagName(change('stale')); stale.palette[1].pick(); stale.addTag();
  assert.equal(c.state.deliveryEditor.tagName,''); assert.equal(c.state.deliveryEditor.tagColor,''); assert.equal(c.state.deliveryEditor.tags.length,0);
  const before=c.deliveryEditorValues(); c.props.currentUser='allen'; before.startTag(); before.onTagName(change('wrong')); before.palette[0].pick();
  assert.equal(c.state.deliveryEditor.tagName,''); assert(!c.state.deliveryEditor.tagComposerOpen);
});

test('viewing Skill content is independent of selection and never dirties the sheet', () => {
  const c=component(), before=c.deliveryDraftSignature(c.state.deliveryEditor), row=c.deliveryEditorValues().library.rows[0];
  row.view(); const detail=c.deliveryEditorValues().detail;
  assert(detail.open); assert.equal(detail.name,row.name); assert.equal(detail.command,row.command);
  assert.equal(c.state.deliveryEditor.skills.length,0); assert.equal(c.deliveryDraftSignature(c.state.deliveryEditor),before);
  detail.close(); assert(!c.deliveryEditorValues().detail.open);
  row.toggle(); row.view(); assert(c.deliveryEditorValues().detail.selected);
  c.deliveryEditorValues().detail.close(); assert.equal(c.state.deliveryEditor.skills.length,1);
});

test('detail command edits update only the selected snapshot and report empty/duplicate aliases', () => {
  const c=component(), row=c.deliveryEditorValues().library.rows[0]; row.toggle(); row.view();
  const original=c.deliverySkillLibrary()[0].command;
  c.deliveryEditorValues().detail.onCommand(change('')); assert(c.deliveryEditorValues().detail.commandInvalid);
  c.deliveryEditorValues().detail.onCommand(change('local-alias')); assert.equal(c.deliveryEditorValues().detail.command,'/local-alias');
  assert.equal(c.deliverySkillLibrary()[0].command,original);
  c.deliveryEditorValues().detail.close(); c.deliveryEditorValues().library.rows[1].toggle(); row.view();
  c.deliveryEditorValues().detail.onCommand(change(c.state.deliveryEditor.skills[1].command));
  assert.match(c.deliveryEditorValues().detail.commandIssue,/重复/);
});

test('detail ignores list search, blocks sheet submit shortcuts, and stale dialog actions cannot target a new editor', () => {
  const c=component(), row=c.deliveryEditorValues().library.rows[0]; row.view(); const oldDetail=c.deliveryEditorValues().detail;
  c.patchDeliveryEditor({skillQuery:'not-found'}); assert.equal(c.deliveryEditorValues().library.rows.length,0); assert(c.deliveryEditorValues().detail.open);
  let prevented=false, saved=false; c.saveDeliveryEditor=()=>{saved=true};
  c.handleDeliveryEditorKey({key:'Enter',ctrlKey:true,preventDefault(){prevented=true}});
  assert(prevented); assert(!saved);
  c.closeDeliveryEditor(); begin(c); row.view(); assert(!c.deliveryEditorValues().detail.open);
  c.deliveryEditorValues().library.rows[1].view(); oldDetail.close(); assert(c.deliveryEditorValues().detail.open);
});

test('Skill preview keeps code/HTML as text, renders structure and offers a useful empty state', () => {
  const c=component(), blocks=c.deliverySkillContentBlocks('# Title\n\nLine one\nLine two\n\n- First\n- Second\n\n```html\n<script>bad()</script>\n```');
  assert(blocks[0].heading); assert.equal(blocks[1].text,'Line one\nLine two'); assert.equal(blocks[2].items.length,2);
  assert(blocks[3].code); assert.equal(blocks[3].text,'<script>bad()</script>');
  assert.match(c.deliverySkillContentBlocks('')[0].text,/暂无/);
  assert.equal(c.deliverySkillContentBlocks('```\nunfinished')[0].text,'unfinished');
});

test('detail markup is a single native dialog with an independent link-style action, shortcut and bounded preview', () => {
  const editor=template.split('<!-- delivery-editor:start -->')[1].split('<!-- delivery-editor:end -->')[0];
  assert.equal((editor.match(/<dialog class="forge-delivery-skill-detail"/g)||[]).length,1);
  assert(!editor.includes('查看内容与调用名'));
  assert(editor.includes('aria-haspopup="dialog" sc-camel-on-click="{{ option.view }}"'));
  assert(editor.includes('class="forge-delivery-skill-shortcut">{{ deliveryEditor.detail.command }}'));
  assert(editor.includes('<span class="forge-delivery-skill-kind">Skill</span>'));
  assert(!template.includes('.forge-delivery-skill-detail h2>span{'), 'Interpolated title spans inherit heading typography, not the muted kind label');
  assert(editor.includes('aria-label="关闭 Skill 详情" autofocus'));
  assert(editor.includes('sc-camel-on-cancel="{{ deliveryEditor.detail.close }}"'));
  assert(editor.includes('role="region" aria-label="Skill 完整内容"'));
  assert(editor.includes('class="forge-delivery-file-button forge-delivery-list-upload"'));
});
