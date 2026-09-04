  // delivery-members:start
  deliveryMemberRoles() {
    return [
      { key: 'owner', label: '所有者', description: '负责数据单与成员管理' },
      { key: 'reviewer-forge', label: 'Reviewer-Forge', description: '平台审核与反馈' },
      { key: 'reviewer-outsourcing', label: 'Reviewer-Outsourcing', description: '外包审核与反馈' }
    ];
  }

  deliverySheetMembers(sheet) {
    if (Array.isArray(sheet?.members)) return sheet.members.map(member => Object.assign({}, member, {
      role: ({ reviewer: 'reviewer-forge', member: 'reviewer-forge', outsourcing: 'reviewer-outsourcing' })[member.role] || member.role
    }));
    const members = [];
    const owner = sheet?.createdBy || sheet?.ownerAccount;
    if (owner) members.push({ accountName: owner, name: owner, role: 'owner' });
    for (const name of [sheet?.assignee, ...(sheet?.assignees || [])].filter(Boolean)) {
      if (!members.some(member => member.accountName === name)) members.push({ accountName: name, name, role: 'reviewer-forge' });
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
    if (!editor.members.some(member => member.role === 'owner')) return '至少保留一位 所有者，请先指定新的负责人。';
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
      members.push({ accountName, name: person.name, role: 'reviewer-forge' });
    } else {
      if (index < 0 || (action !== 'remove' && action !== 'role')) return;
      if (members[index].role === 'owner' && members.filter(member => member.role === 'owner').length === 1 && (action === 'remove' || role !== 'owner')) {
        this.patchDeliveryEditor({ memberNotice: '请先将另一位成员设为 所有者，再移除或更改这位负责人。' }, editorId); return;
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
      showResults: editable && !!editor.memberSearchOpen, resultCount: matches.length, noResults: !matches.length,
      directoryHelp: '可多选 · 默认 Reviewer-Forge，选择后可调整角色',
      scope: '角色仅对这张数据单生效',
      notice: editor.memberNotice, empty: !editor.members.length,
      onSearch: event => { this.patchDeliveryEditor({ memberQuery: event.target.value }, editor.id); this.openDeliveryMemberPicker(editor.id); },
      open: () => this.openDeliveryMemberPicker(editor.id),
      close: () => this.closeDeliveryMemberPicker(editor.id, true),
      onToggle: event => { this.patchDeliveryEditor({ memberSearchOpen: event.newState === 'open' }, editor.id); },
      onKey: event => {
        if (event.key !== 'ArrowDown') return;
        event.preventDefault(); this.openDeliveryMemberPicker(editor.id);
        if (typeof document !== 'undefined') document.querySelector('#forge-delivery-member-results input:not(:disabled)')?.focus();
      },
      results: matches.map(person => {
        const selected = editor.members.some(member => member.accountName === person.accountName);
        const lastOwner = editor.members.find(member => member.accountName === person.accountName)?.role === 'owner' && editor.members.filter(member => member.role === 'owner').length === 1;
        return Object.assign({}, person, { selected, unselected: !selected, initial: Array.from(person.name)[0],
          meta: person.detail || (person.name !== person.accountName ? person.accountName : '平台成员'),
          label: '选择成员 ' + person.name + ' · ' + person.accountName,
          hint: lastOwner ? '至少保留一位 所有者' : person.name,
          disabled: lastOwner || (!selected && editor.members.length >= 50),
          toggle: event => this.updateDeliveryMember(person.accountName, event.target.checked ? 'add' : 'remove', null, editor.id) });
      }),
      limitNote: editor.members.length >= 50 ? '已选满 50 位成员，取消勾选后可继续选择。' : '',
      rows: editor.members.map(member => {
        const role = roles.find(value => value.key === member.role), lastOwner = member.role === 'owner' && editor.members.filter(value => value.role === 'owner').length === 1;
        return Object.assign({}, member, { initial: Array.from(member.name || member.accountName)[0], me: member.accountName === this.profileIdentity().accountName,
          roleLabel: role?.label || '待配置', description: role?.description || '请指定角色', roleOptions: roles,
          roleDisabled: !editable || lastOwner, removeDisabled: !editable || lastOwner,
          hint: lastOwner ? '至少保留一位 所有者；请先指定另一位 所有者。' : '角色仅对当前数据单生效',
          roleAriaLabel: '设置 ' + member.name + ' 的数据单角色', removeLabel: '移除成员 ' + member.name,
          onRole: event => this.updateDeliveryMember(member.accountName, 'role', event.target.value, editor.id),
          remove: () => this.updateDeliveryMember(member.accountName, 'remove', null, editor.id) });
      })
    };
  }

  openDeliveryMemberPicker(editorId) {
    if (this.state.deliveryEditor?.id !== editorId || !this.deliveryMembersEditable()) return;
    this.patchDeliveryEditor({ memberSearchOpen: true }, editorId);
    if (typeof document === 'undefined') return;
    this.positionDeliveryMemberPicker();
    const popover = document.getElementById('forge-delivery-member-results');
    if (popover && !popover.matches(':popover-open')) popover.showPopover();
  }

  closeDeliveryMemberPicker(editorId, restoreFocus = false) {
    if (this.state.deliveryEditor?.id !== editorId) return;
    if (typeof document !== 'undefined') {
      const popover = document.getElementById('forge-delivery-member-results');
      if (popover?.matches(':popover-open')) popover.hidePopover();
      if (restoreFocus) document.getElementById('forge-delivery-member-search')?.focus({ preventScroll: true });
    }
    this.patchDeliveryEditor({ memberSearchOpen: false }, editorId);
  }

  positionDeliveryMemberPicker() {
    if (typeof document === 'undefined') return;
    const anchor = document.getElementById('forge-delivery-member-search'), popover = document.getElementById('forge-delivery-member-results');
    if (!anchor || !popover) return;
    const rect = anchor.getBoundingClientRect(), viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0, height = viewport?.height || window.innerHeight;
    const below = top + height - rect.bottom - 12, above = rect.top - top - 12;
    const upward = below < 180 && above > below;
    popover.style.left = rect.left + 'px'; popover.style.width = rect.width + 'px';
    popover.style.maxHeight = Math.max(80, Math.min(264, upward ? above : below)) + 'px';
    popover.style.top = (upward ? rect.top - 6 : rect.bottom + 6) + 'px';
    popover.style.transform = upward ? 'translateY(-100%)' : 'none';
  }

  mountDeliveryMemberPicker() {
    // Native popover provides outside-click/Escape dismissal; checkbox keyboard
    // interaction and tab order remain native, without a second focus trap.
    this._deliveryMemberPosition = () => this.positionDeliveryMemberPicker();
    this._deliveryMemberFocus = event => {
      const editor = this.state.deliveryEditor;
      if (editor?.memberSearchOpen && !event.target.closest?.('.forge-delivery-member-picker')) this.closeDeliveryMemberPicker(editor.id);
    };
    document.addEventListener('focusin', this._deliveryMemberFocus);
    document.addEventListener('scroll', this._deliveryMemberPosition, true);
    window.addEventListener('resize', this._deliveryMemberPosition);
    window.visualViewport?.addEventListener('resize', this._deliveryMemberPosition);
  }

  unmountDeliveryMemberPicker() {
    document.removeEventListener('focusin', this._deliveryMemberFocus);
    document.removeEventListener('scroll', this._deliveryMemberPosition, true);
    window.removeEventListener('resize', this._deliveryMemberPosition);
    window.visualViewport?.removeEventListener('resize', this._deliveryMemberPosition);
  }

  deliveryCreationNotifications(sheet) {
    // Frontend demo outbox only. A server must authorize recipients, persist the
    // event and send through a configured Feishu integration before claiming sent.
    const actor = this.profileIdentity().accountName;
    return this.deliverySheetMembers(sheet).filter(member => member.accountName !== actor).map(member => ({
      id: 'delivery-created:' + sheet.key + ':' + member.accountName,
      kind: 'assignment', sheetKey: sheet.key, recipient: member.accountName, actor,
      item: sheet.name, role: member.role, when: '刚刚',
      body: actor + ' 将你设为 ' + this.deliveryMemberRoles().find(role => role.key === member.role).label + '。点击查看 List 清单与审核要求。',
      channels: { inbox: 'local', feishu: 'not-connected' }
    }));
  }

  deliveryNotificationItems() {
    const actor = this.profileIdentity().accountName;
    const visible = new Set(this.profileDeliveryTasks().map(task => task.key));
    return (this.state.deliveryNotifications || []).filter(event => event.recipient === actor && visible.has(event.sheetKey));
  }

  openDeliveryNotification(id) {
    const event = this.deliveryNotificationItems().find(value => value.id === id);
    if (!event) return;
    this.setState({ notifOpen: false, notifRead: Object.assign({}, this.state.notifRead, { [id]: true }), reviewOpen: null,
      view: 'sheet', sheetKey: event.sheetKey, sheetRow: null, sheetQuery: '', sheetFilter: 'all', sheetTagFilter: '' });
  }
  // delivery-members:end
