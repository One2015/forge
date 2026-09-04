import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const cssPattern = /\/\* review-cta:start \*\/[\s\S]*?\/\* review-cta:end \*\//g;
const buttonPattern = (state, handler) => new RegExp('(<sc-if value="{{ it\\.' + state + ' }}"[^>]*>)<button\\b[^>]*sc-camel-on-click="{{ it\\.' + handler + ' }}"[^>]*>[\\s\\S]*?<\\/button>', 'g');

// Synchronize only the four entry CTAs and their stylesheet, not historical layout migrations.
export function updateReviewCta(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const queue = read('review-queue-header.html'), workbench = read('review-workbench.html');
  for (const [state, handler, sources] of [
    ['pending', 'start', [queue]],
    ['drafting', 'start', [queue]],
    ['needsReroll', 'reroll', [queue, workbench]]
  ]) {
    const pattern = buttonPattern(state, handler);
    const replacements = sources.map(markup => {
      const matches = [...markup.matchAll(pattern)];
      if (matches.length !== 1) throw new Error('Source CTA anchor changed: ' + state);
      return matches[0][0];
    });
    if ([...template.matchAll(pattern)].length !== replacements.length) throw new Error('Runtime CTA anchors changed: ' + state);
    let index = 0;
    template = template.replace(pattern, () => replacements[index++]);
  }
  const cssCount = [...template.matchAll(cssPattern)].length;
  if (cssCount > 1) throw new Error('Duplicate review CTA stylesheet');
  if (cssCount) template = template.replace(cssPattern, () => read('review-cta.css'));
  else template = template.replace('</style>', () => read('review-cta.css') + '\n</style>');
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateReviewCta(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated review entry CTA colors, typography and arrow-free labels');
}
