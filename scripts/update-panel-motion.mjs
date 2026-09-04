import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();

export function updatePanelMotion(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing Forge template');
  let t = JSON.parse(source.slice(start + opening.length, end).trim());
  const once = (before, after) => {
    if (t.split(before).length !== 2) throw new Error('Expected one motion anchor: ' + before.slice(0, 100));
    t = t.replace(before, () => after);
  };
  if (!t.includes('/* panel-motion:start */')) {
    once('</style>', read('panel-motion.css') + '\n</style>');
    once('  componentDidMount() {', read('panel-motion-methods.js') + '\n' + read('dataset-resize-methods.js') + '\n  componentDidMount() {\n    this.mountPanelMotion();\n    this.mountDatasetResize();');
    once('  componentWillUnmount() {', '  componentWillUnmount() {\n    this.unmountPanelMotion();\n    this.unmountDatasetResize();');
    for (const [value, id] of [['dl', 'forge-download-panel'], ['notif', 'forge-notification-panel']]) {
      once('<sc-if value="{{ ' + value + '.open }}" hint-placeholder-val="{{ false }}">', '<sc-if value="{{ true }}" hint-placeholder-val="{{ true }}">');
      once('class="forge-sidebar-popover" id="' + id + '"', 'class="forge-sidebar-popover" id="' + id + '" data-open="{{ ' + value + '.open }}" aria-hidden="{{ ' + value + '.closed }}"');
      once('open: !!st.' + value + 'Open,', 'open: !!st.' + value + 'Open,\n      closed: !st.' + value + 'Open,');
    }
    once('<div sc-camel-on-mouse-down="{{ startDrag }}" style="width:9px;', '<div class="forge-dataset-resizer" role="separator" tabindex="0" aria-label="调整 Item 列表宽度" aria-orientation="vertical" aria-valuemin="360" aria-valuemax="760" aria-valuenow="{{ datasetResize.width }}" sc-camel-on-pointer-down="{{ datasetResize.start }}" sc-camel-on-pointer-move="{{ datasetResize.move }}" sc-camel-on-pointer-up="{{ datasetResize.end }}" sc-camel-on-pointer-cancel="{{ datasetResize.end }}" sc-camel-on-lost-pointer-capture="{{ datasetResize.end }}" sc-camel-on-key-down="{{ datasetResize.key }}" style="width:9px;');
    once('      profile: this.profileValues(),', '      datasetResize: { width: Math.round(st.panelW || this.props.panelWidth || 460), start: e => this.startDatasetResize(e), move: e => this.moveDatasetResize(e), end: e => this.finishDatasetResize(e), key: e => this.keyDatasetResize(e) },\n      profile: this.profileValues(),');
    const oldDrag = /    this\._move = e => \{[\s\S]*?    this\._up = \(\) => \{[^\n]*\n/;
    if (!oldDrag.test(t)) throw new Error('Missing old mouse resize handlers');
    t = t.replace(oldDrag, '');
    for (const line of ["    window.addEventListener('mousemove', this._move);\n", "    window.addEventListener('mouseup', this._up);\n", "    window.removeEventListener('mousemove', this._move);\n", "    window.removeEventListener('mouseup', this._up);\n"]) once(line, '');
  } else {
    t = t.replace(/\/\* panel-motion:start \*\/[\s\S]*?\/\* panel-motion:end \*\//, () => read('panel-motion.css'));
    t = t.replace(/  \/\/ panel-motion:start[\s\S]*?  \/\/ panel-motion:end/, () => read('panel-motion-methods.js'));
    t = t.replace(/  \/\/ dataset-resize:start[\s\S]*?  \/\/ dataset-resize:end/, () => read('dataset-resize-methods.js'));
  }
  for (const [marker, file] of [['profile-workspace', 'profile-methods.js'], ['task-linking', 'task-link-methods.js']]) {
    const pattern = new RegExp('  // ' + marker + ':start[\\s\\S]*?  // ' + marker + ':end');
    if (!pattern.test(t)) throw new Error('Missing lifecycle block: ' + marker);
    t = t.replace(pattern, () => read(file));
  }
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(t).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), updated = updatePanelMotion(source);
  if (source !== updated) fs.writeFileSync(file, updated);
  console.log('Applied panel transitions and direct dataset resizing.');
}
