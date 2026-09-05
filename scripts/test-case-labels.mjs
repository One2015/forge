import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { toggleCaseLabels } from './toggle-case-labels.mjs';

const raw = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(raw.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const css = fs.readFileSync(new URL('./templates/case-labels.css', import.meta.url), 'utf8');

test('case labels use independent named buttons and official icons in both review surfaces', () => {
  const sheet = template.match(/<!-- case-labels:start -->([\s\S]*?)<!-- case-labels:end -->/)[1];
  assert.match(sheet, /<button type="button" class="forge-case-button"/);
  assert.match(sheet, /aria-pressed="{{ s.selected }}"/);
  assert.match(sheet, /role="group" aria-label="样本标注"/);
  assert.match(sheet, /data-phosphor="check"/);
  assert.match(sheet, /data-phosphor="x"/);
  assert.doesNotMatch(sheet, /s\.(bg|fg|shadow)|未标注/);
  assert.match(template, /class="review-workbench-good forge-case-button"/);
  assert.match(template, /class="review-workbench-bad forge-case-button"/);
});

test('delivery case marks toggle off, stay exclusive and confirm every change with a toast', () => {
  const context = vm.createContext({ URLSearchParams, setTimeout: () => 0, clearTimeout() {}, window: { location: { search: '' } },
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { this.state = { ...this.state, ...patch }; } } });
  vm.runInContext(code + ';globalThis.c = new Component();', context);
  const c = context.c, id = '9f2a7c1b5e8d4036a1c4e7b209d6f8a3', click = { stopPropagation() {} };
  c.setState({ view: 'sheet', sheetKey: 'ant200', sheetRow: id, sampleLabels: { unrelated: 'good' } });
  const tabs = () => c.renderVals().sheet.pick.sampleTabs;
  const before = JSON.stringify(c.state.reviewDecisions);
  assert.deepEqual(Array.from(tabs(), t => t.label), ['Good Case', 'Bad Case']);
  assert(tabs().every(t => !t.selected));
  tabs()[0].pick(click); assert(tabs()[0].selected); assert(!tabs()[1].selected); assert.equal(c.state.reviewToast, '已标注为 Good Case');
  tabs()[1].pick(click); assert(!tabs()[0].selected); assert(tabs()[1].selected); assert.equal(c.state.reviewToast, '已标注为 Bad Case');
  tabs()[1].pick(click); assert(tabs().every(t => !t.selected)); assert.equal(c.state.reviewToast, '已取消 Bad Case 标注');
  assert(!Object.hasOwn(c.state.sampleLabels, id));
  const staleGood = tabs()[0].pick;
  staleGood(click); assert(tabs()[0].selected); assert.equal(c.state.reviewToast, '已标注为 Good Case');
  staleGood(click); assert(tabs().every(t => !t.selected), 'Repeated callback reads live state'); assert.equal(c.state.reviewToast, '已取消 Good Case 标注');
  assert.equal(c.state.sampleLabels.unrelated, 'good');
  assert.equal(JSON.stringify(c.state.reviewDecisions), before);
});

test('case toggle migration is idempotent and changes only the two marking callbacks', () => {
  assert.equal(toggleCaseLabels(raw), raw);
  let legacy = raw;
  for (const [id, kind, label, indent] of [['r[2]', 'kind', 'label', '                '], ['meta[0]', 'value', "(value === 'good' ? 'Good Case' : 'Bad Case')", '            ']]) {
    const next = `${indent}const labels = Object.assign({}, this.state.sampleLabels || {});
${indent}const removing = labels[${id}] === ${kind};
${indent}if (removing) delete labels[${id}];
${indent}else labels[${id}] = ${kind};
${indent}this.setState({ sampleLabels: labels, reviewToast: removing ? '已取消 ' + ${label} + ' 标注' : '已标注为 ' + ${label}, reviewToastAt: Date.now() });`;
    const previous = `${indent}this.setState({ sampleLabels: Object.assign({}, this.state.sampleLabels || {}, { [${id}]: ${kind} }) });`;
    const encoded = value => JSON.stringify(value).slice(1, -1);
    assert(legacy.includes(encoded(next)));
    legacy = legacy.replace(encoded(next), encoded(previous));
  }
  assert.notEqual(legacy, raw);
  assert.equal(toggleCaseLabels(legacy), raw);
});

test('compact case buttons retain contrast, visible selection, keyboard focus and touch size', () => {
  const luminance = hex => {
    const c = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  for (const [ink, tint] of [['#3e744a', '#f2f7f2'], ['#a5321f', '#fdf3f0']]) {
    for (const bg of ['#ffffff', tint]) assert((luminance(bg) + .05) / (luminance(ink) + .05) >= 4.5);
  }
  assert.match(css, /--case-color:var\(--forge-success\)/);
  assert.match(css, /data-case="bad"\]\{--case-color:var\(--forge-danger\)/);
  assert.match(css, /height:32px/); assert.match(css, /font:400 13px\/20px/);
  assert.match(css, /\[aria-pressed="true"\]/); assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(pointer:coarse\).*min-height:44px/);
  assert.match(css, /@media\(max-width:360px\)/);
});

test('selected Case remains solid with inverse icon treatment and cannot be confused with hover', () => {
  assert.match(css, /\.forge-case-button\[aria-pressed="true"\]\{[^}]*background:var\(--case-color\);color:#fff;font-weight:600/);
  assert.match(css, /\.forge-case-button\[aria-pressed="true"\] \.forge-case-icon\{background:#fff;color:var\(--case-color\)/);
  assert.match(css, /:hover:not\(:disabled\):not\(\[aria-pressed="true"\]\)/);
  assert.match(css, /\.forge-case-button:disabled\{[^}]*color:var\(--forge-disabled-text\)/);
  assert(template.includes(css.trim()));
});
