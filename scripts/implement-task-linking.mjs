import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8'), opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const swap = (before, after) => {
  if (template.split(before).length !== 2) throw new Error('Expected unique anchor: ' + before.slice(0, 100));
  template = template.replace(before, () => after);
};
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};
const markup = name => read(name).replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
const cta = field => `<button type="button" class="forge-task-link-cta" title="{{ ${field}.hint }}" sc-camel-on-click="{{ ${field}.open }}">${icon('', 'paperclip', 16)}<span>关联任务</span></button>`;
const history = prefix => `<details class="forge-task-link-history"><summary>关联记录</summary><sc-for list="{{ ${prefix} }}" as="version" hint-placeholder-count="0"><div class="forge-task-link-history-entry"><strong>{{ version.label }}</strong><span>{{ version.name }} · {{ version.sourceVersion }}</span><span>Item · {{ version.id }}</span><span>Run · {{ version.run }}</span></div></sc-for></details>`;

if (!template.includes('// task-linking:start')) {
  swap('  sheetRows(sheet) {', '  baseSheetRows(sheet) {');
  swap('  componentDidMount() {', read('task-link-methods.js') + '\n  componentDidMount() {');
  swap('    this._key = e => {', `    this._key = e => {
      if (this.state.taskLink) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.submitTaskLink(); }
        return;
      }`);
  swap('  componentWillUnmount() {', '  componentWillUnmount() {\n    clearTimeout(this._taskLinkToastTimer);');
  swap('      deliveryEditor: this.deliveryEditorValues(),', '      deliveryEditor: this.deliveryEditorValues(),\n      taskLink: this.taskLinkValues(),\n      taskLinkToast: this.taskLinkToastValues(),');
  swap('            name: r[0], state, fg, border,', `            name: r[0], state, fg, border,
            link: this.taskLinkEntryValues({ sheetKey: d.key, itemId: r[2] }),
            linkHistory: this.taskLinkHistory(d, r[2]), hasLinkHistory: this.taskLinkHistory(d, r[2]).length > 0,`);
  swap('        isBranch: !!br,', `        isBranch: !!br,
        link: this.taskLinkEntryValues(br ? { itemId: r[2], forkKey: br.key, forkName: br.name, sheetKey: d.key }
          : inSheet ? { sheetKey: d.key, itemId: r[2] } : { itemId: r[2], runId: st.lifeRun }),
        linkHistory: inSheet ? this.taskLinkHistory(d, r[2]) : [], hasLinkHistory: inSheet && this.taskLinkHistory(d, r[2]).length > 0,`);
  swap('          title: rec.subject || rec.name.split', `          link: this.taskLinkEntryValues({ runId: rec.id, index: 0 }), singleItem: rec.n === 1,
          title: rec.subject || rec.name.split`);
  swap('              canStop: state === \'running\',', `              link: this.taskLinkEntryValues({ runId: rec.id, index: k }),
              canStop: state === 'running',`);
  swap('            shortName: shortName(meta),', `            link: this.taskLinkEntryValues({ runId: rec?.id || '', itemId: String(meta[0] || '') }),
            shortName: shortName(meta),`);
  swap('                primary: openBranchRun,', `                primary: bstate === 'deliverable' ? e => { e?.stopPropagation(); this.openTaskLink({ itemId: r[2], forkKey: key, forkName: f.name, sheetKey: d.key }); } : openBranchRun,`);
  swap('<div class="forge-sheet-field-grid"', cta('sheet.pick.link') + '<sc-if value="{{ sheet.pick.hasLinkHistory }}" hint-placeholder-val="{{ false }}">' + history('sheet.pick.linkHistory') + '</sc-if>\n                  <div class="forge-sheet-field-grid"');
  swap('<sc-if value="{{ life.canExport }}"', cta('life.link') + '\n            <sc-if value="{{ life.canExport }}"');
  swap('{{ life.path }}</div>', '{{ life.path }}</div><sc-if value="{{ life.hasLinkHistory }}" hint-placeholder-val="{{ false }}">' + history('life.linkHistory') + '</sc-if>');
  swap('{{ run.title }}</h1>', '{{ run.title }}</h1><sc-if value="{{ run.singleItem }}" hint-placeholder-val="{{ false }}">' + cta('run.link') + '</sc-if>');
  swap('<sc-if value="{{ it.canReview }}"', cta('it.link') + '\n              <sc-if value="{{ it.canReview }}"');
  swap('</main>', markup('task-link-dialog.html') + '\n</main>');
  swap('</style>', read('task-link.css') + '\n</style>');
} else {
  template = template.replace(/  \/\/ task-linking:start[\s\S]*?  \/\/ task-linking:end/, () => read('task-link-methods.js'));
  template = template.replace(/<!-- task-link-dialog:start -->[\s\S]*?<!-- task-link-dialog:end -->/, () => markup('task-link-dialog.html'));
  template = template.replace(/\/\* task-linking:start \*\/[\s\S]*?\/\* task-linking:end \*\//, () => read('task-link.css'));
}
template = template.replace(/  \/\/ delivery-workflows:start[\s\S]*?  \/\/ delivery-workflows:end/, () => read('delivery-methods.js'));
template = template.replace(/  \/\/ feedback-workflows:start[\s\S]*?  \/\/ feedback-workflows:end/, () => read('feedback-methods.js'));
template = template.replaceAll("const key = ((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || 'sheet') + ':' + r[2];", "const key = ((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || 'sheet') + ':' + (itemState.candidateVersion?.source?.itemId || r[2]);");
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
fs.writeFileSync(file, source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing);
console.log('Updated task-to-delivery Item association');
