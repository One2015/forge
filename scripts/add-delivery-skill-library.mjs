import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const markup = () => read('delivery-editor.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

// Focused sync: preserve all other detail, history, profile and review refinements.
export function addDeliverySkillLibrary(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const library = read('delivery-skill-library.js');
  if (!template.includes('// delivery-skill-library:start')) {
    if (!template.includes('  // delivery-workflows:start')) throw new Error('Missing delivery workflow');
    template = template.replace('  // delivery-workflows:start', () => library + '\n\n  // delivery-workflows:start');
  } else template = template.replace(/  \/\/ delivery-skill-library:start[\s\S]*?  \/\/ delivery-skill-library:end/, () => library);
  for (const [pattern, replacement] of [
    [/  \/\/ delivery-workflows:start[\s\S]*?  \/\/ delivery-workflows:end/, read('delivery-methods.js')],
    [/<!-- delivery-editor:start -->[\s\S]*?<!-- delivery-editor:end -->/, markup()],
    [/\/\* delivery-workflows:start \*\/[\s\S]*?\/\* delivery-workflows:end \*\//, read('delivery-workflows.css')]
  ]) {
    if (!pattern.test(template)) throw new Error('Missing delivery block: ' + pattern);
    template = template.replace(pattern, () => replacement);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = addDeliverySkillLibrary(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated searchable delivery Skill library');
}
