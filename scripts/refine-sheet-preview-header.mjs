import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
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
  '<div style="position:absolute;top:14px;left:16px;display:flex;align-items:center;gap:9px;font-size:12px;color:#d7d3cc;pointer-events:none"><span style="width:7px;height:7px;border-radius:50%;background:#6ac58a"></span>WebGL 预览 <span style="color:#8f8b84">1920 × 1080</span></div>',
  '<div style="position:absolute;top:14px;left:54px;display:flex;align-items:center;gap:9px;font-size:12px;color:#d7d3cc;pointer-events:none"><span style="width:7px;height:7px;border-radius:50%;background:#6ac58a"></span>WebGL 预览 <span style="color:#8f8b84">1920 × 1080</span></div>',
  'make room for left close control'
);

replaceOnce(
  '<div sc-camel-on-click="{{ sheet.closePick }}" style="position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid #e2dcd2;color:#6b645d;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer" style-hover="color:#221f1c">×</div>',
  '<div sc-camel-on-click="{{ sheet.closePick }}" aria-label="关闭 Item 详情" style="position:absolute;top:10px;left:14px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid #e2dcd2;color:#6b645d;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer" style-hover="color:#221f1c">×</div>\n                  <a href="{{ sheet.pick.previewUrl }}" target="_blank" rel="noopener" sc-camel-on-click="{{ sheet.stopPick }}" style="position:absolute;top:14px;right:16px;font-size:12px;color:#dedad3;white-space:nowrap;text-decoration:none" style-hover="color:#fff">查看原始网页 ↗</a>',
  'move close left and add original-page link'
);

replaceOnce(
  "            previewCaption: r[0] + ' · ' + (passed ? '最终产物' : '当前产物'),",
  "            previewCaption: r[0] + ' · ' + (passed ? '最终产物' : '当前产物'),\n            previewUrl: '/api/previews/pv2_' + r[2].slice(0, 20) + (itemState.hasPendingCandidate ? '_candidate' : '') + '/dist/index.html',",
  'sheet original preview URL'
);

replaceOnce(
  '            hasRun: !!r[5] && (passed || rn >= 20),\n            needsReview: !!itemState.hasPendingCandidate,',
  '            hasRun: !!r[5] && !itemState.hasPendingCandidate && (passed || rn >= 20),\n            needsReview: !!itemState.hasPendingCandidate,',
  'never show source run for pending review'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Refined delivery preview header and pending action bar');
