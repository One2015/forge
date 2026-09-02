  // appended-review:start
  appendedRecord(itemId, base = {}) {
    const saved = this.state.appendedRework?.[itemId];
    if (!saved) return null;
    if (saved.sheetKey && (this.state.deliveryLinks?.[saved.sheetKey]?.[itemId]?.revision || 0) !== saved.bindingRevision) return null;
    if (saved.runId) return saved;
    // Read older session drafts without fabricating a completed result or changing their notes.
    const approvedVersion = base.currentDeliverableVersion?.approvedBase || base.currentDeliverableVersion;
    if (!approvedVersion) return null;
    const n = Number(String(approvedVersion.label).replace(/\D/g, '')) || 2;
    const sourceItemId = approvedVersion.source?.itemId || itemId;
    const sourceRun = approvedVersion.source?.runId || approvedVersion.runId;
    return {...saved, runId: 'append-legacy-' + itemId + '-' + saved.round, version: 'Run ' + (n + 1),
      itemId, sourceRun, sourceItemId, approvedVersion, baseReviewCount: Math.max(0, saved.round - 1),
      repairKey: (sourceRun || 'sheet') + ':' + sourceItemId, history: [], legacy: true};
  }

  appendedRunState(record) {
    const run = (this.state.submittedRuns || []).find(value => value.id === record.runId);
    const repair = this.state.repairRuns?.[record.repairKey];
    const tech = this.state.runItemTech?.[record.runId + ':0'];
    return tech?.status || (run && run.status !== 'queued' ? run.status : null)
      || repair?.status || run?.status || record.status || 'queued';
  }

  appendedOutcome(record) {
    const technicalStatus = this.appendedRunState(record);
    const decision = this.state.reviewDecisions?.[record.runId + ':' + record.itemId];
    const ready = technicalStatus === 'success';
    return {technicalStatus, ready, decision: ready ? decision : null,
      state: ready ? decision === 'pass' ? 'passed' : decision === 'rework' ? 'rework' : 'review' : technicalStatus};
  }

  appendedRunView(run) {
    if (!run.appendedSource) return run;
    const latest = this.state.appendedRework?.[run.appendedSource.itemId];
    const record = [latest, ...(latest?.history || [])].find(value => value?.runId === run.id);
    if (!record) return run;
    const status = this.appendedRunState(record);
    return {...run, status, done: status === 'success' ? 1 : 0, running: status === 'running' ? 1 : 0,
      failed: ['failed', 'stopped', 'cancelled'].includes(status) ? 1 : 0};
  }

  appendedItemState(itemId, base) {
    const record = this.appendedRecord(itemId, base);
    if (!record) return base;
    const outcome = this.appendedOutcome(record);
    const run = (this.state.submittedRuns || []).find(value => value.id === record.runId);
    const source = {itemId, runId: record.runId, version: record.version, name: record.name || itemId, path: record.path || '',
      identity: 'run:' + record.runId + ':' + itemId, key: 'run:' + record.runId + ':' + itemId + ':' + record.version,
      ready: outcome.ready, approved: outcome.state === 'passed', branch: false, previewImage: run?.previewImage || ''};
    const candidate = {label: record.version, runId: record.runId, source, appended: true, approvedBase: record.approvedVersion,
      technicalStatus: outcome.technicalStatus, reviewStatus: outcome.state === 'review' ? 'pending' : outcome.state};
    return {...base, itemId, businessStatus: 'deliverable', currentDeliverableVersion: outcome.state === 'passed' ? candidate : record.approvedVersion,
      candidateVersion: outcome.state === 'passed' ? null : candidate, hasPendingCandidate: outcome.state === 'review',
      hasAppendedCandidate: outcome.state !== 'passed', technicalStatus: outcome.technicalStatus, reviewDecision: outcome.decision,
      appendedRecord: record};
  }

  appendedLinkState(sheet, entry) {
    const itemId = this.deliveryEntryId(entry), record = this.appendedRecord(itemId);
    if (!record || record.sheetKey !== sheet.key || !record.linkSnapshot) return null;
    const state = this.appendedItemState(itemId, {}), outcome = this.appendedOutcome(record);
    const snapshot = record.linkSnapshot;
    const toVersion = version => ({label: version.label, number: Number(version.label.replace(/\D/g, '')) || 1,
      source: version.source, ref: {runId: version.runId, itemId}, at: record.createdAt,
      technicalStatus: version.technicalStatus, rejected: version.reviewStatus === 'rework', appended: true});
    const candidate = state.candidateVersion ? toVersion(state.candidateVersion) : null;
    const current = outcome.state === 'passed' ? toVersion(state.currentDeliverableVersion) : snapshot.current;
    const history = [...snapshot.history, ...(snapshot.candidate ? [snapshot.candidate] : []),
      ...(outcome.state === 'passed' && snapshot.current ? [snapshot.current] : [])];
    return {current, candidate, history, revision: (snapshot.revision || 0) + 1 + (outcome.decision ? 1 : 0)};
  }

  sheetVersionNodes(itemId, itemState) {
    const current = itemState.currentDeliverableVersion, candidate = itemState.candidateVersion;
    const record = this.appendedRecord(itemId, itemState);
    const nodes = [], seen = new Set();
    const add = (version, state, meta) => {
      if (!version) return;
      const key = version.runId + ':' + version.label;
      if (seen.has(key)) return;
      seen.add(key);
      const labels = {current: '当前可交付', passed: '已通过', review: '待审核', rework: '要求返工', queued: '排队中', running: '运行中', failed: '运行失败', stopped: '已停止', cancelled: '已取消'};
      const tone = this.statusOf(state === 'current' || state === 'passed' || state === 'review' ? 'item' : 'run', state === 'current' ? 'deliverable' : state === 'rework' ? 'failed' : state);
      nodes.push({label: version.label, badge: labels[state] || '运行中', meta, dot: tone.dot, fg: tone.fg, border: tone.border});
    };
    if (record) {
      const previous = record.history || [];
      const oldest = previous[0]?.approvedVersion || record.approvedVersion;
      if (oldest?.runId !== current?.runId) add(oldest, 'passed', '历史已通过版本 · 产物保留');
      for (const entry of previous) {
        if (entry.runId === current?.runId) continue;
        const outcome = this.appendedOutcome(entry);
        add({label: entry.version, runId: entry.runId}, outcome.state, '追加返工 · 历史版本');
      }
    }
    add(current, 'current', '已通过审核 · 新版本通过前保持可交付');
    if (candidate) {
      const stage = candidate.reviewStatus === 'pending' ? 'review' : candidate.reviewStatus || 'queued';
      add(candidate, stage, stage === 'review' ? '新候选产物已就绪 · 等待本轮审核' : stage === 'queued' || stage === 'running' ? '追加返工已提交 · 等待新产物' : '未替换已通过版本');
    }
    nodes.sort((a, b) => (Number(a.label.replace(/\D/g, '')) || 0) - (Number(b.label.replace(/\D/g, '')) || 0));
    return nodes.map((node, index) => ({...node, line: index === nodes.length - 1 ? 'transparent' : 'var(--forge-control-border)'}));
  }

  submitSheetAppend(sheetKey, itemId, mode = 'append') {
    const sheet = this.deliverySheet(sheetKey), row = sheet && this.sheetRows(sheet).find(value => value[2] === itemId);
    if (!row) return;
    const state = row[6], previous = this.appendedRecord(itemId, state), actions = this.sheetDetailActionValues(sheetKey, itemId);
    if (mode === 'append' ? !actions.canAppendRework : !previous || !actions.canReviewCandidate) return;
    if (mode === 'review' && this.state.sheetReworkVersionKey && this.state.sheetReworkVersionKey !== actions.reviewKey) return;
    const note = String(this.state.sheetReworkText || '').trim(), feedback = this.feedbackView('sheet:' + itemId);
    if (this.state.sheetReworkAsk !== itemId || !note || feedback.loading) return;
    const source = mode === 'review' ? state.candidateVersion : state.currentDeliverableVersion;
    const sourceRun = source.source?.runId || source.runId, sourceItemId = source.source?.itemId || itemId;
    const baseReviewCount = previous?.baseReviewCount ?? this.roundsOf(itemId) + 1;
    const round = previous ? previous.round + 1 : baseReviewCount + 1;
    if (round > 20) { this.notifyTaskLink('已达到 20 轮上限，请从历史版本创建独立分支。', 'warning'); return; }
    const nextNumber = Math.max(...[state.currentDeliverableVersion?.label, state.candidateVersion?.label, previous?.version].filter(Boolean).map(label => Number(label.replace(/\D/g, '')) || 0)) + 1;
    const version = (/^v\d/.test(source.label) ? 'v' : 'Run ') + nextNumber;
    const runId = 'repair-' + Date.now() + '-' + (this._appendSequence = (this._appendSequence || 0) + 1);
    const repairKey = runId + ':' + itemId;
    const sourceRec = this.runsData().find(run => run.id === sourceRun);
    const ds = this.dsData().find(ds => ds.name === sourceRec?.dsName) || this.dsData().find(ds => ds.items.some(value => value[0] === sourceItemId));
    const attachments = this.feedbackImages('sheet:' + itemId).map(image => ({...image}));
    const entry = this.deliveryEntries(sheet).find(entry => this.deliveryEntryId(entry) === itemId);
    const record = {runId, repairKey, itemId, sheetKey, name: row[0], path: row[1], note, attachments, round, version, baseReviewCount,
      sourceRun, sourceItemId, approvedVersion: state.currentDeliverableVersion, createdAt: Date.now(), status: 'queued',
      bindingRevision: this.state.deliveryLinks?.[sheetKey]?.[itemId]?.revision || 0,
      linkSnapshot: entry ? this.deliveryLinkState(sheet, entry) : null,
      history: previous ? [...(previous.history || []), {...previous, history: undefined, linkSnapshot: undefined}] : []};
    const run = {id: runId, name: row[0] + ' · ' + version, subject: row[0], strategy: '追加返工', artifactVersion: version,
      pipe: sourceRec?.pipe || '', ver: sourceRec?.ver || '', dsName: ds?.name || '', owner: this.props.currentUser || '一万',
      h: 0, n: 1, done: 0, running: 0, failed: 0, cost: '$0.00', status: 'queued', itemIds: [itemId],
      itemMeta: [[itemId, row[0], '3D', '', row[0]]], appendedSource: {sheetKey, itemId, runId: sourceRun, inputItemId: sourceItemId}, note, attachments};
    const decisions = {...this.state.reviewDecisions};
    if (mode === 'review') decisions[source.runId + ':' + itemId] = 'rework';
    this.setState({appendedRework: {...this.state.appendedRework, [itemId]: record}, submittedRuns: [...(this.state.submittedRuns || []), run],
      repairRuns: {...this.state.repairRuns, [repairKey]: {runId, itemId, sourceRun, status: 'queued', createdAt: record.createdAt, note, attachments}},
      ...(mode === 'review' ? {reviewDecisions: decisions} : {}),
      sheetReworkAsk: null, sheetReworkText: '', sheetReworkMode: null, sheetReworkVersionKey: null, sheetPassAsk: null,
      reviewToast: '已创建 ' + version + ' 返工任务；原审核结论保留，产物就绪后可审核', reviewToastAt: Date.now()});
  }
  // appended-review:end
