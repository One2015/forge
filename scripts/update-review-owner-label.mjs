import fs from 'node:fs';

// Copy-only change. Preserve the data binding and the actual submission history.
const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const previous = '<dt>提交人</dt><dd>{{ it.submitter }}</dd>';
const next = '<dt>项目负责人</dt><dd>{{ it.submitter }}</dd>';
if (!template.includes(next)) {
  if (template.split(previous).length !== 2) throw new Error('Review metadata label changed');
  template = template.replace(previous, next);
  const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
  fs.writeFileSync(file, result);
}
console.log('Review metadata label: 项目负责人');
