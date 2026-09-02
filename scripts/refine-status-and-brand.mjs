import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());

// Display terminology only: reworking/repair keys, legacy filters and outcomes stay intact.
for (const status of ['reworking', 'repair']) {
  const entry = new RegExp('(' + status + ': \\[[^\\n]*?, )\'(?:返工中|运行中)\'(\\],)');
  if (!entry.test(template)) throw new Error('Missing Item status: ' + status);
  template = template.replace(entry, "$1'运行中'$2");
}
template = template.replaceAll('当前 Item 进入返工中。', '当前 Item 进入运行中。')
  .replaceAll('提交后直接进入返工中。', '提交后直接进入运行中。');

const sidebar = fs.readFileSync(new URL('./templates/forge-sidebar.css', import.meta.url), 'utf8');
const wordmark = sidebar.match(/\.forge-sidebar-wordmark\{[^}]*\}/)?.[0];
if (!wordmark || !/\.forge-sidebar-wordmark\{[^}]*\}/.test(template)) throw new Error('Missing Forge wordmark');
template = template.replace(/\.forge-sidebar-wordmark\{[^}]*\}/, () => wordmark);
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (result !== source) fs.writeFileSync(file, result);
console.log('Updated running status wording and compact Forge wordmark');
