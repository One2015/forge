import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();

export function updateDeliveryCustomerHeading(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const heading = template.includes('<!-- delivery-customer-heading:start -->')
    ? /<!-- delivery-customer-heading:start -->[\s\S]*?<!-- delivery-customer-heading:end -->/g
    : /<div style="display:flex;align-items:(?:center|baseline);gap:10px;margin-bottom:10px;flex-wrap:wrap">\s*<sc-if value="{{ c\.hasLogo }}"[\s\S]*?<div style="font-size:13px;color:var\(--forge-muted\)">{{ c\.meta }}<\/div>\s*<\/div>/g;
  const css = /\/\* delivery-workflows:start \*\/[\s\S]*?\/\* delivery-workflows:end \*\//g;
  for (const [pattern, replacement] of [[heading, read('delivery-customer-heading.html')], [css, read('delivery-workflows.css')]]) {
    if ([...template.matchAll(pattern)].length !== 1) throw new Error('Missing unique customer-heading anchor: ' + pattern);
    template = template.replace(pattern, () => replacement);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateDeliveryCustomerHeading(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Aligned delivery customer logos and names');
}
