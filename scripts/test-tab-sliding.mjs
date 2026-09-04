import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('./surface-motion-runtime.js', import.meta.url), 'utf8');

function harness(kind = 'secondary') {
  const frames = new Map(), events = new Map(), values = new Map();
  let serial = 0, notify, resize, observedOptions, disconnected = false;
  const controls = [0, 80, 190].map((left, index) => ({
    selected: index === 0, offsetLeft: left, offsetTop: 3, offsetWidth: index === 1 ? 110 : 76, offsetHeight: 32,
    matches() { return this.selected; }, closest() { return group; }
  }));
  const group = { dataset: { pmTabs: kind }, isConnected: true, clientWidth: 280, clientHeight: 38, offsetWidth: 280,
    querySelectorAll: () => controls, style: { setProperty: (key, value) => values.set(key, value) } };
  const requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  const listeners = prefix => ({ addEventListener: (name, fn) => events.set(prefix + name, fn) });
  const doc = { ...listeners('doc:'), documentElement: {}, querySelectorAll: () => group.isConnected ? [group] : [], fonts: null };
  vm.runInNewContext(source, {
    document: doc, window: listeners('window:'), requestAnimationFrame, cancelAnimationFrame: id => frames.delete(id),
    getComputedStyle: () => ({ paddingRight: '2px' }),
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} unobserve() {} disconnect() { disconnected = true; } },
    MutationObserver: class { constructor(fn) { notify = fn; } observe(_node, options) { observedOptions = options; } disconnect() { disconnected = true; } },
  });
  const flushFrame = () => { const current = [...frames]; frames.clear(); current.forEach(([,fn])=>fn()); };
  const flush = () => { while (frames.size) flushFrame(); };
  const pick = index => { controls.forEach((c, i) => { c.selected = index === i; }); notify(); flush(); };
  flush();
  return { group, controls, values, events, pick, flush, flushFrame, notify, resize: () => resize([{ target: group }]),
    get options() { return observedOptions; }, get disconnected() { return disconnected; } };
}

test('secondary and primary indicators follow the selected control without changing its state', () => {
  const pill = harness();
  pill.pick(1);
  assert.equal(pill.group.dataset.forgeSegmented, 'pill');
  assert.equal(pill.values.get('--forge-segment-left'), '80px');
  assert.equal(pill.values.get('--forge-segment-right'), '90px');
  assert.equal(pill.values.get('--forge-segment-top'), '3px');
  assert.deepEqual(pill.controls.map(c=>c.selected), [false, true, false]);
  const line = harness('primary'); line.pick(2);
  assert.equal(line.group.dataset.forgeSegmented, 'underline');
  assert.equal(line.values.get('--forge-segment-top'), '36px');
  assert.equal(line.values.get('--forge-segment-bottom'), '0px');
});
test('a narrow scrolling strip retains the complete selected width, then shrinks without stale overflow', () => {
  const h = harness(); h.group.clientWidth = h.group.offsetWidth = 140;
  h.pick(2);
  assert.equal(h.values.get('--forge-segment-width'), '268px');
  assert.equal(h.values.get('--forge-segment-right'), '2px');
  h.controls[1].offsetLeft = 40; h.controls[1].offsetWidth = 40;
  h.controls[2].offsetLeft = 84; h.controls[2].offsetWidth = 40;
  h.notify(); h.flush();
  assert.equal(h.values.get('--forge-segment-width'), '140px');
});
test('rapid changes use the latest actual selection; losing selection hides the indicator', () => {
  const h = harness(); h.pick(2); h.pick(0); h.pick(1);
  assert.equal(h.values.get('--forge-segment-left'), '80px');
  h.pick(-1); assert.equal(h.group.dataset.motionReady, 'false');
  h.pick(2); assert.equal(h.group.dataset.motionReady, 'true');
});
test('container resize updates geometry before paint without hiding the indicator', () => {
  const h = harness(); h.pick(1); h.group.clientWidth = 200;
  h.controls[1].offsetLeft = 60; h.resize();
  assert.equal(h.group.dataset.motionReady, 'true');
  assert.equal(h.group.dataset.motionInstant, 'true');
  assert.equal(h.values.get('--forge-segment-left'), '60px');
  h.flushFrame();
  assert.equal(h.group.dataset.motionReady, 'true');
  assert.equal(h.group.dataset.motionInstant, 'false');
});
test('selection and indicator update in the same mutation batch, including rapid reversals', () => {
  const h = harness();
  for (const index of [2, 0, 1]) {
    h.controls.forEach((c, i) => { c.selected = i === index; });
    h.notify();
    // No animation frame has run yet: the renderer and indicator must agree.
    assert.equal(h.values.get('--forge-segment-left'), h.controls[index].offsetLeft + 'px');
    assert.equal(h.group.dataset.motionReady, 'true');
    assert.equal(h.group.dataset.motionInstant, 'false');
  }
});
test('window resize retains selection and a stale placement cannot revive an empty group', () => {
  const h = harness(); h.pick(1);
  h.events.get('window:resize')();
  assert.equal(h.group.dataset.motionReady, 'true');
  h.flushFrame();
  h.controls.forEach(c => { c.selected = false; }); h.notify(); h.flush();
  assert.equal(h.group.dataset.motionReady, 'false');
});
test('intrinsic width changes caused by selection do not interrupt the slide', () => {
  const h = harness();
  h.controls.forEach((c,i)=>c.selected=i===1); h.group.clientWidth=284; h.resize();
  assert.equal(h.group.dataset.motionReady, 'true');
  h.flush(); h.resize();
  assert.equal(h.group.dataset.motionReady, 'true');
});
test('all existing selection contracts and text/count updates trigger measurement; teardown disconnects', () => {
  const h = harness();
  for (const name of ['aria-pressed','aria-selected','aria-current','data-active','data-motion-selected','data-checked']) assert(h.options.attributeFilter.includes(name));
  assert.equal(h.options.characterData, true);
  h.group.isConnected = false; h.notify(); h.flush();
  h.events.get('window:pagehide')(); assert.equal(h.disconnected, true);
  assert.equal(fs.readFileSync(new URL('../public/forge-surface-motion.js', import.meta.url), 'utf8'), source);
});
