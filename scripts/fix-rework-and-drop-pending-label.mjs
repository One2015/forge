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

// 1. 未开始 is not one of the Item statuses. An associated-but-unrun Item is 待生产,
//    which the status vocabulary already carries. Renaming the palette entry updates
//    both the status pill and the delivery sheet's filter chip.
swap(
  'drop 未开始 item status',
  "        pending: ['#6b645d', '#ddd6cb', '#c1b8ab', '未开始']",
  "        pending: ['#6b645d', '#ddd6cb', '#c1b8ab', '待生产']",
);

// 2. legacyStateOf folds 返工中 into the same 'failed' bucket as a crashed run, which
//    cost reworking Items both their verdict text and their review history. A 返工中
//    Item has been reviewed — it is in rework precisely because a reviewer said so.
swap(
  'reworking verdict',
  "      else if (r[3] === 'failed') verdict = '未产出 · 运行失败';",
  "      else if (r[3] === 'failed') verdict = itemState.businessStatus === 'reworking'\n        ? '第 ' + (rounds - 1) + ' 轮要求返工 · ' + r[4]\n        : '未产出 · 运行失败';",
);

swap(
  'reworking keeps its review rounds',
  "          const rn = (r[3] === 'pending' || r[3] === 'failed') ? 0 : (passed ? this.roundsOf(r[2]) + 1 : this.roundsOf(r[2]));",
  "          const reworking = itemState.businessStatus === 'reworking';\n          const rn = (r[3] === 'pending' || (r[3] === 'failed' && !reworking)) ? 0 : (passed ? this.roundsOf(r[2]) + 1 : this.roundsOf(r[2]));",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Fixed reworking review history and removed the 未开始 status');
