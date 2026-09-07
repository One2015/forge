import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

test('RBAC prototype has a dedicated build and port', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['dev:rbac'], /--port 3008/);
  assert.match(pkg.scripts['dev:rbac'], /FORGE_RBAC_PROTOTYPE=1/);
  assert.match(pkg.scripts['prepare:rbac'], /build-rbac-prototype\.mjs/);
});

test('RBAC prototype keeps platform and project roles separate', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  assert.match(source, /platformRole: 'admin'/);
  assert.match(source, /projectRole: 'project-owner'/);
  assert.match(source, /External Experts/);
  assert.match(source, /rolePermissions/);
  assert.match(source, /customPermissions/);
});

test('RBAC prototype includes profile, member management, permission, skill and invitation flows', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  for (const feature of ['基础信息', 'Member', 'Permission', 'Skill', '用户邮箱', '飞书模拟通知']) {
    assert.ok(source.includes(feature), `missing ${feature}`);
  }
});

test('Profile and member management are routed pages in the application flow instead of fixed overlays', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  const routes = read('scripts/templates/routing-core.js');
  assert.match(source, /\(document\.querySelector\('\.forge-main'\) \|\| document\.body\)\.appendChild\(root\)/);
  assert.match(source, /host\.history\.pushState\([^;]+profileUrl\(surface\)\)/);
  assert.match(source, /host\.history\.replaceState\([^;]+profileUrl\(\)\)/);
  assert.match(source, /isLegacyProfileRoute/);
  assert.match(source, /syncWorkspaceToRoute/);
  assert.match(source, /<div class="rbac-page-body">\$\{activeView\(\)\}<\/div>/);
  assert.doesNotMatch(source, /document\.body\.appendChild\(root\)/);
  assert.match(styles, /#forge-rbac-root\{position:relative;/);
  assert.doesNotMatch(styles, /#forge-rbac-root\{position:fixed/);
  assert.match(styles, /data-rbac-page="profile"[^}]+data-rbac-page="member-management"[^}]+:not\(#forge-rbac-root\)/);
  assert.match(routes, /parts\[0\] === 'profile'/);
  assert.match(routes, /parts\[0\] === 'members'/);
  assert.match(routes, /case 'profile': path = '\/profile'/);
  assert.match(routes, /case 'members': path = '\/members'/);
});

test('Admin member management is a dedicated navigation surface while Profile keeps only personal tabs', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('scripts/templates/forge-sidebar.css');
  const sidebar = read('scripts/templates/forge-sidebar.html');
  assert.ok(sidebar.includes('data-rbac-nav="members"'));
  assert.ok(sidebar.includes('<span>成员管理</span>'));
  assert.match(styles, /\.forge-sidebar-member-management\{display:none\}/);
  assert.match(styles, /data-rbac-platform-role="admin"[^}]+\.forge-sidebar-member-management\{display:flex\}/);
  assert.ok(source.includes("const tabs = managingMembers ? [['member', 'Member'], ['permission', 'Permission']] : [['profile', '基础信息'], ['skill', 'Skill']]"));
  assert.ok(source.includes("managingMembers ? '成员管理' : 'Profile'"));
  assert.ok(source.includes("surface === 'members' && !isAdmin()"));
  assert.ok(source.includes("profileUrl('profile')"));
});

test('Profile platform role uses the same plain text treatment as email', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  assert.ok(source.includes('<span class="rbac-field-label">平台角色</span><span class="rbac-field-value">${isAdmin() ? \'Admin\' : \'Internal Member\'}</span>'));
  assert.doesNotMatch(source, /<span class="rbac-field-label">平台角色<\/span><span class="rbac-badge"/);
});

test('Profile header omits the redundant return-to-workspace action', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const profileRender = source.match(/function render\(\)[\s\S]*?function tabsMarkup\(\)/)?.[0] || '';
  assert.match(profileRender, /<header class="rbac-page-head">[\s\S]*?managingMembers \? '成员管理' : 'Profile'/);
  assert.doesNotMatch(profileRender, /data-action="close-workspace"/);
});

test('Member list roles are read-only while Profile role changes use confirmation and explicit save', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'aria-label="查看 ${escapeHtml(member.name)} 的用户 Profile"',
    'class="rbac-member-role-value">${platformRoleLabel(member.platformRole)}',
    'data-action="member-role-draft"',
    'data-action="review-member-role-drafts"',
    '确认平台角色变更',
    'data-action="confirm-member-role-save"',
    '确认并保存',
    'pendingPlatformRoles',
    '<option value="external" ${value === \'external\' ? \'selected\' : \'\'}>External Experts</option>',
  ]) {
    assert.ok(source.includes(contract), `missing member role save contract: ${contract}`);
  }
  const memberListSource = source.match(/function memberView\(\)[\s\S]*?function platformRoleLabel/)?.[0] || '';
  assert.doesNotMatch(memberListSource, /<select/);
  assert.doesNotMatch(memberListSource, /data-clickable="true"/);
  assert.doesNotMatch(source, /data-action="member-platform-role"/);
  assert.match(styles, /\.rbac-member-role-savebar/);
  assert.match(styles, /\.rbac-member-name:hover\{text-decoration:underline/);
  assert.match(styles, /\.rbac-confirm-dialog/);
});

test('Profile avatar centers its change label on hover and keyboard focus', () => {
  const styles = read('public/postman-ui/rbac-prototype.css');
  assert.match(styles, /\.rbac-avatar-control span\{[^}]*inset:0;[^}]*display:grid;[^}]*place-items:center;[^}]*white-space:nowrap;[^}]*pointer-events:none/);
  assert.match(styles, /\.rbac-avatar-control:hover span,\.rbac-avatar-control:focus-within span\{opacity:1\}/);
});

test('Admin invitation offers three Chinese identities and routes external experts to Fellow', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const option of [
    '<option value="admin">管理员</option>',
    '<option value="member" selected>成员</option>',
    '<option value="external">外部专家</option>',
  ]) {
    assert.ok(source.includes(option), `missing invitation identity: ${option}`);
  }
  assert.match(source, /function inviteChannel\(roleKey\)/);
  assert.match(source, /roleKey === 'external' \? 'Fellow' : 'Forge'/);
  assert.match(source, /channel: inviteChannel\(platformRole\)/);
  assert.doesNotMatch(source, /rbac-feishu-card/);
  assert.doesNotMatch(styles, /rbac-feishu-card/);
});

test('Admin can create a custom project role with feature-linked permissions', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'customRoles: []',
    'data-action="open-role-create"',
    'data-form="custom-role"',
    'data-role-draft-permission',
    'handleCustomRoleSubmit',
    'assignableRoleEntries()',
    '现在可用于成员分配',
  ]) {
    assert.ok(source.includes(contract), `missing custom role contract: ${contract}`);
  }
  assert.match(source, /state\.permissionRole !== 'external-expert'/);
  assert.match(source, /rolePermissions: nextPermissions/);
  assert.match(styles, /#forge-rbac-root input\[type="checkbox"\]\{accent-color:var\(--rbac-ink\)\}/);
  assert.doesNotMatch(styles, /input\[type="checkbox"\][^{]*\{[^}]*accent-color:var\(--rbac-accent\)/);
});

test('Permission role selector uses the same underline tab language as Profile navigation', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  assert.match(source, /class="rbac-permission-role-tabs" role="tablist" aria-label="选择项目角色"/);
  assert.match(source, /role="tab" data-permission-role=/);
  assert.match(source, /aria-selected="\$\{selected === key\}"/);
  assert.match(source, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
  assert.doesNotMatch(source, /data-permission-role="\$\{escapeHtml\(key\)\}" aria-pressed=/);
  assert.match(styles, /\.rbac-permission-role-tabs\{[^}]*border-bottom:1px solid var\(--rbac-line\)[^}]*overflow-x:auto/);
  assert.match(styles, /\.rbac-permission-role-tabs button\[aria-selected="true"\]\{border-bottom-color:var\(--rbac-accent\);color:var\(--rbac-ink\);font-weight:600\}/);
  assert.doesNotMatch(styles, /\.rbac-permission-role-tabs button\[aria-(?:pressed|selected)="true"\][^{]*\{[^}]*background:var\(--rbac-ink\)/);
});

test('Skill creation uses one dropdown for upload and form entry', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'class="rbac-skill-create-menu"',
    '<summary class="rbac-secondary">创建 Skill</summary>',
    'data-action="skill-upload-trigger">上传 Skill',
    'data-action="skill-form">填写 Skill',
  ]) {
    assert.ok(source.includes(contract), `missing Skill dropdown contract: ${contract}`);
  }
  assert.ok(source.includes("root.querySelector('[data-action=\"skill-upload\"]')?.click();"));
  assert.match(styles, /\.rbac-skill-create-options/);
  assert.doesNotMatch(source, /填写创建/);
  assert.doesNotMatch(styles, /rbac-upload-label/);
});

test('Skill form separates new and existing owned Skills into two sections', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'class="rbac-skill-create-flow"',
    'id="rbac-new-skill-title">新创建 Skill',
    'id="rbac-created-skills-title">已创建 Skill',
    "update({ skillCreateMode: 'form', skillScope: 'mine' })",
  ]) {
    assert.ok(source.includes(contract), `missing split Skill creation contract: ${contract}`);
  }
  assert.match(styles, /\.rbac-skill-create-flow\{display:grid;gap:24px\}/);
  assert.match(styles, /\.rbac-skill-existing-part\{padding-top:20px;border-top:1px solid var\(--rbac-line\)\}/);
});

test('Skill creation form is ephemeral and hidden until the user requests it', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  assert.match(source, /\.\.\.clone\(defaults\), \.\.\.saved,[\s\S]*?skillCreateMode: '', activeSkillId: '', skillEditMode: false/);
  assert.match(source, /state\.skillCreateMode === 'form'/);
  assert.match(source, /data-action="skill-form"/);
  assert.match(source, /skillCreateMode: ''/);
});

test('All Skill cards open details while only owned Skills can be edited', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    "activeSkillId: ''",
    'data-skill-id="${escapeHtml(skill.id)}"',
    'data-action="back-skills"',
    'data-action="edit-skill"',
    'data-form="skill-edit"',
    'handleSkillEditSubmit',
    '只有本人创建的 Skill 可以编辑',
  ]) {
    assert.ok(source.includes(contract), `missing Skill detail contract: ${contract}`);
  }
  assert.match(source, /function canEditSkill\(skill\)[\s\S]*skill\?\.relation === 'Owner'[\s\S]*skill\?\.owner === currentMember\(\)\.name/);
  assert.match(source, /const editable = canEditSkill\(skill\)/);
  assert.match(source, /\$\{editable \? '<div class="rbac-skill-detail-actions"><button class="rbac-primary" type="button" data-action="edit-skill">编辑 Skill<\/button><\/div>' : ''\}/);
  assert.match(styles, /\.rbac-skill-detail-card/);
  assert.match(styles, /\.rbac-skill-card:hover/);
});

test('Skill detail keeps ownership beside the title and presents complete editable content', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'class="rbac-skill-title-line"',
    '<h3>完整 Skill</h3>',
    'class="rbac-skill-document"',
    'name="content"',
    'content: `# Web3D 结构审核',
    "const content = String(skill?.content || seededSkill?.content || skill?.description || '').trim()",
  ]) {
    assert.ok(source.includes(contract), `missing complete Skill contract: ${contract}`);
  }
  assert.match(source, /rbac-skill-title-line[\s\S]*data-skill-detail-title[\s\S]*rbac-badge/);
  assert.match(styles, /\.rbac-skill-title-line\{display:flex;align-items:center/);
  assert.match(styles, /\.rbac-skill-document\{max-width:72ch/);
  assert.match(styles, /\.rbac-skill-content-input\{min-height:220px/);
});

test('ZIP-backed Skill editing displays the package and supports re-upload before saving', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    "const zipFileName = /\\.zip$/i.test(skill.file || '') ? skill.file : ''",
    'data-skill-file-name',
    '已上传的 Skill 包',
    'data-action="skill-reupload-trigger"',
    'data-action="skill-reupload"',
    'accept=".zip,application/zip"',
    'function handleSkillReuploadPreview(event)',
    "showToast(replacementFile ? 'Skill 文件已替换，修改已保存。' : 'Skill 修改已保存。')",
  ]) {
    assert.ok(source.includes(contract), `missing ZIP Skill replacement contract: ${contract}`);
  }
  assert.match(styles, /\.rbac-skill-file-editor\{display:grid/);
  assert.match(styles, /\.rbac-skill-file-row\{display:flex/);
  assert.match(styles, /\.rbac-skill-file-type\{display:grid/);
});

test('Owned Skills require explicit confirmation before deletion', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'data-action="open-skill-delete"',
    "skillDeleteConfirmOpen ? '' : 'hidden'",
    'role="alertdialog"',
    '此操作无法撤销',
    'data-action="confirm-skill-delete"',
    'function handleSkillDelete()',
    'state.skills.filter(item => item.id !== skill.id)',
    '只有本人创建的 Skill 可以删除',
  ]) {
    assert.ok(source.includes(contract), `missing Skill deletion contract: ${contract}`);
  }
  assert.match(source, /function handleSkillDelete\(\)[\s\S]*if \(!canEditSkill\(skill\)\)/);
  assert.match(styles, /\.rbac-danger\{border:1px solid #a82e26;background:#a82e26;color:#fff\}/);
  assert.match(styles, /\.rbac-confirm-layer\[hidden\]\{display:none\}/);
  assert.match(styles, /\.rbac-skill-edit-actions\{align-items:center;justify-content:space-between\}/);
});

test('Skill cards hide file type and list every related task sheet', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    "relatedTasks: ['蚂蚁 Web3D 首批 200 条', '蚂蚁 Web3D 结构升级']",
    'function normalizeSkill(skill)',
    'function skillUsageMarkup(skill, detail = false)',
    '相关任务单',
    '暂无使用记录',
  ]) {
    assert.ok(source.includes(contract), `missing Skill task usage contract: ${contract}`);
  }
  const skillGridSource = source.match(/const skillGrid = `([\s\S]*?)`;\n    const skillContent/)?.[1] || '';
  assert.doesNotMatch(skillGridSource, /skill\.file/);
  assert.doesNotMatch(source, /name="project"/);
  assert.doesNotMatch(styles, /rbac-skill-file-note|rbac-skill-meta/);
  assert.match(styles, /\.rbac-skill-usage/);
  assert.match(styles, /\.rbac-skill-detail-usage/);
});

test('Prototype role dock collapses to a compact keyboard-accessible trigger', () => {
  const source = read('public/postman-ui/rbac-prototype.js');
  const styles = read('public/postman-ui/rbac-prototype.css');
  for (const contract of [
    'dockCollapsed: false',
    'dock.dataset.collapsed = String(!!state.dockCollapsed)',
    'data-dock="collapse"',
    'aria-label="收起 Prototype 控制栏"',
    'data-dock="expand"',
    'aria-label="展开 Prototype 控制栏"',
    "update({ dockCollapsed: true, dockExpanded: false })",
    "update({ dockCollapsed: false })",
  ]) assert.ok(source.includes(contract), `missing dock collapse contract: ${contract}`);
  assert.match(styles, /#forge-rbac-role-dock\[data-collapsed="true"\]\{width:auto\}/);
  assert.match(styles, /\.rbac-dock-reopen\{[^}]*min-height:40px/);
  assert.match(styles, /\.rbac-dock-reopen:focus-visible\{outline:2px solid var\(--rbac-blue\)/);
});

test('generated RBAC page loads isolated prototype assets', () => {
  const output = read('public/forge-rbac.html');
  assert.match(output, /rbac-prototype\.css\?v=[0-9a-f]{12}/);
  assert.match(output, /rbac-prototype\.js\?v=[0-9a-f]{12}/);
  assert.match(output, /Role-based Access Prototype/);
});

test('standard Postman entry loads the RBAC Profile surface exactly once', () => {
  const output = read('public/forge-postman.html');
  assert.equal(output.match(/rbac-prototype\.css/g)?.length, 1);
  assert.equal(output.match(/rbac-prototype\.js/g)?.length, 1);
  assert.match(output, /rbac-prototype\.css\?v=[0-9a-f]{12}/);
  assert.match(output, /rbac-prototype\.js\?v=[0-9a-f]{12}/);
  assert.match(output, /forge-postman forge-rbac-prototype/);
});
