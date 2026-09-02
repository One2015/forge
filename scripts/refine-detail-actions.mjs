import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};
const markup = name => read(name).replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
const swap = (before, after) => {
  if (template.split(before).length !== 2) throw new Error('Expected one anchor: ' + before.slice(0, 120));
  template = template.replace(before, () => after);
};
const element = anchor => {
  const at = template.indexOf(anchor);
  if (at < 0 || template.indexOf(anchor, at + 1) !== -1) throw new Error('Expected one element: ' + anchor);
  const tag = template.slice(at).match(/^<([\w-]+)/)?.[1];
  const tags = new RegExp('</?' + tag + '\\b[^>]*>', 'g');
  tags.lastIndex = at;
  let depth = 0, match;
  while ((match = tags.exec(template))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return template.slice(at, tags.lastIndex);
  }
  throw new Error('Unclosed element: ' + anchor);
};
const edit = field => `<button type="button" class="forge-task-link-edit" title="更换关联任务" aria-label="更换关联任务" sc-camel-on-click="{{ ${field}.open }}">${icon('', 'pencil-simple', 16)}</button>`;

if (!template.includes('// detail-actions:start')) {
  // Move existing association actions to the ID they affect, preserving their source references.
  for (const field of ['sheet.pick.link', 'life.link', 'run.link', 'it.link']) {
    swap(element(`<button type="button" class="forge-task-link-cta" title="{{ ${field}.hint }}"`), '');
  }
  swap('<sc-if value="{{ run.singleItem }}" hint-placeholder-val="{{ false }}"></sc-if>', '');
  const sheetId = element('<div sc-camel-on-click="{{ f.go }}" title="打开完整记录 · 含 Pipeline 与数据集"');
  swap(sheetId, `<div class="forge-item-id-row"><button type="button" class="forge-item-id-link" sc-camel-on-click="{{ f.go }}" title="{{ f.v }}"><span>{{ f.v }}</span>${icon('', 'arrow-up-right', 16)}</button>${edit('sheet.pick.link')}</div>`);
  swap('<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--forge-muted)">{{ life.id }}</div>', `<div class="forge-item-id-row"><code title="{{ life.id }}">{{ life.id }}</code>${edit('life.link')}</div>`);
  const runId = template.match(/<div\b[^>]*>{{ run.id }}<\/div>/)?.[0];
  if (!runId) throw new Error('Missing Run identity');
  swap(runId, runId + `<sc-if value="{{ run.singleItem }}" hint-placeholder-val="{{ false }}"><div class="forge-item-id-row forge-item-id-caption"><span>Item ID</span><code title="{{ run.itemId }}">{{ run.itemId }}</code>${edit('run.link')}</div></sc-if>`);
  swap('link: this.taskLinkEntryValues({ runId: rec.id, index: 0 }), singleItem: rec.n === 1,', 'link: this.taskLinkEntryValues({ runId: rec.id, index: 0 }), singleItem: rec.n === 1, itemId: this.taskRunItem(rec, 0).itemId,');
  swap('<div style="margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--forge-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ it.id }}</div>', `<div class="forge-item-id-row"><code title="{{ it.id }}">{{ it.id }}</code>${edit('it.link')}</div>`);
  const workbenchId = template.match(/<dt>Item ID<\/dt><dd><button class="review-workbench-item-link"[\s\S]*?<\/dd>/)?.[0];
  const newWorkbenchId = markup('review-workbench.html').match(/<dt>Item ID<\/dt><dd>[\s\S]*?<\/dd>/)?.[0];
  if (!workbenchId || !newWorkbenchId) throw new Error('Missing reviewer Item ID');
  swap(workbenchId, newWorkbenchId);

  // One bottom action group for the displayed version. The old preview download was a no-op.
  swap(element('<sc-if value="{{ sheet.pick.canExport }}"'), '');
  swap(element('<sc-if value="{{ sheet.pick.canAppendRework }}"'), '');
  swap(element('<div class="forge-sheet-actions forge-feedback"'), markup('detail-footer.html'));
  swap('            name: r[0], state, fg, border,', "            name: r[0], state: itemState.hasPendingCandidate ? '待审核候选' : passed ? '已通过审核' : state, fg, border,");
  swap("            showState: r[3] !== 'passed',", '            showState: true,');
  swap("            previewCaption: r[0] + ' · ' + (passed ? '最终产物' : '当前产物'),", "            previewCaption: r[0] + ' · ' + (itemState.hasPendingCandidate ? '待审核候选' : passed ? '最终产物' : '当前产物'),");
  swap('            canAppendRework: passed && rn > 0 && rn < 20 && !appended,\n            appendHint: \'已用 \' + rn + \' / 20 轮\',', '            ...this.sheetDetailActionValues(d.key, r[2]),');
  swap("            appendRework: e => { e.stopPropagation(); this.openSheetFeedback(r[2], 'append'); },\n", '');
  swap("              if (st.sheetReworkMode === 'append') {\n                this.setState({", "              if (this.state.sheetReworkMode === 'append') {\n                if (!this.sheetDetailActionValues(d.key, r[2]).canAppendRework) return;\n                this.setState({");
  swap("                line: (last && !(passed && rn > 0 && rn < 20)) ? 'transparent' : 'var(--forge-control-border)',", "                line: last && !appended ? 'transparent' : 'var(--forge-control-border)',");
  swap("              { k: '业务状态', v: this.statusOf('item', itemState.businessStatus).label, link: false, plain: true },\n              { k: '导出批次', v: passed ? '统一导出（' + d.passed + '）' : '未计入 · 需先通过审核', link: false, plain: true }", "              { k: '业务状态', v: this.statusOf('item', itemState.businessStatus).label, link: false, plain: true }");
  template = template.replaceAll(", ['导出批次', passed ? '统一导出（' + d.passed + '）' : '未计入']", '').replaceAll(", ['导出批次', '未计入']", '');
  swap('  componentDidMount() {', read('detail-action-methods.js') + '\n  componentDidMount() {');
} else {
  template = template.replace(/  \/\/ detail-actions:start[\s\S]*?  \/\/ detail-actions:end/, () => read('detail-action-methods.js'));
  template = template.replace(/<!-- detail-footer:start -->[\s\S]*?<!-- detail-footer:end -->/, () => markup('detail-footer.html'));
}
// Append always starts from the approved artifact, even if a rejected candidate is retained.
if (template.includes("if (!this.sheetDetailActionValues(d.key, r[2]).canAppendRework) return;\n                this.setState({")) {
  swap("if (!this.sheetDetailActionValues(d.key, r[2]).canAppendRework) return;\n                this.setState({", "const approved = this.sheetDetailActionValues(d.key, r[2]);\n                if (!approved.canAppendRework) return;\n                const appendKey = (approved.approvedRunId || 'sheet') + ':' + approved.approvedSourceItemId;\n                this.setState({");
  swap("                  appendedRework: Object.assign({}, st.appendedRework || {}, { [r[2]]: { note, round: rn + 1 } }),\n                  repairRuns: Object.assign({}, st.repairRuns || {}, { [key]: { status: 'queued', createdAt: Date.now(), sourceRun: r[5] || null, note, attachments } }),", "                  appendedRework: Object.assign({}, this.state.appendedRework || {}, { [r[2]]: { note, round: rn + 1 } }),\n                  repairRuns: Object.assign({}, this.state.repairRuns || {}, { [appendKey]: { status: 'queued', createdAt: Date.now(), sourceRun: approved.approvedRunId, note, attachments } }),");
  swap("            artifactVersion: itemState.candidateVersion?.label || itemState.currentDeliverableVersion?.label || '当前版本',", "            artifactVersion: (st.sheetReworkMode === 'append' ? itemState.currentDeliverableVersion?.label : itemState.candidateVersion?.label) || itemState.currentDeliverableVersion?.label || '当前版本',");
}
template = template.replace(/<!-- task-link-dialog:start -->[\s\S]*?<!-- task-link-dialog:end -->/, () => markup('task-link-dialog.html'));
const cssMarker = /\/\* detail-actions:start \*\/[\s\S]*?\/\* detail-actions:end \*\//;
if (cssMarker.test(template)) template = template.replace(cssMarker, () => read('detail-actions.css'));
else swap('</style>', read('detail-actions.css') + '\n</style>');
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const output = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (output !== source) fs.writeFileSync(file, output);
console.log('Refined Item association, approved-version actions, and delivery metadata.');
