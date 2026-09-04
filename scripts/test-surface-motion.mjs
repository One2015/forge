import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateSurfaceMotion } from './update-surface-motion.mjs';
const raw = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const t = JSON.parse(raw.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const helpers = fs.readFileSync(new URL('./templates/surface-motion-methods.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('./templates/panel-motion-methods.js', import.meta.url), 'utf8');
function component({ keyboard = false, reduce = false } = {}) {
  const timers = new Map(), elements = new Map(); let next = 0;
  const document = { documentElement: { dataset: { forgeInput: keyboard ? 'keyboard' : 'pointer' } },
    querySelector: selector => elements.get(selector.match(/data-motion-key="([^"]+)"/)?.[1]) || null, querySelectorAll: () => [] };
  const context = vm.createContext({ document, setTimeout: fn => { timers.set(++next,fn); return next; }, clearTimeout: id => timers.delete(id) });
  const C = vm.runInContext('(class { ' + panel + helpers + ' })',context), c = new C();
  c._panelMotionMounted = true; c._panelReduce = { matches: reduce }; c.updates = 0; c.setState = () => c.updates++;
  const node = key => { const e = { inert: false, addEventListener() {}, removeEventListener() {} }; elements.set(key,e); return e; };
  return {c, node, timers};
}
test('closed dialog retains content only for exit and immediately becomes inert', () => {
  const {c,node,timers} = component(), element = node('branch');
  c.surfaceMotionValue('branch',{title:'从 v2 创建分支',note:'草稿'},true);
  const closed = c.surfaceMotionValue('branch',{title:'',note:''},false);
  assert.equal(closed.title,'从 v2 创建分支'); assert.equal(closed.motionOpen,false); assert.equal(closed.motionPresent,true);
  c.syncSurfaceMotion(); assert.equal(element.inert,true); assert.equal(timers.size,1);
  [...timers.values()][0](); assert.equal(c.surfaceMotionValue('branch',{},false).motionPresent,false);
});
test('rapid reopening cancels stale completion without clearing the new contents', () => {
  const {c,node,timers} = component(); node('deliveryEditor');
  c.surfaceMotionValue('deliveryEditor',{name:'旧数据单'},true); c.surfaceMotionValue('deliveryEditor',{},false); c.syncSurfaceMotion();
  const stale = [...timers.values()][0]; c.surfaceMotionValue('deliveryEditor',{name:'新数据单'},true); stale();
  assert.equal(c._surfaceMotionValues.get('deliveryEditor').value.name,'新数据单'); assert.equal(c._surfaceMotionValues.get('deliveryEditor').open,true);
});
test('nested dialogs close independently and cleanup never delays business state', () => {
  const {c,node,timers} = component(); node('deliveryEditor'); node('skillDetail');
  c.surfaceMotionValue('deliveryEditor',{open:true},true); c.surfaceMotionValue('skillDetail',{open:true},true);
  c.surfaceMotionValue('skillDetail',{open:false},false); c.syncSurfaceMotion(); [...timers.values()][0]();
  assert.equal(c._surfaceMotionValues.has('skillDetail'),false); assert.equal(c._surfaceMotionValues.get('deliveryEditor').open,true);
});
test('keyboard closes immediately; reduced motion uses a short fade lifetime', () => {
  const keyboard = component({keyboard:true}).c; keyboard.surfaceMotionValue('zoom',{title:'预览'},true);
  assert.equal(keyboard.surfaceMotionValue('zoom',{},false).motionPresent,false); assert.equal(keyboard.surfaceMotionDuration(),0);
  assert.equal(component({reduce:true}).c.surfaceMotionDuration(),90);
});
test('rerendering a closed dialog does not extend its exit lifetime', () => {
  const {c,node,timers} = component(); node('stopAsk');
  c.surfaceMotionValue('stopAsk',{fields:['运行任务']},true); c.surfaceMotionValue('stopAsk',{},false); c.syncSurfaceMotion();
  const id = [...timers.keys()][0];
  for (let i=0;i<8;i++) { c.surfaceMotionValue('stopAsk',{},false); c.syncSurfaceMotion(); }
  assert.deepEqual([...timers.keys()],[id]);
});
test('surface update is idempotent and leaves the bundled component executable', () => {
  assert.equal(updateSurfaceMotion(raw),raw);
  assert(t.includes('data-motion-key="sheetReworkConfirm"'));
  assert(helpers.includes("surfaceMotionValue('sheetReworkConfirm'"));
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
});

test('segmented labels share one centered cell with their width-reserving copy', () => {
  const css = fs.readFileSync(new URL('./templates/surface-motion.css', import.meta.url), 'utf8').trimEnd();
  assert(t.includes(css));
  assert(css.includes('[data-forge-segmented="pill"] [data-motion-label]{display:inline-grid;place-items:center;text-align:center}'));
  assert(css.includes('[data-forge-segmented="pill"] [data-motion-label]>.sc-interp{grid-area:1/1}'));
  assert.match(css, /\[data-motion-label\]::after\{[^}]*grid-area:1\/1;[^}]*visibility:hidden/);
  const buttons = [...t.matchAll(/<button\b(?=[^>]*data-motion-label=)(?=[^>]*data-motion-selected=)[^>]*>/g)];
  assert(buttons.length >= 5);
  for (const [button] of buttons) {
    const style = button.match(/style="([^"]*)"/)?.[1] || '';
    assert.doesNotMatch(style, /(?:^|;)\s*(?:display|align-items|gap|text-align)\s*:/);
  }
});

test('segment synchronization removes legacy flex without changing filters or Geist', () => {
  const owner = /(<sc-for list="{{ review\.owners }}"[^>]*>\s*<button[^>]*style=")/;
  assert(owner.test(t));
  const legacy = t.replace(owner, '$1display:flex;align-items:center;gap:7px;text-align:inherit;');
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const fixture = raw.slice(0, raw.indexOf(opening) + opening.length) + '\n' + JSON.stringify(legacy).replaceAll('</script>', '<\\u002Fscript>') + closing;
  // Exact equality protects handlers, labels, the selected indicator and all
  // other surfaces, including the separate fg-segmented Runs component.
  assert.equal(updateSurfaceMotion(fixture), raw);
});
