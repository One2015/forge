import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateInteractionStates } from './update-interaction-states.mjs';
const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const t = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
function component({ narrow = false, touch = false } = {}) {
  const listeners = new Map(), timers = new Map(); let nextTimer = 0;
  const node = () => ({ addEventListener(type, fn) { listeners.set(this.name + type, fn); }, removeEventListener(type) { listeners.delete(this.name + type); }, focus() {}, matches() { return false; } });
  const toggle = { ...node(), name: 'toggle' }, panel = { ...node(), name: 'panel' };
  const sidebar = { ...node(), name: 'sidebar', querySelector: () => toggle, contains: () => false };
  const document = { ...node(), name: 'document', querySelector: () => sidebar, getElementById: () => panel, activeElement: null };
  const window = { ...node(), name: 'window', location: { search: '' }, matchMedia: query => ({ matches: query.includes('min-width') ? !narrow && !touch : narrow }) };
  const ctx = vm.createContext({ document, window, URLSearchParams, queueMicrotask, setTimeout: fn => { timers.set(++nextTimer,fn); return nextTimer; }, clearTimeout: id => timers.delete(id), DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { this.state = { ...this.state, ...patch }; } } });
  vm.runInContext(code + ';globalThis.c = new Component()', ctx);
  return { c: ctx.c, listeners, document, sidebar, toggle, window, timers };
}
test('hover temporarily expands without changing pin preference, page or drafts', () => {
  const { c } = component();
  c.setState({ sidebarCollapsed: true, view: 'datasets', reworkNotes: { a: '保留' } });
  c.startSidebarPeek({ pointerType: 'mouse' });
  let v = c.renderVals().sidebar;
  assert.equal(v.rail, true); assert.equal(v.collapsed, false); assert.equal(v.peeking, true); assert.equal(v.toggleLabel, '固定展开导航');
  c.endSidebarPeek(); v = c.renderVals().sidebar;
  assert.equal(v.collapsed, true); assert.equal(v.peeking, false);
  assert.equal(c.state.view, 'datasets'); assert.equal(c.state.reworkNotes.a, '保留');
});
test('click while peeking pins open; a later click collapses and does not immediately reopen', () => {
  const { c } = component(); c.setState({ sidebarCollapsed: true }); c.startSidebarPeek(); c.toggleSidebar();
  assert.equal(c.state.sidebarCollapsed, false); assert.equal(c.state.sidebarPeek, false);
  c.endSidebarPeek(true); assert.equal(c.renderVals().sidebar.expanded, true);
  c.toggleSidebar(); c.startSidebarPeek();
  assert.equal(c.renderVals().sidebar.collapsed, true);
  c._sidebarPeekSuppressed = false; c.startSidebarPeek(); assert.equal(c.renderVals().sidebar.peeking, true);
});
test('pointer, keyboard and open utilities retain the peek until their interaction ends', () => {
  const { c, document, sidebar } = component(); c.setState({ sidebarCollapsed: true }); c.mountSidebarInteractions(); c.startSidebarPeek();
  c._sidebarPointerInside = true; c.endSidebarPeek(); assert.equal(c.state.sidebarPeek, true);
  c._sidebarPointerInside = false; c.setState({ dlOpen: true }); c.endSidebarPeek(); assert.equal(c.state.sidebarPeek, true);
  c.setState({ dlOpen: false }); document.activeElement = { matches: () => true }; sidebar.contains = () => true;
  c.endSidebarPeek(); assert.equal(c.state.sidebarPeek, true);
  document.activeElement = null; c.endSidebarPeek(); assert.equal(c.state.sidebarPeek, false);
});
test('touch and narrow devices use click only; resize, blur, Escape and unmount are bounded', () => {
  for (const options of [{ touch: true }, { narrow: true }]) {
    const { c } = component(options); c.setState({ sidebarCollapsed: true }); c.startSidebarPeek(); assert(!c.state.sidebarPeek);
    c.toggleSidebar(); assert.equal(c.state.sidebarCollapsed, false);
  }
  const { c, listeners, window } = component(); c.setState({ sidebarCollapsed: true }); c.mountSidebarInteractions();
  c.startSidebarPeek(); let prevented = false;
  listeners.get('documentkeydown')({ key: 'Escape', preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  assert(prevented); assert.equal(c.state.sidebarPeek, false);
  c._sidebarPeekSuppressed = false; c.startSidebarPeek(); listeners.get('windowblur')(); assert.equal(c.state.sidebarPeek, false);
  c.startSidebarPeek(); window.matchMedia = () => ({ matches: false }); listeners.get('windowresize')(); assert.equal(c.state.sidebarPeek, false);
  c.unmountSidebarInteractions(); assert.equal(listeners.size, 0);
});
test('brief pointer exits are cancellable and stale callbacks cannot close a new peek', () => {
  const { c, listeners, timers } = component(); c.setState({ sidebarCollapsed: true }); c.mountSidebarInteractions();
  const enter = () => listeners.get('sidebarpointerenter')({ pointerType: 'mouse' });
  const leave = () => listeners.get('sidebarpointerleave')();
  enter(); leave(); assert.equal(c.state.sidebarPeek, true); assert.equal(timers.size, 1);
  const stale = [...timers.values()][0]; enter(); assert.equal(timers.size, 0);
  stale(); assert.equal(c.state.sidebarPeek, true);
  leave(); [...timers.values()][0](); assert.equal(c.state.sidebarPeek, false);
});
test('pinning, focus retention, blur and disposal safely resolve a pending hover close', () => {
  for (const action of ['pin','focus','blur','unmount']) {
    const { c, listeners, timers, document, sidebar } = component(); c.setState({ sidebarCollapsed: true }); c.mountSidebarInteractions();
    listeners.get('sidebarpointerenter')({ pointerType: 'mouse' }); listeners.get('sidebarpointerleave')();
    const stale = [...timers.values()][0];
    if (action === 'pin') c.toggleSidebar();
    if (action === 'focus') { document.activeElement = { matches: () => true }; sidebar.contains = () => true; c.endSidebarPeek(); }
    if (action === 'blur') listeners.get('windowblur')();
    if (action === 'unmount') c.unmountSidebarInteractions();
    assert.equal(timers.size,0); const before = JSON.stringify(c.state); stale(); assert.equal(JSON.stringify(c.state),before);
    if (action === 'pin') assert.equal(c.state.sidebarCollapsed,false);
    if (action === 'focus') assert.equal(c.state.sidebarPeek,true);
    if (action === 'blur') assert.equal(c.state.sidebarPeek,false);
  }
});
test('navigation closes only the temporary expansion; unchanged keyboard and business actions remain', () => {
  const { c } = component(); c.setState({ sidebarCollapsed: true, sidebarPeek: true });
  c.renderVals().sidebar.goRuns({ stopPropagation() {} });
  assert.equal(c.state.view, 'runs'); assert.equal(c.state.sidebarCollapsed, true); assert.equal(c.state.sidebarPeek, false);
  assert(t.includes('aria-expanded="{{ sidebar.expanded }}"'));
});
test('rail, hover, selected, focus and borderless toggle styles share explicit state tokens', () => {
  const css = read('./templates/interaction-states.css');
  assert(t.includes(css.trimEnd())); assert(t.includes('data-sidebar-rail="{{ sidebar.rail }}"'));
  assert(css.includes('.forge-app-shell[data-sidebar-rail="true"]{--forge-sidebar-width:64px}'));
  assert(css.includes('pointer:fine')); assert(!css.includes('transition:all')); assert(!css.includes('animation:'));
  assert.match(css, /\.forge-sidebar-profile:not\(\[aria-expanded="true"\]\)[\s\S]+background:var\(--forge-hover\)/);
  assert.match(t, /\.forge-sidebar-collapse\{[^}]*border:0;[^}]*background:transparent/);
  assert(css.includes('outline:2px solid var(--forge-accent)'));
  assert(!t.includes('/* download-selected:start */'));
});
test('floating utilities stay outside the animated sidebar clipping boundary', () => {
  const asideStart = t.indexOf('<aside class="forge-sidebar"'), asideEnd = t.indexOf('</aside>',asideStart);
  for (const id of ['forge-download-panel','forge-notification-panel']) {
    assert(t.indexOf('id="' + id + '"') > asideEnd);
    assert(t.slice(asideStart,asideEnd).includes('aria-controls="' + id + '"'));
  }
});
test('upload progress, preview wait and recovery use actual state and remain dismissible', () => {
  for (const busy of ['deliveryEditor.logoLoading', 'deliveryEditor.listLoading', 'deliveryEditor.skillLoading', 'profile.draftLoading']) assert(t.includes('aria-busy="{{ ' + busy + ' }}"'), busy);
  const ui = read('./ui/artifact-preview.tsx');
  assert(ui.includes('aria-busy={status === \'loading\'}'));
  assert(!ui.includes('aria-busy={reading}'), 'The removed local model picker has no orphaned loading state');
  assert(ui.includes('}, 30000)')); assert(ui.includes('重新加载')); assert(ui.includes('clearTimeout(timer.current)'));
  assert(ui.includes('onLoad={() => finish(\'ready\')}')); assert(ui.includes('if (settled.current) return'));
  assert(ui.includes('value={progress || undefined}')); assert(!ui.includes('auto-rotate'));
});
test('focused migration is idempotent and preserves canonical source workflows', () => {
  assert.equal(updateInteractionStates(source) === source, true);
  assert(t.includes('<!-- sheet-preview-navigation:start -->'));
  assert(t.includes('class="forge-delivery-editor forge-feedback"'));
  assert(t.includes('notifyTaskLink(')); assert(t.includes('mountSidebarInteractions();'));
});
