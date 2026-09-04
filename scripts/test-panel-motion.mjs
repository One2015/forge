import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updatePanelMotion } from './update-panel-motion.mjs';
const raw = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const t = JSON.parse(raw.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];

function component({ reduce = false, keyboard = false } = {}) {
  const timers = new Map(); let sequence = 0;
  const panel = () => ({ inert: false, open: true, listeners: new Map(), addEventListener(type, fn) { this.listeners.set(type, fn); }, removeEventListener(type) { this.listeners.delete(type); }, close() { this.open = false; }, showModal() { this.open = true; }, hidePopover() {}, matches() { return false; } });
  const dialog = panel(), profile = panel();
  const document = { documentElement: { dataset: { forgeInput: keyboard ? 'keyboard' : 'pointer' } }, querySelector: selector => selector === '.forge-task-link-dialog' ? dialog : null, getElementById: () => profile };
  const context = vm.createContext({ URLSearchParams, document, window: { location: { search: '' }, CSS: { supports: () => true }, matchMedia: () => ({ matches: reduce }) },
    getComputedStyle: () => ({ getPropertyValue: key => key === '--forge-dialog-duration' ? '200ms' : '125ms' }),
    setTimeout: fn => { timers.set(++sequence, fn); return sequence; }, clearTimeout: id => timers.delete(id),
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true }; updates = 0; setState(patch) { this.updates++; this.state = { ...this.state, ...patch }; } } });
  vm.runInContext(code + ';globalThis.c = new Component()', context);
  const c = context.c; c._panelMotionMounted = true; c._panelReduce = { matches: reduce };
  return { c, timers, dialog, profile };
}
function resizer() {
  const captures = new Set();
  const panel = { style: {}, getBoundingClientRect: () => ({ width: parseFloat(panel.style.width) || 460 }) };
  const handle = { parentElement: panel, setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id), setAttribute() {} };
  const event = overrides => ({ button: 0, buttons: 1, isPrimary: true, pointerId: 7, pointerType: 'touch', clientX: 300, currentTarget: handle, preventDefault() {}, ...overrides });
  return { panel, handle, captures, event };
}
test('touch resize tracks 1:1 without application updates until release', () => {
  const { c } = component(), { panel, captures, event } = resizer();
  c.startDatasetResize(event()); assert(captures.has(7));
  c.moveDatasetResize(event({ clientX: 360 })); assert.equal(panel.style.width, '400px'); assert.equal(c.updates, 0);
  c.finishDatasetResize(event()); assert.equal(c.state.panelW, 400); assert.equal(c.updates, 1); assert(!captures.size);
});
test('cancel, blur and missing pressed buttons end resizing; other pointers cannot hijack it', () => {
  for (const end of ['cancel', 'blur', 'buttons']) {
    const { c } = component(), { panel, captures, event } = resizer(); c.startDatasetResize(event());
    c.moveDatasetResize(event({ pointerId: 9, clientX: 900 })); assert.equal(panel.style.width, undefined);
    c.moveDatasetResize(event({ clientX: 250 }));
    if (end === 'buttons') c.moveDatasetResize(event({ buttons: 0 })); else c.finishDatasetResize(end === 'blur' ? undefined : event());
    c.moveDatasetResize(event({ clientX: 800 })); assert.equal(panel.style.width, '510px'); assert.equal(c.state.panelW, 510); assert(!captures.size);
  }
});
test('keyboard resize and pointer limits retain the 360–760px bounds', () => {
  const { c } = component(), { panel, event } = resizer();
  c.keyDatasetResize(event({ key: 'ArrowLeft' })); assert.equal(c.state.panelW, 470);
  c.keyDatasetResize(event({ key: 'ArrowRight', shiftKey: true })); assert.equal(c.state.panelW, 420);
  c.keyDatasetResize(event({ key: 'Home' })); assert.equal(c.state.panelW, 360);
  c.keyDatasetResize(event({ key: 'End' })); assert.equal(c.state.panelW, 760);
  c.startDatasetResize(event()); c.moveDatasetResize(event({ clientX: -1000 })); assert.equal(panel.style.width, '760px');
  c.moveDatasetResize(event({ clientX: 2000 })); assert.equal(panel.style.width, '360px'); c.finishDatasetResize();
});
const ref = { sheetKey: 'ant200', itemId: 'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f' };
test('dialog exit retains visuals, immediately cancels its draft, and cannot clear a rapid reopen', () => {
  const { c, timers, dialog } = component(); c.openTaskLink(ref);
  const title = c.taskLinkValues().sourceName;
  c.closeTaskLink(); assert.equal(c.state.taskLink, null); assert.equal(dialog.open, false); assert(dialog.inert);
  assert.equal(c.taskLinkValues().sourceName, title); assert.equal(c.taskLinkValues().open, true);
  const oldTimers = [...timers.values()];
  c.openTaskLink(ref); const next = c.state.taskLink;
  for (const callback of oldTimers) callback();
  assert.equal(c.state.taskLink, next); assert.equal(c._taskLinkExitValues, null); assert(!c.state.deliveryLinks);
});
test('reduced motion and keyboard dismissal clear visual snapshots immediately', () => {
  for (const options of [{ reduce: true }, { keyboard: true }]) {
    const { c } = component(options); c.openTaskLink(ref); c.closeTaskLink();
    assert.equal(c.taskLinkValues().open, false); assert.equal(c._taskLinkExitValues, null);
  }
});
test('profile keeps its content during exit and native dismissal state remains closed', () => {
  const { c, profile } = component(); c.state.profileOpen = true;
  const before = c.profileValues(); c.closeProfile();
  assert.equal(c.state.profileOpen, false); assert.equal(c.profileValues().open, false); assert.equal(c.profileValues().taskCount, before.taskCount);
  profile.listeners.get('transitionend')({ target: profile, propertyName: 'opacity' });
  assert.equal(c._profileExitValues, null);
});
test('motion patch can be reapplied without replaying unrelated workflows', () => {
  assert.equal(updatePanelMotion(raw), raw);
  assert(t.includes('role="separator"')); assert(t.includes('sc-camel-on-pointer-cancel'));
  assert(!t.includes("window.addEventListener('mousemove', this._move)"));
});
