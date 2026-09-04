import fs from 'node:fs';
import { renderDeliveryEditor } from './render-delivery-editor.mjs';

// Refresh layout only. Preserve business logic and the bundle's normalized palette.
const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const logic = html => html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const originalLogic = logic(template);
const replace = (pattern, value) => {
  if (!pattern.test(template)) throw new Error('Missing layout target: ' + pattern);
  template = template.replace(pattern, value);
};
const markup = value => value.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

replace(/<!-- delivery-editor:start -->[\s\S]*?<!-- delivery-editor:end -->/, () => markup(renderDeliveryEditor(read('delivery-editor.html'))));
replace(/<!-- delivery-sheet-extras:start -->[\s\S]*?<!-- delivery-sheet-extras:end -->/, () => markup(read('delivery-sheet-extras.html')));
for (const [name, marker] of [['delivery-workflows', 'delivery-workflows'], ['forge-profile', 'forge-profile'], ['task-link', 'task-linking']]) {
  replace(new RegExp('/\\* ' + marker + ':start \\*/[\\s\\S]*?/\\* ' + marker + ':end \\*/'), () => read(name + '.css'));
}
replace(/\.forge-feedback :(?:is|where)\(input,textarea,select,button\)\{font:inherit;color:inherit\}/,
  '.forge-feedback :where(input,textarea,select,button){font:inherit;color:inherit}');
replace(/\.forge-feedback-attachments(?::empty|:not\(:has\(\.forge-feedback-attachment\)\))\{display:none;margin:0\}/,
  '.forge-feedback-attachments:not(:has(.forge-feedback-attachment)){display:none;margin:0}');
replace(/\.forge-branch-source-copy\{([^}]*)\}/, (_, rule) =>
  '.forge-branch-source-copy{' + rule.replace(/;?overflow-wrap:anywhere/g, '') + ';overflow-wrap:anywhere}');
replace(/\.forge-sidebar-profile\{display:flex;[^}]*\}/, rule => rule.replace(/padding:[^;}]*/, 'padding:8px'));

if (logic(template) !== originalLogic) throw new Error('Layout refinement must not alter application logic');
new Function(logic(template));
const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (result !== source) fs.writeFileSync(file, result);
console.log('Aligned upload groups, paired controls, empty states and panel content rails');
