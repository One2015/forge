import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);

if (start < 0 || end < 0 || end <= start) throw new Error('Forge template bundle not found');
let template = JSON.parse(source.slice(start + open.length, end).trim());

function replaceOnce(before, after, label) {
  const count = template.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  template = template.replace(before, after);
}

replaceOnce(
  `class Component extends DCLogic {
  state = {
    view: 'overview', pipeQuery: '', pipeFilter: '活跃', openPipe: null, rerollEditing: false,
    dsQuery: '', selDs: null, picked: {}, panelW: null, drag: false,
    runPipeline: null, copied: null, reviewQuery: '', sheetQuery: '',
    reviewDecisions: {}, reworkDrafts: {}, reworkSent: {}, runItemTech: {},
    previewStates: {}, reviewReturn: null, deepReview: null,
    pipeCopyOpen: false, pipeCopySource: '', pipeCopyName: '', pipeCopyDesc: ''
  };`,
  `const forgeCaptureParams = new URLSearchParams(window.location.search);
const forgeCaptureValue = key => forgeCaptureParams.get(key) || '';
const forgeCaptureItem = forgeCaptureValue('item');
const forgeCaptureReviewKey = forgeCaptureValue('reviewKey');

class Component extends DCLogic {
  state = {
    view: forgeCaptureValue('view') || 'overview', pipeQuery: '', pipeFilter: '活跃', openPipe: null,
    rerollEditing: forgeCaptureValue('rerollEditing') === 'true',
    dsQuery: '', selDs: forgeCaptureValue('selDs') || null,
    picked: forgeCaptureItem ? { [forgeCaptureItem]: true } : {}, panelW: null, drag: false,
    runPipeline: forgeCaptureValue('runPipeline') || null, copied: null, reviewQuery: '', sheetQuery: '',
    reviewOpen: forgeCaptureReviewKey || null,
    reviewDecisions: {},
    reworkDrafts: forgeCaptureValue('rework') === 'true' && forgeCaptureReviewKey ? { [forgeCaptureReviewKey]: true } : {},
    reworkSent: {}, runItemTech: {},
    previewStates: forgeCaptureReviewKey && forgeCaptureValue('previewState') ? { [forgeCaptureReviewKey]: forgeCaptureValue('previewState') } : {},
    reviewReturn: null, deepReview: null,
    passAsk: forgeCaptureValue('pass') === 'true' ? forgeCaptureReviewKey : null,
    reworkAsk: null,
    activeRun: forgeCaptureValue('activeRun') || null,
    sheetKey: forgeCaptureValue('sheetKey') || null,
    sheetRow: forgeCaptureItem || null,
    rerollFrom: forgeCaptureValue('reroll') === 'true' ? forgeCaptureItem : null,
    rerollSubject: forgeCaptureValue('subject') || '',
    rerollPipe: forgeCaptureValue('sourcePipeline') || '',
    rerollRecommended: forgeCaptureValue('runPipeline') || '',
    rerollHasHigher: forgeCaptureValue('higher') === 'true',
    rerollDs: forgeCaptureValue('selDs') || '',
    rerollDsValid: !!forgeCaptureValue('selDs'),
    rerollItemValid: !!forgeCaptureItem,
    rerollReason: forgeCaptureValue('reason') || '',
    pipeCopyOpen: false, pipeCopySource: '', pipeCopyName: '', pipeCopyDesc: ''
  };`,
  'query-driven Figma capture states'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Enabled query-driven Figma capture states');
