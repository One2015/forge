import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateMemberPicker } from './update-member-picker.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });
const directory = [{ accountName: '一万', name: '一万' }, { accountName: 'review-test', name: '测试审核员' }, { accountName: 'external-test', name: '测试协作员' }];
function component(props = {}, platform = {}) {
  const context = vm.createContext({ URLSearchParams, TextDecoder, TextEncoder, Blob, DecompressionStream,
    window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', memberDirectory: directory, ...props }; setState(patch) { this.state = { ...this.state, ...patch }; } }, ...platform
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance; c.openDeliveryEditor();
  c.patchDeliveryEditor({ name: '成员测试单', customer: '测试客户', target: '1' }); c.setDeliveryList('天坛'); confirmDelivery(c); return c;
}
const membership = c => c.deliveryEditorValues().membership;
const add = (c, name) => c.updateDeliveryMember(name, 'add', null, c.state.deliveryEditor.id);
const setRole = (c, name, role) => c.updateDeliveryMember(name, 'role', role, c.state.deliveryEditor.id);
const remove = (c, name) => c.updateDeliveryMember(name, 'remove', null, c.state.deliveryEditor.id);

test('new sheet creator is the sheet Owner without changing global Member identity', () => {
  const c = component();
  assert(membership(c).editable); assert.equal(membership(c).rows[0].role, 'owner');
  assert.equal(c.profileIdentity().key, 'member'); assert(membership(c).rows[0].roleDisabled);
  c.saveDeliveryEditor(); const sheet = c.deliverySheet(c.state.sheetKey);
  assert.equal(sheet.members[0].accountName, '一万'); assert.equal(sheet.members[0].role, 'owner');
  assert.equal(c.profileIdentity().key, 'member'); assert(!c.state.profileRoleOverrides);
});

test('search supports persistent multi-selection and defaults to Reviewer-Forge', () => {
  const c = component();
  membership(c).onSearch(change(' 审核员 ')); assert.equal(membership(c).results.length, 1);
  const result = membership(c).results[0]; assert.equal(result.accountName, 'review-test'); result.toggle({ target: { checked: true } }); result.toggle({ target: { checked: true } });
  assert.equal(membership(c).count, 2); assert(!membership(c).results[0].disabled);
  assert.equal(membership(c).rows[1].role, 'reviewer-forge');
  membership(c).onSearch(change('REVIEW-TEST')); assert.equal(membership(c).resultCount, 1);
  membership(c).onSearch(change('不存在')); assert(membership(c).noResults);
  membership(c).close(); assert(!membership(c).showResults);
});

test('roles and additions are draft snapshots; cancelling does not change the sheet', () => {
  const c = component(); add(c, 'review-test'); setRole(c, 'review-test', 'reviewer-forge'); c.saveDeliveryEditor();
  const key = c.state.sheetKey; c.openDeliveryEditor(key);
  setRole(c, 'review-test', 'reviewer-outsourcing'); add(c, 'external-test'); c.closeDeliveryEditor();
  const saved = c.deliverySheet(key); assert.equal(saved.members.length, 2); assert.equal(saved.members[1].role, 'reviewer-forge');
});

test('last Owner cannot be removed or demoted; responsibility can be transferred', () => {
  const c = component(); remove(c, '一万'); setRole(c, '一万', 'member');
  assert.equal(membership(c).count, 1); assert.equal(membership(c).rows[0].role, 'owner');
  assert.match(membership(c).notice, /另一位成员/);
  add(c, 'review-test'); setRole(c, 'review-test', 'owner');
  assert(!membership(c).rows[0].roleDisabled); remove(c, '一万'); c.saveDeliveryEditor();
  const key = c.state.sheetKey; assert.equal(c.deliverySheet(key).members[0].role, 'owner');
  assert(!c.profileDeliveryTasks().some(task => task.key === key));
  c.openDeliveryEditor(key); assert(!membership(c).editable);
});

test('assigned people see the sheet and its bound Skills; removal clears that scope', () => {
  const c = component(); add(c, 'review-test'); setRole(c, 'review-test', 'reviewer-forge');
  c.patchDeliveryEditor({ skills: [{ id: 'test', command: 'test', name: 'Test Skill', content: '# Test' }] });
  c.saveDeliveryEditor(); const key = c.state.sheetKey;
  c.props.currentUser = 'review-test';
  assert(c.profileDeliveryTasks().some(task => task.key === key)); assert(c.profileSkills().some(skill => skill.sheetKey === key));
  c.openDeliveryEditor(key); assert(membership(c).readonly);
  const initial = c.deliverySheet(key).members.length; add(c, 'external-test'); assert.equal(membership(c).count, initial);
  c.closeDeliveryEditor(); c.props.currentUser = '一万'; c.openDeliveryEditor(key); remove(c, 'review-test'); c.saveDeliveryEditor();
  c.props.currentUser = 'review-test'; assert(!c.profileDeliveryTasks().some(task => task.key === key));
  assert(!c.profileSkills().some(skill => skill.sheetKey === key));
});

test('Lead and matching project Owner can manage; unrelated Owner and Outsourcing cannot', () => {
  const sheet = { key: 'scoped', name: 'Scoped', customer: 'Demo', target: 1, entries: [], projectIds: ['project-a'], members: [{ accountName: 'another-owner', name: '所有者', role: 'owner' }] };
  for (const [props, expected] of [
    [{ currentRole: 'lead' }, true],
    [{ currentRole: 'project-owner', ownedProjectIds: ['project-a'] }, true],
    [{ currentRole: 'project-owner', ownedProjectIds: ['project-b'] }, false],
    [{ currentRole: 'outsourcing' }, false]
  ]) { const c = component(props); c.closeDeliveryEditor(); c.state.deliverySheets = [sheet]; c.openDeliveryEditor('scoped'); assert.equal(membership(c).editable, expected); }
});

test('save rechecks permission, owner requirement, uniqueness and role validity', () => {
  const c = component(); add(c, 'review-test'); c.saveDeliveryEditor(); const key = c.state.sheetKey;
  c.props.currentUser = 'review-test'; c.openDeliveryEditor(key);
  c.patchDeliveryEditor({ members: c.state.deliveryEditor.members.map(member => ({ ...member, role: 'owner' })) });
  assert.match(c.deliveryMembersIssue(), /权限/); c.saveDeliveryEditor(); assert.equal(c.deliverySheet(key).members[1].role, 'reviewer-forge');
  c.closeDeliveryEditor(); c.props.currentUser = '一万'; c.openDeliveryEditor(key);
  setRole(c, 'review-test', 'lead'); assert.equal(membership(c).rows[1].role, 'reviewer-forge');
  c.patchDeliveryEditor({ members: [{ accountName: '一万', name: '一万', role: 'member' }] }); assert.match(c.deliveryMembersIssue(), /至少/);
  c.openDeliveryEditor(key); c.patchDeliveryEditor({ members: [...c.state.deliveryEditor.members, { accountName: 'review-test', name: 'Duplicate', role: 'reviewer-forge' }] }); assert.match(c.deliveryMembersIssue(), /重复/);
  c.openDeliveryEditor(key); c.patchDeliveryEditor({ members: [...c.state.deliveryEditor.members, { accountName: 'unknown', name: 'Unknown', role: 'reviewer-forge' }] }); assert.match(c.deliveryMembersIssue(), /人员列表/);
});

test('stale callbacks, switched accounts and concurrent edits cannot overwrite membership', () => {
  const c = component(); const result = membership(c).results.find(person => person.accountName === 'review-test');
  c.closeDeliveryEditor(); c.openDeliveryEditor(); result.toggle({ target: { checked: true } }); assert.equal(membership(c).count, 1);
  c.patchDeliveryEditor({ name: 'Test', customer: 'Demo', target: '1' }); c.setDeliveryList('天坛'); c.props.currentUser = 'review-test'; assert.match(c.deliveryMembersIssue(), /账号已变更/);
  c.props.currentUser = '一万'; confirmDelivery(c); c.saveDeliveryEditor(); const key = c.state.sheetKey;
  c.openDeliveryEditor(key); add(c, 'review-test');
  c.state.deliverySheets = c.state.deliverySheets.map(sheet => sheet.key === key ? { ...sheet, members: [...sheet.members, { accountName: 'external-test', name: 'Other', role: 'member' }] } : sheet);
  assert.match(c.deliveryMembersIssue(), /配置已更新/); c.saveDeliveryEditor(); assert.equal(c.deliverySheet(key).members[1].accountName, 'external-test');
});

test('existing demo owners are explicit; legacy assignments remain until members are configured', () => {
  const c = component(); c.openDeliveryEditor('ant200'); assert(membership(c).editable); assert.equal(membership(c).rows[0].accountName, '一万');
  const before = c.profileDeliveryTasks().map(task => task.key).join(','); c.closeDeliveryEditor(); assert.equal(c.profileDeliveryTasks().map(task => task.key).join(','), before);
  c.openDeliveryEditor('fin120'); assert(membership(c).readonly); assert.equal(membership(c).rows[0].accountName, 'allen');
});

test('focused generator is idempotent and controls retain native semantics', () => {
  assert(updateMemberPicker(source) === source, 'focused member migration must be idempotent');
  assert(template.includes('aria-label="{{ member.roleAriaLabel }}"'));
  assert(template.includes('label="{{ role.label }}"'));
  assert(template.includes('disabled="{{ member.removeDisabled }}"'));
  assert.equal((template.match(/class="forge-feedback-image-box"/g) || []).length, 2);
  assert(template.includes('aria-describedby="forge-rework-image-help"'));
  assert(template.includes('aria-describedby="forge-sheet-rework-image-help"'));
});

test('exactly three sheet roles are offered with the external role named for users', () => {
  const c = component();
  assert.deepEqual(Array.from(c.deliveryMemberRoles(), role => role.label), ['所有者', 'Reviewer-Forge', '外部专家']);
  const members = c.deliverySheetMembers({ members: ['owner', 'reviewer', 'member', 'outsourcing'].map((role, i) => ({ accountName: String(i), name: String(i), role })) });
  assert.deepEqual(Array.from(members, member => member.role), ['owner', 'reviewer-forge', 'reviewer-forge', 'reviewer-outsourcing']);
  assert.equal(c.profileIdentity().label, 'Member');
});

test('picker opens without a query, permits consecutive check/uncheck and preserves draft across dismissal', () => {
  const c = component(); membership(c).open();
  assert(membership(c).showResults); assert.equal(membership(c).resultCount, directory.length + 3);
  assert.equal(membership(c).results.filter(row => row.external).length, 3);
  assert(membership(c).results.find(row => row.accountName === '一万').disabled);
  for (const name of ['review-test', 'external-test']) membership(c).results.find(row => row.accountName === name).toggle({ target: { checked: true } });
  assert.equal(membership(c).count, 3); assert(membership(c).showResults);
  membership(c).onSearch(change('REVIEW-TEST'));
  membership(c).results[0].toggle({ target: { checked: false } }); assert.equal(membership(c).count, 2);
  membership(c).onToggle({ newState: 'closed' }); assert(!membership(c).showResults);
  membership(c).open(); assert.equal(membership(c).query, 'REVIEW-TEST'); assert.equal(membership(c).count, 2);
  c.deliveryEditorValues().tabs[1].pick(); assert(!membership(c).showResults);
});

test('picker is native light-dismiss with neutral checkbox states and no trailing add control', () => {
  const html = fs.readFileSync(new URL('./templates/delivery-editor.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('./templates/delivery-workflows.css', import.meta.url), 'utf8');
  assert.match(html, /id="forge-delivery-member-results"[^>]*popover="auto"/);
  assert.match(html, /class="forge-delivery-person-option"[^>]*><input type="checkbox"/);
  assert(html.includes('aria-expanded="{{ deliveryEditor.membership.showResults }}"'));
  assert(!html.includes('person.add')); assert(!html.includes('forge-delivery-person-action'));
  assert.match(css, /forge-delivery-person-option\[data-selected="true"\]\{background:var\(--forge-hover/);
  assert.match(css, /input\[type="checkbox"\][^}]+accent-color:var\(--forge-text\)/);
  assert(template.includes('this.mountDeliveryMemberPicker();')); assert(template.includes('this.unmountDeliveryMemberPicker();'));
});

test('all matching members remain reachable; reaching the cap still allows deselection', () => {
  const people = Array.from({ length: 55 }, (_, i) => ({ accountName: 'person-' + i, name: 'Person ' + i }));
  const c = component({ memberDirectory: people });
  for (const person of people.slice(0, 49)) add(c, person.accountName);
  membership(c).open(); assert.equal(membership(c).resultCount, people.length + 4); assert.equal(membership(c).results.length, people.length + 4);
  assert(membership(c).results.find(row => row.accountName === 'person-54').disabled);
  assert(!membership(c).results.find(row => row.accountName === 'person-0').disabled);
  membership(c).results.find(row => row.accountName === 'person-0').toggle({ target: { checked: false } });
  assert(!membership(c).results.find(row => row.accountName === 'person-54').disabled);
});

test('successful creation queues one local inbox event per other member, with honest Feishu state', () => {
  const c = component(); add(c, 'review-test'); add(c, 'external-test'); setRole(c, 'external-test', 'reviewer-outsourcing');
  c.saveDeliveryEditor(); c.saveDeliveryEditor();
  assert.equal(c.state.deliveryNotifications.length, 2);
  assert.equal(c.deliveryNotificationItems().length, 0, 'creator is not notified of their own action');
  assert(c.state.deliveryNotifications.every(event => event.channels.inbox === 'local' && event.channels.feishu === 'not-connected'));
  const key = c.state.sheetKey;
  c.props.currentUser = 'review-test';
  const notification = c.renderVals().notif.items.find(item => item.isAssignment);
  assert(notification); assert.match(notification.body, /Reviewer-Forge/); assert.match(notification.body, /飞书未连接/);
  c.state.view = 'overview'; notification.go(); assert.equal(c.state.view, 'sheet'); assert.equal(c.state.sheetKey, key);
  assert(c.state.notifRead[c.deliveryNotificationItems()[0].id]);
  c.props.currentUser = 'external-test';
  assert.match(c.renderVals().notif.items.find(item => item.isAssignment).body, /外部专家/);
  c.renderVals().notif.readAll({ stopPropagation() {} });
  c.props.currentUser = 'review-test'; assert(c.state.notifRead[c.deliveryNotificationItems()[0].id], 'reading another inbox does not undo read receipts');
});

test('failed, cancelled and edit saves do not duplicate creation notifications', () => {
  const c = component(); add(c, 'review-test'); c.setDeliveryList(''); c.saveDeliveryEditor();
  assert(!c.state.deliveryNotifications?.length); assert.match(c.deliveryEditorIssue(), /生产任务|ZIP/);
  c.closeDeliveryEditor(); assert(!c.state.deliveryNotifications?.length);
  c.openDeliveryEditor(); c.patchDeliveryEditor({ name: '通知测试', customer: '客户', target: '1' }); c.setDeliveryList('天坛'); add(c, 'review-test'); confirmDelivery(c);
  c.saveDeliveryEditor(); const key = c.state.sheetKey;
  c.openDeliveryEditor(key); c.patchDeliveryEditor({ name: '更新名称' }); c.saveDeliveryEditor();
  assert.equal(c.state.deliveryNotifications.length, 1);
});

test('notification links recheck recipient and membership after account switches or removal', () => {
  const c = component(); add(c, 'review-test'); c.saveDeliveryEditor(); const key = c.state.sheetKey;
  c.props.currentUser = 'review-test'; const notification = c.renderVals().notif.items.find(item => item.isAssignment);
  c.props.currentUser = 'external-test'; c.state.view = 'overview'; notification.go(); assert.equal(c.state.view, 'overview');
  c.props.currentUser = '一万'; c.openDeliveryEditor(key); remove(c, 'review-test'); c.saveDeliveryEditor();
  c.props.currentUser = 'review-test'; c.state.view = 'overview'; notification.go(); assert.equal(c.state.view, 'overview');
  assert.equal(c.deliveryNotificationItems().length, 0);
});

test('native picker positioning avoids viewport overflow; focus leaving closes it and listeners clean up', () => {
  const listeners = new Map(); let open = false, focused = false;
  const anchor = { getBoundingClientRect: () => ({ left: 250, top: 620, bottom: 656, width: 560 }), focus() { focused = true; } };
  const popover = { style: {}, matches: () => open, showPopover() { open = true; }, hidePopover() { open = false; } };
  const events = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const c = component({}, { document: { ...events, getElementById: id => id === 'forge-delivery-member-search' ? anchor : popover, querySelector() {} }, window: { ...events, innerHeight: 802, location: { search: '' } } });
  c.mountDeliveryMemberPicker(); membership(c).open(); assert(open);
  assert.equal(popover.style.transform, 'translateY(-100%)'); assert.equal(popover.style.width, '560px');
  assert.equal(popover.style.maxHeight, '264px');
  listeners.get('focusin')({ target: { closest: () => ({}) } }); assert(open);
  listeners.get('focusin')({ target: { closest: () => null } }); assert(!open); assert(!membership(c).showResults);
  membership(c).open(); membership(c).close(); assert(focused); assert(!open);
  c.unmountDeliveryMemberPicker(); assert.equal(listeners.size, 1); assert(listeners.has('beforeunload'));
  c.unmountDeliveryDraftGuard(); assert.equal(listeners.size, 0);
});
