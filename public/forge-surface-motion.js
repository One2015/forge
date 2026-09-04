// DOM-owned indicators also cover controls rendered by the artifact React root.
(() => {
  const groups = new Set();
  const geometry = new Map();
  const placements = new Map();
  const selector = '[data-forge-segmented],[data-pm-tabs],.forge-artifact-switch';
  const selected = '[data-motion-selected="true"],[aria-pressed="true"],[aria-selected="true"],[aria-current="page"],[data-active="true"],label[data-checked="true"]';
  let frame = 0;
  const resize = new ResizeObserver(entries => {
    // Resizing is direct manipulation, so never tween stale coordinates.
    for (const { target } of entries) {
      const previous = geometry.get(target);
      const active = [...target.querySelectorAll('button,label[data-checked]')].find(control => control.closest(selector) === target && control.matches(selected));
      // A bold selected label can resize an intrinsic-width group. That is
      // part of selection, not a resize gesture; retain its ongoing slide.
      if (!previous || (previous.active === active && (previous.width !== target.clientWidth || previous.height !== target.clientHeight))) target.dataset.motionInstant = 'true';
    }
    // ResizeObserver runs before paint. Keep the existing indicator visible and
    // place it now; hiding it until another frame flashes the fallback fill.
    sync();
  });
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const group of groups) if (!group.isConnected) {
      resize.unobserve(group); groups.delete(group); geometry.delete(group);
      cancelAnimationFrame(placements.get(group)); placements.delete(group);
    }
    const measurements = [];
    document.querySelectorAll(selector).forEach(group => {
      if (!group.dataset.forgeSegmented) group.dataset.forgeSegmented = group.dataset.pmTabs === 'primary' ? 'underline' : 'pill';
      if (!groups.has(group)) { groups.add(group); resize.observe(group); }
      const controls = [...group.querySelectorAll('button,label[data-checked]')].filter(control => control.closest(selector) === group);
      const active = controls.find(control => control.matches(selected));
      if (!active || !group.offsetWidth || !active.offsetWidth) {
        group.dataset.motionReady = 'false';
        cancelAnimationFrame(placements.get(group)); placements.delete(group);
        return;
      }
      geometry.set(group, { active, width: group.clientWidth, height: group.clientHeight });
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
      measurements.push({ group, width, left, right, top, bottom });
    });
    // Read all tab geometry before writing styles, including groups inside forms.
    for (const { group, width, left, right, top, bottom } of measurements) {
      const instant = group.dataset.motionReady !== 'true' || group.dataset.motionInstant === 'true';
      if (instant) group.dataset.motionInstant = 'true';
      group.style.setProperty('--forge-segment-width', width + 'px');
      for (const [name, value] of Object.entries({ left, right, top, bottom })) group.style.setProperty('--forge-segment-' + name, Math.max(0, value) + 'px');
      group.dataset.motionReady = 'true';
    }
    for (const { group } of measurements) if (group.dataset.motionInstant === 'true') {
      // Commit the immediate placement before re-enabling interpolation. The
      // readiness flag controls visibility only, never the animation lifecycle.
      getComputedStyle(group, '::before').clipPath;
      cancelAnimationFrame(placements.get(group));
      placements.set(group, requestAnimationFrame(() => {
        placements.delete(group);
        if (group.isConnected) group.dataset.motionInstant = 'false';
      }));
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  // A mutation batch is already coalesced. Measuring here keeps the selection
  // and its indicator in the same paint, even when React renders inside rAF.
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-motion-selected', 'aria-pressed', 'aria-selected', 'aria-current', 'data-active', 'data-checked', 'open', 'data-editing'] });
  document.addEventListener('toggle', schedule, true);
  document.fonts?.ready.then(schedule);
  window.addEventListener('resize', () => {
    for (const group of groups) group.dataset.motionInstant = 'true';
    schedule();
  });
  window.addEventListener('pagehide', () => {
    observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
    for (const pending of placements.values()) cancelAnimationFrame(pending);
    placements.clear();
  }, { once: true });
  schedule();
})();
