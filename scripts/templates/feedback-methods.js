  // feedback-workflows:start
  feedbackImages(key) {
    return (this.state.feedbackImages || {})[key] || [];
  }

  setFeedbackImages(key, images, error) {
    this.setState({
      feedbackImages: Object.assign({}, this.state.feedbackImages, { [key]: images }),
      feedbackErrors: Object.assign({}, this.state.feedbackErrors, { [key]: error || '' })
    });
  }

  async addFeedbackImages(key, files) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    let images = this.feedbackImages(key).slice();
    const accepted = [], errors = [];
    for (const file of Array.from(files || [])) {
      if (!allowed.includes(file.type)) { errors.push('仅支持 PNG、JPG、WebP 或 GIF 图片。'); continue; }
      if (!file.size || file.size > 10 * 1024 * 1024) { errors.push('单张图片须大于 0 且不超过 10 MB。'); continue; }
      if (images.length >= 6) { errors.push('最多添加 6 张图片，请先移除不需要的图片。'); break; }
      const id = 'attachment-' + Date.now() + '-' + (this._feedbackSequence = (this._feedbackSequence || 0) + 1);
      const entry = { id, name: file.name || '粘贴图片.png', size: file.size, type: file.type, url: '', loading: true };
      images.push(entry); accepted.push({ entry, file });
    }
    this.setFeedbackImages(key, images, [...new Set(errors)].join(' '));
    await Promise.all(accepted.map(async ({ entry, file }) => {
      try {
        const url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('读取失败'));
          reader.onabort = () => reject(new Error('读取已取消'));
          reader.readAsDataURL(file);
        });
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => img.naturalWidth ? resolve() : reject(new Error('图片无效'));
          img.onerror = () => reject(new Error('图片无效'));
          img.src = url;
        });
        if (this._feedbackUnmounted) return;
        const current = this.feedbackImages(key);
        if (!current.some(image => image.id === entry.id)) return;
        this.setFeedbackImages(key, current.map(image => image.id === entry.id ? Object.assign({}, image, { url, loading: false }) : image), (this.state.feedbackErrors || {})[key]);
      } catch (_) {
        if (this._feedbackUnmounted || !this.feedbackImages(key).some(image => image.id === entry.id)) return;
        this.setFeedbackImages(key, this.feedbackImages(key).filter(image => image.id !== entry.id), '无法读取「' + entry.name + '」，请重新选择有效图片。');
      }
    }));
  }

  feedbackView(key) {
    const images = this.feedbackImages(key);
    return {
      images: images.map(img => Object.assign({}, img, {
        ready: !img.loading, sizeLabel: img.loading ? '正在读取…' : (img.size >= 1048576 ? (img.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(img.size / 1024)) + ' KB'),
        removeLabel: '移除 ' + img.name,
        remove: e => { e?.stopPropagation(); this.setFeedbackImages(key, this.feedbackImages(key).filter(x => x.id !== img.id), ''); }
      })),
      count: images.length + ' / 6', full: images.length >= 6,
      countLabel: '已上传 ' + images.length + '/6 张', remaining: Math.max(0, 6 - images.length),
      uploadLabel: images.length >= 6 ? '已达 6 张上限' : '点击上传图片',
      capacityHint: images.length >= 6 ? '移除一张后可继续上传' : '还可上传 ' + (6 - images.length) + ' 张',
      loading: images.some(img => img.loading),
      error: (this.state.feedbackErrors || {})[key] || '',
      hasError: !!(this.state.feedbackErrors || {})[key],
      upload: e => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        return this.addFeedbackImages(key, files);
      }
    };
  }

  handleFeedbackPaste(e) {
    const s = this.state;
    const key = s.branchAsk ? s.branchAsk.attachmentKey
      : s.view === 'review' && s.reviewOpen && s.reworkDrafts?.[s.reviewOpen] && !s.passAsk && !s.zoom ? s.reviewOpen
      : s.view === 'sheet' && s.sheetReworkAsk && s.sheetReworkAsk === s.sheetRow && !s.sheetPassAsk && !s.zoom ? 'sheet:' + s.sheetRow : null;
    if (!key) return;
    const files = Array.from(e.clipboardData?.items || []).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter(Boolean);
    if (!files.length) return;
    e.preventDefault();
    return this.addFeedbackImages(key, files);
  }

  submitInlineRework(key, sourceRun) {
    const s = this.state, note = String(s.reworkNotes?.[key] || '').trim();
    const images = this.feedbackImages(key);
    if (!s.reworkDrafts?.[key] || !note || images.some(img => img.loading) || s.reworkSent?.[key]) return;
    const drafts = Object.assign({}, s.reworkDrafts); delete drafts[key];
    this.setState({
      reworkAsk: null, reviewOpen: null, deepReview: null,
      reviewDecisions: Object.assign({}, s.reviewDecisions, { [key]: 'rework' }),
      reworkSent: Object.assign({}, s.reworkSent, { [key]: true }), reworkDrafts: drafts,
      repairRuns: Object.assign({}, s.repairRuns, { [key]: { status: 'queued', createdAt: Date.now(), sourceRun, note, attachments: images.map(img => Object.assign({}, img)) } }),
      reviewToast: '已提交返工，说明与 ' + images.length + ' 张参考图已加入修复任务', reviewToastAt: Date.now()
    });
  }

  openSheetFeedback(item, mode) {
    this.setState({ sheetReworkAsk: item, sheetReworkMode: mode, sheetReworkText: this.state.sheetReworkAsk === item ? this.state.sheetReworkText || '' : '' });
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const panel = document.querySelector('.forge-sheet-scroll');
      if (panel) panel.scrollTop = 0;
      document.querySelector('#forge-sheet-rework-note')?.focus({ preventScroll: true });
    }, 0);
  }

  branchNames(item) {
    const names = (this.state.branches?.[item] || []).map(branch => branch.name);
    Object.entries(this.state.forks || {}).filter(([key]) => key.startsWith(item + ':') || key.startsWith(item + '@')).forEach(([, branches]) => branches.forEach(branch => names.push(branch.name)));
    return new Set(names);
  }

  openBranchForm(source) {
    const rec = this.runsData().find(run => run.id === source.runId);
    const sourceItem = source.configItem || source.item;
    const ds = this.dsData().find(dataset => dataset.name === rec?.dsName)
      || this.dsData().find(dataset => dataset.items.some(item => item[0] === sourceItem));
    const sourceRow = ds?.items.find(item => item[0] === sourceItem);
    const sourceItemName = sourceRow ? this.itemTitle(sourceRow[4] || sourceItem)
      : sourceItem === source.item ? source.name : source.configItemName || sourceItem;
    const pipe = this.pipeData().find(p => p.name === rec?.pipe);
    const n = this.branchNames(source.item).size + 1;
    const siblings = (this.state.forks?.[source.historyKey] || []).filter(branch => (branch.parent || branch.derivedFrom) === source.parentName).length;
    const suffix = ' · 修改 ' + (siblings + 1);
    this.setState({
      branchAsk: Object.assign({}, source, { attachmentKey: 'branch:' + source.item + ':' + Date.now(), previewImage: rec?.previewImage || '',
        sourcePipe: rec?.pipe || '', sourceVer: rec?.ver || '', sourceDs: ds?.name || '', sourceItemName,
        sourceLabel: source.version + ' · 第 ' + source.round + ' 轮' + source.verdict,
        submitted: source.who || (rec ? (rec.owner + ' · ' + this.ago(rec.h)) : '提交信息暂缺') }),
      branchName: source.parentName ? source.parentName.slice(0, 80 - suffix.length) + suffix : source.name.slice(0, 64) + ' · 分支 B-' + String(n).padStart(2, '0'), branchNote: '', branchConfigOpen: false,
      branchPipe: pipe?.name || '', branchVer: rec?.ver || pipe?.version || '', branchDs: ds?.name || '', branchItem: sourceItem
    });
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const dialog = document.querySelector('.forge-branch-dialog');
      if (this.state.branchAsk && dialog && !dialog.open) dialog.showModal();
    }, 0);
  }

  cancelBranchForm(e) {
    e?.stopPropagation(); e?.preventDefault();
    const key = this.state.branchAsk?.attachmentKey;
    if (typeof document !== 'undefined') document.querySelector('.forge-branch-dialog')?.close();
    if (key) this.setFeedbackImages(key, [], '');
    this.setState({ branchAsk: null, branchName: '', branchNote: '', branchConfigOpen: false });
  }

  branchFormValues() {
    const s = this.state, source = s.branchAsk;
    if (!source) return { open: false, images: [], pipelines: [], datasets: [], items: [], disabled: true };
    const pipe = this.pipeData().find(p => p.name === s.branchPipe);
    const datasets = pipe ? this.dsData().filter(ds => (pipe.datasets || []).some(x => x[0] === ds.name)) : [];
    const ds = datasets.find(ds => ds.name === s.branchDs);
    const items = (ds?.items || []).map(item => ({ value: item[0], name: this.itemTitle(item[4] || item[0]) }));
    const sourceItem = source.configItem || source.item;
    // The dataset picker is a partial catalog. Retain the exact source-run Item
    // in its original dataset without adding it to other datasets or the catalog.
    if (ds && ds.name === source.sourceDs && sourceItem && !items.some(item => item.value === sourceItem)) {
      items.unshift({ value: sourceItem, name: source.sourceItemName || sourceItem });
    }
    const selected = items.find(item => item.value === s.branchItem);
    const feedback = this.feedbackView(source.attachmentKey);
    const valid = !!pipe && !!ds && !!selected;
    const duplicate = this.branchNames(source.item).has(String(s.branchName || '').trim());
    const sourceError = this.historyBranchSourceIssue(source);
    const disabled = !String(s.branchName || '').trim() || !String(s.branchNote || '').trim() || !valid || duplicate || feedback.loading || !!sourceError;
    return Object.assign({}, feedback, {
      open: true, title: '从 ' + source.version + (source.historyKey ? ' 追加修改' : ' 创建独立分支'),
      subtitle: '基于第 ' + source.round + ' 轮产物继续迭代 · ' + source.verdict,
      sourceLabel: source.sourceLabel, submitted: source.submitted,
      previewImage: source.previewImage, hasPreview: !!source.previewImage, noPreview: !source.previewImage,
      name: s.branchName || '', note: s.branchNote || '',
      onName: e => this.setState({ branchName: e.target.value }), onNote: e => this.setState({ branchNote: e.target.value }),
      nameError: duplicate ? '已有同名分支，请修改名称。' : '', duplicate,
      pipe: s.branchPipe || '', ds: s.branchDs || '', item: s.branchItem || '',
      configuration: 'Pipeline  ' + (s.branchPipe ? s.branchPipe + ' ' + (s.branchVer || '') : '未选') + '   ·   Dataset  ' + (s.branchDs || '未选') + '   ·   Item  ' + (selected?.name || s.branchItem || '未选'),
      configOpen: !!s.branchConfigOpen, configLabel: s.branchConfigOpen ? '收起配置' : '更换配置',
      configHeading: s.branchPipe === source.sourcePipe && s.branchVer === source.sourceVer && s.branchDs === source.sourceDs && s.branchItem === (source.configItem || source.item) ? '沿用来源配置' : '本次运行配置',
      configRotation: s.branchConfigOpen ? '180deg' : '0deg',
      toggleConfig: () => this.setState({ branchConfigOpen: !this.state.branchConfigOpen }),
      pipelines: this.pipeData().map(p => ({ value: p.name, label: p.name + ' ' + (p.name === source.sourcePipe ? source.sourceVer : p.version), selected: p.name === s.branchPipe })),
      datasets: datasets.map(d => ({ value: d.name, label: d.name, selected: d.name === s.branchDs })),
      items: items.map(item => ({ value: item.value, label: item.name === item.value ? item.value : item.name + ' · ' + item.value, selected: item.value === s.branchItem })),
      dsDisabled: !pipe, itemDisabled: !ds,
      onPipe: e => { if (e.target.value === this.state.branchPipe) return; const p = this.pipeData().find(p => p.name === e.target.value); this.setState({ branchPipe: p?.name || '', branchVer: p?.name === source.sourcePipe ? source.sourceVer : p?.version || '', branchDs: '', branchItem: '' }); },
      onDs: e => { if (e.target.value !== this.state.branchDs) this.setState({ branchDs: e.target.value, branchItem: '' }); },
      onItem: e => this.setState({ branchItem: e.target.value }),
      invalidConfig: !valid || !!sourceError, configError: sourceError || (!pipe ? '请选择 Pipeline。' : !ds ? '请选择此 Pipeline 关联的数据集。' : !selected ? '请选择数据集里的 Item。' : ''),
      disabled, cancel: e => this.cancelBranchForm(e), create: e => { e?.stopPropagation(); this.createBranchRun(); },
      backdrop: e => { if (e.target === e.currentTarget) this.cancelBranchForm(e); }
    });
  }

  createBranchRun() {
    if (!this.state.branchAsk || this.branchFormValues().disabled) return;
    const s = this.state, source = s.branchAsk;
    const id = 'branch-' + Date.now() + '-' + (this._branchSequence = (this._branchSequence || 0) + 1);
    const attachments = this.feedbackImages(source.attachmentKey).map(img => Object.assign({}, img));
    const config = { pipeline: s.branchPipe, version: s.branchVer, dataset: s.branchDs, item: s.branchItem };
    const record = { name: s.branchName.trim(), note: s.branchNote.trim(), from: source.sourceLabel, at: '刚刚', state: '排队中',
      runId: id, sourceItem: source.item, sourceRunId: source.runId, sourceVersion: source.version, sourceRound: source.round, config, attachments };
    const run = { id, name: record.name, subject: record.name, strategy: '独立分支', pipe: config.pipeline, ver: config.version,
      owner: this.props.currentUser || '一万', h: 0, n: 1, done: 0, running: 0, failed: 0, cost: '$0.00', status: 'queued',
      itemIds: [config.item], dsName: config.dataset, dsVersion: this.dsData().find(d => d.name === config.dataset)?.version || 'v1',
      branchSource: { item: source.item, runId: source.runId, version: source.version, round: source.round }, note: record.note, attachments };
    const historyKey = source.historyKey || source.item + ':' + source.version;
    const historyList = (s.forks?.[historyKey] || []).concat([Object.assign({}, record, {
      text: record.note, parent: source.parentName || null, at: Date.now(), state: 'queued',
      origin: source.origin || {label: '基于 ' + source.sourceLabel, where: source.version, run: source.version, verdict: source.verdict}
    })]);
    this.setState({ branches: Object.assign({}, s.branches, { [source.item]: (s.branches?.[source.item] || []).concat([record]) }),
      forks: Object.assign({}, s.forks, {[historyKey]: historyList}), branchOpen: historyKey + '#' + (historyList.length - 1),
      lifeNodes: Object.assign({}, s.lifeNodes, {[source.historyDisplayKey || historyKey]: true}),
      submittedRuns: (s.submittedRuns || []).concat([run]), reviewToast: '已创建分支「' + record.name + '」，运行已进入队列', reviewToastAt: Date.now() });
    this.cancelBranchForm();
    this.notifyTaskLink((source.historyKey ? '已追加修改，分支「' : '分支「') + record.name + '」已进入运行队列；原版本保持不变，完成后可手动关联交付 Item。', 'info', { label: '查看分支状态', runId: id });
  }
  // feedback-workflows:end
