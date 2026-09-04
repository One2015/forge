// Mode changes only: no entrance on mount, input, source selection or resize.
export function mountImportMotion(doc) {
  const win = doc.defaultView;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let element = null, mode = null, animation = null, frame = 0;
  const stop = () => { animation?.cancel(); animation = null; };
  function sync() {
    frame = 0;
    const next = doc.querySelector('.pm-import-config');
    const nextMode = !next ? null : next.dataset.pmImportBump === 'true' ? 'bump' : next.dataset.pmImportDerive === 'true' ? 'derive' : 'file';
    const changed = next === element && mode != null && nextMode !== mode;
    if (next !== element) stop();
    element = next; mode = nextMode;
    if (!changed) return;
    // Sample before canceling, so rapid switching never flashes back to .75.
    const opacity = animation ? win.getComputedStyle(element).opacity : .75;
    stop();
    if (reduced.matches || doc.documentElement.dataset.forgeInput === 'keyboard' || !element?.animate) return;
    const current = element.animate([{ opacity }, { opacity: 1 }], {
      duration: 160, easing: 'cubic-bezier(.16,1,.3,1)',
    });
    animation = current;
    current.onfinish = () => { if (animation === current) animation = null; };
  }
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(sync); };
  // React can commit during an animation frame. Start in the mutation batch,
  // before paint, so content never appears at full opacity then dims a frame later.
  const observer = new win.MutationObserver(() => {
    win.cancelAnimationFrame(frame);
    sync();
  });
  observer.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-pm-import-bump', 'data-pm-import-derive'] });
  const onKey = event => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) stop(); };
  doc.addEventListener('keydown', onKey, true);
  win.addEventListener('resize', stop);
  reduced.addEventListener('change', stop);
  const destroy = () => {
    stop(); observer.disconnect(); win.cancelAnimationFrame(frame);
    doc.removeEventListener('keydown', onKey, true);
    win.removeEventListener('resize', stop);
    win.removeEventListener('pagehide', destroy);
    reduced.removeEventListener('change', stop);
  };
  win.addEventListener('pagehide', destroy, { once: true });
  schedule();
  return destroy;
}
if (typeof document !== 'undefined') mountImportMotion(document);
