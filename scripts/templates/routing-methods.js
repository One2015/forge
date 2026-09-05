  // forge-routing-methods:start
  mountForgeRoutes() {
    if (this._routeHost || typeof window === 'undefined' || !window.history?.pushState) return;
    let host = window;
    try { if (window.frameElement?.classList.contains('forge-frame') && window.parent.location.origin === window.location.origin) host = window.parent; } catch { /* A foreign host cannot own navigation. */ }
    this._routeHost = host;
    this._routeIndex = Number.isInteger(host.history.state?.forgeRouteIndex) ? host.history.state.forgeRouteIndex : 0;
    this._routeSetState = this.setState.bind(this);
    this.setState = patch => {
      const before = ForgeRoutes.write(Object.assign({}, this.state, { routeAnchor: '' })).split(/[?#]/)[0];
      const editorTab = this.state.deliveryEditor?.tab;
      const result = this._routeSetState(patch);
      if (!this._routeApplying) {
        if (this.state._forgeRouteUrl) {
          const target = this.state._forgeRouteUrl;
          const historyIndex = this.state._forgeRouteHistoryIndex;
          this._routeSetState({ _forgeRouteUrl: null, _forgeRouteHistoryIndex: null });
          if (Number.isInteger(historyIndex) && historyIndex !== this._routeIndex) this._routeHost.history.go(historyIndex - this._routeIndex);
          else void this.applyForgeRoute(target);
        } else {
          const after = ForgeRoutes.write(Object.assign({}, this.state, { routeAnchor: '' })).split(/[?#]/)[0];
          if ((before !== after || editorTab !== this.state.deliveryEditor?.tab) && !Object.prototype.hasOwnProperty.call(patch || {}, 'routeAnchor')) this._routeSetState({ routeAnchor: '' });
          this.scheduleForgeRoute();
        }
      }
      return result;
    };
    this._routePop = event => this.onForgeRoutePop(event);
    this._routeClick = event => {
      const link = event.target.closest?.('a[data-forge-route]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, host.location.href);
      if (url.origin !== host.location.origin) return;
      event.preventDefault();
      this.requestForgeRoute(url.pathname + url.search + url.hash);
    };
    host.addEventListener('popstate', this._routePop);
    document.addEventListener('click', this._routeClick);
    void this.applyForgeRoute(host.location.pathname + host.location.search + host.location.hash, { replace: true });
  }

  unmountForgeRoutes() {
    this._routeHost?.removeEventListener('popstate', this._routePop);
    if (typeof document !== 'undefined') document.removeEventListener('click', this._routeClick);
    clearTimeout(this._routeFocusTimer);
    this._routeGeneration = (this._routeGeneration || 0) + 1;
    this._routeHost = null;
    if (this._routeSetState) this.setState = this._routeSetState;
  }

  forgeRouteIssue(route) {
    if (route.error) return route.error;
    const s = route.patch, runs = this.runsData().concat(this.billingRunRecords()), datasets = this.dsData(), sheets = this.deliveryData().flatMap(group => group.sheets);
    const run = id => runs.find(value => value.id === id), sheet = id => sheets.find(value => value.key === id);
    const itemExists = id => datasets.some(ds => ds.items.some(row => row[0] === id)) || sheets.some(value => this.sheetRows(value).some(row => row[2] === id));
    if (s.activeRun && !run(s.activeRun)) return '这条运行记录不存在，或是刷新后已清除的本地演示记录。';
    if ((s.openPipe || s.editPipe) && !this.pipeData().some(value => value.name === (s.editPipe || s.openPipe))) return '找不到这个 Pipeline。';
    if (s.editSel && !this.pipeData().find(value => value.name === s.editPipe)?.dag.some(value => value.split('/')[0] === s.editSel)) return '找不到这个 Pipeline 节点。';
    if (s.selDs && !datasets.some(value => value.name === s.selDs)) return '找不到这个数据集。';
    if (s.selDs && s.dsVersion && !this.dsVersions(datasets.find(value => value.name === s.selDs)).some(value => value[0] === s.dsVersion)) return '找不到这个数据集版本。';
    if (s.sheetKey && !sheet(s.sheetKey)) return '这个数据单不存在，或尚未保存到可恢复的数据源。';
    if (s.sheetRow && !this.sheetRows(sheet(s.sheetKey)).some(row => row[2] === s.sheetRow)) return '这个 Item 不属于当前数据单。';
    if (s.lifeItem && !itemExists(s.lifeItem)) return '找不到这个 Item。';
    if (s.lifeRun && !run(s.lifeRun)) return '找不到这个 Item 的来源运行。';
    if (s.reviewRun !== 'all' && !run(s.reviewRun)) return '找不到这条审核对应的运行记录。';
    if (s.deepReview) {
      const rec = run(s.deepReview.runId), ds = datasets.find(value => value.name === rec?.dsName);
      const belongs = (rec?.itemMeta || ds?.items || []).some(row => row[0] === s.deepReview.itemId) && (!rec?.itemIds || rec.itemIds.includes(s.deepReview.itemId));
      if (!belongs) return '这个 Item 不属于链接中的审核运行。';
    }
    if (s.view === 'submitted' && !(this.state.submittedRuns || []).some(value => !s.activeRun || value.id === s.activeRun)) return '本地运行回执已失效，请从运行记录中查看任务。';
    return '';
  }

  requestForgeRoute(url, historyIndex = null) {
    const route = ForgeRoutes.read(url), editor = this.state.deliveryEditor;
    // An anchor or edit-tab change never recreates (or discards) the form.
    const sameEditor = route.editor && editor && route.editor.key === editor.key && (!route.draft || route.draft === editor.savedDraftId);
    if (sameEditor) { void this.applyForgeRoute(url); return; }
    if (editor && !editor.key) {
      // Reuse the existing save / discard / keep dialog, including its async save.
      this.setState({ view: 'route-loading', _forgeRouteUrl: url, _forgeRouteHistoryIndex: historyIndex });
    } else if (Number.isInteger(historyIndex) && historyIndex !== this._routeIndex) this._routeHost.history.go(historyIndex - this._routeIndex);
    else void this.applyForgeRoute(url);
  }

  onForgeRoutePop(event) {
    const host = this._routeHost;
    if (!host) return;
    if (this._routeReverting) {
      const target = this._routeReverting; this._routeReverting = null;
      this.requestForgeRoute(target.url, target.index); return;
    }
    const target = host.location.pathname + host.location.search + host.location.hash;
    const index = event.state?.forgeRouteIndex;
    const editor = this.state.deliveryEditor, route = ForgeRoutes.read(target);
    const sameEditor = route.editor && editor && route.editor.key === editor.key && (!route.draft || route.draft === editor.savedDraftId);
    if (editor && !editor.key && !sameEditor && this.deliveryDraftDirty(editor)) {
      // Restore the address and history cursor before asking to leave. Cancel
      // leaves both untouched; confirmation resumes the original history move.
      if (Number.isInteger(index) && index !== this._routeIndex) {
        this._routeReverting = { url: target, index }; host.history.go(this._routeIndex - index);
      } else {
        host.history.replaceState(Object.assign({}, host.history.state, { forgeRouteIndex: this._routeIndex }), '', this._routeCurrentUrl);
        this.requestForgeRoute(target);
      }
      return;
    }
    if (Number.isInteger(index)) this._routeIndex = index;
    void this.applyForgeRoute(target, { replace: true });
  }

  async applyForgeRoute(url, { replace = false } = {}) {
    const host = this._routeHost;
    if (!host) return;
    const generation = this._routeGeneration = (this._routeGeneration || 0) + 1;
    const route = ForgeRoutes.read(url), issue = this.forgeRouteIssue(route);
    const current = this.state.deliveryEditor;
    const sameEditor = !issue && route.editor && current && route.editor.key === current.key && (!route.draft || route.draft === current.savedDraftId);
    this._routeApplying = true;
    try {
      if (!sameEditor && current) this.closeDeliveryEditor(null, { restoreFocus: false });
      this.closeProfile();
      // Close transient confirmations, never replay them from a URL.
      if (typeof document !== 'undefined') document.querySelectorAll('dialog[open]').forEach(dialog => {
        if (!(sameEditor && current.key && dialog.classList.contains('forge-delivery-editor'))) dialog.close();
      });
      const patch = Object.assign({}, route.patch, {
        passAsk: null, reworkAsk: null, sheetPassAsk: null, sheetReworkAsk: null, sheetReworkConfirmAsk: null, stopAsk: null, cancelAsk: null,
        branchAsk: null, taskLink: null, zoom: null, newPipeOpen: false, pipeCopyOpen: false, importOpen: false,
        dlOpen: false, notifOpen: false, profileOpen: false, deliveryLeave: null,
      });
      if (issue) Object.assign(patch, { view: 'route-error', routeError: issue, routeMissingUrl: url });
      if (patch.billing) patch.billing = Object.assign(this.billingPreset(patch.billing.preset || 'yesterday'), patch.billing);
      if (!issue && patch.view === 'submitted') {
        const receipts = this.state.submittedRuns || [];
        const receipt = receipts.find(value => value.id === patch.activeRun) || receipts[receipts.length - 1];
        Object.assign(patch, { activeRun: receipt.id, selDs: receipt.dsName, runIds: receipt.itemIds || [], runPipeline: receipt.pipe + ' ' + receipt.ver });
      }
      if (patch.routeAnchor === 'drafts') patch.deliveryDraftsExpanded = true;
      this._routeSetState(patch);
      if (!issue && route.editor) {
        if (route.draft && !sameEditor) {
          // Draft IDs are account-scoped IndexedDB references, not form data.
          this._routeSetState({ view: 'delivery' });
          await this.resumeDeliveryDraft(route.draft, this.profileIdentity().accountName);
          if (generation !== this._routeGeneration || !this._routeHost) return;
          if (!this.state.deliveryEditor) this._routeSetState({ view: 'route-error', routeError: this.state.deliveryDraftsError || '这个草稿在当前浏览器或账号下不可用。', routeMissingUrl: url });
        } else if (!sameEditor) this.openDeliveryEditor(route.editor.key);
        if (this.state.deliveryEditor) {
          if (this.state.deliveryEditor.key) this.patchDeliveryEditor({ tab: route.editor.tab });
          else this.goDeliveryWizardStep(['basic', 'list', 'skills', 'confirm'].indexOf(route.editor.tab) + 1);
        }
      }
      if (!issue) {
        this._routeSetState({ routeAnchor: route.patch.routeAnchor, dlOpen: route.patch.dlOpen, notifOpen: route.patch.notifOpen, profileOpen: route.patch.profileOpen, profileTab: route.patch.profileTab });
        if (route.patch.profileOpen) document.getElementById('forge-profile-panel')?.showPopover();
      }
    } finally {
      if (generation === this._routeGeneration) {
        this._routeApplying = false;
        this.syncForgeRoute(replace);
        this.focusForgeRoute();
      }
    }
  }

  scheduleForgeRoute() {
    if (!this._routeHost || this._routeApplying || this._routeScheduled) return;
    this._routeScheduled = true;
    Promise.resolve().then(() => { this._routeScheduled = false; if (!this._routeApplying) this.syncForgeRoute(); });
  }

  syncForgeRoute(replace = false) {
    const host = this._routeHost;
    if (!host || this._routeReverting) return;
    const url = ForgeRoutes.write(this.state), previous = this._routeCurrentUrl;
    const searchless = value => { const u = new URL(value || '/', host.location.origin); u.searchParams.delete('q'); u.searchParams.delete('search'); return u.pathname + u.search + u.hash; };
    // Typing search text updates one entry. Explicit page / tab / filter changes
    // remain individual Back/Forward destinations. Form edits produce no entry.
    const method = replace || !previous || searchless(previous) === searchless(url) ? 'replaceState' : 'pushState';
    if (url !== previous || replace) {
      if (method === 'pushState') this._routeIndex++;
      host.history[method](Object.assign({}, host.history.state, { forgeRouteIndex: this._routeIndex }), '', url);
      this._routeCurrentUrl = url;
    }
    this.attachForgeRouteSections();
    const title = document.querySelector('.forge-delivery-create-header h1, main h1, .forge-main h1')?.textContent?.trim();
    if (title) { document.title = title + ' | Forge'; host.document.title = document.title; }
  }

  attachForgeRouteSections() {
    const main = document.querySelector('.forge-main');
    if (!main) return;
    // Stable section names, independent of content counts and translated copy.
    const sections = [
      ['.forge-overview-summary', 'summary'],
      ['.forge-delivery-drafts', 'drafts'],
      ['[aria-labelledby="forge-delivery-basic-heading"], .forge-delivery-editor [aria-label="数据单基础信息"]', 'basic'],
      ['[aria-labelledby="forge-delivery-list-heading"], .forge-delivery-editor [aria-label="List 清单与 Tag"]', 'list'],
      ['[aria-labelledby="forge-delivery-skill-heading"], .forge-delivery-editor [aria-label="Skill"]', 'skills'],
      ['.forge-delivery-members', 'members'], ['.forge-delivery-tag-editor', 'tags'],
      ['.forge-billing-metrics', 'summary'],
      ['[aria-label="用量与费用趋势"]', 'trend'], ['.forge-billing-composition', 'composition'],
      ['.forge-billing-breakdown', 'breakdown'],
      ['.forge-model-summary', 'summary'], ['[aria-label="供应商模型线路"]', 'suppliers'],
      ['.forge-task-link-history', 'associations'], ['.forge-life-history', 'history'],
      ['.review-workbench-object', 'object'], ['.review-workbench-references', 'references'],
    ];
    for (const [selector, id] of sections) {
      const node = main.querySelector(selector);
      if (node) node.dataset.forgeRouteSection = id;
    }
    // Existing named sections and static h2 headings also get an address. Avoid
    // per-record h3s (customers, Skills, Items) and repeated chart axes.
    for (const node of main.querySelectorAll('section[aria-label], h2')) {
      if (!node.dataset.forgeRouteSection && !node.closest('dialog, [role="dialog"], [data-review-workbench]')) {
        if (node.closest('[data-forge-route-section]')) continue;
        const label = node.id || node.getAttribute('aria-label') || node.textContent.trim();
        if (label && !label.includes('{{')) node.dataset.forgeRouteSection = label.slice(0, 160);
      }
    }
    const base = (this._routeCurrentUrl || '/overview').split('#')[0];
    for (const node of main.querySelectorAll('[data-forge-route-section]')) {
      const name = node.dataset.forgeRouteSection;
      if (!node.id) node.id = 'forge-section-' + name;
      // Section headings expose a native permalink, so copying/opening in a new
      // tab works too. Do not make the entire section an interactive target.
      const heading = /^H[1-6]$/.test(node.tagName) ? node : node.querySelector('h2, h3');
      if (!heading || heading.querySelector('button, input')) continue;
      // Wizard navigation owns validated step routes; generic heading anchors
      // must not bypass the gate or retain stale labels from another step.
      if (heading.closest('.forge-delivery-wizard')) continue;
      let link = heading.querySelector('a.forge-section-link');
      if (!link) {
        link = document.createElement('a'); link.className = 'forge-section-link'; link.dataset.forgeRoute = '';
        const label = heading.textContent.trim();
        if (!heading.hasAttribute('aria-label')) heading.setAttribute('aria-label', label);
        link.textContent = '#'; link.setAttribute('aria-label', '跳转到 ' + label);
        link.title = '此 section 的独立链接'; heading.append(link);
      }
      if (heading.closest('.forge-billing, .forge-delivery-wizard')) {
        const label = heading.getAttribute('aria-label') || heading.textContent.replace(/#\s*$/, '').trim();
        link.setAttribute('aria-label', '跳转到 ' + label);
      }
      link.href = base + '#' + encodeURIComponent(name); link.target = '_top';
    }
    const links = [['.forge-sidebar-brand', '/overview'], ['.forge-sidebar-link[data-page="overview"]', '/overview']];
    // Buttons retain their existing guards. Expose destination for tooling.
    for (const [selector, path] of links) main.ownerDocument.querySelector(selector)?.setAttribute('data-route-href', path);
  }

  focusForgeRoute() {
    clearTimeout(this._routeFocusTimer);
    this._routeFocusTimer = setTimeout(() => {
      if (!this._routeHost) return;
      this.attachForgeRouteSections();
      const anchor = this.state.routeAnchor;
      const target = anchor ? [...document.querySelectorAll('[data-forge-route-section]')].find(node => node.dataset.forgeRouteSection === anchor) || document.getElementById(anchor) : document.querySelector('.forge-main h1');
      if (target) {
        for (let parent = target; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
        const focus = target.querySelector('h2, h3, summary') || target;
        focus.setAttribute('tabindex', '-1');
        if (!this.state.profileOpen && !this.state.deliveryEditor?.key) focus.focus({ preventScroll: true });
      }
    }, 0);
  }
  // forge-routing-methods:end
