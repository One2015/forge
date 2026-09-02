  // delivery-skill-library:start
  platformSkillCatalog() {
    // A supplied catalog replaces these explicitly labelled local examples.
    const examples = [
      { id: 'demo-3d-trajectory', name: '3D 轨迹评估', command: '3d trajectory', description: '检查相机路径、视角覆盖与运动连续性。', content: '# 3D 轨迹评估（示例）\n\n1. 核对相机路径与交付要求。\n2. 检查主体是否完整入镜、是否存在遮挡。\n3. 检查转场、速度与轨迹连续性。\n4. 按观察到的证据列出问题；缺少轨迹资料时明确标注无法判断。\n\n仅作为审核说明示例，不自动生成分数或通过结论。' },
      { id: 'demo-model-quality', name: '3D 模型质量检查', command: 'model quality', description: '检查结构比例、模型完整性与材质细节。', content: '# 3D 模型质量检查（示例）\n\n对照客户参考资料检查结构比例、几何完整性、贴图与材质。记录问题位置和依据，区分已确认问题与缺少资料的检查项。最终审核由审核员决定。' },
      { id: 'demo-web-review', name: 'Web 界面检查', command: 'web review', description: '检查页面布局、响应式表现和交互状态。', content: '# Web 界面检查（示例）\n\n检查主要任务能否完成、内容是否溢出、文字是否可读、交互是否有明确状态。分别记录桌面与窄屏的观察证据。未经实际操作的功能标注为未验证，不假设已经通过。' }
    ].map(skill => Object.assign({}, skill, { version: '1.0', example: true }));
    const catalog = Array.isArray(this.props.platformSkills) ? this.props.platformSkills : examples;
    return catalog.filter(skill => skill && skill.id && skill.available !== false);
  }

  deliverySkillIdentity(skill) {
    return skill.libraryKey || '';
  }

  deliverySkillLibrary() {
    const result = [], keys = new Set();
    const add = (skill, key, sourceLabel) => {
      if (!skill || keys.has(key) || !String(skill.content || '').trim()) return;
      const command = this.skillCommand(skill.command), content = String(skill.content);
      if (!this.validSkillCommand(command) || new TextEncoder().encode(content).length > 512 * 1024) return;
      keys.add(key);
      result.push(Object.assign({}, skill, { libraryKey: key, command, content, sourceLabel,
        name: String(skill.name || command), description: String(skill.description || ''),
        version: String(skill.version || ''), size: new TextEncoder().encode(content).length,
        sourceFile: skill.sourceFile || skill.filename || 'SKILL.md' }));
    };
    this.platformSkillCatalog().forEach(skill => add(skill, 'platform:' + skill.id, skill.example ? '平台示例' : '平台 Skill'));
    this.personalProfileSkills().forEach(skill => add(skill, 'personal:' + skill.owner + ':' + skill.id, '我的 Skill'));
    this.profileDeliveryTasks().forEach(task => (this.deliverySheet(task.key)?.skills || []).forEach(skill => {
      add(skill, this.deliverySkillIdentity(skill) || 'sheet:' + task.key + ':' + skill.id, '数据单 · ' + task.title);
    }));
    return result;
  }

  deliverySkillSelection(skill, editor = this.state.deliveryEditor) {
    return (editor?.skills || []).find(value => this.deliverySkillIdentity(value) === skill.libraryKey ||
      (value.content === skill.content && this.skillCommand(value.command).toLowerCase() === skill.command.toLowerCase()));
  }

  toggleDeliveryLibrarySkill(key) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.skillLoading) return;
    const skill = this.deliverySkillLibrary().find(value => value.libraryKey === key);
    if (!skill) { this.patchDeliveryEditor({ skillError: '此 Skill 已不可用，请搜索其他 Skill。' }); return; }
    const selected = this.deliverySkillSelection(skill, editor);
    if (selected) { this.removeDeliverySkill(selected.id); return; }
    if (editor.skills.length >= 12) { this.patchDeliveryEditor({ skillError: '最多绑定 12 个 Skill，请先移除一个。' }); return; }
    const used = new Set(editor.skills.map(value => this.skillCommand(value.command).toLowerCase()));
    let command = skill.command, suffix = 2;
    while (used.has(command.toLowerCase())) {
      const tail = '-' + suffix++;
      command = skill.command.slice(0, 60 - tail.length).trimEnd() + tail;
    }
    const binding = Object.assign({}, skill, {
      id: 'bound-skill-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1), command
    });
    this.patchDeliveryEditor({ skills: editor.skills.concat(binding), skillError: '',
      skillNotice: command === skill.command ? '已选择「' + skill.name + '」，保存数据单后生效。' :
        '已选择「' + skill.name + '」。调用名重复，已使用 /' + command + '，可在下方修改。' });
  }

  removeDeliverySkill(id) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.skillLoading) return;
    const skill = editor.skills.find(value => value.id === id);
    if (!skill) return;
    this.patchDeliveryEditor({ skills: editor.skills.filter(value => value.id !== id), skillError: '', skillNotice: '已移除「' + skill.name + '」。' });
  }

  deliverySkillLibraryValues() {
    const editor = this.state.deliveryEditor;
    if (!editor) return { rows: [], query: '', count: 0, empty: true };
    const catalog = this.deliverySkillLibrary();
    const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim().replace(/^\/+/, '').trim();
    const words = normalize(editor.skillQuery).split(/\s+/).filter(Boolean);
    const matches = catalog.filter(skill => {
      const text = normalize([skill.name, skill.command, skill.description, skill.sourceLabel].join(' '));
      return words.every(word => text.includes(word));
    });
    const full = editor.skills.length >= 12;
    return { query: editor.skillQuery || '', count: matches.length, empty: !matches.length,
      emptyTitle: catalog.length ? '没有找到匹配的 Skill' : '暂无可用 Skill',
      emptyHelp: catalog.length ? '试试其他名称或调用名，也可以在下方上传文件。' : '可以先上传文件，或在个人资料中保存 Skill 后再来选择。',
      onSearch: event => this.patchDeliveryEditor({ skillQuery: event.target.value }),
      clear: () => {
        this.patchDeliveryEditor({ skillQuery: '' });
        setTimeout(() => { if (typeof document !== 'undefined' && this.state.deliveryEditor?.id === editor.id) document.getElementById('forge-delivery-skill-search')?.focus({ preventScroll: true }); }, 0);
      }, hasQuery: !!editor.skillQuery,
      limitNote: full ? '已选满 12 个，移除后可继续添加。' : '',
      rows: matches.map(skill => {
        const selected = !!this.deliverySkillSelection(skill, editor), meta = skill.sourceLabel + (skill.version ? ' · v' + skill.version : '');
        return { key: skill.libraryKey, name: skill.name, command: '/' + skill.command, description: skill.description,
          meta, descriptionId: 'forge-library-description-' + encodeURIComponent(skill.libraryKey), selected, unselected: !selected,
          disabled: !!editor.skillLoading || (!selected && full), action: selected ? '已选择' : '选择',
          actionLabel: skill.name + '，/' + skill.command + '，' + meta,
          toggle: () => this.toggleDeliveryLibrarySkill(skill.libraryKey) };
      })
    };
  }
  // delivery-skill-library:end
