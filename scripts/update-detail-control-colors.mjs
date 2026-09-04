import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icons = markup => markup.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

export function updateDetailControlColors(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  for (const [pattern, replacement] of [
    [/<(?:div|button)\b[^>]*class="forge-sheet-close"[^>]*>[\s\S]*?<\/(?:div|button)>/g, icons(read('sheet-detail-close.html'))],
    [/\/\* detail-actions:start \*\/[\s\S]*?\/\* detail-actions:end \*\//g, read('detail-actions.css')],
    [/\/\* forge-refinement:start \*\/[\s\S]*?\/\* forge-refinement:end \*\//g, read('forge-refinement.css')],
    [/\/\* interaction-states:start \*\/[\s\S]*?\/\* interaction-states:end \*\//g, read('interaction-states.css')]
  ]) {
    if ([...template.matchAll(pattern)].length !== 1) throw new Error('Missing unique detail-control anchor: ' + pattern);
    template = template.replace(pattern, () => replacement);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateDetailControlColors(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated detail action colors and persistent close button');
}
