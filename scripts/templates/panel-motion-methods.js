  // panel-motion:start
  panelMotionDuration(kind) {
    if (typeof document === 'undefined' || !this._panelMotionMounted || this._panelReduce?.matches || document.documentElement.dataset.forgeInput === 'keyboard') return 0;
    if (kind === 'dialog' && !window.CSS?.supports('transition-behavior', 'allow-discrete')) return 0;
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(kind === 'dialog' ? '--forge-dialog-duration' : '--forge-panel-exit')) || 0;
  }
  cancelPanelCleanup(key) {
    this._panelCleanups?.get(key)?.();
    this._panelCleanups?.delete(key);
  }
  deferPanelCleanup(key, element, cleanup, duration) {
    this.cancelPanelCleanup(key);
    if (!duration) { cleanup(); return; }
    this._panelCleanups ||= new Map();
    const finish = () => { if (this._panelCleanups.get(key) !== cancel) return; this.cancelPanelCleanup(key); cleanup(); };
    const ended = event => { if (event.target === element && event.propertyName === 'opacity') finish(); };
    const timer = setTimeout(finish, duration + 80);
    const cancel = () => { clearTimeout(timer); element?.removeEventListener('transitionend', ended); };
    element?.addEventListener('transitionend', ended);
    this._panelCleanups.set(key, cancel);
  }
  preserveProfileExit() {
    const panel = typeof document !== 'undefined' && document.getElementById('forge-profile-panel');
    this.deferPanelCleanup('profile', panel, () => { this._profileExitValues = null; if (this._panelMotionMounted && !this.state.profileOpen) this.setState({}); }, this.panelMotionDuration('panel'));
  }
  profileValues() {
    if (!this.state.profileOpen && this._profileExitValues) return Object.assign({}, this._profileExitValues, { open: false });
    const values = this.buildProfileValues();
    if (this.state.profileOpen) this._profileExitValues = values;
    return values;
  }
  updatePanelOrigin(panel) {
    const trigger = document.querySelector('[aria-controls="' + panel.id + '"]');
    if (!trigger) return;
    const style = getComputedStyle(panel);
    const height = panel.offsetHeight || parseFloat(style.height);
    if (!height) return;
    const box = trigger.getBoundingClientRect();
    // offsetHeight and fixed bottom are untransformed; measuring the scaled box would drift.
    const top = window.innerHeight - parseFloat(style.bottom) - height;
    const y = Math.max(0, Math.min(height, box.top + box.height / 2 - top));
    panel.style.setProperty('--forge-panel-origin-y', y + 'px');
  }
  mountPanelMotion() {
    this._panelMotionMounted = true;
    this._panelReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._panelCleanups = new Map();
    const root = document.documentElement;
    const panels = ['forge-download-panel', 'forge-notification-panel'].map(id => document.getElementById(id)).filter(Boolean);
    this._panelMotionPanels = panels;
    this._panelMotionOpen = new Map();
    const profile = document.getElementById('forge-profile-panel');
    this.syncPanelMotion();
    const keyboard = event => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) root.dataset.forgeInput = 'keyboard'; };
    const pointer = () => { root.dataset.forgeInput = 'pointer'; };
    const profileToggle = event => {
      if (event.newState === 'open') {
        profile.inert = false;
        this.cancelPanelCleanup('profile');
        this.updatePanelOrigin(profile);
      } else profile.inert = true;
    };
    const resize = () => { for (const panel of panels) if (panel.dataset.open === 'true') this.updatePanelOrigin(panel); if (profile?.matches(':popover-open')) this.updatePanelOrigin(profile); };
    this._panelListeners = [[document, 'keydown', keyboard, true], [document, 'pointerdown', pointer, true], [profile, 'beforetoggle', profileToggle, false], [window, 'resize', resize, false]];
    for (const [node, type, listener, capture] of this._panelListeners) node?.addEventListener(type, listener, capture);
    if (profile) profile.inert = !profile.matches(':popover-open');
  }
  componentDidUpdate() { this.syncPanelMotion(); this.syncSurfaceMotion(); }
  syncPanelMotion() {
    for (const panel of this._panelMotionPanels || []) {
      const open = panel.dataset.open === 'true';
      if (this._panelMotionOpen.get(panel) === open) continue;
      this._panelMotionOpen.set(panel, open);
      panel.inert = !open;
      if (open) this.updatePanelOrigin(panel);
    }
  }
  unmountPanelMotion() {
    this._panelMotionMounted = false;
    this._panelMotionPanels = [];
    for (const key of this._panelCleanups?.keys() || []) this.cancelPanelCleanup(key);
    for (const [node, type, listener, capture] of this._panelListeners || []) node?.removeEventListener(type, listener, capture);
    this._profileExitValues = null; this._taskLinkExitValues = null;
    this._surfaceMotionValues?.clear();
  }
  // panel-motion:end
