import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);

if (start < 0 || end < 0 || end <= start) throw new Error('Forge template bundle not found');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const before = "            runLabel: (passed || rn >= 20) ? '查看完整记录 →' : '来源运行 →',";
const after = "            runLabel: '查看完整记录 →',";
const count = template.split(before).length - 1;
if (count !== 1) throw new Error(`Expected one source-run label, found ${count}`);
template = template.replace(before, after);
const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Removed source-run copy from delivery modal');
