  // delivery-skill-workspace:start
  deliverySkillActorMatches(editor = this.state.deliveryEditor) {
    return !!editor && editor.memberActor === this.profileIdentity().accountName;
  }

  openDeliverySkillDetail(key, id, event) {
    const editor = this.state.deliveryEditor;
    if (editor?.id !== id || !this.deliverySkillActorMatches(editor) || !this.deliverySkillLibraryValues(true).rows.some(row => row.key === key)) return;
    this._deliverySkillDetailTrigger = event?.currentTarget || (typeof document !== 'undefined' ? document.activeElement : null);
    this.patchDeliveryEditor({ skillDetailKey: key }, id);
    setTimeout(() => {
      if (typeof document === 'undefined' || this.state.deliveryEditor?.id !== id || this.state.deliveryEditor.skillDetailKey !== key) return;
      const dialog = document.querySelector('dialog.forge-delivery-skill-detail');
      if (dialog && !dialog.open) dialog.showModal();
    }, 0);
  }

  closeDeliverySkillDetail(event, restoreFocus = true) {
    event?.preventDefault(); event?.stopPropagation();
    const editor = this.state.deliveryEditor;
    if (!editor?.skillDetailKey) return;
    const trigger = this._deliverySkillDetailTrigger;
    if (typeof document !== 'undefined') document.querySelector('dialog.forge-delivery-skill-detail')?.close();
    this._deliverySkillDetailTrigger = null;
    this.patchDeliveryEditor({ skillDetailKey: '' }, editor.id);
    if (restoreFocus) setTimeout(() => {
      if (typeof document === 'undefined' || this.state.deliveryEditor?.id !== editor.id || this.state.deliveryEditor.skillDetailKey) return;
      (trigger?.isConnected ? trigger : document.getElementById('forge-delivery-skill-search'))?.focus({ preventScroll: true });
    }, 0);
  }

  deliverySkillContentBlocks(content) {
    // Render structural Markdown as bound text, never HTML or executable instructions.
    const blocks = [], lines = String(content || '').replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [], list = [], code = null;
    const flush = () => {
      if (paragraph.length) blocks.push({ paragraph: true, text: paragraph.join('\n') });
      if (list.length) blocks.push({ list: true, items: list });
      paragraph = []; list = [];
    };
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        flush();
        if (code !== null) { blocks.push({ code: true, text: code.join('\n') }); code = null; }
        else code = [];
      } else if (code !== null) code.push(line);
      else if (!line.trim()) flush();
      else if (/^#{1,6}\s+/.test(line)) { flush(); blocks.push({ heading: true, text: line.replace(/^#{1,6}\s+/, '') }); }
      else if (/^\s*[-*+]\s+/.test(line)) { if (paragraph.length) flush(); list.push(line.replace(/^\s*[-*+]\s+/, '')); }
      else { if (list.length) flush(); paragraph.push(line); }
    }
    flush();
    if (code !== null) blocks.push({ code: true, text: code.join('\n') });
    return blocks.length ? blocks : [{ paragraph: true, text: '此 Skill 暂无指令内容。' }];
  }

  deliverySkillDetailValues() {
    const editor = this.state.deliveryEditor;
    if (!editor?.skillDetailKey) return { open: false, blocks: [] };
    const row = this.deliverySkillLibraryValues(true).rows.find(value => value.key === editor.skillDetailKey);
    if (!row) return { open: true, name: 'Skill 已不可用', description: '此 Skill 的来源已变更，请关闭详情并重新选择。', blocks: [], close: event => { if (this.state.deliveryEditor?.id === editor.id) this.closeDeliverySkillDetail(event); } };
    return Object.assign({}, row, { open: true, blocks: this.deliverySkillContentBlocks(row.content),
      close: event => { if (this.state.deliveryEditor?.id === editor.id && this.state.deliveryEditor.skillDetailKey === row.key) this.closeDeliverySkillDetail(event); } });
  }

  deliverySkillDraftDirty(editor = this.state.deliveryEditor) {
    return ['name', 'command', 'description', 'content'].some(key => String(editor?.skillDraft?.[key] || '').trim());
  }

  focusDeliverySkillControl(id, target) {
    setTimeout(() => {
      if (typeof document !== 'undefined' && this.state.deliveryEditor?.id === id)
        document.getElementById(target)?.focus({ preventScroll: !!this.state.deliveryEditor.key });
    }, 0);
  }

  setDeliverySkillMode(mode, id) {
    const editor = this.state.deliveryEditor;
    if (!this.deliverySkillActorMatches(editor) || editor.id !== id || editor.skillLoading) return;
    if (!['existing', 'choose', 'create', 'upload'].includes(mode)) return;
    // Older local drafts may contain the former full-page chooser mode.
    if (mode === 'choose') mode = 'existing';
    if (typeof document !== 'undefined') {
      const popover = document.getElementById('forge-skill-create-menu');
      if (popover?.matches(':popover-open')) popover.hidePopover();
    }
    this.patchDeliveryEditor({ skillMode: mode, skillError: '', skillNotice: '', error: '' }, id);
    this.focusDeliverySkillControl(id, { existing: 'forge-skill-create-trigger', create: 'forge-skill-create-name', upload: 'forge-skill-upload-input' }[mode]);
  }

  patchDeliverySkillDraft(patch, id) {
    const editor = this.state.deliveryEditor;
    if (!this.deliverySkillActorMatches(editor) || editor.id !== id || editor.skillLoading) return;
    this.patchDeliveryEditor({ skillDraft: Object.assign({}, editor.skillDraft, patch), skillError: '', error: '' }, id);
  }

  deliverySkillDefinitionIssue(skill) {
    if (!String(skill.name || '').trim() || String(skill.name).trim().length > 80) return '请填写 1–80 字的 Skill 名称。';
    if (!this.validSkillCommand(this.skillCommand(skill.command))) return '调用名须为 1–60 字，可用中英文、数字、空格、短横线或下划线。';
    if (!String(skill.content || '').trim()) return '请填写 Skill 指令。';
    if (String(skill.content).includes('\0') || new TextEncoder().encode(skill.content).length > 512 * 1024) return '指令须为文本，且不能超过 512 KB。';
    if (String(skill.description || '').length > 300) return '描述不能超过 300 字。';
    return '';
  }

  deliverySkillPublishPlan(skills, editor = this.state.deliveryEditor) {
    // No writes here: publish to the platform list and personal library atomically.
    if (!this.deliverySkillActorMatches(editor)) return { issue: '账号已切换，请重新打开数据单。' };
    if (editor.skillLoading) return { issue: '文件正在读取，请稍候。' };
    if (!skills.length) return { issue: '请先上传有效的 Skill 文件。' };
    const catalog = this.platformSkillCatalog(), mine = this.personalProfileSkills();
    const platformAdditions = [], personalAdditions = [], ids = new Set();
    for (const skill of skills) {
      const issue = this.deliverySkillDefinitionIssue(skill);
      if (issue) return { issue: String(skill.name || skill.filename || 'Skill') + '：' + issue };
      const command = this.skillCommand(skill.command), normalized = command.toLowerCase();
      const matches = catalog.concat(platformAdditions, mine, personalAdditions).filter(value => this.skillCommand(value.command).toLowerCase() === normalized);
      if (matches.some(value => value.content !== skill.content)) return { issue: '/' + command + ' 已存在且内容不同，请修改调用名，或返回选择已有 Skill。' };
      let platform = catalog.concat(platformAdditions).find(value => this.skillCommand(value.command).toLowerCase() === normalized && value.content === skill.content);
      if (!platform) {
        platform = Object.assign({}, skill, { name: skill.name.trim(), command, owner: editor.memberActor, example: false });
        delete platform.personalPending; delete platform.personalSkillId; delete platform.libraryKey;
        platformAdditions.push(platform);
      }
      if (!mine.concat(personalAdditions).some(value => this.skillCommand(value.command).toLowerCase() === normalized && value.content === skill.content)) {
        personalAdditions.push(Object.assign({}, platform, { owner: editor.memberActor, libraryKey: 'platform:' + platform.id }));
      }
      ids.add('platform:' + platform.id);
    }
    if (mine.length + personalAdditions.length > 12) return { issue: '个人 Skill 最多保存 12 个。请先整理个人 Skill，或返回选择已有 Skill。' };
    return { issue: '', platformSkills: (this.state.createdPlatformSkills || []).concat(platformAdditions),
      personalSkills: (this.state.personalSkills || []).concat(personalAdditions), count: ids.size, created: platformAdditions.length, ids: Array.from(ids) };
  }

  deliverySkillCreateIssue() {
    const editor = this.state.deliveryEditor, draft = editor?.skillDraft || {};
    if (String(draft.content || '').length > 20000) return '指令不能超过 20000 字。';
    return this.deliverySkillPublishPlan([draft], editor).issue;
  }

  publishDeliverySkillDefinitions(skills, id, source = 'create') {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.id !== id) return;
    const plan = this.deliverySkillPublishPlan(skills, editor);
    if (plan.issue) { this.patchDeliveryEditor({ skillError: plan.issue }, id); return; }
    this.setState({ createdPlatformSkills: plan.platformSkills, personalSkills: plan.personalSkills,
      profileSkillNotice: 'Skill 已同步到平台列表和个人 Skill。',
      deliveryEditor: Object.assign({}, editor, { skillDraft: source === 'create' ? {} : editor.skillDraft, skillUploads: source === 'upload' ? [] : editor.skillUploads, skillMode: 'existing', skillQuery: '', skillError: '', error: '',
        skillNotice: (plan.created ? '已创建 ' + plan.created + ' 个 Skill' : '相同内容已存在，已复用') + '，已同步到平台列表和个人 Skill。请在列表中勾选本单需要的 Skill。' }) });
    this.focusDeliverySkillControl(id, 'forge-delivery-skill-search');
  }

  createDeliverySkill() {
    const editor = this.state.deliveryEditor;
    if (!editor) return;
    const issue = this.deliverySkillCreateIssue();
    if (issue) { this.patchDeliveryEditor({ skillError: issue }); return; }
    const draft = editor.skillDraft;
    const skill = Object.assign({}, draft, {
      id: 'skill-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1),
      filename: 'SKILL.md', size: new TextEncoder().encode(draft.content).length
    });
    this.publishDeliverySkillDefinitions([skill], editor.id);
  }

  deliverySkillPersonalIssue(skill) {
    return !String(skill.name || '').trim() ? 'Skill 名称不能为空。' : '';
  }

  deliverySkillSavePlan(editor = this.state.deliveryEditor) {
    if (!this.deliverySkillActorMatches(editor)) return { issue: '账号已切换，请重新打开数据单。' };
    // Saving a sheet commits only its selected snapshots, never creates library records.
    return { issue: '', skills: editor.skills.map(skill => Object.assign({}, skill, { command: this.skillCommand(skill.command) })),
      personalSkills: this.state.personalSkills || [], createdCount: 0 };
  }

  deliverySkillWorkspaceValues() {
    const editor = this.state.deliveryEditor;
    if (!editor) return {};
    const id = editor.id, draft = editor.skillDraft || {}, mode = editor.skillMode || 'existing', uploads = editor.skillUploads || [];
    const issue = this.deliverySkillCreateIssue(), locked = editor.skillLoading || !this.deliverySkillActorMatches(editor);
    const dirty = this.deliverySkillDraftDirty(editor), uploadIssue = this.deliverySkillPublishPlan(uploads, editor).issue;
    const discard = patch => {
      if (this.state.deliveryEditor?.id === id && this.deliverySkillActorMatches() && !this.state.deliveryEditor.skillLoading)
        this.patchDeliveryEditor(Object.assign({ skillError: '', skillNotice: '', error: '' }, patch), id);
    };
    const mutateUploads = change => {
      if (this.state.deliveryEditor?.id === id && this.deliverySkillActorMatches() && !this.state.deliveryEditor.skillLoading)
        this.patchDeliveryEditor({ skillUploads: change(this.state.deliveryEditor.skillUploads || []), skillError: '', skillNotice: '', error: '' }, id);
    };
    return Object.assign({}, draft, {
      name: draft.name || '', command: draft.command || '', description: draft.description || '', content: draft.content || '',
      existing: mode === 'existing' || mode === 'choose', creating: mode === 'create', uploading: mode === 'upload', subpage: mode === 'create' || mode === 'upload', locked,
      start: () => this.setDeliverySkillMode('choose', id), write: () => this.setDeliverySkillMode('create', id), upload: () => this.setDeliverySkillMode('upload', id),
      back: () => this.setDeliverySkillMode('existing', id), choose: () => this.setDeliverySkillMode('choose', id),
      dirty, hiddenDraft: (mode === 'existing' || mode === 'choose') && (dirty || uploads.length > 0), createDisabled: !!issue, createIssue: issue,
      discard: () => discard({ skillDraft: {}, skillUploads: [] }), discardForm: () => discard({ skillDraft: {} }), discardUploads: () => discard({ skillUploads: [] }),
      onName: event => { const value = event.target.value; this.patchDeliverySkillDraft(Object.assign({ name: value }, this.state.deliveryEditor?.skillDraft?.commandTouched ? {} : { command: this.skillCommand(value).slice(0, 60) }), id); },
      onCommand: event => this.patchDeliverySkillDraft({ command: event.target.value.replace(/^\/+/, ''), commandTouched: true }, id),
      onDescription: event => this.patchDeliverySkillDraft({ description: event.target.value }, id),
      onContent: event => this.patchDeliverySkillDraft({ content: event.target.value }, id),
      create: () => { if (this.state.deliveryEditor?.id === id) this.createDeliverySkill(); },
      uploadDisabled: locked || uploads.length >= 12, uploadCount: uploads.length, hasUploads: !!uploads.length,
      uploadIssue, publishDisabled: !!uploadIssue,
      publishUploads: () => { if (this.state.deliveryEditor?.id === id) this.publishDeliverySkillDefinitions(this.state.deliveryEditor.skillUploads || [], id, 'upload'); },
      uploads: uploads.map(skill => Object.assign({}, skill, {
        onName: event => mutateUploads(values => values.map(value => value.id === skill.id ? Object.assign({}, value, { name: event.target.value }) : value)),
        onCommand: event => mutateUploads(values => values.map(value => value.id === skill.id ? Object.assign({}, value, { command: event.target.value.replace(/^\/+/, '') }) : value)),
        remove: () => mutateUploads(values => values.filter(value => value.id !== skill.id)),
        nameLabel: skill.filename + ' 的 Skill 名称', commandLabel: skill.filename + ' 的调用名', removeLabel: '移除文件 ' + skill.filename
      })),
      dragOver: event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = locked || uploads.length >= 12 ? 'none' : 'copy'; },
      drop: event => { event.preventDefault(); event.stopPropagation(); if (!locked && this.state.deliveryEditor?.id === id) return this.uploadDeliverySkills(Array.from(event.dataTransfer?.files || [])); }
    });
  }
  // delivery-skill-workspace:end
