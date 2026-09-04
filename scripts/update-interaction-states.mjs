import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
export function updateInteractionStates(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let t = JSON.parse(source.slice(start + opening.length, end).trim());
  const replace = (before, after) => { if (!t.includes(before)) throw new Error('Missing interaction anchor: ' + before.slice(0,90)); t = t.replace(before, () => after); };
  // Only migrate the current sidebar; never replay the original shell generator.
  if (!t.includes('// sidebar-interactions:start')) {
    replace('  componentDidMount() {', read('sidebar-interaction-methods.js') + '\n  componentDidMount() {\n    this.mountSidebarInteractions();');
    replace('  componentWillUnmount() {', '  componentWillUnmount() {\n    this.unmountSidebarInteractions();');
    replace('collapsed: !!st.sidebarCollapsed,\n        expanded: !st.sidebarCollapsed,', 'collapsed: !!st.sidebarCollapsed && !st.sidebarPeek,\n        rail: !!st.sidebarCollapsed,\n        peeking: !!st.sidebarCollapsed && !!st.sidebarPeek,\n        expanded: !st.sidebarCollapsed || !!st.sidebarPeek,');
    replace("toggleLabel: st.sidebarCollapsed ? '展开导航' : '收起导航',", "toggleLabel: st.sidebarCollapsed ? (st.sidebarPeek ? '固定展开导航' : '展开导航') : '收起导航',");
    replace('toggle: () => this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed }),', 'toggle: () => this.toggleSidebar(),');
    replace('data-sidebar-collapsed="{{ sidebar.collapsed }}"', 'data-sidebar-collapsed="{{ sidebar.collapsed }}" data-sidebar-rail="{{ sidebar.rail }}" data-sidebar-peeking="{{ sidebar.peeking }}"');
    replace('  closeSidebar() {\n    this.setState({ sidebarCollapsed: true });', '  closeSidebar() {\n    this._sidebarPeekSuppressed = true;\n    this.setState({ sidebarCollapsed: true, sidebarPeek: false });');
    replace("    this.renderVals()[action](event);", "    this.endSidebarPeek(true);\n    this.renderVals()[action](event);");
    replace("    this.setState({ dlOpen: false, notifOpen: false });\n    if (typeof document", "    this.setState({ dlOpen: false, notifOpen: false });\n    this.endSidebarPeek();\n    if (typeof document");
  } else t = t.replace(/  \/\/ sidebar-interactions:start[\s\S]*?  \/\/ sidebar-interactions:end/, () => read('sidebar-interaction-methods.js'));
  // Fixed utility panels must escape the sidebar's animated clipping boundary.
  const floatingPanels = [];
  for (const id of ['forge-download-panel','forge-notification-panel']) {
    const asideStart = t.indexOf('<aside class="forge-sidebar"'), asideEnd = t.indexOf('</aside>', asideStart);
    const panelIndex = t.indexOf('id="' + id + '"');
    if (panelIndex < 0) throw new Error('Missing sidebar panel: ' + id);
    if (panelIndex > asideEnd) continue;
    const start = t.lastIndexOf('<sc-if', panelIndex);
    let depth = 0, end = -1;
    for (const match of t.slice(start).matchAll(/<\/?sc-if\b[^>]*>/g)) {
      depth += match[0].startsWith('</') ? -1 : 1;
      if (!depth) { end = start + match.index + match[0].length; break; }
    }
    if (start < asideStart || end < panelIndex) throw new Error('Unbalanced sidebar panel: ' + id);
    floatingPanels.push(t.slice(start,end)); t = t.slice(0,start) + t.slice(end);
  }
  if (floatingPanels.length) t = t.replace('</aside>', () => '</aside>\n<!-- forge-sidebar-floating-panels:start -->\n' + floatingPanels.join('\n') + '\n<!-- forge-sidebar-floating-panels:end -->');
  // Preserve the current icon geometry, labels, and all unrelated sidebar CSS.
  const togglePattern = /<button class="forge-sidebar-collapse"[\s\S]*?<\/button>/;
  const toggle = t.match(togglePattern)?.[0];
  if (!toggle) throw new Error('Missing sidebar toggle');
  t = t.replace(togglePattern, '').replace(/(<div class="forge-sidebar-header">)\s*/, (_, header) => header + '\n  ' + toggle + '\n  ');
  // Normalize only the now-empty line from moving the toggle before the brand.
  t = t.replace(/(<\/button>)\n\s*\n(\s*<\/div>\n\s*<nav class="forge-sidebar-nav")/, '$1\n$2');
  t = t.replace(/\/\* download-selected:start \*\/[\s\S]*?\/\* download-selected:end \*\//g, '');
  t = t.replace(/\.forge-sidebar-collapse\{display:flex[^}]*\}/, read('forge-sidebar.css').match(/\.forge-sidebar-collapse\{display:flex[^}]*\}/)[0]);
  t = t.replace(/\/\* forge-profile:start \*\/[\s\S]*?\/\* forge-profile:end \*\//, () => read('forge-profile.css'));
  const css = read('interaction-states.css'), cssPattern = /\/\* interaction-states:start \*\/[\s\S]*?\/\* interaction-states:end \*\//;
  t = cssPattern.test(t) ? t.replace(cssPattern, () => css) : t.replace('</style>', () => css + '\n</style>');
  // Existing uploads already guard duplicate work; expose the same state to AT.
  for (const [className, state] of [['forge-delivery-file-button','deliveryEditor.listLoading'],['forge-delivery-file-button','deliveryEditor.skillsFull'],['forge-profile-upload','profile.uploadDisabled']]) {
    const busy = state === 'deliveryEditor.skillsFull' ? 'deliveryEditor.skillLoading' : state === 'profile.uploadDisabled' ? 'profile.draftLoading' : state;
    const a = `class="${className}" data-disabled="{{ ${state} }}"`;
    if (t.includes(a + '>')) t = t.replace(a + '>', a + ` aria-busy="{{ ${busy} }}">`);
  }
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(t).replaceAll('</script>', '<\\u002Fscript>') + closing;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const s = fs.readFileSync(file, 'utf8'), next = updateInteractionStates(s);
  if (s !== next) fs.writeFileSync(file, next);
  console.log('Unified interaction states and added reversible sidebar peek');
}
