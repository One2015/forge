  // profile-workspace:start
  profileIdentity() {
    const roles = [
      { key: 'lead', label: 'Lead', name: '公司负责人', scope: '可查看全部项目的任务', description: '公司负责人，可查看全部任务。' },
      { key: 'project-owner', label: 'Project Owner', name: '项目负责人', scope: '仅查看负责项目中的任务', description: '项目负责人，可查看所负责项目的任务。' },
      { key: 'member', label: 'Member', name: '成员', scope: '仅查看分配给自己的任务', description: '团队成员，仅查看分配给自己的任务。' },
      { key: 'outsourcing', label: 'Outsourcing', name: '外包协作', scope: '仅查看分配给自己的任务', description: '外包协作，仅查看分配给自己的任务。' }
    ];
    const accountName = String(this.props.currentUser || '一万');
    const configured = String(this.state.profileRoleOverrides?.[accountName] || this.props.currentRole || 'member').trim().toLowerCase().replace(/[ _]+/g, '-');
    const key = configured === 'owner' ? 'project-owner' : configured;
    const role = roles.find(value => value.key === key);
    return {
      name: this.state.profileNameOverrides?.[accountName] || accountName, accountName, key, roles,
      label: role?.label || '未配置角色', roleName: role?.name || '待确认', scope: role?.scope || '角色未配置，暂不展示任务',
      ownedProjects: Array.isArray(this.props.ownedProjectIds) ? this.props.ownedProjectIds.filter(value => typeof value === 'string') : []
    };
  }

  profileTaskCatalog() {
    const datasets = this.dsData();
    const project = id => { const ds = datasets.find(value => value.name === id); return ds?.group || ds?.name || '未关联项目'; };
    const reviews = this.pendingQueue().map(item => {
      const assignment = this.assignmentOf(String(item.id), this.roundsOf(item.id));
      const title = this.itemTitle(item.meta?.[4] || '') || ('Item ' + String(item.id).slice(0, 8));
      return { key: 'review:' + item.rec.id + ':' + item.id, kind: 'review', title, runId: item.rec.id, itemId: String(item.id),
        itemIds: [String(item.id)], projectId: item.ds?.name || item.rec.dsName || '', projectName: project(item.ds?.name || item.rec.dsName),
        assignee: assignment.assignee, status: '待审核', tone: 'review', h: item.rec.h,
        meta: '审核 · ' + assignment.assignee + ' · ' + this.ago(item.rec.h) };
    });
    const runs = this.runsData().map(run => {
      const states = { running: ['运行中', 'running'], success: ['已完成', 'done'], failed: ['运行失败', 'failed'], partial: ['部分失败', 'failed'], queued: ['排队中', 'neutral'] };
      const state = states[run.status] || ['待处理', 'neutral'];
      return { key: 'run:' + run.id, kind: 'run', title: run.subject || run.name, runId: run.id,
        itemIds: (run.itemIds || []).map(String), projectId: run.dsName || '', projectName: project(run.dsName),
        assignee: run.owner, status: state[0], tone: state[1], h: run.h,
        meta: '运行 · ' + run.owner + ' · ' + this.ago(run.h) };
    });
    return reviews.sort((a, b) => a.h - b.h).concat(runs.sort((a, b) => a.h - b.h));
  }

  profileTasks() {
    const identity = this.profileIdentity();
    return this.profileTaskCatalog().filter(task => {
      if (identity.key === 'lead') return true;
      if (identity.key === 'project-owner') return !!task.projectId && identity.ownedProjects.includes(task.projectId);
      if (identity.key === 'member' || identity.key === 'outsourcing') return task.assignee === identity.accountName;
      return false;
    });
  }

  profileDeliveryTasks(work = this.profileTasks()) {
    const identity = this.profileIdentity();
    if (!identity.roles.some(role => role.key === identity.key)) return [];
    const visibleItems = new Set(work.flatMap(task => task.itemIds || []));
    return this.deliveryData().flatMap(group => group.sheets).filter(sheet => {
      if (identity.key === 'lead') return true;
      if (Array.isArray(sheet.members)) return sheet.members.some(member => member.accountName === identity.accountName)
        || (identity.key === 'project-owner' && (sheet.projectIds || []).some(id => identity.ownedProjects.includes(id)));
      const itemIds = this.sheetRows(sheet).map(row => String(row[2]));
      if (itemIds.some(id => visibleItems.has(id))) return true;
      if (identity.key === 'project-owner') return (sheet.projectIds || []).some(id => identity.ownedProjects.includes(id));
      return sheet.createdBy === identity.accountName || sheet.assignee === identity.accountName || (sheet.assignees || []).includes(identity.accountName);
    }).map(sheet => ({ key: sheet.key, kind: 'delivery', title: sheet.name, customer: sheet.customer,
      itemIds: this.sheetRows(sheet).map(row => String(row[2])), target: sheet.target, passed: sheet.passed,
      meta: '已就绪 ' + sheet.passed + ' / ' + sheet.target + ' 项', actionLabel: '打开交付数据单 · ' + sheet.name,
      open: () => this.openProfileDelivery(sheet.key) }));
  }

  openProfileDelivery(key) {
    if (!this.profileDeliveryTasks().some(sheet => sheet.key === key)) return;
    this.closeProfile();
    this.setState({ view: 'sheet', sheetKey: key, sheetRow: null, sheetFilter: 'all', sheetQuery: '', sheetTagFilter: '', reviewOpen: null });
  }

  profileSkills(tasks = this.profileTasks()) {
    const result = new Map();
    this.profileDeliveryTasks(tasks).forEach(task => (this.deliverySheet(task.key)?.skills || []).forEach(skill => {
      const bindingId = task.key + ':' + skill.id;
      result.set(bindingId, Object.assign({}, skill, { bindingId, sheetKey: task.key, sheetName: task.title, taskKey: task.key }));
    }));
    const personal = this.personalProfileSkills().map(skill => Object.assign({}, skill, { personal: true, bindingId: 'personal:' + skill.id, sheetName: '个人 Skill' }));
    return personal.concat(Array.from(result.values()));
  }

  personalProfileSkills() {
    return (this.state.personalSkills || []).filter(skill => skill.owner === this.profileIdentity().accountName);
  }

  async uploadProfileSkills(files) {
    if (this.state.profileSkillDraft?.loading && this.state.profileSkillDraft.owner === this.profileIdentity().accountName) return;
    const owner = this.profileIdentity().accountName, id = 'profile-skills-' + (this._deliverySequence = (this._deliverySequence || 0) + 1);
    const previous = this.state.profileSkillDraft;
    const draft = { id, owner, skills: previous?.owner === owner && !previous.editId ? previous.skills : [], loading: true, error: '', targetSheet: '' };
    this.setState({ profileTab: 'skills', profileSkillDraft: draft, profileSkillNotice: '' });
    const additions = [], errors = [], capacity = 12 - this.personalProfileSkills().length - draft.skills.length;
    const accept = skill => { if (additions.length >= capacity) throw new Error('个人 Skill 最多保存 12 个。'); additions.push(skill); };
    for (const file of Array.from(files || []).slice(0, 13)) {
      try {
        if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('文件为空或超过 20 MB。');
        if (/\.(md|markdown)$/i.test(file.name)) {
          if (file.size > 512 * 1024) throw new Error('单个 Skill 文档不能超过 512 KB。');
          accept(this.parseUploadedSkill(await file.text(), file.name, file.name, true));
        } else if (/\.zip$/i.test(file.name)) {
          const buffer = await file.arrayBuffer(), directory = this.zipDirectory(buffer);
          const entries = directory.filter(entry => /(^|\/)SKILL\.md$/i.test(entry.path));
          if (!entries.length) throw new Error('Skill ZIP 中需要包含 SKILL.md。');
          for (const entry of entries) {
            if (additions.length >= capacity) { errors.push('个人 Skill 最多保存 12 个，其余未导入。'); break; }
            try { accept(this.parseUploadedSkill(await this.zipSkillText(buffer, entry), entry.path, file.name, true)); }
            catch (error) { errors.push(entry.path + '：' + error.message); }
          }
        } else throw new Error('请选择 .md 或包含 SKILL.md 的 ZIP 文件。');
      } catch (error) { errors.push(file.name + '：' + (error.message || '读取失败')); }
    }
    if (this.state.profileSkillDraft?.id !== id || this.profileIdentity().accountName !== owner) return;
    this.setState({ profileSkillDraft: Object.assign({}, this.state.profileSkillDraft, { skills: draft.skills.concat(additions), loading: false, error: errors.join(' ') }) });
  }

  patchProfileSkillDraft(patch) {
    const draft = this.state.profileSkillDraft;
    if (!draft || draft.owner !== this.profileIdentity().accountName || draft.loading) return;
    this.setState({ profileSkillDraft: Object.assign({}, draft, patch) });
  }

  editPersonalSkill(id) {
    const skill = this.personalProfileSkills().find(value => value.id === id);
    if (!skill || this.state.profileSkillDraft?.loading) return;
    this.setState({ profileTab: 'skills', profileSkillNotice: '', profileSkillDraft: {
      id: 'profile-skills-' + (this._deliverySequence = (this._deliverySequence || 0) + 1), owner: skill.owner,
      editId: id, skills: [Object.assign({}, skill)], loading: false, error: '', targetSheet: ''
    } });
  }

  profileSkillDraftIssue() {
    const draft = this.state.profileSkillDraft;
    if (!draft || draft.owner !== this.profileIdentity().accountName) return '请上传 Skill 文件。';
    if (draft.loading) return '正在读取文件，请稍候。';
    if (!draft.skills.length) return '请上传有效的 Skill 文件。';
    const existing = this.personalProfileSkills().filter(skill => skill.id !== draft.editId);
    if (existing.length + draft.skills.length > 12) return '个人 Skill 最多保存 12 个。';
    const commands = new Set(existing.map(skill => this.skillCommand(skill.command).toLowerCase()));
    for (const skill of draft.skills) {
      if (!String(skill.name || '').trim() || String(skill.name).trim().length > 80) return 'Skill 名称须为 1–80 字。';
      const command = this.skillCommand(skill.command);
      if (!this.validSkillCommand(command)) return '调用名须为 1–60 字，可用中英文、数字、空格、短横线和下划线。';
      if (commands.has(command.toLowerCase())) return '个人 Skill 调用名重复，请修改后保存。';
      commands.add(command.toLowerCase());
    }
    if (draft.targetSheet) {
      if (!this.profileDeliveryTasks().some(sheet => sheet.key === draft.targetSheet)) return '此数据单已不在你的任务范围内，请重新选择。';
      const bound = this.deliverySheet(draft.targetSheet)?.skills || [];
      if (bound.length + draft.skills.length > 12) return '数据单最多绑定 12 个 Skill。';
      if (draft.skills.some(skill => bound.some(value => this.skillCommand(value.command).toLowerCase() === this.skillCommand(skill.command).toLowerCase()))) return '数据单已有同名调用，请修改调用名或选择其他数据单。';
    }
    return '';
  }

  saveProfileSkills() {
    const draft = this.state.profileSkillDraft;
    if (!draft || this.profileSkillDraftIssue()) return;
    const additions = draft.skills.map(skill => Object.assign({}, skill, { name: skill.name.trim(), command: this.skillCommand(skill.command), owner: draft.owner }));
    const patch = { personalSkills: (this.state.personalSkills || []).filter(skill => !(skill.owner === draft.owner && skill.id === draft.editId)).concat(additions),
      profileSkillDraft: null, profileSkillNotice: draft.targetSheet ? 'Skill 已保存并关联到数据单。' : 'Skill 已保存，可稍后关联到数据单。' };
    if (draft.targetSheet) {
      const sheet = this.deliverySheet(draft.targetSheet), skills = (sheet.skills || []).concat(additions.map(skill => Object.assign({}, skill, { id: 'bound-' + skill.id + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1) })));
      const custom = (this.state.deliverySheets || []).slice(), index = custom.findIndex(value => value.key === sheet.key);
      if (index >= 0) { custom[index] = Object.assign({}, custom[index], { skills }); patch.deliverySheets = custom; }
      else patch.deliveryOverrides = Object.assign({}, this.state.deliveryOverrides, { [sheet.key]: Object.assign({}, this.state.deliveryOverrides?.[sheet.key], { skills }) });
    }
    this.setState(patch);
  }

  canEditProfileIdentity() {
    return ['lead', 'project-owner'].includes(this.profileIdentity().key);
  }

  profileEditableRoles() {
    const identity = this.profileIdentity();
    return this.canEditProfileIdentity() ? identity.roles.filter(role => identity.key === 'lead' || role.key !== 'lead') : [];
  }

  editProfileIdentity() {
    if (!this.canEditProfileIdentity()) return;
    const identity = this.profileIdentity();
    this.setState({ profileIdentityDraft: { accountName: identity.accountName, name: identity.name, role: identity.key } });
  }

  profileIdentityIssue() {
    const draft = this.state.profileIdentityDraft, identity = this.profileIdentity();
    if (!draft || draft.accountName !== identity.accountName || !this.canEditProfileIdentity()) return '当前账号不可编辑个人资料。';
    if (!String(draft.name || '').trim() || String(draft.name).trim().length > 40) return '姓名须为 1–40 字。';
    if (!this.profileEditableRoles().some(role => role.key === draft.role)) return '当前账号不能设置此角色。';
    return '';
  }

  saveProfileIdentity() {
    if (this.profileIdentityIssue()) return;
    const draft = this.state.profileIdentityDraft;
    this.setState({ profileNameOverrides: Object.assign({}, this.state.profileNameOverrides, { [draft.accountName]: draft.name.trim() }),
      profileRoleOverrides: Object.assign({}, this.state.profileRoleOverrides, { [draft.accountName]: draft.role }), profileIdentityDraft: null });
  }

  syncProfilePopover(event) {
    const open = event.newState === 'open';
    const patch = { profileOpen: open };
    if (!open) patch.profileIdentityDraft = null;
    if (open) {
      patch.dlOpen = false; patch.notifOpen = false;
      if (typeof window !== 'undefined' && window.matchMedia?.('(max-width:760px)').matches) patch.sidebarCollapsed = true;
    }
    this.setState(patch);
  }

  closeProfile() {
    if (typeof document !== 'undefined') {
      const panel = document.getElementById('forge-profile-panel');
      if (panel?.matches(':popover-open')) panel.hidePopover();
    }
    this.setState({ profileOpen: false, profileIdentityDraft: null });
  }

  collapseProfileForViewport() {
    if (this.state.profileOpen && !this.state.sidebarCollapsed && typeof window !== 'undefined' && window.matchMedia?.('(max-width:760px)').matches) {
      this.setState({ sidebarCollapsed: true });
    }
  }

  openProfileTask(key) {
    const task = this.profileTasks().find(value => value.key === key);
    if (!task) return;
    this.closeProfile();
    if (task.kind === 'review') {
      this.openReview(task.runId, { reviewOwner: 'all', reviewOrigin: 'top', deepReview: { itemId: task.itemId, runId: task.runId } });
    } else this.setState({ view: 'run', activeRun: task.runId, runItem: null });
  }

  openProfileSkill(bindingId) {
    const skill = this.profileSkills().find(value => value.bindingId === bindingId);
    if (!skill) return;
    if (skill.personal) this.editPersonalSkill(skill.id);
    else this.openProfileDelivery(skill.sheetKey);
  }

  profileValues() {
    const identity = this.profileIdentity(), work = this.state.profileOpen ? this.profileTasks() : [], tasks = this.state.profileOpen ? this.profileDeliveryTasks(work) : [], skills = this.state.profileOpen ? this.profileSkills(work) : [];
    const draft = this.state.profileSkillDraft?.owner === identity.accountName ? this.state.profileSkillDraft : null;
    const issue = draft ? this.profileSkillDraftIssue() : '';
    const identityDraft = this.canEditProfileIdentity() && this.state.profileIdentityDraft?.accountName === identity.accountName ? this.state.profileIdentityDraft : null;
    const showTasks = this.state.profileTab !== 'skills';
    return {
      open: !!this.state.profileOpen, name: identity.name, initial: Array.from(identity.name)[0] || '', roleLabel: identity.label, roleName: identity.roleName, scope: identity.scope,
      canEditIdentity: this.canEditProfileIdentity(), editIdentity: () => this.editProfileIdentity(), editingIdentity: !!identityDraft,
      editing: !!identityDraft || !!draft,
      identityName: identityDraft?.name || '', identityRole: identityDraft?.role || '', identityIssue: identityDraft ? this.profileIdentityIssue() : '',
      identitySaveDisabled: !identityDraft || !!this.profileIdentityIssue(), identityRoles: this.profileEditableRoles(),
      onIdentityName: event => { if (identityDraft && this.canEditProfileIdentity()) this.setState({ profileIdentityDraft: Object.assign({}, identityDraft, { name: event.target.value }) }); },
      onIdentityRole: event => { if (identityDraft && this.canEditProfileIdentity()) this.setState({ profileIdentityDraft: Object.assign({}, identityDraft, { role: event.target.value }) }); },
      saveIdentity: () => this.saveProfileIdentity(), cancelIdentity: () => this.setState({ profileIdentityDraft: null }),
      showTasks, showSkills: !showTasks, taskCount: tasks.length, skillCount: skills.length, noTasks: !tasks.length, noSkills: !skills.length && !draft,
      taskHint: tasks.length + ' 份交付数据单 · 点击进入查看和审核',
      emptyTaskHint: '暂无与你相关的交付数据单，分配后会显示在这里。',
      tasks,
      skills: skills.map(skill => Object.assign({}, skill, { commandLabel: '/' + skill.command, description: skill.description || skill.name,
        displayName: skill.name || skill.command, fileLabel: skill.filename || skill.sourceFile || 'Skill 文件', action: skill.personal ? '命名 / 关联' : '查看数据单',
        actionLabel: (skill.personal ? '命名或关联 · ' : '查看数据单 · ') + skill.name,
        open: () => this.openProfileSkill(skill.bindingId) })),
      uploadDisabled: !!draft?.loading || this.personalProfileSkills().length >= 12,
      uploadSkills: event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length) this.uploadProfileSkills(files); },
      notice: this.state.profileSkillNotice || '', hasDraft: !!draft, draftLoading: !!draft?.loading, draftError: draft?.error || '', draftIssue: issue,
      draftSaveDisabled: !!issue, draftSaveLabel: draft?.targetSheet ? '保存并关联' : '保存 Skill',
      draftSkills: (draft?.skills || []).map(skill => Object.assign({}, skill, {
        nameLabel: skill.filename + ' 的 Skill 名称', commandLabel: skill.filename + ' 的调用名',
        onName: event => this.patchProfileSkillDraft({ skills: this.state.profileSkillDraft.skills.map(value => value.id === skill.id ? Object.assign({}, value, { name: event.target.value }) : value) }),
        onCommand: event => this.patchProfileSkillDraft({ skills: this.state.profileSkillDraft.skills.map(value => value.id === skill.id ? Object.assign({}, value, { command: event.target.value }) : value) }),
        remove: () => this.patchProfileSkillDraft({ skills: this.state.profileSkillDraft.skills.filter(value => value.id !== skill.id) })
      })),
      targetSheet: draft?.targetSheet || '', targetSheets: tasks.map(task => ({ key: task.key, label: task.title })),
      onTargetSheet: event => this.patchProfileSkillDraft({ targetSheet: event.target.value }),
      saveSkills: () => this.saveProfileSkills(), cancelSkills: () => this.setState({ profileSkillDraft: null }),
      pickTasks: () => this.setState({ profileTab: 'tasks' }), pickSkills: () => this.setState({ profileTab: 'skills' })
    };
  }
  // profile-workspace:end
