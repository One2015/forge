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
        this.setState({ queueBusy: '', queuePreviewOnly: false, reviewClaims: { ...this.state.reviewClaims, [row.key]: me } });
        this.openReviewFocus(row.key);
      } catch (error) {
        this.setState({ queueBusy: '', queueError: error.message || '暂时无法打开任务，请刷新后重试。' });
      }
    };
  }
  reviewQueuePreview(row) {
    return event => {
      event?.stopPropagation();
      if (this.state.queueBusy) return;
      this.setState({ queuePreviewOnly: true, queueError: '' });
      this.openReviewFocus(row.key);
    };
  }
  reviewQueueValues({ rows, records, review, recs, runOfItem, me }) {
    const st = this.state;
    const sameUser = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    const rowByKey = new Map(rows.map(row => [row.key, row]));
    const noop = event => event?.stopPropagation();
    // Existing claims open as read-only review context, including direct Item links.
    // A claim created by this browser session remains actionable for its reviewer.
    review.items = (review.items || []).map(item => {
      const row = rowByKey.get(item.key);
      const claim = row ? this.reviewQueueClaim(row) : '';
      const activeSession = !st.queuePreviewOnly && Object.prototype.hasOwnProperty.call(st.reviewClaims || {}, item.key) && sameUser(claim, me);
      const drafting = !!st.reworkDrafts?.[item.key];
      const activeDraft = drafting && st.reviewOpen === item.key && !st.queuePreviewOnly && (!claim || activeSession);
      const locked = !!st.queuePreviewOnly || (drafting && !activeDraft) || (!!claim && !activeSession);
      return locked ? { ...item, actionsDisabled: true, needsNote: false, notNeedsNote: true,
        pass: noop, rework: noop, cancelNote: noop, submitNote: noop } : { ...item, actionsDisabled: false,
        rework: event => {
          item.rework(event);
          if (typeof document === 'undefined') return;
          setTimeout(() => {
            const form = document.querySelector('.review-workbench-rework-form');
            if (!form) return;
            const panel = form.closest('.review-workbench-scroll');
            if (panel) panel.scrollTop = Math.max(0, form.offsetTop - 16);
            form.querySelector('textarea')?.focus();
          }, 0);
        } };
    });
    const now = Date.now();
    const submittedAt = this._queueClock || (this._queueClock = now);
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const eq = sameUser;
    const decided = st.reviewDecisions || {};
    const pending = rows.filter(r => !(decided[r.key] === 'pass' || decided[r.key] === 'rework' && st.reworkSent?.[r.key]));
    const patch = values => this.setState({ queuePage: 1, reviewOpen: null, deepReview: null, ...values });
    const reset = () => patch({ reviewOwner: 'all', reviewQuery: '', reviewSort: 'newest', queueType: 'all', queueRound: 'all', queuePerson: 'all', queueToday: false, queueFilterMenu: null });
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
      // A pending candidate is created only after this Item's artifact has been
      // generated. Prefer that current fact over a stale stored technical state.
      const hasReviewableCandidate = !!r.itemState?.hasPendingCandidate && r.itemState?.technicalStatus === 'success';
      const blocked = !hasReviewableCandidate && (r.failed || ['running', 'queued', 'failed', 'stopped'].includes(r.itemState?.technicalStatus));
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
        owned: mine, actionTone: mode, actionLabel: st.queueBusy === r.key ? '打开中…' : ({start:'人工审核', reviewing:'审核中', progress:'查看进度'})[mode],
        busy: st.queueBusy === r.key, actionDisabled: reviewing || st.queueBusy === r.key, action: this.reviewQueueAction(r, mode), open: reviewing ? this.reviewQueuePreview(r) : this.reviewQueueAction(r, mode),
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
    const people = Array.from(new Set(source.map(r => String(r.person || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'base' }))
      .map(value => ({ value, label: value }));
    const person = people.find(option => eq(option.value, st.queuePerson))?.value || 'all';
    const filtered = source.filter(r => (!query || [r.title, r.id, r.runId].join(' ').toLowerCase().includes(query))
      && (owner === 'all' || eq(r.assignee, me)) && (type === 'all' || r.type === type)
      && (round === 'all' || (round === '3' ? r.n >= 3 : r.n === Number(round)))
      && (person === 'all' || eq(r.person, person))
      && (!done || !st.queueToday || r.stamp >= +todayStart && r.stamp <= now))
      .sort((a, b) => a.stamp === null ? 1 : b.stamp === null ? -1 : st.reviewSort === 'oldest' ? a.stamp - b.stamp : b.stamp - a.stamp);
    const size = [10,20,50].includes(Number(st.queuePageSize)) ? Number(st.queuePageSize) : 10;
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    const page = Math.min(pages, Math.max(1, Number(st.queuePage) || 1));
    const hasFilters = !!query || owner !== 'all' || type !== 'all' || round !== 'all' || person !== 'all' || st.reviewSort === 'oldest' || !!st.queueToday;
    const filterCount = [owner !== 'all', type !== 'all', round !== 'all', person !== 'all', st.reviewSort === 'oldest', !!st.queueToday].filter(Boolean).length;
    const personHeading = done ? '审核人' : '提交人';
    const timeHeading = done ? '审核时间' : '提交时间';
    const menuState = st.queueFilterMenu || null;
    const focusFilter = key => {
      if (typeof document === 'undefined') return;
      setTimeout(() => document.getElementById('pq-filter-' + key)?.focus(), 0);
    };
    const closeMenu = event => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const key = menuState?.key;
      this.setState({ queueFilterMenu: null });
      if (key) focusFilter(key);
    };
    const makeFilter = (key, ariaLabel, selected, stateKey, options) => {
      const current = options.find(option => option[0] === selected) || options[0];
      const open = menuState?.key === key;
      return {
        key, ariaLabel, label: current[1], open, filtered: selected !== options[0][0],
        left: open ? menuState.left : 0, top: open ? menuState.top : 0, width: open ? menuState.width : 0,
        placement: open ? menuState.placement : 'bottom',
        toggle: event => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          if (open) { closeMenu(event); return; }
          const rect = event?.currentTarget?.getBoundingClientRect?.() || { left: 12, top: 48, bottom: 84, width: 176 };
          const viewportWidth = typeof window === 'undefined' ? 1440 : Number(window.innerWidth) || 1440;
          const viewportHeight = typeof window === 'undefined' ? 900 : Number(window.innerHeight) || 900;
          const labelWidth = label => Array.from(String(label)).reduce((sum, character) => sum + (/[^\u0000-\u00ff]/.test(character) ? 14 : 8), 0);
          const naturalWidth = Math.ceil(Math.max(...options.map(option => labelWidth(option[1]))) + 48);
          const width = Math.min(viewportWidth - 24, Math.max(Math.ceil(rect.width || 0), naturalWidth));
          const rawLeft = Math.round(rect.left);
          const rectRight = Math.round(Number(rect.right) || rawLeft + Number(rect.width || 0));
          const left = rawLeft + width <= viewportWidth - 12
            ? Math.max(12, rawLeft)
            : Math.max(12, Math.min(rectRight - width, viewportWidth - width - 12));
          const optionHeight = viewportWidth <= 760 ? 44 : 36;
          const height = Math.min(288, options.length * optionHeight + 8);
          const below = viewportHeight - rect.bottom >= height + 12;
          const placement = below ? 'bottom' : 'top';
          const desiredTop = below ? rect.bottom + 6 : rect.top - height - 6;
          const top = Math.max(12, Math.min(Math.round(desiredTop), viewportHeight - height - 12));
          this.setState({ queueFilterMenu: { key, left, top, width, placement } });
          if (event?.detail === 0 && typeof document !== 'undefined') {
            setTimeout(() => document.querySelector('#pq-filter-menu [aria-checked="true"]')?.focus(), 0);
          }
        },
        options: options.map(([value, label]) => ({ value, label, selected: value === selected, pick: event => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          patch({ [stateKey]: value, queueFilterMenu: null });
          focusFilter(key);
        } }))
      };
    };
    const filters = [
      makeFilter('owner', '审核范围', owner, 'reviewOwner', [['all', '全部任务'], ['mine', '我的任务']]),
      makeFilter('type', '审核类型', type, 'queueType', [['all', '全部类型'], ['first', '首次审核'], ['rework', '返工复审']]),
      makeFilter('round', '审核轮次', round, 'queueRound', [['all', '全部轮次'], ['1', '第 1 轮'], ['2', '第 2 轮'], ['3', '第 3 轮及以上']]),
      makeFilter('person', personHeading, person, 'queuePerson', [['all', '全部' + personHeading], ...people.map(option => [option.value, option.label])]),
      makeFilter('sort', timeHeading + '排序', st.reviewSort || 'newest', 'reviewSort', [['newest', '最新优先'], ['oldest', '最早优先']])
    ];
    const activeFilter = filters.find(filter => filter.open) || null;
    const menuKey = event => {
      if (event.key === 'Escape') { closeMenu(event); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const options = Array.from(event.currentTarget?.querySelectorAll?.('.pq-filter-option') || []);
      if (!options.length) return;
      event.preventDefault();
      const index = options.indexOf(typeof document === 'undefined' ? null : document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : event.key === 'ArrowUp' ? (index <= 0 ? options.length - 1 : index - 1)
        : (index + 1) % options.length;
      options[next].focus();
    };
    if (!done && review.focused) {
      const navigable = filtered.filter(r => r.actionTone !== 'progress' && (st.queuePreviewOnly || !r.actionDisabled));
      const index = navigable.findIndex(r => r.key === st.reviewOpen);
      review.positionLabel = (index < 0 ? 0 : index + 1) + ' / ' + navigable.length;
      review.cannotSwitch = navigable.length < 2;
      const move = delta => {
        if (navigable.length < 2) return;
        const target = navigable[(Math.max(0,index)+delta+navigable.length)%navigable.length];
        return st.queuePreviewOnly ? this.reviewQueuePreview(target)() : target.action();
      };
      review.next = () => move(1); review.previous = () => move(-1);
    }
    return {
      subtitle: recs.length + ' 个运行 · ' + list.length + ' 条待处理', pending: list.length, rework: list.filter(r => r.type === 'rework').length, today,
      summary: [
        { label: '待审核', description: '尚未完成审核的条目，包含已领取和未领取的任务。点击查看待审核队列。', value: list.length, selected: !done && type === 'all', pick: () => { reset(); patch({reviewPhase:'pending'}); } },
        { label: '返工后待审', description: '待审核队列中审核轮次大于 1 的条目。点击筛选这些条目。', value: list.filter(r => r.type === 'rework').length, selected: !done && type === 'rework', pick: () => { reset(); patch({reviewPhase:'pending',queueType:'rework'}); } },
        { label: '今日已审核', description: '今天已有审核结果的条目；无准确时间的历史记录不计入。点击查看今日审核结果。', value: today, selected: done && !!st.queueToday, pick: () => { reset(); patch({reviewPhase:'done',queueToday:true}); } }
      ],
      done, todayOnly: done && !!st.queueToday, clearToday:()=>patch({queueToday:false}),
      query: st.reviewQuery || '', hasQuery:!!query, onQuery:e=>patch({reviewQuery:e.target.value,queueFilterMenu:null}), clearQuery:()=>patch({reviewQuery:'',queueFilterMenu:null}), owner, setOwner:e=>patch({reviewOwner:e.target.value,queueFilterMenu:null}),
      type, setType:e=>patch({queueType:e.target.value}), round, setRound:e=>patch({queueRound:e.target.value}),
      person, people, setPerson:e=>patch({queuePerson:e.target.value}),
      sort:st.reviewSort || 'newest', setSort:e=>patch({reviewSort:e.target.value}), filters, activeFilter, menuOpen:!!activeFilter, closeMenu, menuKey, hasFilters, filterCount, hasFilterSelections:filterCount > 0, reset,
      rows:filtered.slice((page-1)*size,page*size), total:filtered.length, empty:!filtered.length,
      emptyTitle:hasFilters ? '没有符合条件的任务' : done ? '还没有审核记录' : '当前任务已处理完',
      emptyHint:hasFilters ? '试试减少筛选条件，或换个关键词。' : done ? '完成审核后，结果与轮次会记录在这里。' : '新的产物提交后会出现在这里。',
      statusHeading:done?'审核结果':'审核类型', personHeading, timeHeading,
      page, pages, size, range:filtered.length ? ((page-1)*size+1)+'–'+Math.min(page*size,filtered.length) : '0',
      pageNumbers:Array.from({length:pages},(_,i)=>({label:i+1,selected:page===i+1,pick:()=>this.setState({queuePage:i+1})})),
      first:page===1, last:page===pages, prev:()=>this.setState({queuePage:Math.max(1,page-1)}), next:()=>this.setState({queuePage:Math.min(pages,page+1)}),
      setSize:e=>patch({queuePageSize:Number(e.target.value)}), loading:!!st.queueLoading,
      refresh:async()=>{ if(st.queueLoading)return; this.setState({queueLoading:true,queueError:''}); try { await new Promise(r=>setTimeout(r,180)); this.runsData(); this.setState({queueLoading:false}); } catch(e){ this.setState({queueLoading:false,queueError:'刷新失败，请稍后重试。'}); } },
      error:st.queueError || '', hasError:!!st.queueError, dismissError:()=>this.setState({queueError:''})
    };
  }
  // pm-review-queue-methods:end
