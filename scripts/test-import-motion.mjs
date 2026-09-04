import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildPostman } from './postman-ui/build.mjs';
import { mountImportMotion } from '../public/postman-ui/import-motion.mjs';

function harness({ reduce = false, keyboard = false } = {}) {
  const callbacks = new Map(), frames = new Map(), plays = [];
  let sequence = 0, notify, target = null, disconnected = false;
  const events = prefix => ({ addEventListener: (name, fn) => callbacks.set(prefix + name, fn), removeEventListener: name => callbacks.delete(prefix + name) });
  const reduced = { matches: reduce, ...events('media:') };
  const win = {
    ...events('window:'), matchMedia: () => reduced,
    requestAnimationFrame: fn => { frames.set(++sequence, fn); return sequence; },
    cancelAnimationFrame: id => frames.delete(id), getComputedStyle: () => ({ opacity: '.88' }),
    MutationObserver: class { constructor(fn) { notify = fn; } observe() {} disconnect() { disconnected = true; } },
  };
  const doc = { ...events('doc:'), defaultView: win, documentElement: { dataset: { forgeInput: keyboard ? 'keyboard' : 'pointer' } }, querySelector: () => target };
  const node = () => ({ dataset: { pmImportBump: 'false', pmImportDerive: 'false' }, animate: (keyframes, options) => {
    const animation = { keyframes, options, canceled: false, cancel() { this.canceled = true; } };
    plays.push(animation); return animation;
  } });
  const flush = () => { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } };
  const destroy = mountImportMotion(doc);
  const mount = () => { target = node(); notify(); flush(); };
  const change = mode => { target.dataset.pmImportBump = String(mode === 'bump'); target.dataset.pmImportDerive = String(mode === 'derive'); notify(); flush(); };
  return { plays, callbacks, doc, reduced, mount, change, destroy, notify, flush,
    remove: () => { target = null; notify(); flush(); }, get disconnected() { return disconnected; } };
}

test('only a subsequent import mode change fades, never initial mount or unrelated input', () => {
  const h = harness(); h.mount(); h.notify(); h.flush();
  assert.equal(h.plays.length, 0);
  h.change('derive');
  assert.deepEqual(h.plays[0].keyframes, [{ opacity: .75 }, { opacity: 1 }]);
  assert.deepEqual(h.plays[0].options, { duration: 160, easing: 'cubic-bezier(.16,1,.3,1)' });
  h.change('derive'); h.notify(); h.flush();
  assert.equal(h.plays.length, 1);
  h.destroy();
});
test('rapid switches continue from the in-flight opacity and ignore stale finish events', () => {
  const h = harness(); h.mount(); h.change('derive');
  const first = h.plays[0]; h.change('bump');
  assert.equal(first.canceled, true);
  assert.equal(h.plays[1].keyframes[0].opacity, '.88');
  first.onfinish(); h.change('file');
  assert.equal(h.plays[1].canceled, true);
  h.destroy();
});
test('keyboard and reduced motion switch immediately without changing form state', () => {
  for (const options of [{ keyboard: true }, { reduce: true }]) {
    const h = harness(options); h.mount(); h.change('derive'); h.change('bump');
    assert.equal(h.plays.length, 0); h.destroy();
  }
});
test('keyboard, resize and live reduced-motion changes cancel animation without replay', () => {
  for (const event of ['doc:keydown', 'window:resize', 'media:change']) {
    const h = harness(); h.mount(); h.change('derive');
    h.callbacks.get(event)({ key: 'Tab' });
    assert.equal(h.plays[0].canceled, true);
    h.notify(); h.flush(); assert.equal(h.plays.length, 1); h.destroy();
  }
});
test('closing and reopening the import card never leaves an exit or entrance animation', () => {
  const h = harness(); h.mount(); h.change('derive'); h.remove();
  assert.equal(h.plays[0].canceled, true);
  h.mount(); assert.equal(h.plays.length, 1);
  h.destroy(); assert.equal(h.disconnected, true); assert.equal(h.callbacks.size, 0);
});
test('Postman opts in one import control without changing callbacks, actions or data values', () => {
  const raw = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
  const decode = s => JSON.parse(s.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
  const built = decode(buildPostman(raw));
  assert.equal((built.match(/class="pm-import-modes"/g) || []).length, 1);
  assert.equal((built.match(/class="pm-import-config"/g) || []).length, 1);
  assert.match(built, /data-pm-import-bump="{{ importIsBump }}" data-pm-import-derive="{{ importFromDs }}"/);
  const config = built.slice(built.indexOf('<div class="pm-import-config"'), built.indexOf('{{ importHint }}'));
  for (const name of ['importNeedsName', 'importIsBump', 'importFromFile', 'importFromDs', 'onImportName', 'onImportSubject']) assert(config.includes(name));
  assert.match(config, /<\/div>\s*<div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">/);
  assert.match(built, /class="pm-import-modes"[^>]*data-pm-tabs="secondary"/);
  const logic = built.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const ctx = vm.createContext({ URL, URLSearchParams, TextDecoder, TextEncoder, Blob, setTimeout: () => 0, clearTimeout() {}, window: { location: { search: '' } }, DCLogic: class { props = {}; setState(patch) { this.state = { ...this.state, ...patch }; } } });
  vm.runInContext(logic + ';globalThis.c = new Component();', ctx);
  const c = ctx.c;
  c.state = { ...c.state, view: 'datasets', importOpen: true, importName: '保留的名称', importSubject: '保留的标签' };
  for (const [index, mode] of [[1, 'bump'], [2, 'derive'], [0, 'file']]) {
    c.renderVals().importTabs[index].pick();
    assert.equal(c.state.importMode, mode);
    assert.equal(c.state.importName, '保留的名称');
    assert.equal(c.state.importSubject, '保留的标签');
  }
});
test('indicator reuses existing geometry, reserves label width and retains immediate variants', () => {
  const css = fs.readFileSync(new URL('../public/postman-ui/import-motion.css', import.meta.url), 'utf8');
  assert.match(css, /--forge-segment-fill:var\(--pm-pressed\)/);
  assert.match(css, /\[data-motion-ready=true\]::before\{display:block!important/);
  assert.match(css, /\[data-motion-label\]::after\{display:block!important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /data-forge-input=keyboard/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /display:grid!important/);
  assert.match(css, /white-space:normal!important/);
  assert.match(css, /\.pm-import-config\{min-width:0;opacity:1\}/);
  assert.doesNotMatch(css, /transition:\s*(all|width|height)/);
});
