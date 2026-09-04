import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);

if (start < 0 || end < 0 || end <= start) throw new Error('Forge template bundle not found');
let template = JSON.parse(source.slice(start + open.length, end).trim());

function replaceOnce(before, after, label) {
  const count = template.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  template = template.replace(before, after);
}

replaceOnce(
  '            hasRun: !!r[5],\n            needsReview: !!itemState.hasPendingCandidate,',
  '            hasRun: !!r[5] && (passed || rn >= 20),\n            needsReview: !!itemState.hasPendingCandidate,',
  'hide source run action for pending review'
);

replaceOnce(
  `      const decided = st.reviewDecisions || {};`,
  `      const deep = st.deepReview || null;
      if (deep && !rows.some(r => String(r.meta && r.meta[0]) === String(deep.itemId))) {
        const sheetSource = this.sheetRows(null).find(r => String(r[2]) === String(deep.itemId)) || null;
        const fallbackRec = pool.find(r => r.id === deep.runId) || rec || {
          id: deep.runId || st.reviewRun || '—',
          name: (sheetSource ? sheetSource[0] : '当前 Item') + ' · 审核候选',
          subject: sheetSource ? sheetSource[0] : '当前 Item',
          dsName: null, done: 1, failed: 0, h: 1
        };
        const fallbackDs = fallbackRec.dsName ? this.dsData().find(d => d.name === fallbackRec.dsName) : null;
        const fallbackMeta = (fallbackDs && fallbackDs.items.find(m => String(m[0]) === String(deep.itemId))) || [
          String(deep.itemId || ''),
          sheetSource ? sheetSource[0] : '当前 Item',
          'Web3D',
          '',
          sheetSource ? sheetSource[0] : '当前 Item'
        ];
        rows.push({ meta: fallbackMeta, rec: fallbackRec, ds: fallbackDs, key: fallbackRec.id + ':' + fallbackMeta[0], fromDeepLink: true });
      }
      const decided = st.reviewDecisions || {};`,
  'inject deep-linked delivery item into review queue'
);

replaceOnce(
  `      const deep = st.deepReview || null;
      const deepRow = deep ? rows.find(r => String(r.meta && r.meta[0]) === String(deep.itemId) && (!deep.runId || !r.rec || r.rec.id === deep.runId)) : null;`,
  `      const deepRow = deep ? rows.find(r => String(r.meta && r.meta[0]) === String(deep.itemId) && (!deep.runId || !r.rec || r.rec.id === deep.runId)) : null;`,
  'reuse early deep-link context'
);

replaceOnce(
  `(all ? recs.length + ' 个运行 · ' : (rec.subject || rec.name.split(' · ')[0]) + ' · ' + (rec.strategy || '') + ' · ') + pendingN + ' / ' + shown.length + ' 条待处理'`,
  `(all ? recs.length + ' 个运行 · ' : ((rec && (rec.subject || String(rec.name || '').split(' · ')[0])) || '当前 Item') + ' · ' + ((rec && rec.strategy) || '') + ' · ') + pendingN + ' / ' + shown.length + ' 条待处理'`,
  'deep-link subtitle fallback'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Fixed delivery-to-review deep link and removed pending source-run action');
