  // history-branch-tree:start
  historyBranchStatus(branch) {
    const run = this.runsData().find(value => value.id === branch.runId);
    if (branch.state === 'deliverable' || branch.state === 'passed') return 'deliverable';
    if (run?.branchSource) {
      if (run.status === 'success') return 'review';
      if (run.status === 'partial' || run.status === 'failed') return 'failed';
      if (run.status === 'queued' || run.status === 'running') return run.status;
    }
    return branch.state === 'success' ? 'review' : branch.state || 'running';
  }

  canAppendHistoryBranch(key, name) {
    const branch = (this.state.forks?.[key] || []).find(value => value.name === name);
    return !!branch && ['review', 'deliverable'].includes(this.historyBranchStatus(branch));
  }

  historyBranchSourceIssue(source) {
    if (!source?.historyKey || !source.parentName) return '';
    return this.canAppendHistoryBranch(source.historyKey, source.parentName) ? '' : '来源分支尚未完成或已移除，请选择有可用产物的版本。';
  }

  openHistoryBranch(source) {
    if (this.historyBranchSourceIssue(source)) return;
    this.openBranchForm(source);
  }

  historyBranchNodeValues(context) {
    const { item, name, runId, key, kind, origin, parent } = context;
    const historyKey = parent?.key || key;
    const parentRecord = parent && (this.state.forks?.[historyKey] || []).find(value => value.name === parent.name);
    const source = {
      item, name, runId: parentRecord?.runId || runId, configItem: parentRecord?.config?.item || item,
      version: parentRecord ? parentRecord.name + ' · Run 1' : origin.run || kind,
      round: Number((/^审核 (\d+)$/.exec(kind) || [])[1]) || Math.max(1, Number((/Run (\d+)/.exec(origin.run || kind) || [])[1]) - 1),
      verdict: parentRecord ? this.statusOf('item', this.historyBranchStatus(parentRecord)).label : origin.verdict,
      historyKey, historyDisplayKey: key, parentName: parentRecord?.name || null, origin, historyNodeKind: parent?.trunkKind || kind
    };
    const tree = this.historyBranchTree(item, historyKey, { name, origin, runId, kind, trunkKind: parent?.trunkKind || parent?.fromKind || kind, displayKey: key, parentName: parentRecord?.name || null });
    return {
      appendDisabled: !!parent && !this.canAppendHistoryBranch(historyKey, parent.name),
      appendHint: parent && !this.canAppendHistoryBranch(historyKey, parent.name) ? '运行完成并有可用产物后可追加修改' : '以此版本为来源创建独立分支，原版本保持不变',
      append: event => { event?.stopPropagation(); this.openHistoryBranch(source); },
      hasForks: context.canFork && tree.length > 0, tree,
      forkGroupLabel: '派生分支 · ' + tree.length + ' 条', bodyFlex: '1 1 100%'
    };
  }

  historyBranchTree(item, key, context = {}) {
    const records = this.state.forks?.[key] || [], result = [], visited = new Set();
    const byName = new Map(records.map(record => [record.name, record]));
    const parentOf = record => record.parent || record.derivedFrom || null;
    const walk = (siblings, depth, guides) => siblings.forEach((record, index) => {
      if (visited.has(record)) return;
      visited.add(record);
      const position = records.indexOf(record), cardKey = key + '#' + position, last = index === siblings.length - 1;
      const children = records.filter(value => parentOf(value) === record.name && value !== record);
      const state = this.historyBranchStatus(record);
      const tone = this.statusOf(['queued', 'running', 'failed'].includes(state) ? 'run' : 'item', state);
      const run = this.runsData().find(value => value.id === record.runId);
      const active = state === 'running';
      const previewImage = record.previewImage || (run?.branchSource ? run.previewImage : '') || '';
      const currentStep = state === 'deliverable' ? 2 : state === 'review' ? 1 : 0;
      const expanded = this.state.branchOpen === cardKey;
      const parentName = parentOf(record), origin = record.origin || context.origin || {};
      const openRun = event => { event?.stopPropagation(); if (this.runsData().some(run => run.id === record.runId)) this.setState({view: 'run', activeRun: record.runId, runItem: null}); };
      const ancestry = parentName ? '源自 ' + parentName : origin.label || ('源自 ' + context.kind);
      result.push({
        cardKey, name: record.name, depth, visualDepth: Math.min(depth, 5), last, hasChildren: children.length > 0,
        guides: guides.filter(value => value < 5).map(value => ({depth: value})),
        origin: ancestry, description: record.text || record.note || '未填写修改说明',
        stateLabel: tone.label, stateFg: active ? 'var(--forge-accent)' : tone.fg,
        stateBorder: active ? 'var(--forge-branch-border)' : tone.border, stateDot: active ? 'var(--forge-accent)' : tone.dot,
        steps: [state === 'queued' ? '排队中' : state === 'failed' ? '运行失败' : '运行中', '待审核', '可交付'].map((label, index) => ({
          label, active: index === currentStep, complete: index < currentStep, hasNext: index < 2,
          fg: state === 'failed' && index === currentStep ? 'var(--forge-danger)' : state === 'deliverable' && index === currentStep ? 'var(--forge-success)' : 'var(--forge-accent)'
        })),
        previewImage, hasPreviewImage: !!previewImage, noPreviewImage: !previewImage,
        previewLabel: state === 'queued' || state === 'running' ? '等待分支产物' : '暂无分支预览',
        sourceWhere: origin.where || context.kind || '—', sourceVersion: record.sourceVersion || origin.run || context.kind || '—',
        sourceVerdict: origin.verdict || '未经审核', creator: record.createdBy || (run?.branchSource ? run.owner : '') || '—',
        createdAt: typeof record.at === 'number' ? this.stampOf(record.at) : record.at || '—', branchItemId: this.branchIid(item, record.name),
        expanded, detailsId: 'branch-detail-' + Array.from(key).map(char => char.codePointAt(0).toString(16)).join('-') + '-' + position,
        toggle: () => this.setState({branchOpen: expanded ? null : cardKey, discardAsk: null}),
        toggleLabel: (expanded ? '收起' : '展开') + '修改详情 · ' + record.name,
        created: this.sinceLabel(record.at), runId: record.runId || '暂无运行记录',
        configuration: record.config ? record.config.pipeline + ' ' + record.config.version + ' · ' + record.config.dataset : '沿用来源配置',
        itemId: record.config?.item || item,
        attachments: (record.attachments || []).map(image => ({name: image.name, url: image.url})),
        hasAttachments: !!record.attachments?.length,
        canOpenRun: this.runsData().some(run => run.id === record.runId), openRun,
        appendDisabled: !this.canAppendHistoryBranch(key, record.name),
        appendHint: this.canAppendHistoryBranch(key, record.name) ? '基于此分支的产物追加修改' : '运行完成并有可用产物后可追加修改',
        append: event => { event?.stopPropagation(); this.openHistoryBranch({
          item, name: context.name || record.name, runId: record.runId || context.runId, configItem: record.config?.item || item,
          version: record.name + ' · Run 1', round: record.sourceRound || 1, verdict: tone.label,
          historyKey: key, historyDisplayKey: context.displayKey || key, parentName: record.name, historyNodeKind: context.trunkKind || context.kind,
          origin: {label: '基于 ' + record.name + ' 的产物', where: record.name, run: record.name + ' · Run 1', verdict: tone.label}
        }); },
        openRecord: event => { event?.stopPropagation(); this.setState({view: 'itemlife', lifeItem: item,
          lifeBranch: {owner: item, key, name: record.name, text: record.text || record.note, parent: parentName,
            fromKind: context.trunkKind || context.kind, trunkKind: context.trunkKind || context.kind, origin, at: record.at}, lifeNodes: {}, lifeAll: false}); },
        canLink: state === 'review' || state === 'deliverable',
        link: event => { event?.stopPropagation(); this.openTaskLink({itemId: item, forkKey: key, forkName: record.name, sheetKey: this.state.sheetKey}); },
        discardAsking: this.state.discardAsk === cardKey,
        askDiscard: () => this.setState({discardAsk: cardKey, branchOpen: cardKey}),
        cancelDiscard: () => this.setState({discardAsk: null}),
        discard: () => this.discardHistoryBranch(item, key, record.name)
      });
      walk(children, depth + 1, last ? guides : guides.concat(depth));
    });
    const roots = context.parentName ? records.filter(record => parentOf(record) === context.parentName)
      : records.filter(record => !parentOf(record) || !byName.has(parentOf(record)));
    walk(roots, 0, []);
    // Older local drafts can contain disconnected/cyclic parent links. Keep them visible once.
    if (!context.parentName) walk(records.filter(record => !visited.has(record)), 0, []);
    return result;
  }

  discardHistoryBranch(item, key, name) {
    const records = this.state.forks?.[key] || [], position = records.findIndex(record => record.name === name);
    if (position < 0 || this.state.discardAsk !== key + '#' + position) return;
    const removed = new Set([name]);
    for (let i = 0; i < records.length; i++) records.forEach(record => { if (removed.has(record.parent || record.derivedFrom)) removed.add(record.name); });
    const runIds = new Set(records.filter(record => removed.has(record.name)).map(record => record.runId).filter(Boolean));
    this.setState({forks: Object.assign({}, this.state.forks, {[key]: records.filter(record => !removed.has(record.name))}),
      branches: Object.assign({}, this.state.branches, {[item]: (this.state.branches?.[item] || []).filter(record => !runIds.has(record.runId))}),
      discardAsk: null, branchOpen: null});
    this.notifyTaskLink('已移除 ' + removed.size + ' 条分支记录；原运行和主线保持不变。', 'info');
  }
  // history-branch-tree:end
