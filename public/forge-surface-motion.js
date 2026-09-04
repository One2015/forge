// DOM-owned indicators also cover controls rendered by the artifact React root.
(() => {
  const groups = new Set();
  let frame = 0;
  const resize = new ResizeObserver(schedule);
  function sync() {
    frame = 0;
    for (const group of groups) if (!group.isConnected) { resize.unobserve(group); groups.delete(group); }
    document.querySelectorAll('[data-forge-segmented],.forge-artifact-switch').forEach(group => {
      if (!group.dataset.forgeSegmented) group.dataset.forgeSegmented = 'pill';
      if (!groups.has(group)) { groups.add(group); resize.observe(group); }
      const active = group.querySelector('[data-motion-selected="true"],[aria-pressed="true"],label[data-checked="true"]');
      if (!active || !group.offsetWidth || !active.offsetWidth) return;
      // offset geometry remains stable while an ancestor dialog scales in.
      const underline = group.dataset.forgeSegmented === 'underline';
      const left = active.offsetLeft, right = group.clientWidth - left - active.offsetWidth;
      const top = underline ? group.clientHeight - 2 : active.offsetTop;
      const bottom = underline ? 0 : group.clientHeight - top - active.offsetHeight;
      for (const [name, value] of Object.entries({ left, right, top, bottom })) group.style.setProperty('--forge-segment-' + name, Math.max(0, value) + 'px');
      if (group.dataset.motionReady !== 'true') requestAnimationFrame(() => { if (group.isConnected) group.dataset.motionReady = 'true'; });
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-motion-selected', 'aria-pressed', 'data-checked', 'open', 'data-editing'] });
  document.addEventListener('toggle', schedule, true);
  document.fonts?.ready.then(schedule);
  window.addEventListener('resize', () => {
    for (const group of groups) group.dataset.motionReady = 'false';
    schedule();
  });
  window.addEventListener('pagehide', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); }, { once: true });
  schedule();
})();
