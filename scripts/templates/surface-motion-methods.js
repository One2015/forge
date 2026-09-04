  // surface-motion:start
  surfaceMotionDuration(kind = 'dialog') {
    if (!this._panelMotionMounted || typeof document === 'undefined' || document.documentElement.dataset.forgeInput === 'keyboard') return 0;
    if (this._panelReduce?.matches) return 90;
    return kind === 'menu' || kind === 'toast' ? 120 : 160;
  }
  surfaceMotionValue(key, value, open, kind = 'dialog') {
    this._surfaceMotionValues ||= new Map();
    const prior = this._surfaceMotionValues.get(key);
    if (open) {
      this.cancelPanelCleanup('surface:' + key);
      this._surfaceMotionValues.set(key, { value, open: true, kind });
      return Object.assign({}, value, { motionPresent: true, motionOpen: true });
    }
    if (!this.surfaceMotionDuration(kind)) {
      this.cancelPanelCleanup('surface:' + key);
      this._surfaceMotionValues.delete(key);
    } else if (prior) {
      prior.open = false;
      return Object.assign({}, prior.value, { motionPresent: true, motionOpen: false });
    }
    return Object.assign({}, value, { motionPresent: false, motionOpen: false });
  }
  withSurfaceMotion(values) {
    const state = this.state;
    values.flowMotion = { view: JSON.stringify([state.view, state.activeRun || '', state.sheetKey || '', state.lifeItem || '', state.editPipe || '']) };
    values.taskLinkToast = this.surfaceMotionValue('taskLinkToast', values.taskLinkToast, !!state.taskLinkToast, 'toast');
    values.reviewToast = this.surfaceMotionValue('reviewToast', values.reviewToast, !!values.reviewToast?.show, 'toast');
    for (const key of ['pipeCopy', 'newPipe', 'passAsk', 'stopAsk', 'cancelAsk', 'branch', 'deliveryLeave']) {
      values[key] = this.surfaceMotionValue(key, values[key], !!values[key]?.open);
    }
    const editor = values.deliveryEditor;
    editor.detail = this.surfaceMotionValue('skillDetail', editor.detail || {}, !!editor.detail?.open);
    // Creation is a page; only the edit dialog needs presence retention.
    const modal = this.surfaceMotionValue('deliveryEditor', editor, !!editor.modal);
    values.deliveryEditor = editor.page ? editor : modal;
    if (values.sheet?.pick) {
      const sheet = values.sheet;
      sheet.pick.reworkConfirm = this.surfaceMotionValue('sheetReworkConfirm', sheet.pick.reworkConfirm || {}, !!sheet.pick.reworkConfirm?.open);
      sheet.pick = this.surfaceMotionValue('sheetPass', sheet.pick, !!sheet.pick.passConfirmOpen);
      const detail = this.surfaceMotionValue('sheetDetail', sheet, !!sheet.hasPick);
      values.sheet = detail;
    }
    const zoom = this.surfaceMotionValue('zoom', { title: values.zoomTitle, url: values.zoomUrl, note: values.zoomNote }, values.zoomOpen);
    values.zoomMotion = zoom;
    values.zoomTitle = zoom.title; values.zoomUrl = zoom.url; values.zoomNote = zoom.note;
    for (const list of [values.pipeFilters, values.delivery?.cats, values.sheet?.filters, values.runs?.filters, values.importTabs, values.review?.owners]) {
      for (const item of list || []) item.motionSelected = !!item.shadow && item.shadow !== 'none';
    }
    for (const item of values.subNav || []) item.motionSelected = item.weight === '600';
    return values;
  }
  syncSurfaceMotion() {
    if (typeof document === 'undefined') return;
    for (const [key, record] of this._surfaceMotionValues || []) {
      const element = document.querySelector('[data-motion-key="' + key + '"]');
      if (element) element.inert = !record.open;
      if (record.open || this._panelCleanups?.has('surface:' + key)) continue;
      if (!element) { this._surfaceMotionValues.delete(key); continue; }
      this.deferPanelCleanup('surface:' + key, element, () => {
        if (this._surfaceMotionValues?.get(key) !== record) return;
        this._surfaceMotionValues.delete(key);
        if (this._panelMotionMounted) this.setState({});
      }, this.surfaceMotionDuration(record.kind));
    }
    // Mounted menus are immediately inert during exit; their contents stay stable.
    for (const menu of document.querySelectorAll?.('.forge-motion-menu[data-motion-open]') || []) menu.inert = menu.dataset.motionOpen !== 'true';
  }
  // surface-motion:end
