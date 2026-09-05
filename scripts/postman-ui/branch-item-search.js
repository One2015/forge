  // pm-branch-search:start
  pmBranchSearchRecord(kind, option, base) {
    const datasets = this.dsData(), runs = this.runsData();
    const datasetItems = dataset => (dataset?.items || []).flatMap(item => [item[0], item[4] ? this.itemTitle(item[4]) : '']);
    if (kind === 'pipeline') {
      const pipeline = this.pipeData().find(value => value.name === option.value);
      const datasetNames = (pipeline?.datasets || []).map(value => Array.isArray(value) ? value[0] : value);
      const linkedDatasets = datasets.filter(dataset => datasetNames.includes(dataset.name));
      const linkedRuns = runs.filter(run => run.pipe === option.value || (!run.pipe && datasetNames.includes(run.dsName)));
      return {
        terms: [option.label, option.value, ...datasetNames, ...linkedDatasets.flatMap(datasetItems), ...linkedRuns.map(run => run.id)],
        meta: datasetNames.length + ' 个数据集 · ' + linkedRuns.length + ' 个 Run'
      };
    }
    if (kind === 'dataset') {
      const dataset = datasets.find(value => value.name === option.value);
      const linkedRuns = runs.filter(run => run.dsName === option.value && (!base.pipe || run.pipe === base.pipe));
      return {
        terms: [option.label, option.value, ...datasetItems(dataset), ...linkedRuns.map(run => run.id)],
        meta: (dataset?.items || []).length + ' 个 Item' + (linkedRuns.length ? ' · ' + linkedRuns.length + ' 个 Run' : '')
      };
    }
    const linkedRuns = runs.filter(run => run.dsName === base.ds && (!run.itemIds?.length || run.itemIds.includes(option.value)));
    return {
      terms: [option.label, option.value, ...linkedRuns.map(run => run.id)],
      meta: option.value + (linkedRuns.length ? ' · Run ' + linkedRuns.map(run => run.id).slice(0, 2).join('、') : '')
    };
  }

  pmBranchPicker(base, kind, options, disabled, onChange) {
    const context = [this.state.branchAsk.attachmentKey, kind, kind === 'pipeline' ? '' : base.pipe, kind === 'item' ? base.ds : ''].join('|');
    const selected = options.find(option => option.selected);
    const saved = this.state.pmBranchPicker;
    const current = saved?.kind === kind && saved?.context === context
      ? saved : { kind, context, query: '', open: false, active: 0 };
    const patch = value => this.setState({ pmBranchPicker: { ...current, ...value, kind, context } });
    const query = String(current.query || '').trim().toLowerCase();
    const matches = options.map(option => ({ ...option, search: this.pmBranchSearchRecord(kind, option, base) }))
      .filter(option => !query || option.search.terms.some(term => String(term || '').toLowerCase().includes(query)));
    const shown = matches.slice(0, 20), active = Math.min(current.active, Math.max(0, shown.length - 1));
    const choose = option => {
      onChange({ target: { value: option.value } });
      patch({ query: '', open: false, active: 0 });
      setTimeout(() => {
        if (typeof document !== 'undefined') document.getElementById('forge-branch-' + kind)?.focus();
      }, 0);
    };
    const close = () => patch({ query: '', open: false, active: 0 });
    return {
      disabled, open: !!current.open && !disabled, empty: !selected,
      valueLabel: selected?.label || '未选', query: current.query || '',
      activeOption: current.open && shown.length ? 'pm-branch-' + kind + '-option-' + active : '',
      results: shown.map((option, index) => ({
        value: option.value, label: option.label, meta: option.search.meta,
        id: 'pm-branch-' + kind + '-option-' + index,
        active: index === active, selected: option.value === selected?.value,
        keepFocus: event => event.preventDefault(), pick: () => choose(option)
      })),
      hint: matches.length
        ? (matches.length > 20 ? '显示前 20 项，共 ' + matches.length + ' 项，请继续输入缩小范围' : matches.length + ' 个匹配结果')
        : '没有匹配结果，请尝试名称、Item ID 或 Run ID',
      toggle: () => {
        if (disabled) return;
        if (current.open) return close();
        patch({ query: '', open: true, active: 0 });
        setTimeout(() => {
          if (typeof document !== 'undefined') document.getElementById('forge-branch-' + kind + '-search')?.focus();
        }, 0);
      },
      searchInput: event => patch({ query: event.target.value, open: true, active: 0 }),
      searchBlur: close,
      searchKey: event => {
        if (event.isComposing) return;
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); close();
          setTimeout(() => {
            if (typeof document !== 'undefined') document.getElementById('forge-branch-' + kind)?.focus();
          }, 0);
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const next = Math.max(0, Math.min(shown.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
          patch({ open: true, active: next });
          setTimeout(() => {
            if (typeof document !== 'undefined') document.getElementById('pm-branch-' + kind + '-option-' + next)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        if (event.key === 'Enter' && current.open) {
          event.preventDefault(); event.stopPropagation();
          if (shown[active]) choose(shown[active]);
        }
      }
    };
  }

  pmBranchValues() {
    const base = this.branchFormValues();
    if (!base.open) return base;
    return {
      ...base,
      pipelinePicker: this.pmBranchPicker(base, 'pipeline', base.pipelines, false, base.onPipe),
      datasetPicker: this.pmBranchPicker(base, 'dataset', base.datasets, base.dsDisabled, base.onDs),
      itemPicker: this.pmBranchPicker(base, 'item', base.items, base.itemDisabled, base.onItem)
    };
  }
  // pm-branch-search:end
