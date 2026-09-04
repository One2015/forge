import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open), end = source.lastIndexOf(close);
if (start < 0 || end < 0) throw new Error('Missing bundled Forge template');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const swap = (before, after, expected = 1) => {
  const count = template.split(before).length - 1;
  if (count !== expected) throw new Error('Expected ' + expected + ' matches, got ' + count + ': ' + before.slice(0, 90));
  template = template.replaceAll(before, after);
};
const icon = (_, name, size) => {
  const original = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = original.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};
// Retain the existing task/notification content when relocating its triggers.
// Read it from either the old toolbar or the already-migrated sidebar so reruns are safe.
const utilityPanel = (name, id, label) => {
  const start = template.indexOf('<sc-if value="{{ ' + name + '.open }}"');
  if (start < 0) throw new Error('Missing utility panel: ' + name);
  const rest = template.slice(start);
  let depth = 0, end = -1;
  for (const match of rest.matchAll(/<\/?sc-if\b[^>]*>/g)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) { end = match.index + match[0].length; break; }
  }
  if (end < 0) throw new Error('Unbalanced utility panel: ' + name);
  let panel = rest.slice(0, end)
    .replace(/class="forge-topbar-popover" style="[^"]*"/, 'class="forge-sidebar-popover" id="' + id + '" role="region" aria-label="' + label + '"')
    .replace(/<div style="max-height:min\(4[23]0px,\d+vh\);overflow-y:auto">/, '<div class="forge-sidebar-popover-list">');
  if (!panel.includes('forge-sidebar-popover-close')) {
    const listStart = panel.indexOf('<div class="forge-sidebar-popover-list">');
    const headerEnd = panel.lastIndexOf('</div>', listStart);
    if (listStart < 0 || headerEnd < 0) throw new Error('Missing utility panel header');
    panel = panel.slice(0, headerEnd) + '<button type="button" class="forge-sidebar-popover-close" sc-camel-on-click="{{ sidebar.closeUtility }}" aria-label="关闭' + label + '">' + icon('', 'x', 16) + '</button>' + panel.slice(headerEnd);
  }
  return panel;
};
const utilities = fs.readFileSync(new URL('./templates/forge-sidebar-utilities.html', import.meta.url), 'utf8')
  .replace('[[profile-panel]]', () => fs.readFileSync(new URL('./templates/forge-profile.html', import.meta.url), 'utf8'));
const sidebar = fs.readFileSync(new URL('./templates/forge-sidebar.html', import.meta.url), 'utf8')
  .replace('[[sidebar-utilities]]', utilities.trim())
  .replace('[[download-panel]]', utilityPanel('dl', 'forge-download-panel', '下载任务'))
  .replace('[[notification-panel]]', utilityPanel('notif', 'forge-notification-panel', '消息通知'))
  .replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
const css = fs.readFileSync(new URL('./templates/forge-sidebar.css', import.meta.url), 'utf8');

if (!template.includes('<!-- forge-sidebar:start -->')) {
  const rootStart = template.indexOf('<div style="min-height:100vh;background:#fbfaf8">');
  const toolsStart = template.indexOf('<div style="display:flex;align-items:center;gap:16px;font-size:13px;color:#6b645d">', rootStart);
  if (rootStart < 0 || toolsStart < 0) throw new Error('Missing existing navigation');
  template = template.slice(0, rootStart) + `<div class="forge-app-shell" data-sidebar-collapsed="{{ sidebar.collapsed }}">\n${sidebar}\n<main class="forge-main">\n<header class="forge-topbar" aria-label="全局工具栏">\n` + template.slice(toolsStart);
  swap('<div style="display:flex;align-items:center;gap:16px;font-size:13px;color:#6b645d">', '<div class="forge-topbar-tools">');
  swap('<div><svg class="forge-icon" data-phosphor="arrow-clockwise"', '<div class="forge-topbar-refresh"><svg class="forge-icon" data-phosphor="arrow-clockwise"');
  swap(`      <div>一万</div>
    </div>
  </div>

  <sc-if value="{{ showSubNav }}"`, `      <div class="forge-topbar-profile" title="{{ sidebar.userName }}"><span class="forge-topbar-avatar" aria-hidden="true">{{ sidebar.userInitial }}</span><span class="forge-topbar-username">{{ sidebar.userName }}</span></div>
    </div>
  </header>

  <sc-if value="{{ showSubNav }}"`);
  swap('<div style="display:flex;align-items:center;gap:22px;padding:0 clamp(14px,2vw,28px);min-height:44px;background:#fff;border-bottom:1px solid #e8e2d9;position:sticky;top:56px;z-index:39;flex-wrap:wrap">', '<div class="forge-production-tabs" aria-label="生产二级导航">');
  swap('\n</div>\n\n</x-dc>', '\n</main>\n</div>\n\n</x-dc>');
  // Keep existing global utilities and popover content, with keyboard-accessible triggers.
  for (const name of ['dl', 'notif']) {
    const pattern = new RegExp('<div sc-camel-on-click="{{ ' + name + '\\.toggle }}"([\\s\\S]*?)<\\/div>\\n\\n        <sc-if value="{{ ' + name + '\\.open }}"');
    const match = template.match(pattern);
    if (!match) throw new Error('Missing utility: ' + name);
    template = template.replace(pattern, '<button class="forge-topbar-icon" sc-camel-on-click="{{ ' + name + '.toggle }}" aria-label="{{ ' + name + '.tip }}" aria-expanded="{{ ' + name + '.open }}"$1</button>\n\n        <sc-if value="{{ ' + name + '.open }}"');
  }
  swap('<div style="position:absolute;top:calc(100% + 10px);right:0;width:min(430px,88vw);', '<div class="forge-topbar-popover" style="position:absolute;top:calc(100% + 10px);right:0;width:min(430px,88vw);');
  swap('<div style="position:absolute;top:calc(100% + 10px);right:0;width:min(420px,86vw);', '<div class="forge-topbar-popover" style="position:absolute;top:calc(100% + 10px);right:0;width:min(420px,86vw);');
  // Dataset columns account for the taller toolbar plus the unchanged 44px tabs.
  swap('top:118px;height:max(660px,calc(100vh - 138px))', 'top:calc(var(--forge-topbar-height) + 62px);height:max(660px,calc(100vh - var(--forge-topbar-height) - 82px))', 2);
  swap("    reviewOpen: forgeCaptureReviewKey || null,", "    sidebarCollapsed: false,\n    reviewOpen: forgeCaptureReviewKey || null,");
  swap(`    return {
      zoomOpen: !!st.zoom,`, `    return {
      sidebar: {
        collapsed: !!st.sidebarCollapsed,
        expanded: !st.sidebarCollapsed,
        toggleLabel: st.sidebarCollapsed ? '展开导航' : '收起导航',
        toggle: () => this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed }),
        overviewCurrent: view === 'overview' ? 'page' : 'false',
        productionCurrent: !onDelivery && !onReview && view !== 'overview' ? 'page' : 'false',
        reviewCurrent: onReview ? 'page' : 'false',
        deliveryCurrent: onDelivery ? 'page' : 'false',
        userName: this.props.currentUser || '一万',
        userInitial: (this.props.currentUser || '一万').slice(0, 1)
      },
      zoomOpen: !!st.zoom,`);
} else {
  template = template.replace(/<!-- forge-sidebar:start -->[\s\S]*?<!-- forge-sidebar:end -->/, sidebar.trim());
}
if (!template.includes('// collapsible-sidebar:start')) {
  swap('    sidebarCollapsed: false,', "    sidebarCollapsed: typeof window !== 'undefined' && !!window.matchMedia?.('(max-width:760px)').matches,");
  swap('        toggle: () => this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed }),', `        toggle: () => this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed }),
        close: () => this.closeSidebar(),
        goOverview: e => this.navigateFromSidebar('goOverview', e),
        goRuns: e => this.navigateFromSidebar('goRuns', e),
        goReview: e => this.navigateFromSidebar('goReview', e),
        goDelivery: e => this.navigateFromSidebar('goDelivery', e),`);
  swap('  componentDidMount() {', `  // collapsible-sidebar:start
  closeSidebar() {
    this.setState({ sidebarCollapsed: true });
    if (typeof document !== 'undefined') document.querySelector('.forge-sidebar-collapse')?.focus({ preventScroll: true });
  }
  navigateFromSidebar(action, event) {
    this.renderVals()[action](event);
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width:760px)').matches) this.setState({ sidebarCollapsed: true });
  }
  // collapsible-sidebar:end
  componentDidMount() {`);
  swap('      if (this.handleReviewKey(e)) return;', `      if (e.key === 'Escape' && !this.state.sidebarCollapsed && window.matchMedia?.('(max-width:760px)').matches) {
        e.preventDefault(); this.closeSidebar(); return;
      }
      if (this.handleReviewKey(e)) return;`);
}
// The sidebar owns all global utilities; leave no empty top toolbar behind.
template = template.replace(/<header class="forge-topbar"[\s\S]*?<\/header>\s*/, '');
if (!template.includes('// sidebar-utilities:start')) {
  swap('        close: () => this.closeSidebar(),', `        close: () => this.closeSidebar(),
        toggleDownloads: () => this.toggleSidebarUtility('dl'),
        toggleMessages: () => this.toggleSidebarUtility('notif'),
        closeUtility: () => this.closeSidebarUtility(),`);
  swap('    this.renderVals()[action](event);', `    this.renderVals()[action](event);
    this.setState({ dlOpen: false, notifOpen: false });`);
  swap('  // collapsible-sidebar:end', `  // collapsible-sidebar:end
  // sidebar-utilities:start
  toggleSidebarUtility(name) {
    const current = this.renderVals()[name];
    current.toggle();
    if (!current.open && typeof window !== 'undefined' && window.matchMedia?.('(max-width:760px)').matches) this.setState({ sidebarCollapsed: true });
  }
  closeSidebarUtility() {
    const name = this.state.dlOpen ? 'dl' : 'notif';
    this.setState({ dlOpen: false, notifOpen: false });
    if (typeof document !== 'undefined') document.querySelector('.forge-sidebar-tool[data-utility="' + name + '"]')?.focus({ preventScroll: true });
  }
  // sidebar-utilities:end`);
  swap("      if (e.key === 'Escape' && !this.state.sidebarCollapsed", `      if (e.key === 'Escape' && (this.state.dlOpen || this.state.notifOpen)) {
        e.preventDefault(); this.closeSidebarUtility(); return;
      }
      if (e.key === 'Escape' && !this.state.sidebarCollapsed`);
}
if (template.includes('/* forge-sidebar:start */')) {
  template = template.replace(/\/\* forge-sidebar:start \*\/[\s\S]*?\/\* forge-sidebar:end \*\//, css.trim());
} else swap('</style>', css + '\n</style>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close);
console.log('Moved Forge primary navigation to the left sidebar');
