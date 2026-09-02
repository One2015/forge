  // delivery-members:start
  deliveryMemberRoles() {
    return [
      { key: 'owner', label: 'Owner', description: '负责数据单与成员管理' },
      { key: 'reviewer', label: 'Reviewer', description: '负责审核与反馈' },
      { key: 'member', label: 'Member', description: '参与生产与迭代' },
      { key: 'outsourcing', label: 'Outsourcing', description: '外包协作人员' }
    ];
  }

  deliverySheetMembers(sheet) {
    if (Array.isArray(sheet?.members)) return sheet.members.map(member => Object.assign({}, member));
    const members = [];
    const owner = sheet?.createdBy || sheet?.ownerAccount;
    if (owner) members.push({ accountName: owner, name: owner, role: 'owner' });
    for (const name of [sheet?.assignee, ...(sheet?.assignees || [])].filter(Boolean)) {
      if (!members.some(member => member.accountName === name)) members.push({ accountName: name, name, role: 'member' });
    }
    return members;
  }

  canManageDeliveryMembers(sheet) {
    const identity = this.profileIdentity();
    if (identity.key === 'lead') return true;
    if (!sheet) return false;
    if (this.deliverySheetMembers(sheet).some(member => member.accountName === identity.accountName && member.role === 'owner')) return true;
    return identity.key === 'project-owner' && (sheet.projectIds || []).some(id => identity.ownedProjects.includes(id));
  }

  deliveryMemberDirectory() {
    const identity = this.profileIdentity(), people = new Map();
    const add = value => {
      const person = typeof value === 'string' ? { accountName: value, name: value } : value;
      if (!person || typeof person.accountName !== 'string' || !person.accountName.trim()) return;
      const accountName = person.accountName.trim();
      if (!people.has(accountName)) people.set(accountName, { accountName, name: String(person.name || accountName), detail: String(person.detail || '') });
    };
    add({ accountName: identity.accountName, name: identity.name });
    if (Array.isArray(this.props.memberDirectory)) this.props.memberDirectory.forEach(add);
    else this.profileTaskCatalog().forEach(task => add(task.assignee));
    return Array.from(people.values());
  }

  deliveryMemberSignature(members) {
    return JSON.stringify(members.map(member => [member.accountName, member.name, member.role]).sort((a, b) => a[0].localeCompare(b[0])));
  }

  deliveryMembersEditable(editor = this.state.deliveryEditor) {
    if (!editor || editor.memberActor !== this.profileIdentity().accountName) return false;
    return !editor.key || this.canManageDeliveryMembers(this.deliverySheet(editor.key));
  }

  deliveryMembersIssue() {
    const editor = this.state.deliveryEditor;
    if (!editor) return '';
    if (editor.memberActor !== this.profileIdentity().accountName) return '当前账号已变更，请关闭后重新打开数据单。';
    const current = editor.key ? this.deliverySheet(editor.key) : null;
    if (editor.key && !current) return '数据单已不存在，请关闭后重新打开。';
    const changed = this.deliveryMemberSignature(editor.members) !== editor.memberBaseline;
    if (editor.key && !changed) return '';
    if (!this.deliveryMembersEditable(editor)) return '你不再拥有成员管理权限，请关闭后重新打开数据单。';
    if (current && this.deliveryMemberSignature(this.deliverySheetMembers(current)) !== editor.memberBaseline) return '成员配置已更新，请关闭后重新打开，避免覆盖其他修改。';
    if (!editor.members.some(member => member.role === 'owner')) return '至少保留一位 Owner，请先指定新的负责人。';
    if (editor.members.length > 50) return '一张数据单最多添加 50 位成员。';
    const accounts = new Set(), roles = new Set(this.deliveryMemberRoles().map(role => role.key));
    const available = new Set(this.deliveryMemberDirectory().map(person => person.accountName));
    this.deliverySheetMembers(current).forEach(member => available.add(member.accountName));
    for (const member of editor.members) {
      if (!available.has(member.accountName)) return '有成员已不在人员列表中，请移除后重新选择。';
      if (!roles.has(member.role)) return '请选择有效的数据单角色。';
      if (accounts.has(member.accountName)) return '同一个人不能重复添加。';
      accounts.add(member.accountName);
    }
    return '';
  }

  updateDeliveryMember(accountName, action, role, editorId) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.id !== editorId || !this.deliveryMembersEditable(editor)) return;
    const members = editor.members.map(member => Object.assign({}, member));
    const index = members.findIndex(member => member.accountName === accountName);
    if (action === 'add') {
      const person = this.deliveryMemberDirectory().find(value => value.accountName === accountName);
      if (!person || index >= 0 || members.length >= 50) return;
      members.push({ accountName, name: person.name, role: 'member' });
    } else {
      if (index < 0 || (action !== 'remove' && action !== 'role')) return;
      if (members[index].role === 'owner' && members.filter(member => member.role === 'owner').length === 1 && (action === 'remove' || role !== 'owner')) {
        this.patchDeliveryEditor({ memberNotice: '请先将另一位成员设为 Owner，再移除或更改这位负责人。' }, editorId); return;
      }
      if (action === 'remove') members.splice(index, 1);
      else {
        if (!this.deliveryMemberRoles().some(value => value.key === role)) return;
        members[index].role = role;
      }
    }
    const person = members.find(member => member.accountName === accountName);
    const label = this.deliveryMemberRoles().find(value => value.key === person?.role)?.label;
    this.patchDeliveryEditor({ members, memberNotice: action === 'remove' ? '已移除 ' + accountName + '，保存后生效。' : (person?.name || accountName) + ' 已设为 ' + label + '，保存后生效。', error: '' }, editorId);
  }

  deliveryMembersValues() {
    const editor = this.state.deliveryEditor;
    if (!editor) return { rows: [], results: [], editable: false };
    const editable = this.deliveryMembersEditable(editor), roles = this.deliveryMemberRoles();
    const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim();
    const query = normalize(editor.memberQuery), tokens = query.split(/\s+/).filter(Boolean);
    const matches = this.deliveryMemberDirectory().filter(person => tokens.every(token => normalize(person.name + ' ' + person.accountName + ' ' + person.detail).includes(token)));
    return {
      editable, readonly: !editable, query: editor.memberQuery, count: editor.members.length,
      showResults: editable && !!query, resultCount: matches.length, noResults: !matches.length,
      directoryHelp: Array.isArray(this.props.memberDirectory) ? '从平台人员列表搜索；新增成员默认为 Member。' : '搜索当前演示中的人员；新增成员默认为 Member。',
      scope: !editor.key ? '你是这张数据单的 Owner，可分配成员。角色仅在本单内生效。' : '角色仅在本单内生效，不改变账号的全局角色。',
      notice: editor.memberNotice, empty: !editor.members.length,
      onSearch: event => this.patchDeliveryEditor({ memberQuery: event.target.value }, editor.id),
      clear: () => { this.patchDeliveryEditor({ memberQuery: '' }, editor.id); setTimeout(() => {
        if (this.state.deliveryEditor?.id === editor.id && typeof document !== 'undefined') document.querySelector('#forge-delivery-member-search')?.focus();
      }, 0); },
      results: matches.slice(0, 12).map(person => {
        const selected = editor.members.some(member => member.accountName === person.accountName);
        return Object.assign({}, person, { selected, unselected: !selected, initial: Array.from(person.name)[0],
          meta: person.detail || (person.name !== person.accountName ? person.accountName : '平台成员'),
          label: (selected ? '已添加 ' : '添加 ') + person.name + ' · ' + person.accountName,
          action: selected ? '已添加' : '添加', disabled: selected || editor.members.length >= 50,
          add: () => this.updateDeliveryMember(person.accountName, 'add', null, editor.id) });
      }),
      more: matches.length > 12 ? '仅展示前 12 位，请输入更完整的姓名缩小范围。' : '',
      rows: editor.members.map(member => {
        const role = roles.find(value => value.key === member.role), lastOwner = member.role === 'owner' && editor.members.filter(value => value.role === 'owner').length === 1;
        return Object.assign({}, member, { initial: Array.from(member.name || member.accountName)[0], me: member.accountName === this.profileIdentity().accountName,
          roleLabel: role?.label || '待配置', description: role?.description || '请指定角色', roleOptions: roles,
          roleDisabled: !editable || lastOwner, removeDisabled: !editable || lastOwner,
          hint: lastOwner ? '至少保留一位 Owner；请先指定另一位 Owner。' : '角色仅对当前数据单生效',
          roleAriaLabel: '设置 ' + member.name + ' 的数据单角色', removeLabel: '移除成员 ' + member.name,
          onRole: event => this.updateDeliveryMember(member.accountName, 'role', event.target.value, editor.id),
          remove: () => this.updateDeliveryMember(member.accountName, 'remove', null, editor.id) });
      })
    };
  }
  // delivery-members:end
