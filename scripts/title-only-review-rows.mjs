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

const swap = (label, before, after, expected = 1) => {
  const count = template.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} match(es), found ${count}`);
  }
  template = template.replaceAll(before, after);
  console.log(`${label}: ${count} replacement(s)`);
};

// Both review lists show the Item title only. shortName already split the title off
// the description at ' · ', but truncated to 18 characters when a row had no
// description — cutting real titles in half. Descriptions live in the review modal.
swap(
  'shortName keeps whole titles',
  "      const shortName = m => {\n        const desc = (m && m[4]) || '';\n        const dot = desc.indexOf(' · ');\n        return dot > 0 ? desc.slice(0, dot) : (desc ? desc.slice(0, 18) : 'Item');\n      };",
  "      const shortName = m => {\n        const desc = (m && m[4]) || '';\n        const dot = desc.indexOf(' · ');\n        return dot > 0 ? desc.slice(0, dot) : (desc || 'Item');\n      };",
);

swap(
  '待审核 rows show the title only',
  "            domain: meta[4] || '—',\n            round: row.priorRounds ? '第 ' + (row.priorRounds + 1) + ' 轮 · 返工后复审' : '第 1 轮 · 首次审核',",
  "            domain: shortName(meta),\n            round: row.priorRounds ? '第 ' + (row.priorRounds + 1) + ' 轮 · 返工后复审' : '第 1 轮 · 首次审核',",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Review lists now show titles only');
