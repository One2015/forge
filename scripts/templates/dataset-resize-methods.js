  // dataset-resize:start
  startDatasetResize(event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    this.finishDatasetResize();
    const handle = event.currentTarget, panel = handle.parentElement;
    const width = panel.getBoundingClientRect().width;
    this._datasetResize = { handle, panel, pointerId: event.pointerId, startX: event.clientX, startWidth: width, width };
    handle.setAttribute('data-resizing', 'true');
    handle.setPointerCapture(event.pointerId);
  }
  moveDatasetResize(event) {
    const drag = this._datasetResize;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.buttons === 0) { this.finishDatasetResize(); return; }
    event.preventDefault();
    drag.width = Math.max(360, Math.min(760, drag.startWidth + drag.startX - event.clientX));
    // Resize necessarily changes layout, but does not rerender the entire application per move.
    drag.panel.style.width = drag.width + 'px';
    drag.handle.setAttribute('aria-valuenow', String(Math.round(drag.width)));
  }
  finishDatasetResize(event) {
    const drag = this._datasetResize;
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.pointerId)) return;
    this._datasetResize = null;
    drag.handle.setAttribute('data-resizing', 'false');
    if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
    this.setState({ panelW: drag.width });
  }
  keyDatasetResize(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const width = event.currentTarget.parentElement.getBoundingClientRect().width;
    const step = event.shiftKey ? 40 : 10;
    const next = event.key === 'Home' ? 360 : event.key === 'End' ? 760 : width + (event.key === 'ArrowLeft' ? step : -step);
    this.setState({ panelW: Math.max(360, Math.min(760, next)) });
  }
  mountDatasetResize() {
    this._datasetResizeBlur = () => this.finishDatasetResize();
    window.addEventListener('blur', this._datasetResizeBlur);
  }
  unmountDatasetResize() {
    const drag = this._datasetResize;
    this._datasetResize = null;
    drag?.handle.setAttribute('data-resizing', 'false');
    if (drag?.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
    window.removeEventListener('blur', this._datasetResizeBlur);
  }
  // dataset-resize:end
