import fs from 'node:fs';

// Keep the compact detail entry/footer generator authoritative before applying state integration.
await import('./refine-detail-actions.mjs');
const file = new URL('./templates/forge-base.html', import.meta.url), source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const swap = (before, after) => {
  if (!before || template.split(before).length !== 2) throw new Error('Expected one anchor: ' + before?.slice(0, 120));
  template = template.replace(before, () => after);
};
if (!template.includes('// appended-review:start')) {
  swap('  componentDidMount() {', read('appended-review-methods.js') + '\n  componentDidMount() {');
  swap("    out.hasPendingCandidate = !!(out.candidateVersion && out.candidateVersion.reviewStatus === 'pending');\n    return out;", "    out.hasPendingCandidate = !!(out.candidateVersion && out.candidateVersion.reviewStatus === 'pending');\n    return this.appendedItemState(id, out);");
  swap('    ]).map(r => this.normalizeRun(r));', '    ]).map(r => this.normalizeRun(this.appendedRunView(r)));');
  swap('      const src = ds ? ds.items : [];\n      for (let k = 0; k < rc.done', '      const src = rc.itemMeta || (ds ? ds.items : []);\n      for (let k = 0; k < rc.done');
  swap('        const cycle = ds ? ds.items : [];', '        const cycle = rec.itemMeta || (ds ? ds.items : []);');
  const rn = "          const rn = (r[3] === 'pending' || (r[3] === 'failed' && !reworking)) ? 0 : (passed ? this.roundsOf(r[2]) + 1 : this.roundsOf(r[2]));\n          const appended = (st.appendedRework || {})[r[2]] || null;";
  swap(rn, "          const appended = this.appendedRecord(r[2], itemState);\n          const rn = appended ? appended.baseReviewCount : (r[3] === 'pending' || (r[3] === 'failed' && !reworking)) ? 0 : (passed ? this.roundsOf(r[2]) + 1 : this.roundsOf(r[2]));");
  const nodesStart = template.indexOf('          const versionNodes = (() => {');
  const nodesEnd = template.indexOf('\n          return {', nodesStart);
  swap(template.slice(nodesStart, nodesEnd), '          const versionNodes = this.sheetVersionNodes(r[2], itemState);');
  swap("              { k: 'Run ID', v: r[5] || '—', link: false, plain: true },", "              { k: 'Run ID', v: itemState.candidateVersion?.runId || itemState.currentDeliverableVersion?.runId || r[5] || '—', link: false, plain: true },");
  swap("              { k: '审核结论', v: r[4], link: false, plain: true },", "              { k: '审核结论', v: appended ? (itemState.candidateVersion ? appended.version + ' · ' + this.sheetDetailActionValues(d.key, r[2]).state : appended.version + ' · 已通过审核') : r[4], link: false, plain: true },");
  const reviewStart = template.indexOf('            pass: e => { e.stopPropagation(); this.setState({ sheetPassAsk: r[2] }); },');
  const reviewEnd = template.indexOf('            branches:', reviewStart);
  swap(template.slice(reviewStart, reviewEnd), '// sheet-review-actions:start\n' + read('sheet-review-actions.js') + '\n// sheet-review-actions:end\n');
  const appendStart = template.indexOf("              if (this.state.sheetReworkMode === 'append') {");
  const appendEnd = template.indexOf('              this.setState({\n                sheetReworkAsk:', appendStart);
  swap(template.slice(appendStart, appendEnd), "              if (this.state.sheetReworkMode === 'append' || this.appendedRecord(r[2], itemState)) {\n                this.submitSheetAppend(d.key, r[2], this.state.sheetReworkMode === 'append' ? 'append' : 'review');\n                return;\n              }\n");
  const historyStart = template.indexOf('<sc-if value="{{ sheet.pick.hasAppendedRound }}"');
  const historyEnd = template.indexOf('</sc-if>', historyStart) + '</sc-if>'.length;
  swap(template.slice(historyStart, historyEnd), read('sheet-appended-rounds.html'));
  swap("            hasAppendedRound: !!appended,\n            appendedTitle: '第 ' + (rn + 1) + ' 轮',\n            appendedWho: '一万 · 追加返工',\n            appendedNote: appended ? appended.note : '',\n", '');
} else {
  template = template.replace(/  \/\/ appended-review:start[\s\S]*?  \/\/ appended-review:end/, () => read('appended-review-methods.js'));
  template = template.replace(/\/\/ sheet-review-actions:start[\s\S]*?\/\/ sheet-review-actions:end/, () => '// sheet-review-actions:start\n' + read('sheet-review-actions.js') + '\n// sheet-review-actions:end');
  template = template.replace(/<!-- sheet-appended-rounds:start -->[\s\S]*?<!-- sheet-appended-rounds:end -->/, () => read('sheet-appended-rounds.html'));
}
const reworkSubmit = read('sheet-rework-submit.js');
if (template.includes('// sheet-rework-confirmation:start')) {
  template = template.replace(/            \/\/ sheet-rework-confirmation:start[\s\S]*?            \/\/ sheet-rework-confirmation:end/, () => reworkSubmit);
} else {
  const reworkTitle = template.indexOf('            reworkTitle:');
  const reworkStart = template.indexOf('            cancelRework:', reworkTitle);
  const reworkEnd = template.indexOf('\n          };\n        })(),\n        rows:', reworkStart);
  if (reworkTitle < 0 || reworkStart < 0 || reworkEnd < 0) throw new Error('Missing sheet rework submission block');
  swap(template.slice(reworkStart, reworkEnd), reworkSubmit);
}
template = template.replace(
  '说明需要保留、修改和验收的内容。填写并提交本身即为确认，不再增加一次通用弹窗。',
  '说明需要保留、修改和验收的内容。填写完成后将再次确认；确认提交才会创建下一轮修复任务。'
);
template = template.replace(/  \/\/ task-linking:start[\s\S]*?  \/\/ task-linking:end/, () => read('task-link-methods.js'));
if (template.includes('        const src = ds ? ds.items : [];\n        const picked = rec.itemIds')) {
  swap('        const src = ds ? ds.items : [];\n        const picked = rec.itemIds', '        const src = rec.itemMeta || (ds ? ds.items : []);\n        const picked = rec.itemIds');
}
if (template.includes("            round: '第 ' + (rn + 1) + ' 轮',")) {
  swap("            round: '第 ' + (rn + 1) + ' 轮',", "            round: '第 ' + (st.sheetReworkMode === 'append' ? (appended?.round || rn) + 1 : appended?.round || rn + 1) + ' 轮',");
  swap("              { k: '审核轮次', v: '第 ' + (this.roundsOf(r[2]) + 1) + ' 轮' },", "              { k: '审核轮次', v: '第 ' + (appended?.round || this.roundsOf(r[2]) + 1) + ' 轮' },");
  swap("version: ok && itemState.currentDeliverableVersion ? itemState.currentDeliverableVersion.label : 'Run ' + (k + 2),", "version: ok && itemState.currentDeliverableVersion ? (appended?.history?.[0]?.approvedVersion || appended?.approvedVersion || itemState.currentDeliverableVersion).label : 'Run ' + (k + 2),");
}
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const output = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (output !== source) fs.writeFileSync(file, output);
console.log('Connected appended repair versions to review and delivery state.');
