// Pure planning keeps filtering/reordering behavior testable without a browser.
export function planListMotion(previous, current, { keyboard = false, reduce = false, pageChanged = false, limit = 24 } = {}) {
  if (keyboard || pageChanged) return [];
  const result = [];
  for (const row of current) {
    if (!row.visible || result.length >= limit) continue;
    const old = previous.get(row.key);
    const dx = old ? old.x - row.x : 0, dy = old ? old.y - row.y : 4;
    if (old && Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
    const move = !!old && !reduce && Math.abs(dx) <= 120 && Math.abs(dy) <= 120;
    result.push({ key: row.key, opacity: old && move ? 1 : .45, x: move ? dx : 0, y: reduce ? 0 : move ? dy : old ? 0 : 4, duration: reduce ? 90 : 150 });
  }
  return result;
}

export function mountFlowMotion(doc) {
  const win = doc.defaultView, reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Map();
  let main = null, view = null, signature = '', rows = new Map(), frame = 0;
  const keyboard = () => doc.documentElement.dataset.forgeInput === 'keyboard';
  const cancel = element => { animations.get(element)?.cancel(); animations.delete(element); };
  const stop = () => { for (const element of animations.keys()) cancel(element); };
  function play(element, from, duration) {
    cancel(element);
    if (!duration || !element.animate) return;
    const animation = element.animate([from, { opacity: 1, ...(from.transform === undefined ? {} : { transform: 'none' }) }], { duration, easing: 'cubic-bezier(.16,1,.3,1)' });
    animations.set(element, animation);
    animation.onfinish = () => { if (animations.get(element) === animation) animations.delete(element); };
  }
  function sync() {
    frame = 0;
    const currentMain = doc.querySelector('.forge-main[data-flow-view]');
    if (!currentMain) return;
    const nextView = currentMain.dataset.flowView, changed = main === currentMain && view !== null && view !== nextView;
    if (main !== currentMain) { stop(); rows = new Map(); signature = ''; }
    main = currentMain; view = nextView;
    // Opacity-only on the page preserves the containing block of its fixed dialogs.
    if (changed) {
      const opacity = animations.has(main) ? win.getComputedStyle(main).opacity : .68;
      stop(); rows = new Map(); signature = '';
      if (!keyboard()) play(main, { opacity }, reduced.matches ? 90 : 160);
    }
    const elements = [...main.querySelectorAll('[data-flow-family][data-flow-row]')].filter(element =>
      element.dataset.reviewWorkbench !== 'true' && !element.closest('[role="dialog"],dialog,[data-motion-overlay]'));
    const nextSignature = JSON.stringify(elements.map(element => [element.dataset.flowFamily, element.dataset.flowRow]));
    if (signature === nextSignature) return;
    const oldVisual = new Map();
    for (const [key, row] of rows) {
      let x = row.x, y = row.y;
      // Sample only our own in-flight transform, before canceling reused React nodes.
      if (animations.has(row.element)) {
        const matrix = new win.DOMMatrixReadOnly(win.getComputedStyle(row.element).transform);
        x += matrix.m41; y += matrix.m42;
      }
      oldVisual.set(key, { x, y });
    }
    for (const element of animations.keys()) if (element !== main) cancel(element);
    const bounds = main.getBoundingClientRect(), current = [], seen = new Set();
    // Batch all geometry reads before any animation writes.
    for (const element of elements) {
      const box = element.getBoundingClientRect(), key = JSON.stringify([element.dataset.flowFamily, element.dataset.flowRow]);
      if (seen.has(key)) continue;
      seen.add(key);
      current.push({ key, element, x: box.left - bounds.left, y: box.top - bounds.top,
        visible: box.height > 0 && box.width > 0 && box.bottom > 0 && box.top < win.innerHeight && box.right > 0 && box.left < win.innerWidth });
    }
    const byKey = new Map(current.map(row => [row.key,row]));
    const plans = planListMotion(oldVisual,current,{ keyboard: keyboard(), reduce: reduced.matches, pageChanged: changed || !signature });
    for (const plan of plans) play(byKey.get(plan.key).element,{ opacity: plan.opacity, transform: 'translate(' + plan.x + 'px,' + plan.y + 'px)' },plan.duration);
    rows = byKey; signature = nextSignature;
  }
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(sync); };
  // Apply a reveal in the same mutation batch as the new rows/view. Deferring
  // a React commit inside rAF until the next frame exposes the final content
  // first, then visibly dims it when the animation finally starts.
  const observer = new win.MutationObserver(() => {
    win.cancelAnimationFrame(frame);
    sync();
  });
  observer.observe(doc.documentElement,{ subtree: true, childList: true, attributes: true, attributeFilter: ['data-flow-view','data-flow-row','data-review-workbench'] });
  const onKey = event => { if (!['Shift','Control','Alt','Meta'].includes(event.key)) stop(); };
  const onResize = () => { stop(); rows = new Map(); signature = ''; schedule(); };
  doc.addEventListener('keydown',onKey,true);
  win.addEventListener('resize',onResize);
  reduced.addEventListener('change',onResize);
  const destroy = () => { stop(); observer.disconnect(); win.cancelAnimationFrame(frame); doc.removeEventListener('keydown',onKey,true); win.removeEventListener('resize',onResize); reduced.removeEventListener('change',onResize); };
  win.addEventListener('pagehide',destroy,{ once: true });
  schedule();
  return destroy;
}
if (typeof document !== 'undefined') mountFlowMotion(document);
