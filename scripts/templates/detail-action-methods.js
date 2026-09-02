  // detail-actions:start
  sheetDetailActionValues(sheetKey, itemId) {
    const sheet = this.deliverySheet(sheetKey);
    const row = sheet && this.sheetRows(sheet).find(value => value[2] === itemId);
    const item = row && (row[6] || this.itemStateOf(itemId, { legacy: row[3], runId: row[5] }));
    const record = this.appendedRecord(itemId, item || {});
    const outcome = record && this.appendedOutcome(record);
    const activeAppend = !!record && outcome.state !== 'passed';
    const approvedDetail = !!row && row[3] === 'passed' && !item.hasPendingCandidate && !activeAppend;
    const round = record?.round ?? (row ? this.roundsOf(itemId) + (row[3] === 'passed' ? 1 : 0) : 0);
    const appended = !!record && outcome.state !== 'passed';
    const canAppendRework = approvedDetail && round > 0 && round < 20 && !appended;
    const approvedVersion = item?.currentDeliverableVersion;
    const canReviewCandidate = !!item?.hasPendingCandidate && (!record || outcome.ready && !outcome.decision);
    const candidate = item?.candidateVersion;
    const reviewKey = candidate ? candidate.runId + ':' + (candidate.source?.itemId || itemId) : '';
    const statusLabels = {queued: '排队中', running: '运行中', failed: '运行失败', stopped: '已停止', cancelled: '已取消', review: '待审核候选', rework: '要求返工', passed: '已通过审核'};
    const label = outcome ? statusLabels[outcome.state] || '运行中' : item?.hasPendingCandidate ? '待审核候选' : approvedDetail ? '已通过审核' : this.statusOf('item', item?.businessStatus).label;
    const hint = activeAppend ? record.version + (canReviewCandidate ? ' 产物已就绪，可审核；' : ' ' + label + '，产物就绪后可审核；') + (approvedVersion?.label || '已通过版本') + ' 仍可交付。' : '';
    const tone = activeAppend && !canReviewCandidate ? this.statusOf('run', outcome.state) : this.statusOf('item', canReviewCandidate ? 'review' : item?.businessStatus);
    return {
      approvedDetail, canAppendRework, cannotAppendRework: !canAppendRework,
      needsReview: !!item?.hasPendingCandidate || activeAppend, canReviewCandidate, cannotReviewCandidate: !canReviewCandidate, reviewKey,
      state: label, fg: tone.fg, border: tone.border,
      previewCaption: row?.[0] + ' · ' + (activeAppend ? record.version + (canReviewCandidate ? ' · 待审核产物' : ' · 等待新产物') : item?.hasPendingCandidate ? '待审核候选' : approvedDetail ? '最终产物' : '当前产物'),
      hasReviewActionHint: activeAppend, reviewActionHint: hint,
      showAppendRun: !!record && (this.state.submittedRuns || []).some(run => run.id === record.runId),
      openAppendRun: event => {event?.stopPropagation(); if (record) this.setState({view: 'run', activeRun: record.runId});},
      ...(record ? {roundSummary: '当前可交付版本：' + approvedVersion.label + (activeAppend ? ' · 新版本：' + record.version + ' · ' + label : ' · 已通过审核'),
        appendedRounds: [...(record.history || []), record].map(entry => {
          const status = this.appendedOutcome(entry), stateLabel = statusLabels[status.state] || '运行中';
          return {title: '第 ' + entry.round + ' 轮', label: entry.version + ' · ' + stateLabel, who: '一万 · 追加返工', note: entry.note,
            approved: status.state === 'passed', fg: status.state === 'passed' ? 'var(--forge-success)' : 'var(--forge-muted)'};
        })} : {appendedRounds: []}),
      approvedRunId: approvedVersion?.source?.runId || approvedVersion?.runId || row?.[5] || null,
      approvedSourceItemId: approvedVersion?.source?.itemId || itemId,
      showHistoryAction: !!row?.[5] && !record && !approvedDetail && !item.hasPendingCandidate && round >= 20,
      appendHint: appended ? '已有追加返工任务，请等待运行完成' : round >= 20 ? '已达到 20 轮上限，可从历史版本创建独立分支' : '保留已通过版本，追加一轮返工 · 已用 ' + round + ' / 20 轮',
      appendRework: event => {
        event?.stopPropagation();
        if (!this.sheetDetailActionValues(sheetKey, itemId).canAppendRework) return;
        this.openSheetFeedback(itemId, 'append');
      },
      download: event => {
        event?.stopPropagation();
        if (!this.sheetDetailActionValues(sheetKey, itemId).approvedDetail) return;
        const currentRow = this.sheetRows(this.deliverySheet(sheetKey)).find(value => value[2] === itemId);
        const version = currentRow[6]?.currentDeliverableVersion;
        const runId = version?.source?.runId || version?.runId || currentRow[5];
        const sourceItemId = version?.source?.itemId || itemId;
        const versionLabel = version?.label || '已通过版本';
        const id = ['artifact', sheetKey, itemId, runId, versionLabel].join(':');
        if (this.state.dlQueued?.some(value => value.id === id)) {
          this.notifyTaskLink('该版本已在下载列表中。', 'info'); return;
        }
        this.setState({ dlQueued: [...(this.state.dlQueued || []), {
          id, name: currentRow[0] + ' · ' + versionLabel, sheetKey, itemId, sourceItemId, runId, version: versionLabel,
          meta: '本地演示 · 已加入下载列表，未接入产物下载服务', state: 'running', pct: 0
        }] });
        this.notifyTaskLink('已加入下载列表（本地演示，暂不生成下载文件）。', 'info');
      }
    };
  }
  // detail-actions:end
