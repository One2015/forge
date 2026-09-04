  // sidebar-interactions:start
  supportsSidebarPeek() {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(min-width:761px) and (hover:hover) and (pointer:fine)').matches;
  }
  cancelSidebarPeekClose() {
    if (this._sidebarPeekCloseTimer != null) clearTimeout(this._sidebarPeekCloseTimer);
    this._sidebarPeekCloseTimer = null;
  }
  scheduleSidebarPeekClose() {
    this.cancelSidebarPeekClose();
    if (!this.state.sidebarPeek || this._sidebarDisposed) return;
    const timer = setTimeout(() => {
      if (this._sidebarPeekCloseTimer !== timer || this._sidebarDisposed) return;
      this._sidebarPeekCloseTimer = null;
      this.endSidebarPeek();
    }, 100);
    this._sidebarPeekCloseTimer = timer;
  }
  toggleSidebar() {
    this.cancelSidebarPeekClose();
    const collapsed = !this.state.sidebarCollapsed;
    this._sidebarPeekSuppressed = collapsed;
    this.setState({ sidebarCollapsed: collapsed, sidebarPeek: false });
  }
  startSidebarPeek(event) {
    this.cancelSidebarPeekClose();
    if (event?.pointerType && event.pointerType !== 'touch' && typeof document !== 'undefined' && document.documentElement) document.documentElement.dataset.forgeInput = 'pointer';
    if (!this.state.sidebarCollapsed || this._sidebarPeekSuppressed || event?.pointerType === 'touch' || !this.supportsSidebarPeek()) return;
    if (!this.state.sidebarPeek) this.setState({ sidebarPeek: true });
  }
  endSidebarPeek(force = false) {
    this.cancelSidebarPeekClose();
    if (!this.state.sidebarPeek) return;
    const focused = typeof document !== 'undefined' && document.activeElement;
    const keyboardInside = focused?.matches?.(':focus-visible') && this._sidebarElement?.contains(focused);
    if (!force && (this._sidebarPointerInside || keyboardInside || this.state.dlOpen || this.state.notifOpen || this.state.profileOpen)) return;
    this.setState({ sidebarPeek: false });
  }
  mountSidebarInteractions() {
    this._sidebarElement = document.querySelector('.forge-sidebar');
    const toggle = this._sidebarElement?.querySelector('.forge-sidebar-collapse');
    if (!toggle) return;
    this._sidebarDisposed = false;
    const deferLeave = () => queueMicrotask(() => { if (!this._sidebarDisposed) this.endSidebarPeek(); });
    this._sidebarListeners = [
      [this._sidebarElement, 'pointerenter', event => { this._sidebarPointerInside = true; this.startSidebarPeek(event); }],
      [this._sidebarElement, 'pointerleave', () => { this._sidebarPointerInside = false; this._sidebarPeekSuppressed = false; this.scheduleSidebarPeekClose(); }],
      [toggle, 'focus', () => { if (toggle.matches(':focus-visible')) this.startSidebarPeek(); }],
      [this._sidebarElement, 'focusout', deferLeave],
      [document.getElementById('forge-profile-panel'), 'toggle', deferLeave],
      [window, 'blur', () => { this._sidebarPointerInside = false; this.endSidebarPeek(true); }],
      [window, 'resize', () => { if (!this.supportsSidebarPeek()) this.endSidebarPeek(true); }],
      [document, 'keydown', event => {
        if (event.key !== 'Escape' || !this.state.sidebarPeek || this.state.profileOpen || this.state.dlOpen || this.state.notifOpen || this.state.branchAsk || this.state.deliveryEditor || this.state.taskLink) return;
        event.preventDefault(); event.stopImmediatePropagation(); this._sidebarPeekSuppressed = true;
        this.endSidebarPeek(true); toggle.focus({ preventScroll: true });
      }]
    ];
    for (const [node, type, listener] of this._sidebarListeners) node?.addEventListener(type, listener);
  }
  unmountSidebarInteractions() {
    this.cancelSidebarPeekClose();
    this._sidebarDisposed = true;
    for (const [node, type, listener] of this._sidebarListeners || []) node?.removeEventListener(type, listener);
    this._sidebarListeners = []; this._sidebarElement = null;
  }
  // sidebar-interactions:end
