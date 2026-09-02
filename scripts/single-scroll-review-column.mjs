import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);
if (start < 0 || end < 0 || end <= start) throw new Error('Forge template bundle not found');

let template = JSON.parse(source.slice(start + open.length, end).trim());

const swap = (label, before, after, expected = 1) => {
  const count = template.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} match(es), found ${count}`);
  template = template.replaceAll(before, after);
  console.log(`${label}: ${count} replacement(s)`);
};

// The right column had TWO independent scroll regions — a 44vh metadata panel above a
// separate timeline. Anything added to the metadata panel (样本标注, 分支关系) fell below a
// fold the reviewer never discovers. Graphite's PR detail is ONE column of stacked cards in
// ONE scroll region, with the commit bar pinned. Same here.

swap(
  'one scroll region for the review column',
  'grid-template-columns:minmax(0,1.55fr) minmax(360px,.8fr);grid-template-rows:auto auto minmax(0,1fr) auto"',
  'grid-template-columns:minmax(0,1.55fr) minmax(360px,.8fr);grid-template-rows:minmax(0,1fr) auto"',
);

swap(
  'preview spans the new row count',
  'grid-column:1;grid-row:1 / 5;',
  'grid-column:1;grid-row:1 / 3;',
);

swap(
  'metadata becomes the first card inside the scroll region',
  '<div style="grid-column:2;grid-row:1;min-width:0;max-height:44vh;overflow-y:auto;padding:18px 20px 16px;border-bottom:1px solid #f0ece5">',
  '<div style="grid-column:2;grid-row:1;min-width:0;min-height:0;overflow-y:auto">\n'
  + '                <div style="padding:18px 20px 16px;border-bottom:1px solid #f0ece5">',
);

swap(
  '审核记录 header sticks to the top of the scroll region',
  '<div style="grid-column:2;grid-row:2;display:flex;align-items:center;gap:8px;padding:11px 20px 9px">',
  '<div style="position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:11px 20px 9px;background:#fff;border-bottom:1px solid #f0ece5">',
);

swap(
  'timeline joins the same scroll region',
  '<div style="grid-column:2;grid-row:3;min-height:0;overflow-y:auto;padding:4px 20px 12px">',
  '<div style="padding:8px 20px 12px">',
);

swap(
  'close the scroll region and pin the verdict bar',
  '                <div style="grid-column:2;grid-row:4;display:flex;gap:8px;padding:12px 20px;border-top:1px solid #f0ece5;background:#fcfbf9;flex-wrap:wrap">',
  '                </div>\n\n'
  + '                <div style="grid-column:2;grid-row:2;display:flex;gap:8px;padding:12px 20px;border-top:1px solid #f0ece5;background:#fcfbf9;flex-wrap:wrap">',
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Review column is now a single scroll region');
