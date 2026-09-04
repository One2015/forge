import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const template = JSON.parse(fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8').split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function component(props = {}, narrow = false) {
  const context = vm.createContext({
    URLSearchParams, TextDecoder, TextEncoder, Blob, DecompressionStream,
    window: { location: { search: '' }, matchMedia: () => ({ matches: narrow }) }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, ...props }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}
test('the confirmed Member sees delivery sheets, not individual cases or runs', () => {
  const c = component();
  c.syncProfilePopover({ newState: 'open' });
  const p = c.profileValues();
  assert.equal(p.name, '一万'); assert.equal(p.roleLabel, 'Member');
  assert(p.tasks.length > 0); assert(p.tasks.every(task => task.kind === 'delivery'));
  assert(p.tasks.some(task => task.key === 'ant200'));
  assert(p.tasks.every(task => !task.status && !task.runId && !task.itemId));
  assert(!p.tasks.some(task => task.title === '布达拉宫'));
});
test('Lead sees the full task catalog; Project Owner sees only explicit project IDs', () => {
  const lead = component({ currentRole: 'Lead' });
  assert.equal(lead.profileTasks().length, lead.profileTaskCatalog().length);
  const owner = component({ currentRole: 'Project Owner', ownedProjectIds: ['web3d-china-landmarks-v2'] });
  assert(owner.profileTasks().length > 0);
  assert(owner.profileTasks().every(task => task.projectId === 'web3d-china-landmarks-v2'));
  assert(owner.profileTasks().some(task => task.assignee !== '一万'));
  assert.equal(component({ currentRole: 'project-owner' }).profileTasks().length, 0);
  assert.equal(component({ currentRole: 'project-owner', ownedProjectIds: ['not-a-project'] }).profileTasks().length, 0);
});
test('Outsourcing remains assignment-scoped; unknown roles fail closed', () => {
  const c = component({ currentRole: 'outsourcing', currentUser: 'allen' });
  assert(c.profileTasks().length > 0); assert(c.profileTasks().every(task => task.assignee === 'allen'));
  assert.equal(component({ currentRole: 'admin' }).profileTasks().length, 0);
  assert.equal(component({ currentRole: 'admin' }).profileSkills().length, 0);
});
test('delivery actions recheck scope and open the exact sheet with clean filters', () => {
  const c = component();
  c.state.profileOpen = true;
  const before = c.state.view; c.openProfileDelivery('missing'); assert.equal(c.state.view, before);
  const sheet = c.profileValues().tasks[0];
  Object.assign(c.state, {sheetFilter: 'review', sheetQuery: 'old', sheetTagFilter: 'old', sheetRow: 1, reviewOpen: 'old'});
  sheet.open();
  assert.equal(c.state.view, 'sheet'); assert.equal(c.state.profileOpen, false);
  assert.equal(c.state.sheetKey, sheet.key); assert.equal(c.state.sheetFilter, 'all');
  assert.equal(c.state.sheetQuery, ''); assert.equal(c.state.sheetTagFilter, '');
  assert.equal(c.state.sheetRow, null); assert.equal(c.state.reviewOpen, null);
});
test('Skills come only from visible task Item bindings, deduplicated by sheet and ID', () => {
  const c = component();
  const mine = c.profileTasks().find(task => task.kind === 'review');
  const other = c.profileTaskCatalog().find(task => task.kind === 'review' && task.assignee !== '一万');
  c.state.deliverySheets = [
    { key: 'mine', name: '我的审核数据单', customer: '测试', target: 1, entries: [{ itemId: mine.itemId }], skills: [{ id: 's1', command: '3d trajectory', name: '3D 轨迹', description: '检查镜头轨迹', content: 'Review trajectory.', filename: 'SKILL.md' }] },
    { key: 'other', name: '其他人的数据单', customer: '测试', target: 1, entries: [{ itemId: other.itemId }], skills: [{ id: 's2', command: 'private', name: '仅其他任务', content: 'Other item.' }] }
  ];
  const skills = c.profileSkills();
  assert.equal(skills.length, 1); assert.equal(skills[0].bindingId, 'mine:s1');
  assert.equal(c.profileSkills([mine, mine]).length, 1);
  c.openProfileSkill('other:s2'); assert.equal(c.state.skillSessions, undefined);
  c.openProfileSkill('mine:s1');
  assert.equal(c.state.view, 'sheet'); assert.equal(c.state.sheetKey, 'mine');
  assert.equal(c.state.skillSessions, undefined); // Navigation does not execute the evaluation.
  assert.equal(c.state.reviewOpen, null);
});
test('Skill bindings are reevaluated after removal; same-named files retain sheet identity', () => {
  const c = component(); const task = c.profileTasks().find(value => value.kind === 'review');
  c.state.deliverySheets = ['a','b'].map(key => ({ key, name: key, customer: '测试', target: 1, entries: [{ itemId: task.itemId }], skills: [{ id: 's', command: 'same', name: 'Same' }] }));
  assert.equal(c.profileSkills().length, 2);
  c.state.deliverySheets[0].skills = [];
  c.openProfileSkill('a:s'); assert.equal(c.state.skillSessions, undefined);
  assert.equal(c.profileSkills().length, 1);
});
test('native panel sync excludes other utilities, preserves drafts and collapses the mobile rail', () => {
  for (const narrow of [false, true]) {
    const c = component({}, narrow); c.state.sidebarCollapsed = false;
    c.state.dlOpen = true; c.state.notifOpen = true; c.state.reworkNotes = { draft: '保留' };
    c.syncProfilePopover({ newState: 'open' });
    assert.equal(c.state.dlOpen, false); assert.equal(c.state.notifOpen, false);
    assert.equal(c.state.sidebarCollapsed, narrow);
    c.renderVals().sidebar.toggleDownloads(); assert.equal(c.state.profileOpen, false); assert.equal(c.state.dlOpen, true);
    c.syncProfilePopover({ newState: 'open' }); c.renderVals().sidebar.goRuns(); assert.equal(c.state.profileOpen, false);
    assert.equal(c.state.reworkNotes.draft, '保留');
    c.syncProfilePopover({ newState: 'closed' }); assert.equal(c.profileValues().open, false);
  }
});
test('empty states always offer Skill upload and omit role/scope explanations', () => {
  const c = component({ hasRuns: false }); c.syncProfilePopover({ newState: 'open' });
  assert.equal(c.profileValues().noTasks, true); assert.equal(c.profileValues().noSkills, true);
  c.profileValues().pickSkills(); assert.equal(c.profileValues().showSkills, true);
  c.profileValues().pickTasks(); assert.equal(c.profileValues().showTasks, true);
  const html = fs.readFileSync(new URL('./templates/forge-profile.html', import.meta.url), 'utf8');
  assert(html.includes('popover="auto"')); assert(html.includes('popovertargetaction="hide"'));
  assert(html.includes('本地演示')); assert(html.includes('上传个人 Skill'));
  assert.equal(c.profileValues().uploadDisabled, false); assert.equal(c.profileValues().canEditIdentity, false);
  assert(!html.includes('角色与任务范围')); assert(!html.includes('profile.scope'));
  assert(!html.includes('sc-camel-on-key'));
  assert.equal([...html.matchAll(/<sc-for list="{{ profile\.(tasks|skills|roles) }}" as=/g)].length, 2);
  assert(!template.includes('--forge-panel-subtle'));
});
test('resizing an open profile to mobile collapses only the rail, without closing the panel', () => {
  const c = component({}, true); c.state.sidebarCollapsed = false; c.state.profileOpen = true;
  c.collapseProfileForViewport(); assert.equal(c.state.sidebarCollapsed, true); assert.equal(c.state.profileOpen, true);
  c.state.sidebarCollapsed = false; c.state.profileOpen = false;
  c.collapseProfileForViewport(); assert.equal(c.state.sidebarCollapsed, false);
});

const change = value => ({target: {value}});
const skillText = '---\nname: 3d trajectory\ndescription: 检查轨迹\n---\n# 仅保存内容，不执行\nReview trajectory.';
const md = (name = 'SKILL.md', text = skillText) => ({name, size: Buffer.byteLength(text), text: async () => text});
const open = c => c.syncProfilePopover({newState: 'open'});
const customSheet = (patch = {}) => ({key:'personal-sheet', name:'测试交付单', customer:'测试客户', target:2, entries:[], skills:[], ...patch});
function storedZip(path, text = skillText) {
  const name = Buffer.from(path), data = Buffer.from(text), local = Buffer.alloc(30), central = Buffer.alloc(46), end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + data.length, 16);
  const bytes = Buffer.concat([local, name, data, central, name, end]);
  return {name:'skills.zip', size:bytes.length, arrayBuffer:async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)};
}

test('sheet scopes aggregate assigned Items, explicit projects and creator-owned empty sheets', () => {
  const lead = component({currentRole:'lead'});
  assert.equal(lead.profileDeliveryTasks().length, lead.deliveryData().flatMap(group => group.sheets).length);
  const member = component({hasRuns:false});
  member.state.deliverySheets = [customSheet({createdBy:'一万'}), customSheet({key:'elsewhere', createdBy:'allen'})];
  assert.deepEqual(Array.from(member.profileDeliveryTasks(), sheet => sheet.key), ['personal-sheet']);
  const owner = component({currentRole:'owner', hasRuns:false, ownedProjectIds:['p1']});
  owner.state.deliverySheets = [customSheet({projectIds:['p1']}), customSheet({key:'elsewhere', projectIds:['p2']})];
  assert.deepEqual(Array.from(owner.profileDeliveryTasks(), sheet => sheet.key), ['personal-sheet']);
  assert.equal(component({currentRole:'admin'}).profileDeliveryTasks().length, 0);
});

test('creating a delivery sheet assigns its creator with a validated matching List', () => {
  const c = component({hasRuns:false}); c.openDeliveryEditor();
  c.patchDeliveryEditor({name:'新的交付单', customer:'客户', target:'1'}); c.setDeliveryList('天坛'); confirmDelivery(c); c.saveDeliveryEditor();
  const sheet = c.deliverySheet(c.state.sheetKey);
  assert.equal(sheet.createdBy, '一万'); assert(c.profileDeliveryTasks().some(task => task.key === sheet.key));
});

test('multiple Skills can be uploaded, named and saved without tasks or prior Skills', async () => {
  const c = component({hasRuns:false}); open(c);
  const pending = c.uploadProfileSkills([md(), md('material.md', '# Material')]);
  assert(c.profileValues().draftSaveDisabled); assert.equal(c.profileValues().noSkills, false);
  await pending;
  assert.equal(c.profileValues().draftSkills.length, 2);
  c.profileValues().draftSkills[0].onName(change('3D 轨迹评估'));
  c.profileValues().draftSkills[0].onCommand(change('/trajectory review'));
  assert.equal(c.profileValues().draftSaveDisabled, false);
  c.profileValues().saveSkills();
  assert.equal(c.personalProfileSkills().length, 2);
  assert.equal(c.personalProfileSkills()[0].name, '3D 轨迹评估');
  assert.equal(c.personalProfileSkills()[0].command, 'trajectory review');
  assert.equal(c.personalProfileSkills()[0].content, skillText);
  assert.equal(c.profileValues().uploadDisabled, false);
  assert.equal(c.profileValues().noTasks, true);
  assert.equal(c.state.skillSessions, undefined);
  c.props.currentUser = 'allen'; assert.equal(c.personalProfileSkills().length, 0);
});

test('invalid or duplicate commands require naming before save; failed saves do not mutate', async () => {
  const c = component(); open(c);
  await c.uploadProfileSkills([md('roof.v2.md', '# Roof')]);
  assert.match(c.profileSkillDraftIssue(), /调用名须/);
  c.profileValues().draftSkills[0].onCommand(change('roof')); c.saveProfileSkills();
  await c.uploadProfileSkills([md('second.md', '---\nname: ROOF\n---\n# Roof')]);
  assert.match(c.profileSkillDraftIssue(), /重复/); c.saveProfileSkills();
  assert.equal(c.personalProfileSkills().length, 1);
  c.profileValues().draftSkills[0].onName(change(' ')); assert.match(c.profileSkillDraftIssue(), /名称须/);
  c.profileValues().draftSkills[0].onName(change('屋顶')); c.profileValues().draftSkills[0].onCommand(change('屋顶 检查'));
  assert.equal(c.profileSkillDraftIssue(), ''); c.saveProfileSkills(); assert.equal(c.personalProfileSkills().length, 2);
});

test('Skill ZIP and file errors preserve valid drafts without executing package content', async () => {
  const c = component(); open(c);
  await c.uploadProfileSkills([storedZip('trajectory/SKILL.md'), md('empty.md', ''), {name:'script.js', size:20}, storedZip('../SKILL.md'), {name:'large.md',size:600*1024}]);
  assert.equal(c.profileValues().draftSkills.length, 1); assert.match(c.profileValues().draftError, /不安全/);
  assert.match(c.profileValues().draftError, /512 KB/); assert.match(c.profileValues().draftError, /script.js/);
  c.saveProfileSkills(); assert.equal(c.personalProfileSkills().length, 1);
  await c.uploadProfileSkills([storedZip('README.md')]); assert.match(c.profileValues().draftError, /需要包含 SKILL.md/);
  assert(c.profileValues().draftSaveDisabled);
});

test('cancelled, replaced and cross-account uploads cannot resurrect or overwrite drafts', async () => {
  const c = component(); open(c); let resolve;
  const first = c.uploadProfileSkills([{...md(), text: () => new Promise(done => {resolve = done;})}]);
  c.profileValues().cancelSkills(); await c.uploadProfileSkills([md('next.md', '# Next')]);
  resolve(skillText); await first; assert.equal(c.profileValues().draftSkills[0].filename, 'next.md');
  c.profileValues().cancelSkills(); let resolveOther;
  const second = c.uploadProfileSkills([{...md(), text: () => new Promise(done => {resolveOther = done;})}]);
  c.props.currentUser = 'allen'; resolveOther(skillText); await second;
  assert.equal(c.profileValues().hasDraft, false); c.saveProfileSkills(); assert.equal(c.personalProfileSkills().length, 0);
  await c.uploadProfileSkills([md('own.md', '# Own')]); c.saveProfileSkills();
  assert.equal(c.personalProfileSkills().length, 1); assert.equal(c.personalProfileSkills()[0].owner, 'allen');
});

test('personal Skills optionally bind independent snapshots and reveal the review section', async () => {
  const c = component(); open(c);
  const task = c.profileTasks().find(value => value.kind === 'review');
  c.state.deliverySheets = [customSheet({entries:[{itemId:task.itemId}]})];
  const context = {sheetKey:'personal-sheet', itemId:task.itemId, itemName:task.title, runId:task.runId, scope:'sheet'};
  assert.equal(c.reviewSkillValues(context).available, false);
  await c.uploadProfileSkills([md()]); c.profileValues().onTargetSheet(change('personal-sheet')); c.saveProfileSkills();
  assert.equal(c.reviewSkillValues(context).available, true);
  assert.equal(c.profileValues().skills.length, 1); assert.match(c.profileValues().skills[0].sheetName, /已关联 1 张数据单/); assert.equal(c.state.skillSessions, undefined);
  const personal = c.personalProfileSkills()[0]; c.openProfileSkill('personal:' + personal.id);
  c.profileValues().draftSkills[0].onName(change('个人新名称')); c.saveProfileSkills();
  assert.equal(c.personalProfileSkills()[0].name, '个人新名称');
  assert.equal(c.deliverySheet('personal-sheet').skills[0].name, '3d trajectory');
  c.editPersonalSkill(personal.id); c.patchProfileSkillDraft({targetSheet:'personal-sheet'});
  assert.match(c.profileSkillDraftIssue(), /已有同名/);
  c.state.deliverySheets = []; assert.match(c.profileSkillDraftIssue(), /不在你的任务范围/);
  c.saveProfileSkills(); assert(c.state.profileSkillDraft);
});

test('binding to seeded sheets uses overrides, library capacity gates upload and save', async () => {
  const c = component(); open(c); const key = c.profileDeliveryTasks()[0].key;
  await c.uploadProfileSkills([md()]); c.patchProfileSkillDraft({targetSheet:key}); c.saveProfileSkills();
  assert.equal(c.state.deliveryOverrides[key].skills.length, 1);
  c.state.personalSkills = Array.from({length:12}, (_,i) => ({id:String(i), owner:'一万', name:'Skill '+i, command:'skill '+i}));
  assert.equal(c.profileValues().uploadDisabled, true);
  await c.uploadProfileSkills([md()]); assert.match(c.profileValues().draftError, /最多保存 12/);
  c.saveProfileSkills(); assert.equal(c.personalProfileSkills().length, 12);
});

test('only Lead and Owner may edit profile identity; Owner cannot escalate to Lead', () => {
  for (const role of ['member','outsourcing','admin']) {
    const c = component({currentRole:role}); assert.equal(c.profileValues().canEditIdentity, false);
    c.editProfileIdentity(); assert(!c.state.profileIdentityDraft);
    c.state.profileIdentityDraft = {accountName:'一万',name:'new',role:'lead'}; c.saveProfileIdentity();
    assert.equal(c.profileIdentity().key, role); assert.equal(c.profileIdentity().name, '一万');
  }
  const owner = component({currentRole:'owner'}); owner.editProfileIdentity();
  assert(!owner.profileEditableRoles().some(role => role.key === 'lead'));
  owner.state.profileIdentityDraft.role = 'lead'; owner.saveProfileIdentity(); assert.equal(owner.profileIdentity().key, 'project-owner');
});

test('identity edits preserve account ownership, update sidebar, and revoke editing after downgrade', async () => {
  const c = component({currentRole:'lead'}); open(c); await c.uploadProfileSkills([md()]); c.saveProfileSkills();
  c.editProfileIdentity(); c.profileValues().onIdentityName(change('新名字')); c.profileValues().saveIdentity();
  assert.equal(c.profileIdentity().name, '新名字'); assert.equal(c.profileIdentity().accountName, '一万');
  assert.equal(c.personalProfileSkills().length, 1); assert.equal(c.renderVals().sidebar.userName, '新名字');
  assert.equal(c.renderVals().sidebar.userInitial, '新');
  c.editProfileIdentity(); c.profileValues().onIdentityRole(change('member')); c.profileValues().saveIdentity();
  assert.equal(c.profileValues().canEditIdentity, false); assert.equal(c.profileValues().roleLabel, 'Member');
  assert(c.profileTasks().every(task => task.assignee === '一万')); assert.equal(c.personalProfileSkills().length, 1);
});

test('both review surfaces wrap the entire Skill region in a bound-Skill guard', () => {
  for (const [scope, prefix] of [['review','it.skills'], ['sheet','sheet.pick.skills']]) {
    const region = template.split('<!-- ' + scope + '-skill-session:start -->')[1].split('<!-- ' + scope + '-skill-session:end -->')[0].trim();
    assert(region.startsWith('<sc-if value="{{ ' + prefix + '.available }}"'));
    assert(region.endsWith('</sc-if>'));
    assert(!region.includes('暂无已绑定 Skill'));
  }
});
