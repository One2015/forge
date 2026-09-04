import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const markupPattern = /<!-- sheet-preview-navigation:start -->[\s\S]*?<!-- sheet-preview-navigation:end -->/;
const cssPattern = /\/\* sheet-preview-navigation:start \*\/[\s\S]*?\/\* sheet-preview-navigation:end \*\//;
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};

// Patch only the delivery preview controls; keep the review workbench and every
// pending workflow change intact. This does not replay the old modal migration.
export function updateSheetPreviewNavigation(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const markup = read('sheet-preview-navigation.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
  if (markupPattern.test(template)) template = template.replace(markupPattern, () => markup);
  else {
    const previous = /<div style="position:absolute;bottom:14px;left:16px;display:flex;align-items:center;gap:7px">[\s\S]*?\n                  <\/div>/;
    if ([...template.matchAll(new RegExp(previous, 'g'))].length !== 1) throw new Error('Preview navigation boundary changed');
    const existing = template.match(previous)[0];
    if (!existing.includes('{{ sheet.prev }}') || !existing.includes('{{ sheet.posLabel }}')) throw new Error('Unexpected preview controls');
    template = template.replace(previous, () => markup);
  }
  // Existing handlers already clamp at either end. Expose that same state to
  // native buttons so users can see the boundary and tab to actionable controls.
  if (!template.includes('cannotPrev: rows.findIndex')) {
    const anchor = "        posLabel: (rows.findIndex(r => r[2] === st.sheetRow) + 1) + ' / ' + rows.length,";
    if (template.split(anchor).length !== 2) throw new Error('Preview position data changed');
    template = template.replace(anchor, anchor + '\n        cannotPrev: rows.findIndex(r => r[2] === st.sheetRow) <= 0,\n        cannotNext: !rows.some(r => r[2] === st.sheetRow) || rows.findIndex(r => r[2] === st.sheetRow) >= rows.length - 1,');
  }
  const css = read('sheet-preview-navigation.css');
  if (cssPattern.test(template)) template = template.replace(cssPattern, () => css);
  else template = template.replace('</style>', () => css + '\n</style>');
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateSheetPreviewNavigation(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated compact frosted preview navigation');
}
