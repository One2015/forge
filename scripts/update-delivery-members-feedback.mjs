import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addDeliverySkillLibrary } from './add-delivery-skill-library.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icons = text => text.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

export function updateDeliveryMembersFeedback(input) {
  const source = addDeliverySkillLibrary(input);
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const members = read('delivery-members.js');
  if (template.includes('// delivery-members:start')) template = template.replace(/  \/\/ delivery-members:start[\s\S]*?  \/\/ delivery-members:end/, () => members);
  else template = template.replace('  // delivery-workflows:start', () => members + '\n\n  // delivery-workflows:start');
  for (const [pattern, replacement] of [
    [/  \/\/ profile-workspace:start[\s\S]*?  \/\/ profile-workspace:end/, read('profile-methods.js')],
    [/  \/\/ feedback-workflows:start[\s\S]*?  \/\/ feedback-workflows:end/, read('feedback-methods.js')],
    [/\/\* feedback-workflows:start \*\/[\s\S]*?\/\* feedback-workflows:end \*\//, read('feedback-workflows.css')]
  ]) {
    if (!pattern.test(template)) throw new Error('Missing focused source block: ' + pattern);
    template = template.replace(pattern, () => replacement);
  }
  // Give existing demonstration sheets structured creator IDs, matching their displayed creation records.
  for (const [key, creator] of [['ant200', '一万'], ['step300', '一万'], ['stepv2w', 'allen'], ['fin120', 'allen'], ['webdev150', 'yokiguan']]) {
    template = template.replace("{ key: '" + key + "', createdBy: '" + creator + "', name:", "{ key: '" + key + "', name:");
    template = template.replace("{ key: '" + key + "', name:", "{ key: '" + key + "', ownerAccount: '" + creator + "', name:");
  }
  const imageBox = icons(read('review-workbench.html').match(/<!-- feedback-image-box:start -->[\s\S]*?<!-- feedback-image-box:end -->/)[0]);
  for (const [prefix, id] of [['it.feedback', 'forge-rework-image-help'], ['sheet.pick.feedback', 'forge-sheet-rework-image-help']]) {
    let found = 0;
    const replacement = imageBox.replaceAll('it.feedback', prefix).replaceAll('forge-rework-image-help', id);
    const pattern = /<!-- feedback-image-box:start -->[\s\S]*?<!-- feedback-image-box:end -->|<div class="forge-feedback-upload-row">[\s\S]*?<p class="forge-feedback-limit">[^<]*<\/p>/g;
    template = template.replace(pattern, block => {
      if (!block.includes('{{ ' + prefix + '.')) return block;
      found++; return replacement;
    });
    if (found !== 1) throw new Error('Expected one upload block for ' + prefix + ', found ' + found);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateDeliveryMembersFeedback(source);
  if (source !== result) fs.writeFileSync(file, result);
  console.log('Updated delivery membership and inline rework image boxes');
}
