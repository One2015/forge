import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
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

// The delivery sheet lists Items that have produced something to judge. An Item that
// has not run yet has no artifact, no version and no review, so it carries no status
// worth showing here — it belongs to 生产, not 交付.
swap(
  'sheet drops un-run Items',
  '      const rows0 = this.sheetRows(d);',
  '      const rows0 = this.sheetRows(d).filter(r => r[3] !== \'pending\');',
);

swap(
  'sheet filter chips lose the un-run bucket',
  "        filters: [['all', '全部'], ['passed', null], ['review', null], ['failed', null], ['pending', null]].map(x => {",
  "        filters: [['all', '全部'], ['passed', null], ['review', null], ['failed', null]].map(x => {",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Un-run Items no longer appear in the delivery sheet');
