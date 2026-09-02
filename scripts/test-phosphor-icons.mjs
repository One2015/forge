import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const markup = template.slice(0, template.indexOf('<script type="text/x-dc"'));
const click = { stopPropagation() {}, preventDefault() {} };

function component(props = {}) {
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' } },
    navigator: { clipboard: { writeText() {} } },
    setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true, ...props };
      setState(patch) { Object.assign(this.state, patch); }
    },
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}

test('every interface SVG uses unmodified official Phosphor Regular geometry', () => {
  const icons = [...markup.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g)];
  // Includes branch progress connectors and compact record/remove actions.
  assert.equal(icons.length, 156);
  const names = new Set();
  for (const [, attrs, geometry] of icons) {
    const name = attrs.match(/data-phosphor="([\w-]+)"/)?.[1];
    assert(name, 'Non-Phosphor interface icon');
    names.add(name);
    const official = fs.readFileSync(new URL(`../assets/phosphor/regular/${name}.svg`, import.meta.url), 'utf8')
      .match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1]
      .replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
    assert.equal(geometry, official, name);
    assert.match(attrs, /sc-camel-view-box="0 0 256 256"/);
    assert.match(attrs, /fill="currentColor"/);
    assert.match(attrs, /width="(?:12|14|16|20|24)"/);
    assert.match(attrs, /aria-hidden="true"/);
    assert.match(attrs, /focusable="false"/);
    assert(!attrs.includes('stroke-width='));
  }
  assert.equal(names.size, 37);
  assert(template.includes('Phosphor Icons license'));
});

test('no legacy glyph icons remain in markup, without changing data notation', () => {
  assert.doesNotMatch(markup, /[↻→←↑↓↗×＋−⑂▴▾▲▼✓⧉]/);
  assert(template.includes('SD01×12'));
  assert(template.includes('generate → retarget → build'));
  assert(template.includes("sampleTabs: [['good', 'Good Case'], ['bad', 'Bad Case']]"));
});

test('notification outcome icons inherit contrasting semantic colors, including approval', () => {
  const c = component();
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const [flag, icon] of [['isDone', 'check'], ['isFail', 'x'], ['isPass', 'check-circle']]) {
    const block = markup.match(new RegExp('<sc-if value="{{ n\\.' + flag + ' }}"[^>]*>([\\s\\S]*?)<\\/sc-if>'))?.[1];
    assert(block, flag);
    assert(block.includes('data-phosphor="' + icon + '"'));
    assert(block.includes('fill="currentColor"'));
    assert.doesNotMatch(block, /style="[^"]*color:/, 'Status icons must inherit the notification color');
    const item = c.renderVals().notif.items.find(value => value[flag]);
    assert(item, flag);
    const contrast = (luminance(item.iconBg) + .05) / (luminance(item.iconFg) + .05);
    assert(contrast >= 3, flag + ' icon contrast: ' + contrast);
  }
  const approved = c.renderVals().notif.items.find(value => value.isPass);
  assert.equal(approved.iconFg, '#3f6b45');
  assert.equal(approved.cta, '查看交付归属');
});

test('pipeline and dataset chevrons follow expanded/collapsed state', () => {
  const c = component();
  let pipe = c.renderVals().pipelines[0];
  assert.equal(pipe.chevRotation, '0deg');
  pipe.toggle(click);
  pipe = c.renderVals().pipelines[0];
  assert.equal(pipe.chevRotation, '180deg');
  pipe.toggle(click);
  assert.equal(c.renderVals().pipelines[0].chevRotation, '0deg');
  c.state.selDs = c.dsData()[0].name;
  assert.equal(c.renderVals().ds.versionChevRotation, '0deg');
  c.renderVals().ds.toggleVersions();
  assert.equal(c.renderVals().ds.versionChevRotation, '180deg');
});

test('selection, copy feedback, and run-arrow conditions remain interactive', () => {
  const c = component();
  c.selectRunPipeline(c.pipeData()[0]);
  c.state.selDs = c.dsData()[0].name;
  let ds = c.renderVals().ds;
  assert.equal(ds.showRunArrow, false);
  assert.equal(ds.items[0].check, '');
  assert.equal(ds.items[0].copyIdle, true);
  ds.items[0].toggle(click);
  ds = c.renderVals().ds;
  assert.equal(ds.items[0].check, '✓');
  assert.equal(ds.showRunArrow, true);
  assert(!ds.runLabel.includes('→'));
  ds.items[0].copy(click);
  ds = c.renderVals().ds;
  assert.equal(ds.items[0].copyDone, true);
  assert.equal(ds.items[0].copyIdle, false);
  assert.equal(ds.items[0].copyLabel, '已复制');
  c.state.rerollFrom = ds.items[0].id;
  assert.equal(c.renderVals().ds.showRunArrow, false);
});

test('all top-level views can still produce their render data', () => {
  for (const view of ['overview', 'pipelines', 'datasets', 'runs', 'review', 'delivery', 'resources', 'sheet', 'itemlife', 'pipeedit']) {
    const c = component();
    c.state.view = view;
    assert.equal(typeof c.renderVals(), 'object', view);
  }
});
