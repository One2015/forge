import fs from 'node:fs';

// Focused CSS update: preserve the current markup, state and earlier sidebar refinements.
const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const cases = /\/\* case-labels:start \*\/[\s\S]*?\/\* case-labels:end \*\//;
if (!cases.test(template)) throw new Error('Missing case styles');
template = template.replace(cases, () => read('case-labels.css'));
const download = /\/\* download-selected:start \*\/[\s\S]*?\/\* download-selected:end \*\//;
const sidebarRule = read('forge-sidebar.css').match(download)?.[0];
if (!sidebarRule) throw new Error('Missing download selection styles');
if (download.test(template)) template = template.replace(download, () => sidebarRule);
else {
  if (!template.includes('/* forge-sidebar:end */')) throw new Error('Missing sidebar styles');
  template = template.replace('/* forge-sidebar:end */', sidebarRule + '\n/* forge-sidebar:end */');
}
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const output = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (output !== source) fs.writeFileSync(file, output);
console.log('Updated selected Case and Download states.');
