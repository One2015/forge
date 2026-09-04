import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icons = markup => markup.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

// Refresh only this dialog and its styles; never replay the historical
// association migration, which also rewrites unrelated workflow methods.
export function updateTaskLinkSelection(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  for (const [pattern, replacement] of [
    [/<!-- task-link-dialog:start -->[\s\S]*?<!-- task-link-dialog:end -->/g, icons(read('task-link-dialog.html'))],
    [/\/\* task-linking:start \*\/[\s\S]*?\/\* task-linking:end \*\//g, read('task-link.css')]
  ]) {
    if ([...template.matchAll(pattern)].length !== 1) throw new Error('Expected one task-link selection boundary');
    template = template.replace(pattern, () => replacement);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateTaskLinkSelection(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated task-link Item single selection');
}
