  // pm-review-queue-methods:start
  reviewQueueClaim(row) {
    const key = row.key;
    if (Object.prototype.hasOwnProperty.call(this.state.reviewClaims || {}, key)) return this.state.reviewClaims[key];
    // Local prototype fixtures: assignment alone does not mean a task is claimed.
    // These two existing Items demonstrate ongoing work without a new backend.
    return ['701f39aa8af242e2a322670c1d4b8e95', '9f2a7c1b5e8d4036a1c4e7b209d6f8a3'].includes(String(row.meta[0])) ? row.assignee : '';
  }
  reviewQueueAction(row, mode) {
    return async event => {
      event?.stopPropagation();
      if (this.state.queueBusy || mode === 'reviewing') return;
      this.setState({ queueBusy: row.key, queueError: '' });
      try {
        await new Promise(resolve => setTimeout(resolve, 120));
        if (mode === 'progress') {
          this.setState({ queueBusy: '', view: 'run', activeRun: row.rec.id });
          return;
        }
        const me = this.props.currentUser || '一万';
        const claim = this.reviewQueueClaim(row);
        if (claim) throw Error('该任务已由 ' + claim + ' 领取，正在审核中。');
        if (this.state.reworkDrafts?.[row.key]) throw Error('该任务已有审核草稿，正在审核中。');
        if ((this.state.reviewDecisions || {})[row.key] === 'pass' || this.state.reworkSent?.[row.key]) throw Error('该任务已有审核结果，请刷新后查看。');
        this.setState({ queueBusy: '', reviewClaims: { ...this.state.reviewClaims, [row.key]: me } });
        this.openReviewFocus(row.key);
      } catch (error) {
        this.setState({ queueBusy: '', queueError: error.message || '暂时无法打开任务，请刷新后重试。' });
      }
    };
  }
  reviewQueueValues({ rows, records, review, recs, runOfItem, me }) {
    const st = this.state;
    const now = Date.now();
    const submittedAt = this._queueClock || (this._queueClock = now);
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const eq = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    const decided = st.reviewDecisions || {};
    const pending = rows.filter(r => !(decided[r.key] === 'pass' || decided[r.key] === 'rework' && st.reworkSent?.[r.key]));
    const patch = values => this.setState({ queuePage: 1, reviewOpen: null, deepReview: null, ...values });
    const reset = () => patch({ reviewOwner: 'all', reviewQuery: '', reviewSort: 'newest', queueType: 'all', queueRound: 'all', queueToday: false });
    const type = ['first', 'rework'].includes(st.queueType) ? st.queueType : 'all';
    const round = ['1', '2', '3'].includes(String(st.queueRound)) ? String(st.queueRound) : 'all';
    const owner = st.reviewOwner === 'mine' ? 'mine' : 'all';
    const query = String(st.reviewQuery || '').trim().toLowerCase();
    const done = st.reviewPhase === 'done' || review.isDone;
    const time = stamp => {
      if (!stamp) return '历史记录';
      const h = Math.max(0, (now - stamp) / 3600000);
      if (h < 1) return '刚刚提交';
      if (h < 24) return (Number(h.toFixed(1))) + ' 小时前';
      const d = new Date(stamp), yesterday = new Date(todayStart); yesterday.setDate(yesterday.getDate() - 1);
      const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      return stamp >= +yesterday && stamp < +todayStart ? '昨天 ' + hh : String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ' + hh;
    };
    const fullTime = stamp => stamp ? new Date(stamp).toLocaleString('zh-CN', { hour12: false }) : '历史审核未提供精确时间';
    const thumb = (id, run) => {
      const manifest = this.props.artifacts?.[id]?.[run?.id] || run?.artifactsByItem?.[id];
      const image = manifest?.thumbnail || (manifest?.files || []).find(f => /image\//.test(f.mime || f.type || '') || /\.(png|jpe?g|webp)(\?|$)/i.test(f.url || ''))?.url;
      return this.taskLinkPreview(run?.itemPreviews?.[id] || image || (run?.n === 1 ? run.previewImage : '') || '');
    };
    const details = (id, run, dataset, verdict) => event => {
      event?.stopPropagation();
      this.setState({ view: 'itemlife', lifeItem: id, lifeRun: run || null, sheetKey: null, lifeFrom: 'review', lifeVerdict: verdict || null, lifeDs: dataset || null });
    };
    const list = pending.map(r => {
      const id = String(r.meta[0]), n = r.priorRounds + 1, claim = this.reviewQueueClaim(r);
      const mine = eq(claim, me), reviewing = !!claim || !!st.reworkDrafts?.[r.key];
      const blocked = r.failed || ['running', 'queued', 'failed', 'stopped'].includes(r.itemState?.technicalStatus);
      const mode = reviewing ? 'reviewing' : blocked ? 'progress' : 'start';
      const title = r.meta[4]?.split(' · ')[0] || r.meta[1] || id;
      const preview = thumb(id, r.rec);
      const stamp = submittedAt - (Number(r.rec?.h) || 0) * 3600000;
      const issue = n > 1 ? r.history?.[r.history.length - 1]?.note || '' : '';
      return { key: r.key, id, title, dataset: r.ds?.name || '未关联数据集', runId: r.rec.id, n, stamp,
        type: n > 1 ? 'rework' : 'first', assignee: claim || r.assignee, person: r.author, initial: Array.from(r.author)[0].toUpperCase(),
        badge: reviewing ? '审核中' : n > 1 ? '返工复审' : '首次审核', tone: reviewing ? 'working' : n > 1 ? 'rework' : 'neutral',
        roundLabel: '第 ' + n + ' 轮', timeLabel: time(stamp), timeFull: fullTime(stamp),
        issue: issue ? '上次问题：' + issue : '', hasIssue: !!issue,
        preview, hasPreview: !!preview, noPreview: !preview, imageError:()=>this.taskLinkImageError(preview), is3D: !!r.ds?.web3d, isWeb: !r.ds?.web3d,
        owned: mine, actionTone: mode, actionLabel: st.queueBusy === r.key ? '打开中…' : ({start:'开始审核', reviewing:'审核中', progress:'查看进度'})[mode],
        busy: st.queueBusy === r.key, actionDisabled: reviewing || st.queueBusy === r.key, action: this.reviewQueueAction(r, mode), open: this.reviewQueueAction(r, mode),
        hasHistory: false, history: details(id, r.rec.id, r.ds?.name), claimLabel: reviewing ? (claim || '当前用户') + ' 正在审核' : blocked ? '产物尚不可审核，可查看运行进度' : '尚未领取' };
    });
    // Reuse completed records and the authored prior-round feedback. Never invent
    // timestamps for old feedback; undated rounds stay outside today's count.
    this._queueRecordTimes ||= {};
    const results = records.map(r => {
      const raw = rows.find(x => String(x.meta[0]) === String(r.id));
      const runId = raw?.rec?.id || runOfItem[r.id] || '';
      const n = Number(r.round?.match(/\d+/)?.[0]) || 1;
      const key = r.id + ':' + n + ':' + r.verdict;
      const stamp = this._queueRecordTimes[key] || (this._queueRecordTimes[key] = r.at);
      const passed = /通过/.test(r.verdict), preview = thumb(r.id, raw?.rec);
      return { key, id: r.id, title: r.name, dataset: raw?.ds?.name || this.dsData().find(d => d.items.some(x => String(x[0]) === String(r.id)))?.name || '未关联数据集',
        runId, n, stamp, type: n > 1 ? 'rework' : 'first', person: r.reviewer, assignee: r.reviewer,
        initial: Array.from(r.reviewer)[0].toUpperCase(), badge: passed ? '已通过' : '请求修改', tone: passed ? 'passed' : 'rework',
        roundLabel: '第 ' + n + ' 轮', timeLabel: time(stamp).replace('刚刚提交', '刚刚审核'), timeFull: fullTime(stamp),
        preview, hasPreview: !!preview, noPreview: !preview, imageError:()=>this.taskLinkImageError(preview), is3D: !!raw?.ds?.web3d, isWeb: !raw?.ds?.web3d,
        hasIssue: false, owned: false, actionTone: 'result', actionLabel: '查看结果', actionDisabled: false, busy: false,
        action: r.open, open: r.open, hasHistory: true, history: details(r.id, runId, raw?.ds?.name, passed ? 'pass' : 'rework') };
    });
    rows.forEach(r => (r.history || []).forEach((h, index) => {
      const id = String(r.meta[0]), n = index + 1;
      if (results.some(x => x.id === id && x.n === n)) return;
      const person = h.who.split(' 审核')[0], open = details(id, r.rec.id, r.ds?.name, 'rework');
      results.push({ key: r.key + ':history:' + n, id, title: r.meta[4]?.split(' · ')[0] || r.meta[1], dataset: r.ds?.name || '未关联数据集', runId: r.rec.id,
        n, stamp: null, type: n > 1 ? 'rework' : 'first', person, assignee: person, initial: Array.from(person)[0].toUpperCase(),
        badge: '请求修改', tone: 'rework', roundLabel: '第 ' + n + ' 轮', timeLabel: '历史记录', timeFull: '历史审核未提供精确时间',
        preview: '', hasPreview: false, noPreview: true, is3D: !!r.ds?.web3d, isWeb: !r.ds?.web3d,
        hasIssue: false, owned: false, actionTone: 'result', actionLabel: '查看结果', actionDisabled: false, busy: false, action: open, open, hasHistory: true, history: open });
    }));
    const today = results.filter(r => r.stamp >= +todayStart && r.stamp <= now).length;
    const source = done ? results : list;
    const filtered = source.filter(r => (!query || [r.title, r.id, r.runId].join(' ').toLowerCase().includes(query))
      && (owner === 'all' || eq(r.assignee, me)) && (type === 'all' || r.type === type)
      && (round === 'all' || (round === '3' ? r.n >= 3 : r.n === Number(round)))
      && (!done || !st.queueToday || r.stamp >= +todayStart && r.stamp <= now))
      .sort((a, b) => a.stamp === null ? 1 : b.stamp === null ? -1 : st.reviewSort === 'oldest' ? a.stamp - b.stamp : b.stamp - a.stamp);
    const size = [10,20,50].includes(Number(st.queuePageSize)) ? Number(st.queuePageSize) : 10;
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    const page = Math.min(pages, Math.max(1, Number(st.queuePage) || 1));
    const hasFilters = !!query || owner !== 'all' || type !== 'all' || round !== 'all' || st.reviewSort === 'oldest' || !!st.queueToday;
    if (!done && review.focused) {
      const navigable = filtered.filter(r => r.actionTone !== 'progress' && !r.actionDisabled);
      const index = navigable.findIndex(r => r.key === st.reviewOpen);
      review.positionLabel = (index < 0 ? 0 : index + 1) + ' / ' + navigable.length;
      review.cannotSwitch = navigable.length < 2;
      const move = delta => { if(navigable.length > 1) return navigable[(Math.max(0,index)+delta+navigable.length)%navigable.length].action(); };
      review.next = () => move(1); review.previous = () => move(-1);
    }
    return {
      subtitle: recs.length + ' 个运行 · ' + list.length + ' 条待处理', pending: list.length, rework: list.filter(r => r.type === 'rework').length, today,
      summary: [
        { label: '待审核', description: '尚未完成审核的条目，包含已领取和未领取的任务。点击查看待审核队列。', value: list.length, selected: !done && type === 'all', pick: () => { reset(); patch({reviewPhase:'pending'}); } },
        { label: '返工后待审', description: '待审核队列中审核轮次大于 1 的条目。点击筛选这些条目。', value: list.filter(r => r.type === 'rework').length, selected: !done && type === 'rework', pick: () => { reset(); patch({reviewPhase:'pending',queueType:'rework'}); } },
        { label: '今日已审核', description: '今天已有审核结果的条目；无准确时间的历史记录不计入。点击查看今日审核结果。', value: today, selected: done && !!st.queueToday, pick: () => { reset(); patch({reviewPhase:'done',queueToday:true}); } }
      ],
      tabs: [{ label:'待审核', count:list.length, showCount:true, selected:!done, pick:()=>patch({reviewPhase:'pending',queueToday:false}) },
        { label:'已审核', count:results.length, showCount:false, selected:done, pick:()=>patch({reviewPhase:'done',queueToday:false}) }],
      done, todayOnly: done && !!st.queueToday, clearToday:()=>patch({queueToday:false}),
      query: st.reviewQuery || '', onQuery: e=>patch({reviewQuery:e.target.value}), owner, setOwner:e=>patch({reviewOwner:e.target.value}),
      type, setType:e=>patch({queueType:e.target.value}), round, setRound:e=>patch({queueRound:e.target.value}),
      sort:st.reviewSort || 'newest', setSort:e=>patch({reviewSort:e.target.value}), hasFilters, reset,
      rows:filtered.slice((page-1)*size,page*size), total:filtered.length, empty:!filtered.length,
      emptyTitle:hasFilters ? '没有符合条件的任务' : done ? '还没有审核记录' : '当前任务已处理完',
      emptyHint:hasFilters ? '调整搜索或筛选条件，或重置后查看全部任务。' : done ? '完成审核后，结果与轮次会记录在这里。' : '新的产物提交后会出现在这里。',
      statusHeading:done?'审核结果':'审核类型', personHeading:done?'审核人':'提交人', timeHeading:done?'审核时间':'提交时间',
      page, pages, size, range:filtered.length ? ((page-1)*size+1)+'–'+Math.min(page*size,filtered.length) : '0',
      pageNumbers:Array.from({length:pages},(_,i)=>({label:i+1,selected:page===i+1,pick:()=>this.setState({queuePage:i+1})})),
      first:page===1, last:page===pages, prev:()=>this.setState({queuePage:Math.max(1,page-1)}), next:()=>this.setState({queuePage:Math.min(pages,page+1)}),
      setSize:e=>patch({queuePageSize:Number(e.target.value)}), loading:!!st.queueLoading,
      refresh:async()=>{ if(st.queueLoading)return; this.setState({queueLoading:true,queueError:''}); try { await new Promise(r=>setTimeout(r,180)); this.runsData(); this.setState({queueLoading:false}); } catch(e){ this.setState({queueLoading:false,queueError:'刷新失败，请稍后重试。'}); } },
      error:st.queueError || '', hasError:!!st.queueError, dismissError:()=>this.setState({queueError:''})
    };
  }
  // pm-review-queue-methods:end
