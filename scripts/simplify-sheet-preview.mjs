import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { updateArtifactPreview } from './update-artifact-preview.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();

export function simplifySheetPreview(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const heading = /<!-- sheet-history-heading:start -->[\s\S]*?<!-- sheet-history-heading:end -->/;
  if (heading.test(template)) template = template.replace(heading, () => read('sheet-history-heading.html'));
  else {
    const oldHeading = /<div class="forge-sheet-history-heading"[^>]*>[\s\S]*?(?=\s*<div class="forge-sheet-history")/g;
    if ([...template.matchAll(oldHeading)].length !== 1) throw new Error('Expected one sheet history heading');
    template = template.replace(oldHeading, () => read('sheet-history-heading.html'));
  }
  // Keep the former "尚未审核" meaning for Items with no historical rounds.
  if (!template.includes('class="forge-sheet-history-empty"')) {
    const history = /<div class="forge-sheet-history"[^>]*>/g;
    if ([...template.matchAll(history)].length !== 1) throw new Error('Expected one sheet history timeline');
    template = template.replace(history, match => match + '\n                  <sc-if value="{{ !sheet.pick.rounds.length && !sheet.pick.appendedRounds.length }}" hint-placeholder-val="{{ false }}"><p class="forge-sheet-history-empty" style="margin:0;color:var(--forge-muted);font-size:12px">尚未审核</p></sc-if>');
  }
  // Update only the history spacing rules, preserving all other refinement edits.
  for (const selector of ['forge-sheet-history-heading', 'forge-sheet-history']) {
    const rules = [...read('forge-refinement.css').matchAll(new RegExp('\\.' + selector + '\\{[^}]+\\}', 'g'))];
    let index = 0;
    template = template.replace(new RegExp('\\.' + selector + '\\{[^}]+\\}', 'g'), () => {
      if (!rules[index]) throw new Error('Unexpected extra rule: ' + selector);
      return rules[index++][0];
    });
    if (index !== rules.length) throw new Error('Missing spacing rule: ' + selector);
  }
  const actions = /  \/\/ detail-actions:start[\s\S]*?  \/\/ detail-actions:end/;
  if (!actions.test(template)) throw new Error('Missing sheet detail actions');
  template = template.replace(actions, () => read('detail-action-methods.js'));
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
  return updateArtifactPreview(result);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = simplifySheetPreview(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Simplified artifact preview and connected the review heading to its timeline.');
}
