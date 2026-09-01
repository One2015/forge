import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Forge template bundle not found');
}

let template = JSON.parse(source.slice(start + open.length, end).trim());
const unsafe = "? '当前可交付版本：' + itemState.currentDeliverableVersion.label + ' · 待审核候选版本：' + itemState.candidateVersion.label";
const safe = "? '当前可交付版本：' + ((itemState.currentDeliverableVersion && itemState.currentDeliverableVersion.label) || '—') + ' · 待审核候选版本：' + ((itemState.candidateVersion && itemState.candidateVersion.label) || '—')";
const count = template.split(unsafe).length - 1;

if (count !== 2) {
  throw new Error(`Expected 2 unsafe version summaries, found ${count}`);
}

template = template.replaceAll(unsafe, safe);
const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Hardened 2 version summary expressions');
