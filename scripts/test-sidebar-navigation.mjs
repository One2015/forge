import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const sidebar = template.match(/<!-- forge-sidebar:start -->([\s\S]*?)<!-- forge-sidebar:end -->/)[1];
const toolbar = template.match(/<header class="forge-topbar"[\s\S]*?<\/header>/)?.[0] || '';
const utilities = sidebar.match(/<!-- forge-sidebar-utilities:start -->([\s\S]*?)<!-- forge-sidebar-utilities:end -->/)[1];
const click = { stopPropagation() {}, preventDefault() {} };
function component(props = {}, narrow = false) {
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' }, matchMedia: () => ({ matches: narrow }) }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true, ...props };
      setState(patch) { this.state = { ...this.state, ...patch }; }
    },
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  return context.instance;
}

test('four primary destinations live only in the semantic left navigation', () => {
  assert.match(sidebar, /<nav[^>]+aria-label="主导航"/);
  const buttons = [...sidebar.matchAll(/<button class="forge-sidebar-link"[^>]+aria-label="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(buttons, ['概览', '生产', '审核', '交付']);
  for (const action of ['goOverview', 'goRuns', 'goReview', 'goDelivery']) {
    assert(sidebar.includes('{{ sidebar.' + action + ' }}'));
    assert(!toolbar.includes('{{ ' + action + ' }}'));
  }
  assert(sidebar.includes('aria-expanded="{{ sidebar.expanded }}"'));
  assert(sidebar.includes('aria-controls="forge-primary-navigation"'));
});

test('Forge wordmark is compact without scaling the logo or navigation controls', () => {
  const css = fs.readFileSync(new URL('./templates/forge-sidebar.css', import.meta.url), 'utf8');
  const rule = '.forge-sidebar-wordmark{font-size:20px;font-weight:500;letter-spacing:-.02em;line-height:24px}';
  assert(css.includes(rule));
  assert(template.includes(rule));
  assert.match(template, /\.forge-sidebar-logo\{[^}]*width:26px;height:28px/);
  assert.match(template, /\.forge-sidebar-link\{[^}]*font-size:14px/);
  assert(template.includes('.forge-app-shell[data-sidebar-collapsed="true"] .forge-sidebar-wordmark'));
});

test('every destination and nested view has exactly one active navigation item', () => {
  const c = component();
  const cases = {
    overview: 'overviewCurrent', runs: 'productionCurrent', run: 'productionCurrent',
    pipelines: 'productionCurrent', datasets: 'productionCurrent', resources: 'productionCurrent',
    pipeedit: 'productionCurrent', submitted: 'productionCurrent', review: 'reviewCurrent',
    delivery: 'deliveryCurrent', sheet: 'deliveryCurrent', itemlife: 'deliveryCurrent',
  };
  for (const [view, expected] of Object.entries(cases)) {
    c.setState({ view, lifeFrom: null });
    const nav = c.renderVals().sidebar;
    assert.equal(nav[expected], 'page', view);
    assert.equal(Object.entries(nav).filter(([key, value]) => key.endsWith('Current') && value === 'page').length, 1, view);
  }
  c.setState({ view: 'itemlife', lifeFrom: 'review' });
  assert.equal(c.renderVals().sidebar.reviewCurrent, 'page');
});

test('collapse is reversible and does not reset the current workflow or drafts', () => {
  const c = component();
  c.setState({ view: 'datasets', selDs: c.dsData()[0].name, picked: { item: true }, reworkNotes: { current: '保留草稿' } });
  const before = JSON.stringify(c.state);
  assert.equal(c.renderVals().sidebar.expanded, true);
  c.renderVals().sidebar.toggle();
  assert.equal(c.renderVals().sidebar.collapsed, true);
  assert.equal(c.renderVals().sidebar.toggleLabel, '展开导航');
  assert.equal(c.state.view, 'datasets');
  assert.equal(c.state.picked.item, true);
  assert.equal(c.state.reworkNotes.current, '保留草稿');
  c.renderVals().goReview();
  assert.equal(c.renderVals().sidebar.collapsed, true);
  c.renderVals().sidebar.toggle();
  assert.equal(c.renderVals().sidebar.expanded, true);
  assert(before.includes('保留草稿'));
});

test('the toggle stays in the header in both states, including narrow layouts', () => {
  assert(sidebar.indexOf('class="forge-sidebar-collapse"') < sidebar.indexOf('<nav'));
  assert(!sidebar.includes('class="forge-sidebar-bottom"'));
  assert(sidebar.includes('class="forge-sidebar-backdrop"'));
  assert(template.includes('.forge-app-shell[data-sidebar-collapsed="false"] .forge-sidebar{width:184px'));
  const c = component({}, true);
  assert.equal(c.renderVals().sidebar.collapsed, true);
  c.renderVals().sidebar.toggle();
  assert.equal(c.renderVals().sidebar.expanded, true);
  c.renderVals().sidebar.close();
  assert.equal(c.renderVals().sidebar.collapsed, true);
});

test('narrow navigation closes after selection, while desktop preserves preference', () => {
  for (const narrow of [false, true]) {
    const c = component({}, narrow);
    c.setState({ sidebarCollapsed: false, reworkNotes: { current: '保留草稿' } });
    for (const [action, view] of [['goOverview','overview'],['goRuns','runs'],['goReview','review'],['goDelivery','delivery']]) {
      c.setState({ sidebarCollapsed: false });
      c.renderVals().sidebar[action](click);
      assert.equal(c.state.view, view);
      assert.equal(c.state.sidebarCollapsed, narrow);
      assert.equal(c.state.reworkNotes.current, '保留草稿');
    }
  }
});

test('the existing primary and production-level actions remain available', () => {
  const c = component();
  for (const [action, view] of [['goOverview', 'overview'], ['goRuns', 'runs'], ['goReview', 'review'], ['goDelivery', 'delivery']]) {
    c.renderVals()[action](click);
    assert.equal(c.state.view, view);
  }
  c.renderVals().goRuns();
  assert.deepEqual(Array.from(c.renderVals().subNav, s => s.label), ['运行任务', 'Pipeline', '数据集', '资源']);
  c.renderVals().subNav.find(s => s.label === 'Pipeline').pick();
  assert.equal(c.state.view, 'pipelines');
  assert.equal(c.renderVals().sidebar.productionCurrent, 'page');
});

test('download, messages and actual profile live in the sidebar with no top toolbar', () => {
  const c = component({ currentUser: 'Allen' });
  assert.equal(c.renderVals().sidebar.userName, 'Allen');
  assert.equal(c.renderVals().sidebar.userInitial, 'A');
  assert.equal(toolbar, '');
  assert(!template.includes('class="forge-topbar-refresh"'));
  assert(sidebar.indexOf('class="forge-sidebar-utilities"') > sidebar.indexOf('</nav>'));
  assert(utilities.includes('class="forge-sidebar-profile"'));
  assert(utilities.includes('{{ sidebar.userName }}'));
  for (const [name, action] of [['dl', 'toggleDownloads'], ['notif', 'toggleMessages']]) {
    assert.match(utilities, new RegExp('<button[^>]+sc-camel-on-click="{{ sidebar\\.' + action + ' }}"'));
    const before = c.renderVals()[name].open;
    c.renderVals().sidebar[action](click);
    assert.equal(c.renderVals()[name].open, !before);
  }
  assert.equal(c.renderVals().dl.open, false);
  assert.equal(c.renderVals().notif.open, true);
  c.renderVals().sidebar.closeUtility();
  assert.equal(c.renderVals().notif.open, false);
});

test('utility panels follow the rail and collapse it on narrow screens without losing drafts', () => {
  for (const narrow of [false, true]) {
    const c = component({}, narrow);
    c.setState({ sidebarCollapsed: false, reworkNotes: { current: '保留草稿' } });
    c.renderVals().sidebar.toggleDownloads();
    assert.equal(c.renderVals().dl.open, true);
    assert.equal(c.renderVals().sidebar.collapsed, narrow);
    c.renderVals().sidebar.toggleMessages();
    assert.equal(c.renderVals().dl.open, false);
    assert.equal(c.renderVals().notif.open, true);
    assert.equal(c.state.reworkNotes.current, '保留草稿');
    c.renderVals().sidebar.goRuns(click);
    assert.equal(c.renderVals().notif.open, false);
  }
  assert(template.includes('inset:auto auto 16px calc(var(--forge-sidebar-width) + 8px)'));
  assert(template.includes('.forge-sidebar-tool-label,.forge-app-shell[data-sidebar-collapsed="true"] .forge-sidebar-profile-copy{display:none}'));
  assert(template.includes('font-size:0;line-height:0;border-radius:50%'));
  assert(utilities.includes('aria-controls="forge-download-panel"'));
  assert(utilities.includes('aria-controls="forge-notification-panel"'));
  assert(template.includes("e.key === 'Escape' && (this.state.dlOpen || this.state.notifOpen)"));
});

test('sidebar markup is balanced and content/modal positioning is preserved', () => {
  for (const markup of [sidebar]) {
    const stack = [];
    for (const [full, name] of markup.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/g)) {
      if (['img', 'input', 'br', 'hr'].includes(name) || full.endsWith('/>')) continue;
      if (full.startsWith('</')) assert.equal(stack.pop(), name, full);
      else stack.push(name);
    }
    assert.equal(stack.length, 0);
  }
  assert.match(template, /<main class="forge-main"(?:\s[^>]*)?>/);
  assert.match(template, /<\/main>\s*<\/div>\s*<\/x-dc>/);
  assert(template.includes('[data-review-workbench="true"]{inset:0!important;width:100%;height:100dvh;'));
  assert(template.includes('--forge-sidebar-width:184px'));
  assert(template.includes('--forge-topbar-height:0px'));
  assert(template.includes('--forge-sidebar-header-height:64px'));
  assert(template.includes('--forge-sidebar-width:64px'));
  assert(!template.includes('position:sticky;top:56px'));
});

test('download selection stays obvious in expanded and icon-only rails and clears when closed', () => {
  const block = template.match(/\/\* interaction-states:start \*\/[\s\S]*?\/\* interaction-states:end \*\//)?.[0];
  assert(block);
  assert.match(block, /\.forge-sidebar-tool\[aria-expanded="true"\][^}]+background:var\(--forge-nav-tint\);color:var\(--forge-nav-active\)/);
  assert.match(block, /\.forge-sidebar-tool-count\{color:var\(--forge-nav-active\);background:var\(--forge-panel\)/);
  assert.match(block, /:focus-visible\{outline:2px solid var\(--forge-accent\)/);
  for (const collapsed of [false, true]) {
    const c = component(); c.setState({sidebarCollapsed: collapsed});
    c.renderVals().sidebar.toggleDownloads();
    assert.equal(c.renderVals().dl.open, true);
    assert.equal(c.renderVals().sidebar.collapsed, collapsed);
    c.renderVals().sidebar.toggleDownloads(); assert.equal(c.renderVals().dl.open, false);
    c.renderVals().sidebar.toggleDownloads(); c.renderVals().sidebar.toggleMessages();
    assert.equal(c.renderVals().dl.open, false);
  }
});
