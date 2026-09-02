import fs from 'node:fs';
const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open), end = source.lastIndexOf(close);
let template = JSON.parse(source.slice(start + open.length, end).trim());
const swap = (label, before, after) => {
  const n = template.split(before).length - 1;
  if (n !== 1) throw new Error(`${label}: expected 1, found ${n}`);
  template = template.replaceAll(before, after);
  console.log(`${label}: ok`);
};
// The sticky header squeezed 审核记录 onto two lines once the long version summary joined it.
swap(
  'history label never wraps',
  '<div style="font-size:12px;color:#9c948b;letter-spacing:.04em">审核记录</div>\n                  <div style="flex:1"></div>\n                  <div style="font-size:12px;color:#6b645d">{{ sheet.pick.roundSummary }}</div>',
  '<div style="font-size:12px;color:#9c948b;letter-spacing:.04em;white-space:nowrap;flex:none">审核记录</div>\n                  <div style="flex:1;min-width:8px"></div>\n                  <div style="font-size:12px;color:#6b645d;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ sheet.pick.roundSummary }}</div>',
);
const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('sticky header fixed');
