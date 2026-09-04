// DOM-owned indicators also cover controls rendered by the artifact React root.
(() => {
  const groups = new Set();
  const selector = '[data-forge-segmented],[data-pm-tabs],.forge-artifact-switch';
  const selected = '[data-motion-selected="true"],[aria-pressed="true"],[aria-selected="true"],[aria-current="page"],[data-active="true"],label[data-checked="true"]';
  let frame = 0;
  const resize = new ResizeObserver(entries => {
    // Resizing is direct manipulation, so never tween stale coordinates.
    for (const { target } of entries) target.dataset.motionReady = 'false';
    schedule();
  });
  function sync() {
    frame = 0;
    for (const group of groups) if (!group.isConnected) { resize.unobserve(group); groups.delete(group); }
    document.querySelectorAll(selector).forEach(group => {
      if (!group.dataset.forgeSegmented) group.dataset.forgeSegmented = group.dataset.pmTabs === 'primary' ? 'underline' : 'pill';
      if (!groups.has(group)) { groups.add(group); resize.observe(group); }
      const controls = [...group.querySelectorAll('button,label[data-checked]')].filter(control => control.closest(selector) === group);
      const active = controls.find(control => control.matches(selected));
      if (!active || !group.offsetWidth || !active.offsetWidth) { group.dataset.motionReady = 'false'; return; }
      // offset geometry remains stable while an ancestor dialog scales in.
      const underline = group.dataset.forgeSegmented === 'underline';
      // Cover the scrollable strip, not just its visible viewport. Measure the
      // controls instead of scrollWidth so yesterday's indicator cannot keep a
      // now-smaller strip artificially wide. The layer scrolls with its labels.
      const paddingRight = parseFloat(getComputedStyle(group).paddingRight) || 0;
      const width = Math.max(group.clientWidth, ...controls.map(control => control.offsetLeft + control.offsetWidth + paddingRight));
      const left = active.offsetLeft, right = width - left - active.offsetWidth;
      const top = underline ? group.clientHeight - 2 : active.offsetTop;
      const bottom = underline ? 0 : group.clientHeight - top - active.offsetHeight;
      group.style.setProperty('--forge-segment-width', width + 'px');
      for (const [name, value] of Object.entries({ left, right, top, bottom })) group.style.setProperty('--forge-segment-' + name, Math.max(0, value) + 'px');
      if (group.dataset.motionReady !== 'true') requestAnimationFrame(() => { if (group.isConnected) group.dataset.motionReady = 'true'; });
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-motion-selected', 'aria-pressed', 'aria-selected', 'aria-current', 'data-active', 'data-checked', 'open', 'data-editing'] });
  document.addEventListener('toggle', schedule, true);
  document.fonts?.ready.then(schedule);
  window.addEventListener('resize', () => {
    for (const group of groups) group.dataset.motionReady = 'false';
    schedule();
  });
  window.addEventListener('pagehide', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); }, { once: true });
  schedule();
})();
