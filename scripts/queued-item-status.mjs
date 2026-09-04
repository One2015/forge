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

// Neither 未开始 nor 待生产 is an Item status. An Item that is linked to a sheet but
// has not run yet is 排队中 — the same wording the run family already uses for work
// that is waiting to execute, and the same palette.
swap(
  'pending_production → 排队中',
  "        pending_production: ['#6b645d', '#ddd6cb', '#c1b8ab', '待生产'],",
  "        pending_production: ['#6b645d', '#ddd6cb', '#c1b8ab', '排队中'],",
);

swap(
  'pending → 排队中',
  "        pending: ['#6b645d', '#ddd6cb', '#c1b8ab', '待生产']",
  "        pending: ['#6b645d', '#ddd6cb', '#c1b8ab', '排队中']",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Un-run Items now read 排队中');
