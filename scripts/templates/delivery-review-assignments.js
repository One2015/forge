  // delivery-review-assignments:start
  deliveryDatasetReviewStates() {
    return [
      { key: 'pending', label: '待审核', tone: 'warning' },
      { key: 'reviewing', label: '审核中', tone: 'neutral' },
      { key: 'repair', label: '待返工 · Repair', tone: 'warning' },
      { key: 'paused', label: '已暂停', tone: 'muted' }
    ];
  }

  deliveryReviewDatasets(value) {
    if (!value) return [];
    const groups = new Map();
    const entries = value.entries || this.deliveryEntries(value);
    const saved = value.datasetReviews || {};
    for (const entry of entries) {
      // The List deduplicates Items, but an Item can still belong to several
      // selected datasets. Preserve every source's independent review owner.
      const refs = entry.sourceType === 'production' && entry.sourceRefs?.some(ref => ref.dataset)
        ? entry.sourceRefs.filter(ref => ref.dataset) : [{ pipeline: entry.sourcePipeline, dataset: entry.sourceDataset }];
      for (const ref of refs) {
      const production = entry.sourceType === 'production' && ref.dataset;
      const key = production ? 'production:' + JSON.stringify([ref.pipeline || '', ref.dataset])
        : value.archive ? 'zip:' + value.archive.name : 'list';
      if (!groups.has(key)) groups.set(key, {
        key, name: production ? ref.dataset : value.archive?.name || '交付清单',
        source: production ? ref.pipeline || '生产任务' : value.archive ? '上传 ZIP' : '已有条目',
        itemIds: new Set(), entries: [], reviewer: saved[key]?.reviewer ?? '', status: saved[key]?.status || 'pending',
        updatedBy: saved[key]?.updatedBy || '', updatedAt: saved[key]?.updatedAt || 0
      });
      const group = groups.get(key), itemId = this.deliveryEntryId(entry) || entry.key;
      if (!group.itemIds.has(itemId)) { group.entries.push(entry); group.itemIds.add(itemId); }
      }
    }
    return Array.from(groups.values()).map(group => ({ ...group, itemIds: Array.from(group.itemIds), count: group.entries.length }));
  }

  deliveryDatasetReviewSignature(sheet) {
    return JSON.stringify({ reviews: sheet?.datasetReviews || {}, entries: sheet?.entries || null,
      archive: sheet?.archive?.name || '', sourceRunIds: sheet?.sourceRunIds || [],
      members: sheet ? this.deliveryMemberSignature(this.deliverySheetMembers(sheet)) : null });
  }

  deliveryReviewerOptions(editor = this.state.deliveryEditor) {
    if (!editor) return [];
    const identity = this.profileIdentity(), people = new Map(this.deliveryMemberDirectory().map(person => [person.accountName, person]));
    for (const member of editor.members) if (!people.has(member.accountName)) people.set(member.accountName, member);
    return Array.from(people.values()).map(person => {
      const supplied = this.props.memberDirectory?.find(member => member.accountName === person.accountName);
      const sheetRole = editor.members.find(member => member.accountName === person.accountName)?.role;
      const accountRole = person.accountName === identity.accountName ? identity.key
        : String(this.state.profileRoleOverrides?.[person.accountName] || supplied?.role || supplied?.roleKey || '').trim().toLowerCase().replace(/[ _]+/g, '-');
      const lead = person.accountName === identity.accountName ? identity.key === 'lead'
        : (this.state.profileRoleOverrides?.[person.accountName] || supplied?.role || supplied?.roleKey) === 'lead';
      const external = person.external === true || sheetRole === 'reviewer-outsourcing' || accountRole === 'outsourcing';
      const identityLabel = person.name + (person.name !== person.accountName && !person.accountName.startsWith('outsourcing:') ? ' · ' + person.accountName : '');
      const detail = String(person.detail || '');
      const supplierLabel = external && detail.startsWith('外部专家 · ') ? ' · ' + detail.slice('外部专家 · '.length) : '';
      return { ...person, external, label: (external ? '外部专家 · ' : '') + identityLabel + supplierLabel
        + (person.accountName === identity.accountName ? '（我）' : '') + (lead ? ' · Lead' : '') };
    });
  }

  deliveryEditorReviewDatasets(editor = this.state.deliveryEditor) {
    if (!editor) return [];
    const defaultReviewer = !editor.key ? editor.members.find(member => member.role === 'owner')?.accountName || '' : '';
    return this.deliveryReviewDatasets(editor).map(group => ({ ...group,
      reviewer: Object.hasOwn(editor.datasetReviews || {}, group.key) ? group.reviewer : defaultReviewer }));
  }

  updateDeliveryDatasetReview(key, field, value, editorId) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.id !== editorId || !this.deliveryMembersEditable(editor) || editor.listLoading) return;
    const group = this.deliveryEditorReviewDatasets(editor).find(row => row.key === key);
    if (!group || !['reviewer', 'status'].includes(field)) return;
    const members = editor.members.slice();
    if (field === 'reviewer' && value) {
      const person = this.deliveryReviewerOptions(editor).find(person => person.accountName === value);
      if (!person) return;
      if (!members.some(member => member.accountName === value)) {
        if (members.length >= 50) { this.patchDeliveryEditor({ reviewNotice: '成员已达 50 人上限，请先调整成员。' }, editorId); return; }
        members.push({ accountName: value, name: person.name, detail: person.detail || '', teamName: person.teamName || '', external: !!person.external,
          role: person.external ? 'reviewer-outsourcing' : 'reviewer-forge' });
      }
    }
    if (field === 'status' && !this.deliveryDatasetReviewStates().some(status => status.key === value)) return;
    this.patchDeliveryEditor({ members, datasetReviews: { ...editor.datasetReviews,
      [key]: { reviewer: group.reviewer, status: group.status, [field]: value } }, reviewTouched: true, error: '',
      reviewNotice: '审核分配已修改，' + (editor.key ? '保存更改' : '创建数据单') + '后生效。' }, editorId);
  }

  deliveryDatasetReviewIssue(editor = this.state.deliveryEditor) {
    if (!editor) return '';
    if (editor.memberActor !== this.profileIdentity().accountName) return '当前账号已变更，请关闭后重新打开数据单。';
    const current = editor.key ? this.deliverySheet(editor.key) : null;
    if (editor.key && !current) return '数据单已不存在，请关闭后重新打开。';
    const changed = editor.reviewTouched || JSON.stringify(editor.datasetReviews || {}) !== JSON.stringify(current?.datasetReviews || {});
    const required = !editor.key || !!current?.datasetReviews || changed;
    if (!required) return '';
    if (editor.key && (changed || editor.listChanged) && !this.deliveryMembersEditable(editor)) return '仅数据单所有者、所属项目负责人或 Lead 可修改审核分配。';
    if (current && this.deliveryDatasetReviewSignature(current) !== editor.reviewBaseline) return '数据集或审核分配已更新，请关闭后重新打开，避免覆盖其他修改。';
    const people = new Set(this.deliveryReviewerOptions(editor).map(person => person.accountName));
    for (const group of this.deliveryEditorReviewDatasets(editor)) {
      if (!group.reviewer) return '请为「' + group.name + '」分配 Reviewer，可选择自己或 Lead。';
      if (!people.has(group.reviewer) || !editor.members.some(member => member.accountName === group.reviewer)) return '「' + group.name + '」的 Reviewer 已不在数据单成员中，请先重新分配。';
      if (!this.deliveryDatasetReviewStates().some(status => status.key === group.status)) return '请为「' + group.name + '」选择有效的处理状态。';
    }
    return '';
  }

  deliveryDatasetReviewPlan(editor, previous) {
    // Legacy sheets stay unconfigured until the owner explicitly assigns them.
    if (previous && !previous.datasetReviews && !editor.reviewTouched) return null;
    const at = Date.now(), actor = this.profileIdentity().accountName, changes = [];
    const datasetReviews = Object.fromEntries(this.deliveryEditorReviewDatasets(editor).map(group => {
      const before = previous?.datasetReviews?.[group.key];
      const changed = !before || before.reviewer !== group.reviewer || before.status !== group.status;
      const review = changed ? { reviewer: group.reviewer, status: group.status, updatedAt: at, updatedBy: actor } : { ...before };
      if (changed) changes.push({ datasetKey: group.key, datasetName: group.name, before: before || null, after: review, actor, at });
      return [group.key, review];
    }));
    return { datasetReviews, datasetReviewHistory: [...(previous?.datasetReviewHistory || []), ...changes], changes };
  }

  deliveryDatasetReviewNotifications(sheet, changes) {
    const actor = this.profileIdentity().accountName;
    return changes.filter(change => change.after.reviewer !== actor && change.before?.reviewer !== change.after.reviewer).map(change => ({
      id: 'dataset-review:' + sheet.key + ':' + change.datasetKey + ':' + change.at,
      kind: 'assignment', sheetKey: sheet.key, recipient: change.after.reviewer, actor, item: change.datasetName, when: '刚刚',
      body: actor + ' 将「' + change.datasetName + '」的审核分配给你。当前状态：' + this.deliveryDatasetReviewStates().find(status => status.key === change.after.status).label + '。',
      channels: { inbox: 'local', feishu: 'not-connected' }
    }));
  }

  deliveryDatasetReviewValues() {
    const editor = this.state.deliveryEditor;
    if (!editor) return { rows: [], hasRows: false };
    const editable = this.deliveryMembersEditable(editor) && !editor.listLoading;
    const groups = this.deliveryEditorReviewDatasets(editor), options = this.deliveryReviewerOptions(editor);
    return { editable, readonly: !editable, hasRows: !!groups.length, empty: !groups.length, count: groups.length,
      assigned: groups.filter(group => !!group.reviewer).length, notice: editor.reviewNotice || '', issue: this.deliveryDatasetReviewIssue(editor),
      help: editor.key ? '按数据集重新分配 Reviewer 或调整处理状态，保存后生效。' : '每份数据集需指定一位 Reviewer，默认由所有者本人审核，也可分配给同事或 Lead。',
      rows: groups.map(group => ({ ...group, options, states: this.deliveryDatasetReviewStates(),
        reviewerName: options.find(person => person.accountName === group.reviewer)?.label || '未分配',
        statusLabel: this.deliveryDatasetReviewStates().find(status => status.key === group.status)?.label || '状态待确认',
        reviewerLabel: '分配「' + group.name + '」的 Reviewer', statusAriaLabel: '设置「' + group.name + '」的处理状态',
        onReviewer: event => this.updateDeliveryDatasetReview(group.key, 'reviewer', event.target.value, editor.id),
        onStatus: event => this.updateDeliveryDatasetReview(group.key, 'status', event.target.value, editor.id)
      })) };
  }

  deliverySavedDatasetReviewValues(sheet) {
    const members = this.deliverySheetMembers(sheet), states = this.deliveryDatasetReviewStates();
    const rows = this.deliveryReviewDatasets({ ...sheet, entries: this.deliveryEntries(sheet) }).map(group => ({ ...group,
      reviewerName: members.find(member => member.accountName === group.reviewer)?.name || group.reviewer || '未分配',
      statusLabel: group.reviewer ? states.find(status => status.key === group.status)?.label || '状态待确认' : '待分配',
      tone: group.reviewer ? states.find(status => status.key === group.status)?.tone || 'muted' : 'muted',
      updatedLabel: group.updatedAt ? group.updatedBy + ' · ' + new Date(group.updatedAt).toLocaleString('zh-CN', { hour12: false }) : ''
    }));
    return { rows, hasRows: !!rows.length, count: rows.length, canManage: this.canManageDeliveryMembers(sheet),
      edit: () => { if (!this.canManageDeliveryMembers(this.deliverySheet(sheet.key))) return; this.openDeliveryEditor(sheet.key); if (this.state.deliveryEditor?.key === sheet.key) this.patchDeliveryEditor({ tab: 'reviewers' }); } };
  }
  // delivery-review-assignments:end
