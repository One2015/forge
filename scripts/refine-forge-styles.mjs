import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open), end = source.lastIndexOf(close);
if (start < 0 || end < 0) throw new Error('Missing Forge template');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trim();
// Existing component templates remain the source of truth. This final style pass
// adds tokens and semantic hooks to the older inline-style markup, not business logic.
for (const [marker, name] of [['forge-sidebar', 'forge-sidebar.css'], ['review-workbench', 'review-workbench.css'], ['feedback-workflows', 'feedback-workflows.css']]) {
  const re = new RegExp('/\\* ' + marker + ':start \\*/[\\s\\S]*?/\\* ' + marker + ':end \\*/');
  if (!re.test(template)) throw new Error('Missing style block: ' + marker);
  template = template.replace(re, read(name));
}
template = template.replace(/\/\* forge-refinement:start \*\/[\s\S]*?\/\* forge-refinement:end \*\//, '');
template = template.replace(/:root\{--forge-accent:[^}]+\}/, '');

function hook(fragment, name) {
  if (template.includes('class="' + name + '"')) return;
  if (template.split(fragment).length !== 2) throw new Error('Expected one hook: ' + name);
  template = template.replace(fragment, fragment.replace('<div ', '<div class="' + name + '" '));
}
hook('<div sc-camel-on-click="{{ sheet.closePick }}" role="dialog"', 'forge-sheet-overlay');
hook('<div sc-camel-on-click="{{ sheet.stopPick }}" style="position:relative;width:min(1500px,calc(100vw - 36px));', 'forge-sheet-dialog');
hook('<div sc-camel-on-click="{{ sheet.closePick }}" aria-label="关闭 Item 详情"', 'forge-sheet-close');
const oldGrid = '<div style="height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(360px,.8fr);grid-template-rows:minmax(0,1fr) auto">';
template = template.replace(oldGrid, '<div class="forge-sheet-grid">');
hook('<div style="grid-column:1;grid-row:1 / 3;', 'forge-sheet-preview');
hook('<div style="padding:18px 20px 16px;border-bottom:1px solid ', 'forge-sheet-meta');
hook('<div style="font-size:17px;font-weight:600;letter-spacing:-0.01em">{{ sheet.pick.name }}', 'forge-sheet-meta-title');
hook('<div style="display:grid;grid-template-columns:62px minmax(0,1fr);gap:7px 12px;', 'forge-sheet-field-grid');
hook('<div style="position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:11px 20px 9px;', 'forge-sheet-history-heading');
hook('<div style="padding:8px 20px 12px">', 'forge-sheet-history');
hook('<div style="width:96px;height:64px;border-radius:10px;', 'forge-sheet-history-thumb');
hook('<div style="margin-left:3px;font-size:11px;color:#aaa59d">', 'forge-sheet-preview-hint');
template = template.replace(/<div style="max-width:(1240px|\{\{ review.shellWidth \}\});margin:0 auto;padding:26px clamp\(16px,2.2vw,28px\) 60px">/g, '<div class="forge-page" style="max-width:$1;margin:0 auto;padding:26px clamp(16px,2.2vw,28px) 60px">');
const queueStart = template.indexOf('<div class="review-queue-card-header"');
const queueEnd = template.indexOf('<!-- review-workbench:start -->', queueStart);
if (queueStart < 0 || queueEnd < 0) throw new Error('Missing queue header');
let queue = template.slice(queueStart, queueEnd);
queue = queue.replace('<div style="height:82px;', '<div class="forge-review-thumb" style="height:82px;');
queue = queue.replace('<div style="display:flex;flex-direction:column;justify-content:center;gap:7px;align-items:flex-end">', '<div class="forge-review-card-actions" style="display:flex;flex-direction:column;justify-content:center;gap:7px;align-items:flex-end">');
template = template.slice(0, queueStart) + queue + template.slice(queueEnd);
template = template.replaceAll('clamp(120px,14vw,168px)', 'clamp(172px,18vw,220px)');
template = template.replace(/<div style="([^"]*)">\{\{ r.progress \}\}<\/div>/, '<div class="forge-run-progress" style="$1">{{ r.progress }}</div>');

const palette = {
  '#b1543a':'--forge-accent', '#c83d00':'--forge-accent', '#d33e00':'--forge-accent', '#ff4d00':'--forge-accent', '#e64700':'--forge-accent',
  '#95452f':'--forge-accent-hover', '#8f4029':'--forge-accent-hover', '#c93b00':'--forge-accent-hover', '#e54500':'--forge-accent-hover', '#c53b00':'--forge-accent-hover',
  '#fff0e8':'--forge-accent-soft', '#ffdfd1':'--forge-accent-soft', '#ffdfcb':'--forge-accent-soft', '#ffe7d8':'--forge-accent-soft',
  '#221f1c':'--forge-text', '#3a352f':'--forge-text', '#171717':'--forge-text', '#202020':'--forge-text',
  '#9c948b':'--forge-muted', '#8b847c':'--forge-muted', '#6b645d':'--forge-muted', '#625c56':'--forge-muted', '#737373':'--forge-muted', '#756e67':'--forge-muted', '#514d48':'--forge-muted',
  '#e8e2d9':'--forge-border', '#f0ece5':'--forge-border', '#e5e2df':'--forge-border', '#e1dfdc':'--forge-border',
  '#ddd6cb':'--forge-control-border', '#e2dcd2':'--forge-control-border', '#d9d9d9':'--forge-control-border', '#c7c2bc':'--forge-control-border',
  '#fbfaf8':'--forge-bg', '#fcfbf9':'--forge-subtle', '#faf9f7':'--forge-subtle', '#f4f3f1':'--forge-subtle',
  '#e8e5e1':'--forge-disabled-bg', '#efeeec':'--forge-disabled-bg', '#eeeae5':'--forge-disabled-bg', '#827b74':'--forge-disabled-text', '#817b75':'--forge-disabled-text'
};
// Only color literals change; data, event handlers and state transitions are preserved.
template = template.replace(/#[0-9a-fA-F]{6}\b/g, color => palette[color.toLowerCase()] ? 'var(' + palette[color.toLowerCase()] + ')' : color);
// Keep dense metadata readable. Do not scale the document, previews or controls.
template = template.replace(/style="[^"]*"/g, style => style.replace(/font-size:11px\b/g, 'font-size:12px'));
template = template.replace('outline:2px solid rgba(177,84,58,.42)', 'outline:2px solid var(--forge-accent)');
template = template.replace(/\s*<\/style>/, '\n' + read('forge-refinement.css') + '\n</style>');
const output = source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close;
if (output !== source) fs.writeFileSync(file, output);
console.log('Applied compact Forge typography, shared color tokens and responsive panels');
