  // task-linking:start
  deliveryEntryId(entry) { return String(entry.deliveryItemId || entry.itemId || entry.key); }

  deliveryEntries(sheet) {
    const entries = this.sheetEntryList(sheet).concat(this.state.deliveryNewItems?.[sheet.key] || []);
    const seen = new Set();
    return entries.filter(entry => { const id = this.deliveryEntryId(entry); if (seen.has(id)) return false; seen.add(id); return true; });
  }

  taskLinkPreview(url) {
    const value = String(url || '');
    return /^(?:https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(value) && !this.state.taskLinkBrokenImages?.[value] ? value : '';
  }

  taskLinkImageError(url) {
    this.setState({ taskLinkBrokenImages: Object.assign({}, this.state.taskLinkBrokenImages, { [url]: true }) });
  }

  taskRunItem(rec, index) {
    if (rec.itemMeta?.[index]) { const meta = rec.itemMeta[index]; return {itemId: meta[0], name: meta[4], path: rec.dsName || ''}; }
    const ds = this.dsData().find(value => value.name === rec.dsName), cycle = ds?.items || [];
    const picked = rec.itemIds?.length ? cycle.filter(item => rec.itemIds.includes(item[0])) : cycle.slice(0, rec.n);
    const meta = picked[index] || cycle[index % cycle.length] || [];
    return { itemId: meta[0] || (rec.id.replace(/[^a-f0-9]/g, '') + String(index).padStart(2, '0')).slice(0, 32), name: this.itemTitle(meta[4] || rec.subject), path: ds?.name || '' };
  }

  taskLinkSource(ref) {
    if (!ref) return null;
    let source;
    if (ref.forkKey) {
      const fork = this.state.forks?.[ref.forkKey]?.find(value => value.name === ref.forkName);
      if (!fork) return null;
      source = { itemId: this.branchIid(ref.itemId, fork.name), runId: fork.runId || '', name: fork.name,
        version: fork.version || 'Run 1', branch: true, ready: ['deliverable', 'review'].includes(fork.state), approved: fork.state === 'deliverable',
        previewImage: fork.previewImage || '', path: '独立分支', identity: 'fork:' + ref.forkKey + ':' + fork.name };
    } else if (ref.runId) {
      const run = this.runsData().find(value => value.id === ref.runId);
      if (!run) return null;
      const index = ref.index ?? Array.from({ length: run.n }, (_, i) => i).find(i => this.taskRunItem(run, i).itemId === ref.itemId);
      if (index == null || index < 0 || index >= run.n) return null;
      const item = this.taskRunItem(run, index);
      if (ref.itemId && item.itemId !== ref.itemId) return null;
      const status = this.state.runItemTech?.[run.id + ':' + index]?.status || (index < run.done ? 'success' : index < run.done + run.running ? 'running' : index < run.done + run.running + run.failed ? 'failed' : 'queued');
      const seed = this.baseSheetRows(null).find(row => row[2] === item.itemId);
      const current = seed?.[6]?.currentDeliverableVersion;
      const decision = this.state.reviewDecisions?.[run.id + ':' + item.itemId];
      source = Object.assign({}, item, { runId: run.id, name: run.branchSource ? run.subject : item.name,
        version: run.artifactVersion || seed?.[6]?.candidateVersion?.runId === run.id && seed[6].candidateVersion.label || (current?.runId === run.id ? current.label : 'Run 1'),
        technicalStatus: status, ready: status === 'success', approved: decision === 'pass' || (!decision && current?.runId === run.id), rejected: decision === 'rework',
        branch: !!run.branchSource, previewImage: run.itemPreviews?.[item.itemId] || (run.n === 1 ? run.previewImage : '') || '', identity: 'run:' + run.id + ':' + item.itemId });
    } else {
      const sheet = ref.sheetKey ? this.deliverySheet(ref.sheetKey) : null;
      const row = (sheet ? this.sheetRows(sheet) : this.baseSheetRows(null)).find(value => value[2] === ref.itemId);
      if (!row) return null;
      const version = row[6]?.currentDeliverableVersion || row[6]?.candidateVersion;
      if (version?.source) source = Object.assign({}, version.source, {
        approved: !!row[6]?.currentDeliverableVersion,
        rejected: !row[6]?.currentDeliverableVersion && version.reviewStatus === 'rework'
      });
      else source = { itemId: row[2], name: row[0], runId: version?.runId || row[5], version: version?.label || '尚无产物',
        ready: !!version && (!!row[6]?.currentDeliverableVersion || row[6]?.technicalStatus !== 'failed'), approved: !!row[6]?.currentDeliverableVersion,
        rejected: !row[6]?.currentDeliverableVersion && version?.reviewStatus === 'rework', branch: false, path: row[1],
        previewImage: version?.previewImage || '', identity: 'run:' + (version?.runId || row[5]) + ':' + row[2] };
    }
    source.ready = source.ready && !source.rejected;
    source.previewImage = this.taskLinkPreview(source.previewImage);
    source.key = source.identity + ':' + source.version;
    source.issue = source.ready ? '' : source.rejected ? '此版本已要求返工，请等待新的最终产物。' : '任务尚未产出可关联的最终版本，请完成运行后再试。';
    return source;
  }

  deliveryLinkState(sheet, entry) {
    const appended = this.appendedLinkState(sheet, entry);
    if (appended) return appended;
    const id = this.deliveryEntryId(entry), stored = this.state.deliveryLinks?.[sheet.key]?.[id];
    if (stored) {
      // A linked candidate may be reviewed later. Derive promotion without changing
      // the task's review decision or another sheet's delivery slot.
      let current = stored.current, candidate = stored.candidate;
      if (candidate) {
        const ref = candidate.ref, source = candidate.source;
        const decision = this.state.reviewDecisions?.[source.runId + ':' + source.itemId];
        const passed = decision === 'pass' || (!decision && ref.forkKey && this.state.forks?.[ref.forkKey]?.find(value => value.name === ref.forkName)?.state === 'deliverable');
        if (passed) { current = Object.assign({}, candidate, { source: Object.assign({}, source, { approved: true }) }); candidate = null; }
        else if (decision === 'rework') candidate = Object.assign({}, candidate, { rejected: true });
      }
      return Object.assign({}, stored, { current, candidate });
    }
    if (entry.sourceType === 'production') {
      const ref = (entry.sourceRefs || [])[0] || { runId: entry.sourceRunId, itemId: entry.itemId };
      const source = this.taskLinkSource(ref);
      const version = source && (source.ready || source.rejected) ? { number: 1, label: source.version, ref, source, rejected: !!source.rejected } : null;
      return { current: version?.source.approved ? version : null, candidate: version && !version.source.approved ? version : null, history: [], revision: 0 };
    }
    const row = this.baseSheetRows(null).find(value => value[2] === entry.itemId);
    const seedVersion = (version, approved) => version ? { number: Number(String(version.label).replace(/\D/g, '')) || 1,
      label: version.label, ref: { runId: version.runId, itemId: entry.itemId },
      source: { key: 'run:' + version.runId + ':' + entry.itemId + ':' + version.label, identity: 'run:' + version.runId + ':' + entry.itemId, itemId: entry.itemId,
        runId: version.runId, version: version.label, name: row[0], path: row[1], ready: true, branch: false, approved, issue: '', previewImage: version.previewImage || '' } } : null;
    return { current: seedVersion(row?.[6]?.currentDeliverableVersion, true), candidate: seedVersion(row?.[6]?.candidateVersion, false), history: [], revision: 0 };
  }

  sheetRows(sheet) {
    const rows = this.baseSheetRows(sheet);
    if (!sheet?.key) return rows;
    const links = this.state.deliveryLinks?.[sheet.key] || {};
    for (const entry of this.deliveryEntries(sheet)) {
      const id = this.deliveryEntryId(entry);
      if (!links[id] && !this.state.appendedRework?.[id]?.runId && entry.sourceType !== 'production') continue;
      const link = this.deliveryLinkState(sheet, entry), version = link.current || link.candidate;
      if (!version) {
        if (entry.sourceType !== 'production') continue;
        const ref = (entry.sourceRefs || [])[0] || { runId: entry.sourceRunId, itemId: entry.itemId };
        const source = this.taskLinkSource(ref), technicalStatus = source?.technicalStatus || 'queued';
        const state = { itemId: id, businessStatus: 'pending_production', technicalStatus,
          currentDeliverableVersion: null, candidateVersion: null, hasPendingCandidate: false };
        const row = [entry.name, entry.sourceDataset || '生产任务', id, technicalStatus === 'failed' ? 'failed' : 'pending',
          source ? technicalStatus === 'failed' ? '生产失败，等待重试' : '等待生产完成' : '来源任务不可用', ref.runId, state];
        const index = rows.findIndex(value => value[2] === id);
        if (index >= 0) rows[index] = row; else rows.push(row);
        continue;
      }
      const source = version.source, passed = !!link.current;
      const rejected = !!link.candidate?.rejected;
      const state = { itemId: id, businessStatus: passed ? 'deliverable' : rejected ? 'reworking' : 'pending_review', technicalStatus: link.candidate?.technicalStatus || 'success',
        currentDeliverableVersion: link.current ? { label: link.current.label, runId: link.current.source.runId, source: link.current.source } : null,
        candidateVersion: link.candidate ? { label: link.candidate.label, runId: link.candidate.source.runId, reviewStatus: rejected ? 'rework' : link.candidate.technicalStatus && link.candidate.technicalStatus !== 'success' ? link.candidate.technicalStatus : 'pending', source: link.candidate.source, appended: !!link.candidate.appended } : null,
        hasPendingCandidate: !!link.candidate && !rejected && (!link.candidate.technicalStatus || link.candidate.technicalStatus === 'success') };
      const effectiveState = this.appendedItemState(id, state);
      const row = [entry.name, source.path || '手动关联', id, passed ? 'passed' : rejected ? 'failed' : 'review',
        passed ? link.current.label + ' · 已关联最终版本' + (link.candidate ? rejected ? ' · 候选要求返工' : ' · 有待审核候选' : '') : link.candidate.label + (rejected ? ' · 要求返工' : ' · 待审核候选'), source.runId, effectiveState];
      const index = rows.findIndex(value => value[2] === id);
      if (index >= 0) rows[index] = row; else rows.push(row);
    }
    return rows;
  }

  taskLinkEntryValues(ref) {
    const source = this.taskLinkSource(ref);
    return { open: event => { event?.stopPropagation(); this.openTaskLink(ref); },
      hint: source?.issue || '将最终产物关联到交付数据单中的 Item', ready: !!source?.ready };
  }

  taskLinkHistory(sheet, id) {
    const entry = this.deliveryEntries(sheet).find(value => this.deliveryEntryId(value) === id);
    if (!entry || !this.state.deliveryLinks?.[sheet.key]?.[id]) return [];
    const link = this.deliveryLinkState(sheet, entry);
    return [link.current, link.candidate].filter(Boolean).concat(link.history.slice().reverse()).filter((value, index, all) => all.findIndex(other => other.source.key === value.source.key) === index)
      .map(version => ({ label: version.label + (version === link.current ? ' · 当前交付' : version === link.candidate ? version.rejected ? ' · 要求返工' : ' · 待审核候选' : ' · 历史版本'),
        name: version.source.name, id: version.source.itemId, run: version.source.runId, sourceVersion: version.source.version }));
  }

  openTaskLink(ref) {
    this.cancelPanelCleanup('taskLink');
    this._taskLinkExitValues = null;
    const source = this.taskLinkSource(ref);
    if (!source?.ready) { this.notifyTaskLink(source?.issue || '来源任务已不可用，请重新打开详情。', 'warning'); return; }
    this.dismissTaskLinkToast();
    const sheets = this.deliveryData().flatMap(group => group.sheets);
    const suggested = sheets.find(sheet => sheet.key === ref.sheetKey) || sheets.find(sheet => this.deliveryEntries(sheet).some(entry => entry.itemId === source.itemId));
    this.setState({ taskLink: { ref, sourceKey: source.key, sheetKey: suggested?.key || sheets[0]?.key || '', query: '', selectedId: '', revision: '', mode: 'existing', newName: source.name, acknowledged: false, error: '' } });
    setTimeout(() => { if (typeof document !== 'undefined' && this.state.taskLink) { const dialog = document.querySelector('.forge-task-link-dialog'); if (dialog && !dialog.open) { dialog.inert = false; dialog.showModal(); } } }, 0);
  }

  closeTaskLink(event) {
    event?.preventDefault(); event?.stopPropagation();
    const duration = this.panelMotionDuration('dialog');
    this._taskLinkExitValues = duration && this.state.taskLink ? this.taskLinkValues() : null;
    const dialog = typeof document !== 'undefined' && document.querySelector('.forge-task-link-dialog');
    if (dialog) { dialog.close(); dialog.inert = true; }
    this.setState({ taskLink: null });
    this.deferPanelCleanup('taskLink', dialog, () => { this._taskLinkExitValues = null; if (this._panelMotionMounted && !this.state.taskLink) this.setState({}); }, duration);
  }

  patchTaskLink(patch) { if (this.state.taskLink) this.setState({ taskLink: Object.assign({}, this.state.taskLink, patch, { error: '' }) }); }

  taskLinkRevision(link) { return JSON.stringify([link.revision, link.current?.source.key, link.candidate?.source.key]); }

  taskLinkValues() {
    const form = this.state.taskLink;
    if (!form) return this._taskLinkExitValues || { open: false, items: [], sheets: [], disabled: true };
    const source = this.taskLinkSource(form.ref), sheets = this.deliveryData().flatMap(group => group.sheets);
    const sheet = sheets.find(value => value.key === form.sheetKey), entries = sheet ? this.deliveryEntries(sheet) : [];
    const selected = entries.find(entry => this.deliveryEntryId(entry) === form.selectedId), link = selected ? this.deliveryLinkState(sheet, selected) : null;
    const duplicate = !!link && [link.current, link.candidate].some(version => version?.source.key === source?.key);
    const replace = !!link?.current && !duplicate && !!source?.approved;
    const replaceCandidate = !!link?.candidate && !duplicate;
    const isNew = form.mode === 'new', query = form.query.trim().toLowerCase();
    const filtered = entries.filter(entry => (entry.name + ' ' + this.deliveryEntryId(entry)).toLowerCase().includes(query));
    const nameDuplicate = isNew && entries.some(entry => entry.name.toLowerCase() === form.newName.trim().toLowerCase());
    const issue = !source?.ready ? source?.issue || '来源任务已不可用。' : source.key !== form.sourceKey ? '来源版本已变化，请关闭后重新关联。'
      : !sheet ? '请先选择交付数据单。' : isNew ? !source.branch ? '仅分支任务可在此创建新 Item。' : !form.newName.trim() ? '请输入新 Item 名称。' : nameDuplicate ? '此数据单已有同名 Item，请修改名称或关联已有 Item。' : ''
      : !selected ? '请选择一个交付 Item。' : duplicate ? '此任务版本已经关联，无需重复提交。'
      : (replace || replaceCandidate) && !form.acknowledged ? '请确认版本变更后再关联。' : '';
    const next = link ? Math.max(link.current?.number || 0, link.candidate?.number || 0, ...link.history.map(value => value.number || 0)) + 1 : 1;
    return {
      open: true, sourceName: source?.name || '来源不可用', sourceMeta: (source?.branch ? '分支任务' : '现有任务') + ' · ' + (source?.version || '—'),
      sourceId: source?.runId || '—', approved: !!source?.approved, status: source?.approved ? '已通过审核' : '待审核候选',
      sheetKey: form.sheetKey, sheets: sheets.map(value => ({ value: value.key, label: value.name })), noSheets: !sheets.length,
      onSheet: event => this.patchTaskLink({ sheetKey: event.target.value, query: '', selectedId: '', revision: '', acknowledged: false }),
      query: form.query, onQuery: event => this.patchTaskLink({ query: event.target.value, selectedId: '', revision: '', acknowledged: false }), clearQuery: () => this.patchTaskLink({ query: '' }), hasQuery: !!query,
      existing: !isNew, isNew, allowNew: !!source?.branch,
      existingMode: () => this.patchTaskLink({ mode: 'existing', selectedId: '', acknowledged: false }), newMode: () => this.patchTaskLink({ mode: 'new', selectedId: '', acknowledged: false }),
      newName: form.newName, onName: event => this.patchTaskLink({ newName: event.target.value }), nameDuplicate,
      count: filtered.length + ' / ' + entries.length + ' 个 Item', empty: !filtered.length,
      emptyTitle: entries.length ? '没有匹配的 Item' : '这张数据单还没有 Item',
      emptyHint: entries.length ? '试试名称或 Item ID 的一部分。' : source?.branch ? '可以切换到“创建新 Item”，保留为独立交付项。' : '请先在交付数据单中添加 List 清单。',
      items: filtered.map(entry => {
        const id = this.deliveryEntryId(entry), current = this.deliveryLinkState(sheet, entry), preview = this.taskLinkPreview(current.current?.source.previewImage || current.candidate?.source.previewImage || entry.previewImage);
        return { id, name: entry.name, selected: form.selectedId === id, unselected: form.selectedId !== id, preview, hasPreview: !!preview, noPreview: !preview,
          imageError: () => this.taskLinkImageError(preview),
          version: current.current ? '当前版本 ' + current.current.label : '当前版本：暂无', candidate: current.candidate ? ' · 候选 ' + current.candidate.label + (current.candidate.rejected ? '（要求返工）' : '') : '',
          choose: () => this.patchTaskLink({ selectedId: id, revision: this.taskLinkRevision(current), acknowledged: false }) };
      }),
      hasSelection: !!selected && !isNew, selectedName: selected?.name || '', selectedId: form.selectedId,
      consequence: duplicate ? '已关联此版本，Item ID 与交付版本均未变化。' : source?.approved ? (link?.current ? link.current.label + ' 将更新为 v' + next + '；旧版本保留在关联记录中。' : '将作为 v' + next + ' 关联；交付 Item ID 保持不变。') : '将保存为待审核候选；当前可交付版本和已完成数量保持不变。',
      needsAck: !isNew && (replace || replaceCandidate), ackLabel: replaceCandidate && !replace ? '确认更新候选版本，原候选记录保留' : '确认更新当前交付版本，旧版本记录保留',
      acknowledged: form.acknowledged, onAck: event => this.patchTaskLink({ acknowledged: event.target.checked }),
      issue, hasIssue: !!issue, error: form.error, hasError: !!form.error, disabled: !!issue,
      submitLabel: duplicate ? '已关联此版本' : isNew ? '创建 Item 并关联' : source?.approved ? '确认关联' : '关联候选版本',
      createHint: '将生成新的 Item ID，从 v1 开始；不会改动原 Item 或主线版本。',
      cancel: event => this.closeTaskLink(event), submit: () => this.submitTaskLink(),
      backdrop: event => { if (event.target === event.currentTarget) this.closeTaskLink(event); }
    };
  }

  submitTaskLink() {
    const form = this.state.taskLink;
    if (!form || this._taskLinkSubmitting) return;
    const values = this.taskLinkValues();
    if (values.issue) { this.patchTaskLink({}); this.setState({ taskLink: Object.assign({}, this.state.taskLink, { error: values.issue }) }); this.notifyTaskLink(values.issue, 'warning'); return; }
    const source = this.taskLinkSource(form.ref), sheet = this.deliverySheet(form.sheetKey);
    let entry = this.deliveryEntries(sheet).find(value => this.deliveryEntryId(value) === form.selectedId);
    let previous = entry ? this.deliveryLinkState(sheet, entry) : { current: null, candidate: null, history: [], revision: 0 };
    if (form.mode === 'existing' && this.taskLinkRevision(previous) !== form.revision) {
      this.patchTaskLink({ selectedId: '', acknowledged: false }); this.notifyTaskLink('目标 Item 的版本已变化，请重新选择并确认。', 'warning'); return;
    }
    this._taskLinkSubmitting = true;
    const newItems = Object.assign({}, this.state.deliveryNewItems);
    if (form.mode === 'new') {
      const id = 'ITEM_' + Date.now().toString(36) + '_' + (++this._taskLinkSequence || (this._taskLinkSequence = 1));
      entry = { key: id, deliveryItemId: id, itemId: '', name: form.newName.trim(), source: form.newName.trim(), tagId: '' };
      newItems[sheet.key] = (newItems[sheet.key] || []).concat(entry);
    }
    const number = Math.max(previous.current?.number || 0, previous.candidate?.number || 0, ...previous.history.map(value => value.number || 0)) + 1;
    const version = { number, label: 'v' + number, source: Object.assign({}, source), ref: Object.assign({}, form.ref), at: Date.now() };
    const history = previous.history.concat([previous.current, previous.candidate].filter(Boolean)).filter((value, index, all) => all.findIndex(other => other.source.key === value.source.key) === index);
    const link = { current: source.approved ? version : previous.current, candidate: source.approved ? null : version, history, revision: previous.revision + 1 };
    const id = this.deliveryEntryId(entry), links = Object.assign({}, this.state.deliveryLinks, { [sheet.key]: Object.assign({}, this.state.deliveryLinks?.[sheet.key], { [id]: link }) });
    this.setState({ deliveryLinks: links, deliveryNewItems: newItems });
    this.closeTaskLink(); this._taskLinkSubmitting = false;
    const message = form.mode === 'new' ? '已创建「' + entry.name + '」· ' + id + ' · ' + (source.approved ? '已关联 v1' : '候选 v1，待审核')
      : source.approved ? '已关联「' + entry.name + '」· ' + id + ' · ' + version.label + (previous.current ? '，旧版本已保留' : '')
      : '已关联「' + entry.name + '」· ' + id + ' · 候选 ' + version.label + '，通过审核后可交付';
    this.notifyTaskLink(message, source.approved ? 'success' : 'info');
  }

  notifyTaskLink(text, tone = 'success', action = null) {
    clearTimeout(this._taskLinkToastTimer);
    const toast = { text, tone, action: action?.runId ? { label: action.label, runId: action.runId } : null };
    this.setState({ taskLinkToast: toast });
    setTimeout(() => {
      if (typeof document !== 'undefined' && this.state.taskLinkToast === toast) {
        const element = document.getElementById('forge-task-link-toast');
        if (element && !element.matches(':popover-open')) element.showPopover();
      }
    }, 0);
    this.resumeTaskLinkToast();
  }

  resumeTaskLinkToast() {
    clearTimeout(this._taskLinkToastTimer);
    const toast = this.state.taskLinkToast;
    if (!toast) return;
    const element = typeof document !== 'undefined' ? document.getElementById?.('forge-task-link-toast') : null;
    if (element && (element.matches(':hover') || element.contains(document.activeElement))) return;
    this._taskLinkToastTimer = setTimeout(() => {
      if (this.state.taskLinkToast === toast) this.dismissTaskLinkToast();
    }, toast.action ? 12000 : 7000);
  }
  dismissTaskLinkToast() { clearTimeout(this._taskLinkToastTimer); if (typeof document !== 'undefined') document.getElementById('forge-task-link-toast')?.hidePopover(); this.setState({ taskLinkToast: null }); }
  openTaskLinkToastAction(toast, event) {
    event?.preventDefault(); event?.stopPropagation();
    if (!toast?.action?.runId || this.state.taskLinkToast !== toast) return;
    const run = this.runsData().find(value => value.id === toast.action.runId);
    if (!run) { this.notifyTaskLink('该分支任务已不可用，请在生产的运行记录中查看。', 'warning'); return; }
    this.dismissTaskLinkToast();
    this.setState({ view: 'run', activeRun: run.id, runItem: null, sheetRow: null, reviewOpen: null, reviewToast: '' });
  }
  taskLinkToastValues() {
    const toast = this.state.taskLinkToast;
    return { text: toast?.text || '', tone: toast?.tone || 'success', success: toast?.tone === 'success', warning: toast?.tone === 'warning', info: toast?.tone === 'info',
      hasAction: !!toast?.action?.runId, actionLabel: toast?.action?.label || '',
      actionHref: toast?.action?.runId ? '?view=run&activeRun=' + encodeURIComponent(toast.action.runId) : '',
      openAction: event => this.openTaskLinkToastAction(toast, event),
      dismiss: () => this.dismissTaskLinkToast(), pause: () => clearTimeout(this._taskLinkToastTimer), resume: () => this.resumeTaskLinkToast() };
  }
  // task-linking:end
