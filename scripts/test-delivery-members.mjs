import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateDeliveryMembersFeedback } from './update-delivery-members-feedback.mjs';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });
const directory = [{ accountName: '一万', name: '一万' }, { accountName: 'review-test', name: '测试审核员' }, { accountName: 'external-test', name: '测试协作员' }];
function component(props = {}) {
  const context = vm.createContext({ URLSearchParams, TextDecoder, TextEncoder, Blob, DecompressionStream,
    window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true, currentUser: '一万', memberDirectory: directory, ...props }; setState(patch) { this.state = { ...this.state, ...patch }; } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance; c.openDeliveryEditor();
  c.patchDeliveryEditor({ name: '成员测试单', customer: '测试客户', target: '2' }); return c;
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

test('search handles names and account IDs; add is unique and defaults to Member', () => {
  const c = component();
  membership(c).onSearch(change(' 审核员 ')); assert.equal(membership(c).results.length, 1);
  const result = membership(c).results[0]; assert.equal(result.accountName, 'review-test'); result.add(); result.add();
  assert.equal(membership(c).count, 2); assert(membership(c).results[0].disabled);
  assert.equal(membership(c).rows[1].role, 'member');
  membership(c).onSearch(change('REVIEW-TEST')); assert.equal(membership(c).resultCount, 1);
  membership(c).onSearch(change('不存在')); assert(membership(c).noResults);
  membership(c).clear(); assert(!membership(c).showResults);
});

test('roles and additions are draft snapshots; cancelling does not change the sheet', () => {
  const c = component(); add(c, 'review-test'); setRole(c, 'review-test', 'reviewer'); c.saveDeliveryEditor();
  const key = c.state.sheetKey; c.openDeliveryEditor(key);
  setRole(c, 'review-test', 'outsourcing'); add(c, 'external-test'); c.closeDeliveryEditor();
  const saved = c.deliverySheet(key); assert.equal(saved.members.length, 2); assert.equal(saved.members[1].role, 'reviewer');
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
  const c = component(); add(c, 'review-test'); setRole(c, 'review-test', 'reviewer');
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
  const sheet = { key: 'scoped', name: 'Scoped', customer: 'Demo', target: 1, entries: [], projectIds: ['project-a'], members: [{ accountName: 'another-owner', name: 'Owner', role: 'owner' }] };
  for (const [props, expected] of [
    [{ currentRole: 'lead' }, true],
    [{ currentRole: 'project-owner', ownedProjectIds: ['project-a'] }, true],
    [{ currentRole: 'project-owner', ownedProjectIds: ['project-b'] }, false],
    [{ currentRole: 'outsourcing' }, false]
  ]) { const c = component(props); c.state.deliverySheets = [sheet]; c.openDeliveryEditor('scoped'); assert.equal(membership(c).editable, expected); }
});

test('save rechecks permission, owner requirement, uniqueness and role validity', () => {
  const c = component(); add(c, 'review-test'); c.saveDeliveryEditor(); const key = c.state.sheetKey;
  c.props.currentUser = 'review-test'; c.openDeliveryEditor(key);
  c.patchDeliveryEditor({ members: c.state.deliveryEditor.members.map(member => ({ ...member, role: 'owner' })) });
  assert.match(c.deliveryMembersIssue(), /权限/); c.saveDeliveryEditor(); assert.equal(c.deliverySheet(key).members[1].role, 'member');
  c.closeDeliveryEditor(); c.props.currentUser = '一万'; c.openDeliveryEditor(key);
  setRole(c, 'review-test', 'lead'); assert.equal(membership(c).rows[1].role, 'member');
  c.patchDeliveryEditor({ members: [{ accountName: '一万', name: '一万', role: 'member' }] }); assert.match(c.deliveryMembersIssue(), /至少/);
  c.openDeliveryEditor(key); c.patchDeliveryEditor({ members: [...c.state.deliveryEditor.members, { accountName: 'review-test', name: 'Duplicate', role: 'member' }] }); assert.match(c.deliveryMembersIssue(), /重复/);
  c.openDeliveryEditor(key); c.patchDeliveryEditor({ members: [...c.state.deliveryEditor.members, { accountName: 'unknown', name: 'Unknown', role: 'member' }] }); assert.match(c.deliveryMembersIssue(), /人员列表/);
});

test('stale callbacks, switched accounts and concurrent edits cannot overwrite membership', () => {
  const c = component(); const result = membership(c).results.find(person => person.accountName === 'review-test');
  c.closeDeliveryEditor(); c.openDeliveryEditor(); result.add(); assert.equal(membership(c).count, 1);
  c.patchDeliveryEditor({ name: 'Test', customer: 'Demo', target: '1' }); c.props.currentUser = 'review-test'; assert.match(c.deliveryMembersIssue(), /账号已变更/);
  c.props.currentUser = '一万'; c.saveDeliveryEditor(); const key = c.state.sheetKey;
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
  assert.equal(updateDeliveryMembersFeedback(source), source);
  assert(template.includes('aria-label="{{ member.roleAriaLabel }}"'));
  assert(template.includes('label="{{ role.label }}"'));
  assert(template.includes('disabled="{{ member.removeDisabled }}"'));
  assert.equal((template.match(/class="forge-feedback-image-box"/g) || []).length, 2);
  assert(template.includes('aria-describedby="forge-rework-image-help"'));
  assert(template.includes('aria-describedby="forge-sheet-rework-image-help"'));
});
