import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open), end = source.lastIndexOf(close);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const swap = (before, after) => {
  if (template.split(before).length !== 2) throw new Error('Expected unique source: ' + before.slice(0, 100));
  template = template.replace(before, after);
};
const section = (a, b, replacement) => {
  const from = template.indexOf(a), to = template.indexOf(b, from);
  if (from < 0 || to < 0) throw new Error('Missing section: ' + a);
  template = template.slice(0, from) + replacement + template.slice(to);
};
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const paths = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${paths}</svg>`;
};
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8');
const markup = name => read(name)
  .replace('[[review-skill-session]]', '<!-- review-skill-session:start -->\n' + read('review-skills.html').replaceAll('skillView.', 'it.skills.') + '\n<!-- review-skill-session:end -->')
  .replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
if (!template.includes('// feedback-workflows:start')) {
  section('                <sc-if value="{{ sheet.pick.branchAskOpen }}"', '                <sc-if value="{{ sheet.pick.passConfirmOpen }}"', '');
  template = template.replace(/    <sc-if value="{{ reworkAsk.open }}"[\s\S]*?    <\/sc-if>/, '');
  section('            branchAskOpen:', '            sampleTabs:', '');
  section('                branch: e => {', '                toggleNote:', `                branch: e => {
                  e.stopPropagation();
                  this.openBranchForm({ item: r[2], name: r[0], runId: r[5], round: k + 1,
                    version: ok && itemState.currentDeliverableVersion ? itemState.currentDeliverableVersion.label : 'Run ' + (k + 2),
                    verdict: ok ? '已通过' : '要求返工', who: ok ? '一万 · 2026/08/20 16:03' : 'allen · 2026/08/18 14:22' });
                },
`);
  section('            needsNote: drafting,', '            stop: e => e.stopPropagation(),\n            zoom:', `            needsNote: drafting, notNeedsNote: !drafting,
            panelRow: drafting ? 'clamp(560px,72vh,660px)' : 'clamp(360px,52vh,470px)',
            noteText: (st.reworkNotes || {})[key] || '',
            noteCount: (((st.reworkNotes || {})[key] || '').length) + ' 字',
            onNote: e => this.setState({ reworkNotes: Object.assign({}, this.state.reworkNotes, { [key]: e.target.value }) }),
            feedback: this.feedbackView(key),
            canSubmitNote: !!String(st.reworkNotes?.[key] || '').trim() && !this.feedbackView(key).loading,
            cannotSubmitNote: !String(st.reworkNotes?.[key] || '').trim() || this.feedbackView(key).loading,
            noteHint: this.feedbackView(key).loading ? '图片正在读取，完成后可提交。'
              : String(st.reworkNotes?.[key] || '').trim() ? '说明和 ' + this.feedbackImages(key).length + ' 张参考图将随任务提交，当前 Item 进入运行中。' : '请填写修改要求；参考图片为选填。提交后直接进入运行中。',
            cancelNote: e => {
              e.stopPropagation();
              const notes = Object.assign({}, this.state.reworkNotes); delete notes[key];
              const drafts = Object.assign({}, this.state.reworkDrafts); delete drafts[key];
              this.setFeedbackImages(key, [], '');
              this.setState({ reworkNotes: notes, reworkDrafts: drafts });
            },
            submitNote: e => { e.stopPropagation(); this.submitInlineRework(key, rec?.id || null); },
`);
  section('      reworkAsk: (() => {', '      reviewToast: {', '      branch: this.branchFormValues(),\n');
  swap('    this._key = e => {\n      if (this.handleReviewKey(e)) return;', `    this._feedbackUnmounted = false;
    this._feedbackPaste = e => this.handleFeedbackPaste(e);
    window.addEventListener('paste', this._feedbackPaste);
    this._key = e => {
      if (this.state.branchAsk) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.createBranchRun(); }
        return;
      }
      if (this.handleReviewKey(e)) return;`);
  swap('  componentWillUnmount() {', `  componentWillUnmount() {
    this._feedbackUnmounted = true;
    window.removeEventListener('paste', this._feedbackPaste);`);
  swap("document.querySelector('.review-workbench-rework-form textarea')?.focus();", `{
                  const panel = document.querySelector('.review-workbench-scroll');
                  if (panel) panel.scrollTop = 0;
                  document.querySelector('.review-workbench-rework-form textarea')?.focus({ preventScroll: true });
                }`);
  swap("'button:not([disabled]), a[href], textarea, [tabindex=\"0\"]'", "'button:not([disabled]), a[href], input:not([disabled]), textarea, select:not([disabled]), [tabindex=\"0\"]'");
  swap('  componentDidMount() {', read('feedback-methods.js') + '\n  componentDidMount() {');
  swap('</main>', markup('branch-dialog.html') + '\n</main>');
  swap('</style>', read('feedback-workflows.css') + '\n</style>');
} else {
  template = template.replace(/  \/\/ feedback-workflows:start[\s\S]*?  \/\/ feedback-workflows:end/, read('feedback-methods.js').trimEnd());
  template = template.replace(/<!-- branch-dialog:start -->[\s\S]*?<!-- branch-dialog:end -->/, markup('branch-dialog.html').trim());
  template = template.replace(/\/\* feedback-workflows:start \*\/[\s\S]*?\/\* feedback-workflows:end \*\//, read('feedback-workflows.css').trim());
}
template = template.replace(/<!-- review-workbench:start -->[\s\S]*?<!-- review-workbench:end -->/, markup('review-workbench.html').trim());
// The delivery detail has a second entry for the same rework action.
if (!template.includes('class="forge-sheet-scroll"')) {
  const oldStart = template.indexOf('                <sc-if value="{{ sheet.pick.reworkFormOpen }}"');
  const oldEnd = template.indexOf('\n              </div>\n            </sc-if>', oldStart);
  if (oldStart < 0 || oldEnd < 0) throw new Error('Missing sheet feedback overlay');
  template = template.slice(0, oldStart) + template.slice(oldEnd);
  const panel = '<div style="grid-column:2;grid-row:1;min-width:0;min-height:0;overflow-y:auto">';
  swap(panel, '<div class="forge-sheet-scroll" style="grid-column:2;grid-row:1;min-width:0;min-height:0;overflow-y:auto">\n<!-- sheet-feedback-slot -->\n<div style="display:{{ sheet.pick.detailDisplay }}">');
  swap('                <div style="grid-column:2;grid-row:2;display:flex;', '                </div>\n                <div class="forge-sheet-actions forge-feedback" style="grid-column:2;grid-row:2;display:flex;');
  swap('                  <sc-if value="{{ sheet.pick.hasRun }}"', '                  <sc-if value="{{ sheet.pick.reworkFormClosed }}" hint-placeholder-val="{{ true }}">\n                  <sc-if value="{{ sheet.pick.hasRun }}"');
  swap('                <sc-if value="{{ sheet.pick.passConfirmOpen }}"', `                <sc-if value="{{ sheet.pick.passConfirmOpen }}"`);
  const footerEnd = template.indexOf('\n                </div>\n\n                <sc-if value="{{ sheet.pick.passConfirmOpen }}"');
  if (footerEnd < 0) throw new Error('Missing sheet footer');
  template = template.slice(0, footerEnd) + `\n                  </sc-if>
                  <sc-if value="{{ sheet.pick.reworkFormOpen }}" hint-placeholder-val="{{ false }}">
                    <button class="forge-feedback-secondary" sc-camel-on-click="{{ sheet.pick.cancelRework }}">取消返工</button>
                    <button class="forge-feedback-primary" disabled="{{ sheet.pick.cannotSubmitRework }}" sc-camel-on-click="{{ sheet.pick.submitRework }}">提交返工</button>
                  </sc-if>` + template.slice(footerEnd);
  swap('            reworkFormOpen: st.sheetReworkAsk === r[2],', `            reworkFormOpen: st.sheetReworkAsk === r[2], reworkFormClosed: st.sheetReworkAsk !== r[2],
            detailDisplay: st.sheetReworkAsk === r[2] ? 'none' : 'block',
            feedback: this.feedbackView('sheet:' + r[2]),
            artifactVersion: itemState.candidateVersion?.label || itemState.currentDeliverableVersion?.label || '当前版本',
            round: '第 ' + (rn + 1) + ' 轮',
            noteHint: '说明与参考图片将随修复任务一起提交；来源版本保持不变。',`);
  swap("rework: e => { e.stopPropagation(); this.setState({ sheetReworkAsk: r[2], sheetReworkText: '', sheetReworkMode: 'review' }); }", "rework: e => { e.stopPropagation(); this.openSheetFeedback(r[2], 'review'); }");
  swap("appendRework: e => { e.stopPropagation(); this.setState({ sheetReworkAsk: r[2], sheetReworkText: '', sheetReworkMode: 'append' }); }", "appendRework: e => { e.stopPropagation(); this.openSheetFeedback(r[2], 'append'); }");
  swap("canSubmitRework: st.sheetReworkAsk === r[2] && !!String(st.sheetReworkText || '').trim(),", "canSubmitRework: st.sheetReworkAsk === r[2] && !!String(st.sheetReworkText || '').trim() && !this.feedbackView('sheet:' + r[2]).loading,");
  swap("cannotSubmitRework: st.sheetReworkAsk !== r[2] || !String(st.sheetReworkText || '').trim(),", "cannotSubmitRework: st.sheetReworkAsk !== r[2] || !String(st.sheetReworkText || '').trim() || this.feedbackView('sheet:' + r[2]).loading,");
  swap("cancelRework: e => { if (e) e.stopPropagation(); this.setState({ sheetReworkAsk: null, sheetReworkText: '' }); },", "cancelRework: e => { if (e) e.stopPropagation(); this.setFeedbackImages('sheet:' + r[2], [], ''); this.setState({ sheetReworkAsk: null, sheetReworkText: '', sheetReworkMode: null }); },");
  swap("              const note = String(st.sheetReworkText || '').trim();\n              if (!note) return;", `              const note = String(this.state.sheetReworkText || '').trim();
              if (this.state.sheetReworkAsk !== r[2] || !note || this.feedbackView('sheet:' + r[2]).loading) return;
              const attachments = this.feedbackImages('sheet:' + r[2]).map(img => Object.assign({}, img));`);
  template = template.replaceAll("sourceRun: r[5] || null } }),\n                  reviewToast:", "sourceRun: r[5] || null, note, attachments } }),\n                  reviewToast:")
    .replaceAll("sourceRun: r[5] || null } }),\n                reviewToast:", "sourceRun: r[5] || null, note, attachments } }),\n                reviewToast:");
}
const sheetForm = markup('review-workbench.html').match(/<section class="review-workbench-rework-form forge-feedback">[\s\S]*?<\/section>/)[0]
  .replaceAll('it.', 'sheet.pick.').replaceAll('sheet.pick.shortName', 'sheet.pick.name')
  .replaceAll('sheet.pick.onNote', 'sheet.pick.onReworkText').replaceAll('sheet.pick.noteText', 'sheet.pick.reworkText')
  .replaceAll('forge-rework-', 'forge-sheet-rework-').replace('>要求返工</h2>', '>{{ sheet.pick.reworkTitle }}</h2>');
const sheetMarkup = `<!-- sheet-feedback:start -->\n<sc-if value="{{ sheet.pick.reworkFormOpen }}" hint-placeholder-val="{{ false }}"><div class="forge-sheet-feedback">${sheetForm}</div></sc-if>\n<!-- sheet-feedback:end -->`;
if (template.includes('<!-- sheet-feedback-slot -->')) template = template.replace('<!-- sheet-feedback-slot -->', sheetMarkup);
else template = template.replace(/<!-- sheet-feedback:start -->[\s\S]*?<!-- sheet-feedback:end -->/, sheetMarkup);
// Promote the existing branch trigger to a keyboard-accessible button.
template = template.replace(/<div (sc-camel-on-click="{{ q.branch }}"[^>]+)>([\s\S]*?)<\/div>/g, '<button type="button" $1>$2</button>');
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
new Function(code);
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close);
console.log('Updated inline rework and version branch dialog');
