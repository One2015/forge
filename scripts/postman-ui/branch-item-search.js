  // pm-branch-search:start
  pmBranchValues() {
    const base = this.branchFormValues();
    if (!base.open) return base;
    const key = [this.state.branchAsk.attachmentKey, base.pipe, base.ds].join('|');
    const selected = base.items.find(item => item.value === base.item);
    const saved = this.state.pmBranchSearch;
    const search = saved?.key === key ? saved : { key, text: selected?.label || '', open: false, active: 0 };
    const patch = value => this.setState({ pmBranchSearch: { ...search, ...value, key } });
    const query = search.text.trim().toLowerCase();
    const matches = base.items.filter(item => !query || item.label.toLowerCase().includes(query) || item.value.toLowerCase().includes(query));
    const results = matches.slice(0, 20), active = Math.min(search.active, Math.max(0, results.length - 1));
    const choose = item => { base.onItem({ target: { value: item.value } }); patch({ text: item.label, open: false, active: 0 }); };
    return { ...base, searchText: search.text, searchOpen: search.open && !base.itemDisabled,
      activeOption: search.open && results.length ? 'pm-branch-option-' + active : '',
      searchHint: matches.length ? (matches.length > 20 ? '显示前 20 项，共 ' + matches.length + ' 项，请继续输入缩小范围' : matches.length + ' 个匹配 Item') : '没有匹配的 Item，请尝试名称或 ID',
      searchResults: results.map((item, index) => ({ ...item, name: item.label.endsWith(' · ' + item.value) ? item.label.slice(0, -(' · ' + item.value).length) : item.label,
        id: 'pm-branch-option-' + index, active: index === active, selected: item.value === base.item,
        keepFocus: event => event.preventDefault(), pick: () => choose(item) })),
      searchInput: event => { base.onItem({ target: { value: '' } }); patch({ text: event.target.value, open: true, active: 0 }); },
      searchFocus: () => patch({ text: '', open: true, active: 0 }),
      searchBlur: () => patch({ text: selected?.label || search.text, open: false }),
      searchKey: event => {
        if (event.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); patch({ text: selected?.label || search.text, open: false }); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); const next = Math.max(0, Math.min(results.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
          patch({ open: true, active: next });
          setTimeout(() => { if (typeof document !== 'undefined') document.getElementById('pm-branch-option-' + next)?.scrollIntoView({ block: 'nearest' }); }, 0);
        }
        if (event.key === 'Enter' && search.open) { event.preventDefault(); event.stopPropagation(); if (results[active]) choose(results[active]); }
      }
    };
  }
  // pm-branch-search:end
