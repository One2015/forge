(() => {
  'use strict';

  const STORAGE_KEY = 'forge-rbac-prototype-v3';
  const dockCaretIcon = '<svg class="forge-icon rbac-dock-caret" data-phosphor="caret-down" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>';
  const ACTIONS = ['view', 'create', 'modify', 'remove'];
  const roleLabels = {
    'project-owner': 'Project Owner',
    member: 'Member',
    'external-expert': 'External Experts',
  };
  const inviteRoleLabels = {
    admin: '管理员',
    member: '成员',
    external: '外部专家',
  };
  const roleDescriptions = {
    'project-owner': '负责项目成员、任务、生产、审核、Fellow 协作与最终交付。',
    member: '参与项目生产、运行、上传、审核以及被授权内容的下载。',
    'external-expert': '仅在 Fellow 中处理明确同步的任务包和返工。',
  };
  const permissionGroups = [
    { label: '项目与看板', rows: [
      ['dashboard', '项目看板'], ['tasks', '任务与 Item'], ['assignments', '成员与任务分配'],
    ] },
    { label: '生产', rows: [
      ['runs', '生产与运行'], ['pipelines', 'Pipeline'], ['datasets', '数据集'], ['resources', '资源'],
    ] },
    { label: '审核与交付', rows: [
      ['review', '审核与返工'], ['delivery', '交付数据单'], ['download', '产物下载'],
    ] },
    { label: '协作与系统', rows: [
      ['skills', 'Skill'], ['fellow', 'Fellow 联动'], ['billing', '用量与费用'], ['models', '模型状态'],
    ] },
  ];

  const allow = (...actions) => Object.fromEntries(ACTIONS.map(action => [action, actions.includes(action)]));
  const defaultPermissions = {
    'project-owner': {
      dashboard: allow('view'), tasks: allow('view', 'create', 'modify'), assignments: allow('view', 'modify'),
      runs: allow('view', 'create', 'modify'), pipelines: allow('view', 'create', 'modify'), datasets: allow('view', 'create', 'modify'), resources: allow('view', 'create', 'modify'),
      review: allow('view', 'create', 'modify'), delivery: allow('view', 'create', 'modify'), download: allow('view', 'create'),
      skills: allow('view', 'create', 'modify'), fellow: allow('view', 'create', 'modify'), billing: allow(), models: allow(),
    },
    member: {
      dashboard: allow('view'), tasks: allow('view', 'create', 'modify'), assignments: allow('view'),
      runs: allow('view', 'create', 'modify'), pipelines: allow('view'), datasets: allow('view', 'create', 'modify'), resources: allow('view', 'create', 'modify'),
      review: allow('view', 'create', 'modify'), delivery: allow('view'), download: allow('view', 'create'),
      skills: allow('view', 'create', 'modify'), fellow: allow(), billing: allow(), models: allow(),
    },
    'external-expert': {
      dashboard: allow(), tasks: allow('view', 'modify'), assignments: allow(), runs: allow(), pipelines: allow(), datasets: allow(), resources: allow('view'),
      review: allow(), delivery: allow(), download: allow('view'), skills: allow('view'), fellow: allow('view', 'create', 'modify'), billing: allow(), models: allow(),
    },
  };

  const initialMembers = [
    { id: 'yiwan', name: '一万', email: 'yiwan@copulalab.com', source: 'Forge', platformRole: 'admin', projects: 3, status: '活跃', avatar: '' },
    { id: 'joanna', name: 'Joanna Lam', email: 'joanna.lam@copulalab.com', source: 'Forge', platformRole: 'member', projects: 4, status: '活跃', avatar: '' },
    { id: 'salina', name: 'Salina Jiang', email: 'salina.jiang@copulalab.com', source: 'Forge', platformRole: 'member', projects: 2, status: '活跃', avatar: '' },
    { id: 'nick', name: 'Nick Lee', email: 'nick.lee@copulalab.com', source: 'Forge', platformRole: 'member', projects: 1, status: '活跃', avatar: '' },
    { id: 'maya', name: 'Maya Chen', email: 'maya@fellow.example', source: 'Fellow', platformRole: 'external', projects: 1, status: 'Fellow 已关联', avatar: '' },
  ];
  const projects = [
    { id: 'ant-200', name: '蚂蚁 Web3D 首批 200 条', customer: '蚂蚁', role: 'Project Owner', status: '进行中', due: '2026-09-18' },
    { id: 'ant-structure', name: '蚂蚁 Web3D 结构升级', customer: '蚂蚁', role: 'Member', status: '进行中', due: '2026-09-26' },
    { id: 'qa-internal', name: '内部测试数据集', customer: 'CopulaLab', role: 'Member', status: '已完成', due: '2026-08-30' },
  ];
  const initialProjectAssignments = {
    yiwan: { 'ant-200': 'Project Owner', 'ant-structure': 'Member', 'qa-internal': 'Member' },
    joanna: { 'ant-200': 'Member', 'ant-structure': 'Project Owner', 'qa-internal': 'Member' },
    salina: { 'ant-200': 'Member', 'qa-internal': 'Project Owner' },
    nick: { 'ant-structure': 'Member' },
    maya: { 'ant-200': 'External Experts' },
  };
  const initialSkills = [
    {
      id: 'skill-review', name: 'Web3D 结构审核', command: '/web3d-review', description: '检查模型结构、材质与交付字段完整性。', owner: '一万', relation: 'Owner', file: 'SKILL.md', relatedTasks: ['蚂蚁 Web3D 首批 200 条', '蚂蚁 Web3D 结构升级'],
      content: `# Web3D 结构审核

## 目标
在交付前检查 Web3D 模型的结构、材质与任务字段，输出可直接处理的问题清单。

## 输入
- 待审核模型文件或资源链接
- 对应的任务单与交付规范
- 如有版本更新，提供上一轮审核记录

## 检查步骤
1. 核对根节点、层级关系与节点命名是否符合项目规范。
2. 检查材质、贴图引用、UV 与透明模式，标记缺失或重复资源。
3. 检查模型原点、缩放、朝向、面数以及异常几何体。
4. 核对 Item ID、来源、版本号和交付地址等必填字段。
5. 将问题按“阻塞交付 / 建议修改 / 已通过”分类，并引用对应节点或字段。

## 输出
返回审核结论、问题位置、修改建议和复核条件；信息不足时先列出待补充项，不推测结果。`,
    },
    {
      id: 'skill-retarget', name: '角色重定向检查', command: '/retarget-check', description: '检查骨骼映射和动画重定向结果。', owner: 'Joanna Lam', relation: 'User', file: 'retarget.zip', relatedTasks: ['蚂蚁 Web3D 结构升级'],
      content: `# 角色重定向检查

## 目标
验证源角色与目标角色的骨骼映射、姿态和动画结果，定位可复现的重定向问题。

## 检查步骤
1. 对比骨骼名称、父子关系和必需关节是否完整。
2. 检查参考姿势、根骨位移与角色朝向。
3. 播放全部动画片段，记录穿插、抖动、脚滑和关节翻转。
4. 核对片段时长、帧率、循环区间与导出设置。

## 输出
按动画片段列出检查结果、问题骨骼、出现帧段、严重程度和建议处理方式。`,
    },
    {
      id: 'skill-dataset', name: '数据集字段校验', command: '/dataset-validate', description: '验证 Item ID、来源与交付字段。', owner: 'Salina Jiang', relation: 'User', file: 'SKILL.md', relatedTasks: ['内部测试数据集', '蚂蚁 Web3D 首批 200 条'],
      content: `# 数据集字段校验

## 目标
验证数据集记录是否满足导入和交付要求，并生成可回填的异常列表。

## 必填字段
- Item ID
- 来源与授权信息
- 当前状态和版本号
- 交付文件或资源地址

## 检查步骤
1. 检查必填字段是否缺失或格式错误。
2. 检查 Item ID 是否唯一，来源与文件是否可以对应。
3. 检查任务状态、版本和交付地址之间是否一致。
4. 对异常记录保留原值，并给出建议修正值和原因。

## 输出
返回通过数、异常数以及逐条问题明细，不自动覆盖原始数据。`,
    },
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  function normalizeSkill(skill) {
    const seededSkill = initialSkills.find(item => item.id === skill?.id);
    const seededTasks = seededSkill?.relatedTasks || [];
    const legacyTask = skill?.project && !['平台 Skill', '个人 Skill'].includes(skill.project) ? [skill.project] : [];
    const sourceTasks = Array.isArray(skill?.relatedTasks) ? skill.relatedTasks : (seededTasks.length ? seededTasks : legacyTask);
    const relatedTasks = [...new Set(sourceTasks.map(task => String(task).trim()).filter(Boolean))];
    const content = String(skill?.content || seededSkill?.content || skill?.description || '').trim();
    return { ...skill, relatedTasks, content };
  }
  const defaults = {
    platformRole: 'admin', projectRole: 'project-owner', activeTab: 'profile', memberView: 'list',
    permissionRole: 'project-owner', skillScope: 'platform', skillCreateMode: '', activeSkillId: '', skillEditMode: false, activeMemberId: '', activeMemberProject: 'ant-200',
    editingMemberPermissions: false, rolePermissions: clone(defaultPermissions), customPermissions: {}, projectAssignments: clone(initialProjectAssignments), customRoles: [],
    roleCreateOpen: false, roleDraftName: '', roleDraftDescription: '', roleDraftBase: 'member', roleDraftPermissions: clone(defaultPermissions.member), roleDraftError: '',
    members: clone(initialMembers), invites: [], skills: clone(initialSkills), avatar: '', dockExpanded: false, dockCollapsed: false,
  };
  let state = loadState();
  let root;
  let dock;
  let toast;
  let toastTimer;
  let workspaceResizeObserver;
  let pendingPlatformRoles = {};
  let platformRoleConfirmOpen = false;
  let skillDeleteConfirmOpen = false;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        ...clone(defaults), ...saved,
        skillCreateMode: '', activeSkillId: '', skillEditMode: false,
        rolePermissions: { ...clone(defaultPermissions), ...(saved.rolePermissions || {}) },
        projectAssignments: { ...clone(initialProjectAssignments), ...(saved.projectAssignments || {}) },
        customRoles: Array.isArray(saved.customRoles) ? saved.customRoles : [],
        roleDraftPermissions: saved.roleDraftPermissions || clone(defaultPermissions.member),
        members: Array.isArray(saved.members) ? saved.members : clone(initialMembers),
        skills: Array.isArray(saved.skills) ? saved.skills.map(normalizeSkill) : clone(initialSkills),
        invites: Array.isArray(saved.invites) ? saved.invites : [],
      };
    } catch (_) {
      return clone(defaults);
    }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function update(patch, rerender = true) {
    state = { ...state, ...patch };
    saveState();
    applyFeatureAccess();
    if (rerender) render();
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function showToast(message, tone = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.dataset.show = 'false'; }, 2800);
  }
  function currentMember() {
    return state.members.find(member => member.id === 'yiwan') || initialMembers[0];
  }
  function roleEntries() {
    return [...Object.entries(roleLabels), ...(state.customRoles || []).map(role => [role.id, role.name])];
  }
  function roleLabel(roleKey) {
    return roleEntries().find(([key]) => key === roleKey)?.[1] || roleKey || 'Member';
  }
  function inviteRoleLabel(roleKey) {
    return inviteRoleLabels[roleKey] || inviteRoleLabels.member;
  }
  function inviteChannel(roleKey) {
    return roleKey === 'external' ? 'Fellow' : 'Forge';
  }
  function roleKeyFromAssignment(value) {
    if (roleLabels[value] || state.customRoles?.some(role => role.id === value)) return value;
    if (value === 'Project Owner') return 'project-owner';
    if (value === 'External Experts') return 'external-expert';
    const custom = state.customRoles?.find(role => role.name === value);
    return custom?.id || 'member';
  }
  function assignableRoleEntries() {
    return roleEntries().filter(([key]) => key !== 'external-expert');
  }
  function roleDescription(roleKey) {
    return roleDescriptions[roleKey] || state.customRoles?.find(role => role.id === roleKey)?.description || 'Admin 创建的自定义项目角色。';
  }
  function memberProjectsFor(memberId) {
    const assignments = state.projectAssignments?.[memberId] || {};
    return projects.filter(project => assignments[project.id]).map(project => {
      const roleKey = roleKeyFromAssignment(assignments[project.id]);
      return { ...project, roleKey, role: roleLabel(roleKey) };
    });
  }
  function isAdmin() { return state.platformRole === 'admin'; }
  function isExternalPreview() { return !isAdmin() && state.projectRole === 'external-expert'; }
  function permissionValue(feature, action = 'view') {
    if (isAdmin()) return true;
    if (isExternalPreview()) return feature === 'fellow' && !!state.rolePermissions['external-expert']?.[feature]?.[action];
    return !!state.rolePermissions[state.projectRole]?.[feature]?.[action];
  }
  function effectivePermission(memberId, projectId, feature, action) {
    const base = !!state.rolePermissions[state.projectRole]?.[feature]?.[action];
    const override = state.customPermissions?.[memberId]?.[projectId]?.[feature]?.[action] || 'inherit';
    return override === 'allow' ? true : override === 'deny' ? false : base;
  }

  function mount() {
    if (document.getElementById('forge-rbac-root')) return;
    root = document.createElement('div');
    root.id = 'forge-rbac-root';
    root.dataset.open = 'false';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);

    const syncWorkspaceInset = () => {
      const sidebarEdge = document.querySelector('.forge-sidebar')?.getBoundingClientRect().right;
      if (Number.isFinite(sidebarEdge)) root.style.setProperty('--rbac-sidebar-edge', `${Math.max(0, sidebarEdge)}px`);
    };
    const sidebar = document.querySelector('.forge-sidebar');
    syncWorkspaceInset();
    if (sidebar && typeof ResizeObserver === 'function') {
      workspaceResizeObserver = new ResizeObserver(syncWorkspaceInset);
      workspaceResizeObserver.observe(sidebar);
    }
    window.addEventListener('resize', syncWorkspaceInset, { passive: true });

    dock = document.createElement('aside');
    dock.id = 'forge-rbac-role-dock';
    dock.setAttribute('aria-label', 'Prototype 角色体验');
    document.body.appendChild(dock);

    toast = document.createElement('div');
    toast.id = 'forge-rbac-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.roleCreateOpen) {
        event.preventDefault();
        closeRoleCreate();
        return;
      }
      if (event.key === 'Escape' && platformRoleConfirmOpen) {
        event.preventDefault();
        platformRoleConfirmOpen = false;
        render();
        requestAnimationFrame(() => root.querySelector('[data-action="review-member-role-drafts"]')?.focus());
        return;
      }
      if (event.key === 'Escape' && skillDeleteConfirmOpen) {
        event.preventDefault();
        closeSkillDeleteConfirm();
        return;
      }
      const skillMenu = root?.querySelector('.rbac-skill-create-menu[open]');
      if (event.key === 'Escape' && skillMenu) {
        event.preventDefault();
        skillMenu.open = false;
        skillMenu.querySelector('summary')?.focus();
      }
    }, true);
    window.addEventListener('popstate', () => closeWorkspace());
    applyFeatureAccess();
    render();
  }
  function waitForForge() {
    if (document.querySelector('.forge-app-shell')) return mount();
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.forge-app-shell')) return;
      observer.disconnect();
      mount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); if (!root) mount(); }, 6000);
  }

  function handleDocumentClick(event) {
    const skillMenu = root?.querySelector('.rbac-skill-create-menu[open]');
    if (skillMenu && !event.target.closest?.('.rbac-skill-create-menu')) skillMenu.open = false;
    const profileButton = event.target.closest?.('.forge-sidebar-profile');
    if (profileButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openWorkspace('profile');
      return;
    }
    const nav = event.target.closest?.('.forge-sidebar-link,.forge-sidebar-brand');
    if (!nav) return;
    const label = nav.getAttribute('aria-label') || nav.textContent.trim();
    const feature = navFeature(label);
    if (feature && !permissionValue(feature, 'view')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast(isExternalPreview() ? 'External Experts 通过 Fellow 工作，无法进入 Forge 页面。' : `当前角色没有“${label}”的查看权限。`, 'warning');
      return;
    }
    closeWorkspace();
  }
  function navFeature(label) {
    if (label.includes('概览')) return 'dashboard';
    if (label.includes('生产')) return 'runs';
    if (label.includes('审核')) return 'review';
    if (label.includes('交付')) return 'delivery';
    if (label.includes('供应商')) return 'fellow';
    return '';
  }
  function applyFeatureAccess() {
    document.body.dataset.rbacPlatformRole = state.platformRole;
    document.body.dataset.rbacProjectRole = state.projectRole;
    document.querySelectorAll('.forge-sidebar-link').forEach(item => {
      const label = item.getAttribute('aria-label') || item.textContent.trim();
      const feature = navFeature(label);
      const blocked = feature ? !permissionValue(feature, 'view') : false;
      item.dataset.rbacBlocked = String(blocked);
      item.setAttribute('aria-disabled', String(blocked));
      if (blocked) item.title = `${label} · 当前体验角色无权限`;
    });
    const profile = document.querySelector('.forge-sidebar-profile');
    if (profile) {
      profile.dataset.rbacCurrent = String(root?.dataset.open === 'true');
      const label = profile.querySelector('.forge-sidebar-profile-label');
      if (label) label.textContent = isAdmin() ? 'Admin' : 'Internal Member';
    }
  }
  function openWorkspace(tab) {
    state.activeTab = tab || state.activeTab;
    if (!isAdmin() && ['member', 'permission'].includes(state.activeTab)) state.activeTab = 'profile';
    root.dataset.open = 'true';
    const profile = document.querySelector('.forge-sidebar-profile');
    if (profile) profile.dataset.rbacCurrent = 'true';
    render();
    root.scrollTop = 0;
  }
  function closeWorkspace() {
    if (!root) return;
    if (state.roleCreateOpen) {
      state = { ...state, roleCreateOpen: false, roleDraftError: '' };
      saveState();
      renderDock();
    }
    root.dataset.open = 'false';
    const profile = document.querySelector('.forge-sidebar-profile');
    if (profile) profile.dataset.rbacCurrent = 'false';
  }

  function render() {
    if (!root || !dock) return;
    renderDock();
    if (root.dataset.open !== 'true') return;
    if (isExternalPreview()) {
      root.innerHTML = externalBoundaryView();
      bindRootEvents();
      return;
    }
    if (!isAdmin() && ['member', 'permission'].includes(state.activeTab)) state.activeTab = 'profile';
    root.innerHTML = `
      <div class="rbac-page">
        <header class="rbac-page-head">
          <div><h1>Profile</h1><p>${isAdmin() ? '账号、成员和权限管理' : '个人信息与工作内容'}</p></div>
          <button class="rbac-secondary" type="button" data-action="close-workspace">返回工作台</button>
        </header>
        ${tabsMarkup()}
        <main>${activeView()}</main>
      </div>`;
    bindRootEvents();
  }
  function tabsMarkup() {
    const tabs = isAdmin()
      ? [['profile', '基础信息'], ['member', 'Member'], ['permission', 'Permission'], ['skill', 'Skill']]
      : [['profile', '基础信息'], ['skill', 'Skill']];
    return `<nav class="rbac-tabs" role="tablist" aria-label="Profile 内容">${tabs.map(([key, label]) => `
      <button class="rbac-tab" type="button" role="tab" aria-selected="${state.activeTab === key}" data-tab="${key}">${label}</button>`).join('')}</nav>`;
  }
  function activeView() {
    if (state.activeTab === 'member') return memberView();
    if (state.activeTab === 'permission') return permissionView();
    if (state.activeTab === 'skill') return skillView();
    return profileView();
  }
  function profileView() {
    const member = currentMember();
    const avatar = state.avatar
      ? `<img src="${escapeHtml(state.avatar)}" alt="">`
      : `<b>${escapeHtml(member.name.slice(0, 1))}</b>`;
    return `
      <section class="rbac-section" aria-labelledby="profile-basic-title">
        <div class="rbac-section-head"><div><h2 id="profile-basic-title">基础信息</h2><p class="rbac-section-copy">姓名、邮箱和平台角色为只读；头像可以自行更换。</p></div></div>
        <div class="rbac-card rbac-profile-card">
          <label class="rbac-avatar-control" title="更换头像">${avatar}<span>更换</span><input type="file" accept="image/*" data-action="avatar" aria-label="更换头像"></label>
          <div><span class="rbac-field-label">姓名</span><span class="rbac-field-value">${escapeHtml(member.name)}</span></div>
          <div><span class="rbac-field-label">邮箱</span><span class="rbac-field-value">${escapeHtml(member.email)}</span></div>
          <div><span class="rbac-field-label">平台角色</span><span class="rbac-field-value">${isAdmin() ? 'Admin' : 'Internal Member'}</span></div>
        </div>
      </section>
      <section class="rbac-section" aria-labelledby="profile-projects-title">
        <div class="rbac-section-head"><div><h2 id="profile-projects-title">相关任务列表</h2><p class="rbac-section-copy">列出所有与当前用户相关的 Project，并显示其在每个项目中的角色。</p></div></div>
        <div class="rbac-card rbac-table-wrap"><table class="rbac-table"><thead><tr><th>Project / 交付单</th><th>客户</th><th>项目角色</th><th>状态</th><th>交付时间</th></tr></thead><tbody>
          ${projects.map(project => `<tr><td><strong>${escapeHtml(project.name)}</strong></td><td>${escapeHtml(project.customer)}</td><td><span class="rbac-badge">${escapeHtml(project.role)}</span></td><td>${escapeHtml(project.status)}</td><td>${escapeHtml(project.due)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>`;
  }

  function memberView() {
    if (state.activeMemberId) return memberDetailView();
    const query = String(state.memberQuery || '').trim().toLowerCase();
    const members = state.members.filter(member => !query || `${member.name} ${member.email}`.toLowerCase().includes(query));
    return `
      <section class="rbac-section">
        <div class="rbac-section-head"><div><h2>Member</h2><p class="rbac-section-copy">管理 Forge 内部成员与 Fellow External Experts。</p></div><button class="rbac-primary" type="button" data-action="show-invite">＋ 邀请成员</button></div>
        <div class="rbac-tabs" role="tablist" aria-label="成员管理内容">
          <button class="rbac-tab" type="button" role="tab" aria-selected="${state.memberView === 'list'}" data-member-view="list">成员列表</button>
          <button class="rbac-tab" type="button" role="tab" aria-selected="${state.memberView === 'invite'}" data-member-view="invite">邀请记录${state.invites.length ? ` · ${state.invites.length}` : ''}</button>
        </div>
        ${state.memberView === 'invite' ? inviteView() : `
          <div class="rbac-toolbar" style="margin-bottom:12px"><input class="rbac-search" type="search" value="${escapeHtml(state.memberQuery || '')}" placeholder="搜索姓名或邮箱" aria-label="搜索成员" data-action="member-search"><span class="rbac-badge">${members.length} 位成员</span></div>
          <div class="rbac-card rbac-table-wrap"><table class="rbac-table"><thead><tr><th>成员</th><th>来源</th><th>平台角色</th><th>参与项目</th><th>状态</th></tr></thead><tbody>
            ${members.map(member => `<tr><td><button class="rbac-member-name" type="button" data-member-id="${member.id}" aria-label="查看 ${escapeHtml(member.name)} 的用户 Profile">${escapeHtml(member.name)}<span class="rbac-member-email">${escapeHtml(member.email)}</span></button></td><td>${escapeHtml(member.source)}</td><td><span class="rbac-member-role-value">${platformRoleLabel(member.platformRole)}</span></td><td>${memberProjectsFor(member.id).length} 个</td><td>${escapeHtml(member.status)}</td></tr>`).join('')}
          </tbody></table></div>`}
      </section>`;
  }
  function platformRoleLabel(role) {
    return role === 'admin' ? 'Admin' : role === 'external' ? 'External Experts' : 'Internal Member';
  }
  function platformRoleOptions(value) {
    return `<option value="admin" ${value === 'admin' ? 'selected' : ''}>Admin</option><option value="member" ${value === 'member' ? 'selected' : ''}>Internal Member</option><option value="external" ${value === 'external' ? 'selected' : ''}>External Experts</option>`;
  }
  function memberRoleChanges() {
    return Object.entries(pendingPlatformRoles).map(([memberId, role]) => {
      const member = state.members.find(item => item.id === memberId);
      return member && member.platformRole !== role ? { member, role } : null;
    }).filter(Boolean);
  }
  function memberRoleSaveBar() {
    const changes = memberRoleChanges();
    if (!changes.length) return '';
    return `<div class="rbac-member-role-savebar" role="status"><div><strong>${changes.length} 项平台角色变更尚未保存</strong><span>保存前会再次确认权限变化。</span></div><div class="rbac-toolbar"><button class="rbac-secondary" type="button" data-action="cancel-member-role-drafts">取消</button><button class="rbac-primary" type="button" data-action="review-member-role-drafts">保存变更</button></div></div>`;
  }
  function memberRoleConfirmDialog() {
    const changes = memberRoleChanges();
    if (!changes.length) return '';
    return `<div class="rbac-confirm-layer" data-action="member-role-confirm-layer"><section class="rbac-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="rbac-member-role-confirm-title"><h2 id="rbac-member-role-confirm-title">确认平台角色变更</h2><p>平台角色会影响成员可访问的管理功能。请确认以下修改：</p><ul>${changes.map(({ member, role }) => `<li><strong>${escapeHtml(member.name)}</strong><span>${platformRoleLabel(member.platformRole)} → ${platformRoleLabel(role)}</span></li>`).join('')}</ul><div class="rbac-form-actions"><button class="rbac-secondary" type="button" data-action="cancel-member-role-confirm">返回修改</button><button class="rbac-primary" type="button" data-action="confirm-member-role-save">确认并保存</button></div></section></div>`;
  }
  function inviteView() {
    return `
      <div class="rbac-invite-layout">
        <form class="rbac-card rbac-invite-form" data-form="invite" novalidate>
          <div class="rbac-section-head"><div><h2>通过邮箱邀请</h2><p class="rbac-section-copy">邀请管理员和成员加入 Forge，或邀请外部专家通过 Fellow 协作。</p></div></div>
          <div class="rbac-form-grid">
            <label class="rbac-form-field"><span>用户邮箱</span><input class="rbac-input" type="email" name="email" placeholder="name@company.com" autocomplete="email" required></label>
            <label class="rbac-form-field"><span>邀请身份</span><select class="rbac-select" name="platformRole"><option value="admin">管理员</option><option value="member" selected>成员</option><option value="external">外部专家</option></select></label>
          </div>
          <label class="rbac-checkline"><input type="checkbox" name="feishu" checked><span>同步飞书邀请通知<small>Prototype 只生成模拟同步记录，尚未接入真实飞书 API。</small></span></label>
          <div class="rbac-form-actions"><button class="rbac-secondary" type="button" data-member-view="list">取消</button><button class="rbac-primary" type="submit">发送邀请</button></div>
        </form>
      </div>
      <section class="rbac-section"><div class="rbac-section-head"><div><h2>邀请记录</h2><p class="rbac-section-copy">可查看 Forge 或 Fellow 邀请，以及飞书模拟同步状态。</p></div></div>
        <div class="rbac-card rbac-table-wrap">${state.invites.length ? `<table class="rbac-table"><thead><tr><th>邮箱</th><th>邀请身份</th><th>邀请渠道</th><th>状态</th><th>飞书状态</th><th>有效期</th></tr></thead><tbody>${state.invites.map(invite => `<tr><td>${escapeHtml(invite.email)}</td><td><span class="rbac-badge" data-tone="${invite.platformRole === 'external' ? 'external' : invite.platformRole === 'admin' ? 'accent' : ''}">${inviteRoleLabel(invite.platformRole)}</span></td><td>${escapeHtml(invite.channel || inviteChannel(invite.platformRole))}</td><td><span class="rbac-badge">待接受</span></td><td><span class="rbac-badge" data-tone="${invite.feishu ? 'success' : ''}">${invite.feishu ? '模拟通知已生成' : '未同步'}</span></td><td>7 天</td></tr>`).join('')}</tbody></table>` : '<div class="rbac-empty"><h3>暂无邀请</h3><p>输入邮箱并选择邀请身份后，记录会显示在这里。</p></div>'}</div>
      </section>`;
  }

  function memberDetailView() {
    const member = state.members.find(item => item.id === state.activeMemberId) || state.members[0];
    const external = member.platformRole === 'external';
    const roleValue = pendingPlatformRoles[member.id] || member.platformRole;
    const rolePending = roleValue !== member.platformRole;
    const memberProjects = memberProjectsFor(member.id);
    const selectedProject = memberProjects.find(project => project.id === state.activeMemberProject) || memberProjects[0];
    return `
      <div class="rbac-detail-head"><button class="rbac-tertiary" type="button" data-action="back-members">← 返回成员列表</button><span>/</span><strong>${escapeHtml(member.name)}</strong></div>
      ${memberRoleSaveBar()}
      <div class="rbac-detail-grid">
        <aside class="rbac-card rbac-detail-summary"><span class="rbac-avatar-control" aria-hidden="true"><b>${escapeHtml(member.name.slice(0, 1))}</b></span><dl>
          <div><dt>姓名</dt><dd>${escapeHtml(member.name)}</dd></div><div><dt>邮箱</dt><dd>${escapeHtml(member.email)}</dd></div>
          <div><dt>成员来源</dt><dd>${escapeHtml(member.source)}</dd></div><div><dt>平台角色</dt><dd><select class="rbac-select rbac-member-role-select" data-action="member-role-draft" data-member-role-id="${escapeHtml(member.id)}" data-pending="${rolePending}" aria-label="${escapeHtml(member.name)} 的平台角色">${platformRoleOptions(roleValue)}</select></dd></div>
        </dl></aside>
        <section class="rbac-card"><div class="rbac-custom-head"><div><strong>个人权限</strong><p class="rbac-section-copy">按项目覆盖角色默认权限。</p></div><button class="${state.editingMemberPermissions ? 'rbac-secondary' : 'rbac-primary'}" type="button" data-action="toggle-custom-permissions">${state.editingMemberPermissions ? '取消编辑' : '编辑权限'}</button></div>
          <div class="rbac-custom-body"><div class="rbac-form-grid"><label class="rbac-form-field"><span>选择 Project</span><select class="rbac-select" data-action="member-project">${memberProjects.map(project => `<option value="${project.id}" ${selectedProject?.id === project.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select></label><label class="rbac-form-field"><span>项目角色</span><select class="rbac-select" data-action="member-project-role" ${external ? 'disabled' : ''}>${external ? '<option value="external-expert">External Experts</option>' : assignableRoleEntries().map(([key, label]) => `<option value="${escapeHtml(key)}" ${selectedProject?.roleKey === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label></div>
          ${external ? '<div class="rbac-boundary"><div><strong>Fellow 安全边界</strong><br>External Experts 只能访问同步至 Fellow 的任务包，不能成为 Project Owner，也不能进入 Forge 内部页面。以下覆盖只作用于该任务包。</div></div>' : ''}
          ${customPermissionTable(member.id, external ? 'external-expert' : '')}
          </div>
        </section>
      </div>
      <section class="rbac-section"><div class="rbac-section-head"><div><h2>参与的 Project</h2><p class="rbac-section-copy">同一成员在不同 Project 中可以拥有不同角色。</p></div></div><div class="rbac-card rbac-table-wrap"><table class="rbac-table"><thead><tr><th>Project</th><th>客户</th><th>项目角色</th><th>状态</th><th>交付时间</th></tr></thead><tbody>${memberProjects.map(project => `<tr><td>${escapeHtml(project.name)}</td><td>${escapeHtml(project.customer)}</td><td><span class="rbac-badge" data-tone="${external ? 'external' : ''}">${escapeHtml(project.role)}</span></td><td>${project.status}</td><td>${project.due}</td></tr>`).join('')}</tbody></table></div></section>
      ${platformRoleConfirmOpen ? memberRoleConfirmDialog() : ''}`;
  }
  function customPermissionTable(memberId, roleOverride = '') {
    const selectedRole = state.projectAssignments?.[memberId]?.[state.activeMemberProject] || 'member';
    const roleKey = roleOverride || roleKeyFromAssignment(selectedRole);
    return `<div class="rbac-table-wrap" style="margin-top:16px"><table class="rbac-table rbac-permission-table"><thead><tr><th>权限范围</th>${ACTIONS.map(action => `<th>${({view:'View',create:'Create',modify:'Modify',remove:'Remove'})[action]}</th>`).join('')}</tr></thead><tbody>${permissionRowsMarkup((feature, action) => {
      const override = state.customPermissions?.[memberId]?.[state.activeMemberProject]?.[feature]?.[action] || 'inherit';
      if (!state.editingMemberPermissions) return `<span class="rbac-badge">${override === 'inherit' ? (state.rolePermissions?.[roleKey]?.[feature]?.[action] ? '继承 · 允许' : '继承 · 禁止') : (override === 'allow' ? '允许' : '禁止')}</span>`;
      return `<select data-custom-permission="${feature}:${action}" aria-label="${feature} ${action}"><option value="inherit" ${override === 'inherit' ? 'selected' : ''}>继承</option><option value="allow" ${override === 'allow' ? 'selected' : ''}>允许</option><option value="deny" ${override === 'deny' ? 'selected' : ''}>禁止</option></select>`;
    })}</tbody></table></div>${state.editingMemberPermissions ? '<div class="rbac-form-actions"><button class="rbac-primary" type="button" data-action="save-custom-permissions">保存个人权限</button></div>' : ''}`;
  }

  function permissionRowsMarkup(cell) {
    return permissionGroups.map(group => `<tr data-group="true"><td colspan="5">${group.label}</td></tr>${group.rows.map(([feature, label]) => `<tr><td>${label}</td>${ACTIONS.map(action => `<td>${cell(feature, action)}</td>`).join('')}</tr>`).join('')}`).join('');
  }
  function permissionView() {
    const selected = state.permissionRole;
    const customRole = state.customRoles?.find(role => role.id === selected);
    return `
      <section class="rbac-section"><div class="rbac-section-head"><div><h2>项目角色与默认权限</h2><p class="rbac-section-copy">用户被分配项目角色后自动继承；个人覆盖不会被默认权限更新清除。</p></div><button class="rbac-primary" type="button" data-action="open-role-create">＋ 新增角色</button></div>
        <div class="rbac-permission-role-tabs" role="tablist" aria-label="选择项目角色">${roleEntries().map(([key, label]) => `<button type="button" role="tab" data-permission-role="${escapeHtml(key)}" aria-selected="${selected === key}" tabindex="${selected === key ? '0' : '-1'}">${escapeHtml(label)}${state.customRoles?.some(role => role.id === key) ? '<span>自定义</span>' : ''}</button>`).join('')}</div>
        <div class="rbac-role-summary"><div><strong>${escapeHtml(roleLabel(selected))}</strong><p>${escapeHtml(roleDescription(selected))}</p></div><span class="rbac-badge" data-tone="${customRole ? 'accent' : ''}">${customRole ? '自定义角色' : '系统角色'}</span></div>
        ${selected === 'external-expert' ? '<div class="rbac-inline-note" style="margin-bottom:12px"><div><strong>External Experts 安全边界</strong><br>即使勾选权限，也只作用于同步到 Fellow 的任务包，不会开放 Forge 登录或内部数据。</div></div>' : ''}
        <div class="rbac-card rbac-table-wrap"><table class="rbac-table rbac-permission-table"><thead><tr><th>权限范围</th><th>View</th><th>Create</th><th>Modify</th><th>Remove</th></tr></thead><tbody>${permissionRowsMarkup((feature, action) => `<input type="checkbox" data-role-permission="${feature}:${action}" ${state.rolePermissions[selected]?.[feature]?.[action] ? 'checked' : ''} aria-label="${feature} ${action}">`)}</tbody></table><footer class="rbac-permission-footer"><p>Prototype 设置保存在当前浏览器；刷新后仍保留。</p><button class="rbac-primary" type="button" data-action="save-role-permissions">保存默认权限</button></footer></div>
      </section>${state.roleCreateOpen ? roleCreateSheet() : ''}`;
  }
  function roleCreateSheet() {
    return `<div class="rbac-role-sheet-layer" data-action="role-sheet-layer">
      <aside class="rbac-role-sheet" role="dialog" aria-modal="true" aria-labelledby="rbac-role-sheet-title">
        <header class="rbac-role-sheet-head"><div><h2 id="rbac-role-sheet-title">新增项目角色</h2><p>设置角色名称、权限基础和默认访问范围。</p></div><button class="rbac-tertiary" type="button" data-action="close-role-create">关闭</button></header>
        <form class="rbac-role-sheet-form" data-form="custom-role" novalidate>
          <div class="rbac-role-sheet-body">
            <div class="rbac-role-identity">
              <label class="rbac-form-field"><span>角色名称</span><input class="rbac-input" name="roleName" value="${escapeHtml(state.roleDraftName)}" maxlength="40" placeholder="例如：QA Reviewer" required data-role-draft="name"></label>
              <label class="rbac-form-field"><span>角色说明</span><textarea class="rbac-textarea" name="roleDescription" maxlength="180" placeholder="说明该角色在项目中的职责" required data-role-draft="description">${escapeHtml(state.roleDraftDescription)}</textarea></label>
              <label class="rbac-form-field"><span>从现有角色复制权限</span><select class="rbac-select" name="roleBase" data-action="role-draft-base">${assignableRoleEntries().map(([key, label]) => `<option value="${escapeHtml(key)}" ${state.roleDraftBase === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><small>复制后可逐项调整，不会影响原角色。External Experts 受 Fellow 边界保护，不能作为内部角色模板。</small></label>
              ${state.roleDraftError ? `<p class="rbac-form-error" role="alert">${escapeHtml(state.roleDraftError)}</p>` : ''}
            </div>
            <div class="rbac-role-sheet-title"><div><h3>默认权限</h3><p>新角色会把这些权限应用到被分配的项目成员。</p></div></div>
            <div class="rbac-card rbac-table-wrap"><table class="rbac-table rbac-permission-table"><thead><tr><th>权限范围</th><th>View</th><th>Create</th><th>Modify</th><th>Remove</th></tr></thead><tbody>${permissionRowsMarkup((feature, action) => `<input type="checkbox" data-role-draft-permission="${feature}:${action}" ${state.roleDraftPermissions?.[feature]?.[action] ? 'checked' : ''} aria-label="新角色 ${feature} ${action}">`)}</tbody></table></div>
          </div>
          <footer class="rbac-role-sheet-footer"><button class="rbac-secondary" type="button" data-action="close-role-create">取消</button><button class="rbac-primary" type="submit">创建角色</button></footer>
        </form>
      </aside>
    </div>`;
  }

  function skillView() {
    const activeSkill = state.skills.find(skill => skill.id === state.activeSkillId);
    if (activeSkill) return skillDetailView(activeSkill);
    const skills = state.skillScope === 'mine' ? state.skills.filter(skill => skill.owner === '一万') : state.skills;
    const skillGrid = `<div class="rbac-skill-grid">${skills.map(skill => `<a class="rbac-card rbac-skill-card" href="#skill-${encodeURIComponent(skill.id)}" data-skill-id="${escapeHtml(skill.id)}" aria-label="查看 ${escapeHtml(skill.name)} 详情"><div class="rbac-skill-head"><div><h3>${escapeHtml(skill.name)}</h3><p class="rbac-skill-command">${escapeHtml(skill.command)}</p></div><span class="rbac-badge" data-tone="${skill.relation === 'Owner' ? 'accent' : ''}">${escapeHtml(skill.relation)}</span></div><p class="rbac-skill-description">${escapeHtml(skill.description)}</p>${skillUsageMarkup(skill)}</a>`).join('')}</div>`;
    const skillContent = state.skillCreateMode === 'form'
      ? `<div class="rbac-skill-create-flow">
          <section class="rbac-skill-part" aria-labelledby="rbac-new-skill-title"><div class="rbac-skill-part-head"><h3 id="rbac-new-skill-title">新创建 Skill</h3></div>${skillCreateForm()}</section>
          <section class="rbac-skill-part rbac-skill-existing-part" aria-labelledby="rbac-created-skills-title"><div class="rbac-skill-part-head"><h3 id="rbac-created-skills-title">已创建 Skill</h3></div>${skillGrid}</section>
        </div>`
      : skillGrid;
    return `
      <section class="rbac-section"><div class="rbac-skill-toolbar"><div><h2>Skill</h2><p class="rbac-section-copy">查看自己创建的 Skill 和有权限访问的全平台 Skill。</p></div><div class="rbac-toolbar"><div class="rbac-segmented" role="group" aria-label="Skill 范围"><button type="button" data-skill-scope="platform" aria-pressed="${state.skillScope === 'platform'}">全平台 Skill</button><button type="button" data-skill-scope="mine" aria-pressed="${state.skillScope === 'mine'}">我创建的</button></div><details class="rbac-skill-create-menu"><summary class="rbac-secondary">创建 Skill${dockCaretIcon}</summary><div class="rbac-skill-create-options"><button type="button" data-action="skill-upload-trigger">上传 Skill</button><button type="button" data-action="skill-form">填写 Skill</button></div><input type="file" accept=".md,.markdown,.zip,text/markdown,application/zip" data-action="skill-upload" aria-label="上传 Skill" hidden></details></div></div>
        ${skillContent}
      </section>`;
  }
  function canEditSkill(skill) {
    return skill?.relation === 'Owner' && skill?.owner === currentMember().name;
  }
  function skillUsageMarkup(skill, detail = false) {
    const relatedTasks = Array.isArray(skill?.relatedTasks) ? skill.relatedTasks : [];
    const tasks = relatedTasks.length
      ? `<ul>${relatedTasks.map(task => `<li>${escapeHtml(task)}</li>`).join('')}</ul>`
      : '<p class="rbac-skill-usage-empty">暂无使用记录</p>';
    if (detail) return `<div class="rbac-skill-detail-usage"><h3>相关任务单</h3>${tasks}</div>`;
    return `<div class="rbac-skill-usage"><span>相关任务单</span>${tasks}</div>`;
  }
  function skillDetailView(skill) {
    const editable = canEditSkill(skill);
    if (state.skillEditMode && editable) {
      const zipFileName = /\.zip$/i.test(skill.file || '') ? skill.file : '';
      return `
        <section class="rbac-section">
          <div class="rbac-skill-detail-nav"><button class="rbac-tertiary" type="button" data-action="back-skills">返回 Skill 列表</button></div>
          <div class="rbac-skill-detail-head"><div><h2 data-skill-detail-title tabindex="-1">编辑 ${escapeHtml(skill.name)}</h2><p class="rbac-section-copy">更新后会保存到当前 Prototype 的个人 Skill 列表。</p></div></div>
          <form class="rbac-card rbac-create-panel rbac-skill-edit-panel" data-form="skill-edit">
            <div class="rbac-create-grid"><label class="rbac-form-field"><span>Skill 名称</span><input class="rbac-input" name="name" value="${escapeHtml(skill.name)}" required maxlength="80" data-skill-edit-name></label><label class="rbac-form-field"><span>调用名</span><input class="rbac-input" name="command" value="${escapeHtml(skill.command)}" required maxlength="60"></label><label class="rbac-form-field"><span>简介</span><textarea class="rbac-textarea" name="description" required>${escapeHtml(skill.description)}</textarea><small>用于 Skill 列表中的快速说明。</small></label><label class="rbac-form-field"><span>完整 Skill</span><textarea class="rbac-textarea rbac-skill-content-input" name="content" required>${escapeHtml(skill.content)}</textarea><small>填写完整目标、输入、执行步骤与输出要求。</small></label></div>
            ${zipFileName ? `<div class="rbac-skill-file-editor"><span class="rbac-skill-file-label">Skill 文件</span><div class="rbac-skill-file-row"><div class="rbac-skill-file-summary"><span class="rbac-skill-file-type" aria-hidden="true">ZIP</span><div><strong data-skill-file-name>${escapeHtml(zipFileName)}</strong><small data-skill-file-note>已上传的 Skill 包</small></div></div><button class="rbac-secondary" type="button" data-action="skill-reupload-trigger">重新上传</button><input type="file" name="skillFile" accept=".zip,application/zip" data-action="skill-reupload" aria-label="重新上传 ZIP Skill 文件" hidden></div></div>` : ''}
            <div class="rbac-form-actions rbac-skill-edit-actions"><button class="rbac-danger-secondary" type="button" data-action="open-skill-delete">删除 Skill</button><div class="rbac-toolbar"><button class="rbac-secondary" type="button" data-action="cancel-skill-edit">取消</button><button class="rbac-primary" type="submit">保存修改</button></div></div>
          </form>
          ${skillDeleteConfirmDialog(skill)}
        </section>`;
    }
    return `
      <section class="rbac-section">
        <div class="rbac-skill-detail-nav"><button class="rbac-tertiary" type="button" data-action="back-skills">返回 Skill 列表</button></div>
        <div class="rbac-skill-detail-head"><div><div class="rbac-skill-title-line"><h2 data-skill-detail-title tabindex="-1">${escapeHtml(skill.name)}</h2><span class="rbac-badge" data-tone="${editable ? 'accent' : ''}">${escapeHtml(skill.relation)}</span></div><p class="rbac-skill-command">${escapeHtml(skill.command)}</p></div>${editable ? '<div class="rbac-skill-detail-actions"><button class="rbac-primary" type="button" data-action="edit-skill">编辑 Skill</button></div>' : ''}</div>
        <div class="rbac-card rbac-skill-detail-card">
          <dl class="rbac-skill-detail-meta"><div><dt>所有者</dt><dd>${escapeHtml(skill.owner)}</dd></div><div><dt>访问关系</dt><dd>${editable ? '本人创建，可编辑' : '已获授权，只读'}</dd></div></dl>
          <div class="rbac-skill-detail-copy"><h3>完整 Skill</h3><div class="rbac-skill-document">${escapeHtml(skill.content || skill.description)}</div></div>
          ${skillUsageMarkup(skill, true)}
        </div>
      </section>`;
  }
  function skillDeleteConfirmDialog(skill) {
    return `<div class="rbac-confirm-layer" data-action="skill-delete-layer" ${skillDeleteConfirmOpen ? '' : 'hidden'}><section class="rbac-confirm-dialog rbac-skill-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="rbac-skill-delete-title" aria-describedby="rbac-skill-delete-description"><h2 id="rbac-skill-delete-title">删除 Skill？</h2><p id="rbac-skill-delete-description">“${escapeHtml(skill.name)}”将从你的 Skill 列表中永久删除。此操作无法撤销。</p><div class="rbac-form-actions"><button class="rbac-secondary" type="button" data-action="cancel-skill-delete">取消</button><button class="rbac-danger" type="button" data-action="confirm-skill-delete">删除 Skill</button></div></section></div>`;
  }
  function skillCreateForm() {
    return `<form class="rbac-card rbac-create-panel" data-form="skill"><div class="rbac-create-grid"><label class="rbac-form-field"><span>Skill 名称</span><input class="rbac-input" name="name" required maxlength="80"></label><label class="rbac-form-field"><span>调用名</span><input class="rbac-input" name="command" placeholder="/skill-command" required maxlength="60"></label><label class="rbac-form-field"><span>简介</span><textarea class="rbac-textarea" name="description" required placeholder="用于列表快速了解这个 Skill"></textarea></label><label class="rbac-form-field"><span>完整 Skill</span><textarea class="rbac-textarea rbac-skill-content-input" name="content" required placeholder="填写完整目标、输入、执行步骤与输出要求"></textarea></label></div><div class="rbac-form-actions"><button class="rbac-secondary" type="button" data-action="cancel-skill-form">取消</button><button class="rbac-primary" type="submit">创建 Skill</button></div></form>`;
  }
  function externalBoundaryView() {
    return `<div class="rbac-page"><header class="rbac-page-head"><div><h1>External Experts</h1><p>Fellow 外部协作身份</p></div><button class="rbac-secondary" type="button" data-action="close-workspace">返回工作台</button></header><div class="rbac-boundary"><div><strong>此角色不登录 Forge</strong><br>External Experts 在 Fellow 中接收由 Forge 同步的任务包、上传结果并处理返工。Forge 内部项目、备注、费用、模型状态和其他成员信息不会开放。</div></div><section class="rbac-section"><div class="rbac-section-head"><div><h2>联动状态</h2><p class="rbac-section-copy">用于体验角色边界，不代表 Fellow 已真实接通。</p></div></div><div class="rbac-card rbac-table-wrap"><table class="rbac-table"><thead><tr><th>任务包</th><th>Forge 状态</th><th>Fellow 状态</th><th>可访问内容</th></tr></thead><tbody><tr><td>蚂蚁 Web3D · Batch 04</td><td>已分配</td><td><span class="rbac-badge" data-tone="external">模拟同步</span></td><td>需求、参考文件、提交入口</td></tr></tbody></table></div></section></div>`;
  }

  function setDockCollapsed(collapsed) {
    update({ dockCollapsed: collapsed });
    requestAnimationFrame(() => dock.querySelector(`[data-dock="${collapsed ? 'restore' : 'collapse'}"]`)?.focus());
  }

  function renderDock() {
    dock.dataset.expanded = String(!!state.dockExpanded);
    dock.dataset.collapsed = String(!!state.dockCollapsed);
    dock.dataset.hidden = String(!!state.roleCreateOpen);
    dock.innerHTML = `<button class="rbac-dock-restore" type="button" data-dock="restore" aria-label="展开 Prototype 角色体验" aria-expanded="false" aria-controls="forge-rbac-role-dock-controls" title="展开 Prototype 角色体验">${dockCaretIcon}</button><div class="rbac-dock-content" id="forge-rbac-role-dock-controls"><div class="rbac-dock-row"><span class="rbac-prototype-tag">Prototype</span><label>平台<select data-dock="platform"><option value="admin" ${state.platformRole === 'admin' ? 'selected' : ''}>Admin</option><option value="member" ${state.platformRole === 'member' ? 'selected' : ''}>Internal Member</option></select></label><label>项目<select data-dock="project">${roleEntries().map(([key, label]) => `<option value="${escapeHtml(key)}" ${state.projectRole === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label><button class="rbac-dock-info" type="button" data-dock="info" aria-label="查看体验模式说明" aria-expanded="${!!state.dockExpanded}">?</button><button class="rbac-dock-collapse" type="button" data-dock="collapse" aria-label="收起 Prototype 角色体验" aria-expanded="true" aria-controls="forge-rbac-role-dock-controls" title="收起 Prototype 角色体验">${dockCaretIcon}</button></div><p class="rbac-dock-note">平台角色决定是否能管理 Member 和 Permission；项目角色决定具体 Forge 功能。Admin 始终拥有最高权限。External Experts 仅通过 Fellow 工作。</p></div>`;
    dock.querySelector('[data-dock="restore"]')?.addEventListener('click', () => setDockCollapsed(false));
    dock.querySelector('[data-dock="collapse"]')?.addEventListener('click', () => setDockCollapsed(true));
    dock.querySelector('[data-dock="platform"]')?.addEventListener('change', event => {
      const platformRole = event.target.value;
      update({ platformRole, roleCreateOpen: false, roleDraftError: '', activeTab: platformRole === 'admin' ? state.activeTab : (['member', 'permission'].includes(state.activeTab) ? 'profile' : state.activeTab) });
      showToast(`已切换为 ${platformRole === 'admin' ? 'Admin' : 'Internal Member'} 体验状态`);
    });
    dock.querySelector('[data-dock="project"]')?.addEventListener('change', event => {
      update({ projectRole: event.target.value });
      if (event.target.value === 'external-expert' && !isAdmin()) openWorkspace('profile');
      showToast(`当前项目角色：${roleLabel(event.target.value)}`);
    });
    dock.querySelector('[data-dock="info"]')?.addEventListener('click', () => update({ dockExpanded: !state.dockExpanded }));
  }

  function bindRootEvents() {
    root.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => update({ activeTab: button.dataset.tab, activeMemberId: '', editingMemberPermissions: false, activeSkillId: '', skillEditMode: false, skillCreateMode: '' })));
    root.querySelector('[data-action="close-workspace"]')?.addEventListener('click', closeWorkspace);
    root.querySelector('[data-action="avatar"]')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return showToast('请选择图片文件。', 'warning');
      const reader = new FileReader();
      reader.onload = () => { update({ avatar: String(reader.result) }); showToast('头像已更新，仅保存在当前 Prototype。'); };
      reader.readAsDataURL(file);
    });
    root.querySelectorAll('[data-member-view]').forEach(button => button.addEventListener('click', () => update({ memberView: button.dataset.memberView })));
    root.querySelector('[data-action="show-invite"]')?.addEventListener('click', () => update({ memberView: 'invite' }));
    root.querySelector('[data-action="member-search"]')?.addEventListener('input', event => {
      const query = event.target.value;
      const selectionStart = event.target.selectionStart;
      update({ memberQuery: query }, true);
      requestAnimationFrame(() => {
        const input = root.querySelector('[data-action="member-search"]');
        input?.focus();
        if (input && Number.isInteger(selectionStart)) input.setSelectionRange(selectionStart, selectionStart);
      });
    });
    root.querySelectorAll('[data-member-id]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      const memberId = button.dataset.memberId;
      const firstProject = memberProjectsFor(memberId)[0]?.id || '';
      pendingPlatformRoles = {};
      platformRoleConfirmOpen = false;
      update({ activeMemberId: memberId, activeMemberProject: firstProject, editingMemberPermissions: false });
    }));
    root.querySelectorAll('[data-action="member-role-draft"]').forEach(select => {
      select.addEventListener('click', event => event.stopPropagation());
      select.addEventListener('change', event => {
        event.stopPropagation();
        const memberId = select.dataset.memberRoleId;
        const member = state.members.find(item => item.id === memberId);
        if (!member) return;
        if (event.target.value === member.platformRole) delete pendingPlatformRoles[memberId];
        else pendingPlatformRoles[memberId] = event.target.value;
        platformRoleConfirmOpen = false;
        render();
        requestAnimationFrame(() => root.querySelector(`[data-member-role-id="${CSS.escape(memberId)}"]`)?.focus());
      });
    });
    root.querySelector('[data-action="cancel-member-role-drafts"]')?.addEventListener('click', () => {
      pendingPlatformRoles = {};
      platformRoleConfirmOpen = false;
      render();
    });
    root.querySelector('[data-action="review-member-role-drafts"]')?.addEventListener('click', () => {
      platformRoleConfirmOpen = true;
      render();
      requestAnimationFrame(() => root.querySelector('[data-action="confirm-member-role-save"]')?.focus());
    });
    root.querySelector('[data-action="cancel-member-role-confirm"]')?.addEventListener('click', () => {
      platformRoleConfirmOpen = false;
      render();
      requestAnimationFrame(() => root.querySelector('[data-action="review-member-role-drafts"]')?.focus());
    });
    root.querySelector('[data-action="member-role-confirm-layer"]')?.addEventListener('click', event => {
      if (event.target !== event.currentTarget) return;
      platformRoleConfirmOpen = false;
      render();
    });
    root.querySelector('[data-action="confirm-member-role-save"]')?.addEventListener('click', () => {
      const changes = memberRoleChanges();
      const nextMembers = state.members.map(member => pendingPlatformRoles[member.id] ? { ...member, platformRole: pendingPlatformRoles[member.id] } : member);
      pendingPlatformRoles = {};
      platformRoleConfirmOpen = false;
      update({ members: nextMembers });
      showToast(`已保存 ${changes.length} 位成员的平台角色。`);
    });
    root.querySelector('[data-action="back-members"]')?.addEventListener('click', () => {
      pendingPlatformRoles = {};
      platformRoleConfirmOpen = false;
      update({ activeMemberId: '', editingMemberPermissions: false });
    });
    root.querySelector('[data-action="toggle-custom-permissions"]')?.addEventListener('click', () => update({ editingMemberPermissions: !state.editingMemberPermissions }));
    root.querySelector('[data-action="member-project"]')?.addEventListener('change', event => update({ activeMemberProject: event.target.value }));
    root.querySelector('[data-action="member-project-role"]')?.addEventListener('change', event => {
      const nextAssignments = clone(state.projectAssignments || {});
      nextAssignments[state.activeMemberId] ||= {};
      nextAssignments[state.activeMemberId][state.activeMemberProject] = event.target.value;
      update({ projectAssignments: nextAssignments });
      showToast(`项目角色已更新为 ${roleLabel(event.target.value)}。`);
    });
    root.querySelector('[data-action="save-custom-permissions"]')?.addEventListener('click', () => { update({ editingMemberPermissions: false }); showToast('个人权限已保存并覆盖该项目的默认值。'); });
    root.querySelectorAll('[data-custom-permission]').forEach(select => select.addEventListener('change', () => {
      const [feature, action] = select.dataset.customPermission.split(':');
      const memberId = state.activeMemberId;
      const projectId = state.activeMemberProject;
      const next = clone(state.customPermissions || {});
      next[memberId] ||= {}; next[memberId][projectId] ||= {}; next[memberId][projectId][feature] ||= {};
      next[memberId][projectId][feature][action] = select.value;
      update({ customPermissions: next }, false);
    }));
    const permissionRoleTabs = [...root.querySelectorAll('[data-permission-role]')];
    permissionRoleTabs.forEach((button, index) => {
      button.addEventListener('click', () => {
        const permissionRole = button.dataset.permissionRole;
        update({ permissionRole });
        requestAnimationFrame(() => root.querySelector(`[data-permission-role="${CSS.escape(permissionRole)}"]`)?.focus());
      });
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? permissionRoleTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + permissionRoleTabs.length) % permissionRoleTabs.length;
        permissionRoleTabs[nextIndex]?.click();
      });
    });
    root.querySelector('[data-action="open-role-create"]')?.addEventListener('click', () => {
      const base = state.permissionRole && state.permissionRole !== 'external-expert' && state.rolePermissions[state.permissionRole] ? state.permissionRole : 'member';
      update({ roleCreateOpen: true, roleDraftName: '', roleDraftDescription: '', roleDraftBase: base, roleDraftPermissions: clone(state.rolePermissions[base] || defaultPermissions.member), roleDraftError: '' });
      requestAnimationFrame(() => root.querySelector('[data-role-draft="name"]')?.focus());
    });
    root.querySelectorAll('[data-action="close-role-create"]').forEach(button => button.addEventListener('click', closeRoleCreate));
    root.querySelector('[data-action="role-sheet-layer"]')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeRoleCreate();
    });
    root.querySelectorAll('[data-role-draft]').forEach(input => input.addEventListener('input', () => {
      const patch = input.dataset.roleDraft === 'name' ? { roleDraftName: input.value, roleDraftError: '' } : { roleDraftDescription: input.value, roleDraftError: '' };
      update(patch, false);
    }));
    root.querySelector('[data-action="role-draft-base"]')?.addEventListener('change', event => {
      const base = event.target.value;
      update({ roleDraftBase: base, roleDraftPermissions: clone(state.rolePermissions[base] || defaultPermissions.member), roleDraftError: '' });
    });
    root.querySelectorAll('[data-role-draft-permission]').forEach(input => input.addEventListener('change', () => {
      const [feature, action] = input.dataset.roleDraftPermission.split(':');
      const next = clone(state.roleDraftPermissions || defaultPermissions.member);
      next[feature][action] = input.checked;
      update({ roleDraftPermissions: next }, false);
    }));
    root.querySelectorAll('[data-role-permission]').forEach(input => input.addEventListener('change', () => {
      const [feature, action] = input.dataset.rolePermission.split(':');
      const next = clone(state.rolePermissions);
      next[state.permissionRole][feature][action] = input.checked;
      update({ rolePermissions: next }, false);
    }));
    root.querySelector('[data-action="save-role-permissions"]')?.addEventListener('click', () => { saveState(); applyFeatureAccess(); showToast(`${roleLabel(state.permissionRole)} 默认权限已更新，平台功能状态已同步。`); });
    root.querySelectorAll('[data-skill-scope]').forEach(button => button.addEventListener('click', () => {
      skillDeleteConfirmOpen = false;
      update({ skillScope: button.dataset.skillScope, activeSkillId: '', skillEditMode: false, skillCreateMode: '' });
    }));
    root.querySelectorAll('[data-skill-id]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      skillDeleteConfirmOpen = false;
      update({ activeSkillId: link.dataset.skillId, skillEditMode: false });
      root.scrollTop = 0;
      requestAnimationFrame(() => root.querySelector('[data-skill-detail-title]')?.focus());
    }));
    root.querySelector('[data-action="back-skills"]')?.addEventListener('click', () => {
      const skillId = state.activeSkillId;
      skillDeleteConfirmOpen = false;
      update({ activeSkillId: '', skillEditMode: false });
      root.scrollTop = 0;
      requestAnimationFrame(() => [...root.querySelectorAll('[data-skill-id]')].find(link => link.dataset.skillId === skillId)?.focus());
    });
    root.querySelector('[data-action="edit-skill"]')?.addEventListener('click', () => {
      skillDeleteConfirmOpen = false;
      update({ skillEditMode: true });
      requestAnimationFrame(() => root.querySelector('[data-skill-edit-name]')?.focus());
    });
    root.querySelector('[data-action="cancel-skill-edit"]')?.addEventListener('click', () => {
      skillDeleteConfirmOpen = false;
      update({ skillEditMode: false });
    });
    root.querySelector('[data-action="open-skill-delete"]')?.addEventListener('click', () => {
      skillDeleteConfirmOpen = true;
      root.querySelector('[data-action="skill-delete-layer"]')?.removeAttribute('hidden');
      requestAnimationFrame(() => root.querySelector('[data-action="cancel-skill-delete"]')?.focus());
    });
    root.querySelector('[data-action="cancel-skill-delete"]')?.addEventListener('click', closeSkillDeleteConfirm);
    root.querySelector('[data-action="skill-delete-layer"]')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeSkillDeleteConfirm();
    });
    root.querySelector('[data-action="confirm-skill-delete"]')?.addEventListener('click', handleSkillDelete);
    root.querySelector('[data-action="skill-reupload-trigger"]')?.addEventListener('click', () => root.querySelector('[data-action="skill-reupload"]')?.click());
    root.querySelector('[data-action="skill-reupload"]')?.addEventListener('change', handleSkillReuploadPreview);
    root.querySelector('[data-action="skill-form"]')?.addEventListener('click', () => update({ skillCreateMode: 'form', skillScope: 'mine' }));
    root.querySelector('[data-action="skill-upload-trigger"]')?.addEventListener('click', () => {
      root.querySelector('.rbac-skill-create-menu')?.removeAttribute('open');
      root.querySelector('[data-action="skill-upload"]')?.click();
    });
    root.querySelector('[data-action="cancel-skill-form"]')?.addEventListener('click', () => update({ skillCreateMode: '' }));
    root.querySelector('[data-action="skill-upload"]')?.addEventListener('change', handleSkillUpload);
    root.querySelector('[data-form="invite"]')?.addEventListener('submit', handleInviteSubmit);
    root.querySelector('[data-form="custom-role"]')?.addEventListener('submit', handleCustomRoleSubmit);
    root.querySelector('[data-form="skill"]')?.addEventListener('submit', handleSkillSubmit);
    root.querySelector('[data-form="skill-edit"]')?.addEventListener('submit', handleSkillEditSubmit);
  }
  function closeRoleCreate() {
    update({ roleCreateOpen: false, roleDraftName: '', roleDraftDescription: '', roleDraftBase: 'member', roleDraftPermissions: clone(defaultPermissions.member), roleDraftError: '' });
  }
  function handleCustomRoleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('roleName') || state.roleDraftName || '').trim();
    const description = String(data.get('roleDescription') || state.roleDraftDescription || '').trim();
    if (!name || !description) return update({ roleDraftError: '请填写角色名称和职责说明。' });
    if (roleEntries().some(([, label]) => label.trim().toLowerCase() === name.toLowerCase())) return update({ roleDraftError: '该角色名称已存在，请使用其他名称。' });
    const id = `custom-${Date.now().toString(36)}`;
    const role = { id, name, description, createdAt: new Date().toISOString() };
    const nextPermissions = { ...state.rolePermissions, [id]: clone(state.roleDraftPermissions || defaultPermissions.member) };
    update({ customRoles: [...(state.customRoles || []), role], rolePermissions: nextPermissions, permissionRole: id, roleCreateOpen: false, roleDraftName: '', roleDraftDescription: '', roleDraftBase: 'member', roleDraftPermissions: clone(defaultPermissions.member), roleDraftError: '' });
    showToast(`已创建项目角色“${name}”，现在可用于成员分配。`);
  }
  function handleInviteSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('请输入有效的用户邮箱。', 'warning');
    if (state.invites.some(invite => invite.email === email)) return showToast('该邮箱已有待处理邀请。', 'warning');
    const requestedRole = String(data.get('platformRole') || 'member');
    const platformRole = Object.hasOwn(inviteRoleLabels, requestedRole) ? requestedRole : 'member';
    const invite = { id: `invite-${Date.now()}`, email, platformRole, channel: inviteChannel(platformRole), feishu: data.get('feishu') === 'on', createdAt: new Date().toISOString() };
    update({ invites: [invite, ...state.invites], memberView: 'invite' });
    const summary = `${invite.channel} ${inviteRoleLabel(invite.platformRole)}邀请已创建`;
    showToast(invite.feishu ? `${summary}，飞书模拟通知已生成。` : `${summary}。`);
  }
  function handleSkillSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const rawCommand = String(data.get('command') || '').trim();
    const command = rawCommand.startsWith('/') ? rawCommand : `/${rawCommand}`;
    const description = String(data.get('description') || '').trim();
    const content = String(data.get('content') || '').trim();
    if (!name || command === '/' || !description || !content) return showToast('请完整填写 Skill 名称、调用名、简介和完整内容。', 'warning');
    const skill = { id: `skill-${Date.now()}`, name, command, description, content, owner: '一万', relation: 'Owner', file: '表单创建', relatedTasks: [] };
    update({ skills: [skill, ...state.skills], skillCreateMode: '', skillScope: 'mine' });
    showToast('Skill 已创建并加入“我创建的”。');
  }
  function handleSkillEditSubmit(event) {
    event.preventDefault();
    const skill = state.skills.find(item => item.id === state.activeSkillId);
    if (!canEditSkill(skill)) {
      update({ skillEditMode: false });
      return showToast('只有本人创建的 Skill 可以编辑。', 'warning');
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const rawCommand = String(data.get('command') || '').trim();
    const command = rawCommand.startsWith('/') ? rawCommand : `/${rawCommand}`;
    const description = String(data.get('description') || '').trim();
    const content = String(data.get('content') || '').trim();
    const replacementFile = event.currentTarget.querySelector('[data-action="skill-reupload"]')?.files?.[0];
    if (replacementFile && !/\.zip$/i.test(replacementFile.name)) return showToast('请选择 ZIP 格式的 Skill 文件。', 'warning');
    if (!name || command === '/' || !description || !content) return showToast('请完整填写 Skill 名称、调用名、简介和完整内容。', 'warning');
    const file = replacementFile?.name || skill.file;
    const nextSkills = state.skills.map(item => item.id === skill.id ? { ...item, name, command, description, content, file } : item);
    update({ skills: nextSkills, skillEditMode: false });
    requestAnimationFrame(() => root.querySelector('[data-skill-detail-title]')?.focus());
    showToast(replacementFile ? 'Skill 文件已替换，修改已保存。' : 'Skill 修改已保存。');
  }
  function closeSkillDeleteConfirm() {
    skillDeleteConfirmOpen = false;
    root.querySelector('[data-action="skill-delete-layer"]')?.setAttribute('hidden', '');
    requestAnimationFrame(() => root.querySelector('[data-action="open-skill-delete"]')?.focus());
  }
  function handleSkillDelete() {
    const skill = state.skills.find(item => item.id === state.activeSkillId);
    if (!canEditSkill(skill)) {
      skillDeleteConfirmOpen = false;
      update({ skillEditMode: false });
      return showToast('只有本人创建的 Skill 可以删除。', 'warning');
    }
    const skillName = skill.name;
    skillDeleteConfirmOpen = false;
    update({ skills: state.skills.filter(item => item.id !== skill.id), activeSkillId: '', skillEditMode: false, skillScope: 'mine' });
    root.scrollTop = 0;
    showToast(`“${skillName}”已删除。`);
  }
  function handleSkillReuploadPreview(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      event.target.value = '';
      return showToast('请选择 ZIP 格式的 Skill 文件。', 'warning');
    }
    const fileName = root.querySelector('[data-skill-file-name]');
    const fileNote = root.querySelector('[data-skill-file-note]');
    if (fileName) fileName.textContent = file.name;
    if (fileNote) fileNote.textContent = '待保存的新文件';
  }
  async function handleSkillUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(md|markdown|zip)$/i.test(file.name)) return showToast('仅支持 MD、Markdown 或含 SKILL.md 的 ZIP。', 'warning');
    const name = file.name.replace(/\.(md|markdown|zip)$/i, '').replace(/[-_]+/g, ' ');
    const command = `/${name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || 'new-skill'}`;
    const isMarkdown = /\.(md|markdown)$/i.test(file.name);
    const uploadedContent = isMarkdown ? String(await file.text()).trim() : '';
    const description = isMarkdown ? '通过 Markdown 文件上传的 Skill。' : '通过 ZIP 文件上传的 Skill 包。';
    const content = uploadedContent || '此 Skill 已通过 ZIP 包上传。请点击“编辑 Skill”补充可阅读的完整目标、输入、执行步骤与输出要求。';
    const skill = { id: `skill-${Date.now()}`, name, command, description, content, owner: '一万', relation: 'Owner', file: file.name, relatedTasks: [] };
    update({ skills: [skill, ...state.skills], skillScope: 'mine' });
    showToast('Skill 文件已读取并加入个人列表。');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForForge, { once: true });
  else waitForForge();
})();
