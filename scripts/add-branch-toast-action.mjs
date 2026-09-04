import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8');
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};

export function addBranchToastAction(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const patch = (pattern, replacement) => {
    if (!pattern.test(template) || !replacement) throw new Error('Missing branch toast anchor: ' + pattern);
    template = template.replace(pattern, () => replacement);
  };
  const methods = /  notifyTaskLink\(text,[\s\S]*?(?=  \/\/ task-linking:end)/;
  patch(methods, read('task-link-methods.js').match(methods)?.[0]);
  const notification = /    this\.notifyTaskLink\(\(source\.historyKey[^\n]+/;
  patch(notification, read('feedback-methods.js').match(notification)?.[0]);
  const markup = /<div id="forge-task-link-toast"[\s\S]*?(?=<!-- task-link-dialog:end -->)/;
  patch(markup, read('task-link-dialog.html').match(markup)?.[0]?.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon));
  const css = /\/\* task-linking:start \*\/[\s\S]*?\/\* task-linking:end \*\//;
  patch(css, read('task-link.css').trim());
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = addBranchToastAction(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Branch creation Toast links to its exact submitted run');
}
