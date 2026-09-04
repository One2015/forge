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

// 审核结果 was a dense table whose header declared six grid columns but supplied five
// labels, so every label sat one column to the left and the verdict badge appeared
// under 审核人. Rebuilding it as the same card the 待审核 list uses fixes the
// misalignment and makes the two lists read as one component.
const reviewerTone = "const reviewerTone = who => ({ allen: '#8f4029', yokiguan: '#6b645d', cli: '#6a4bb8' }[who] || '#4f7a52');";

swap(
  'reviewer avatar tone helper',
  "      const vPal = {\n        pass: ['#3f6b45', '#a7cfae', '#5f9a63', '通过'],",
  `      ${reviewerTone}\n      const vPal = {\n        pass: ['#3f6b45', '#a7cfae', '#5f9a63', '通过'],`,
);

swap(
  'live result rows carry reviewer identity',
  "            name: shortName(r.meta),\n            id: id,\n            reviewer: me,\n            at: Date.now(),",
  "            name: shortName(r.meta),\n            id: id,\n            reviewer: me,\n            reviewerInitial: String(me).slice(0, 1).toUpperCase(),\n            reviewerBg: reviewerTone(me),\n            reviewerLabel: '由 ' + me + ' 审核',\n            at: Date.now(),",
);

swap(
  'seeded result rows carry reviewer identity',
  "          name: x[0], id: x[1], round: '第 ' + rnd + ' 轮', reviewer: x[4],\n          at: Date.now() - x[5] * 3600000,",
  "          name: x[0], id: x[1], round: '第 ' + rnd + ' 轮', reviewer: x[4],\n          reviewerInitial: String(x[4]).slice(0, 1).toUpperCase(),\n          reviewerBg: reviewerTone(x[4]),\n          reviewerLabel: '由 ' + x[4] + ' 审核',\n          at: Date.now() - x[5] * 3600000,",
);

const OLD_LIST = `        <div style="background:#fff;border:1px solid #e8e2d9;border-radius:14px;overflow:hidden">
          <div style="display:grid;grid-template-columns:56px minmax(0,1.6fr) 78px clamp(96px,11vw,120px) clamp(78px,9vw,96px) clamp(112px,13vw,140px);gap:clamp(9px,1.2vw,14px);padding:10px 18px;background:#faf8f5;border-bottom:1px solid #f0ece5;font-size:12px;color:#8b847c;white-space:nowrap">
            <div>Item</div>
            <div>轮次</div>
            <div>结论</div>
            <div>审核人</div>
            <div style="text-align:right">审核时间</div>
          </div>

          <sc-for list="{{ review.done }}" as="r" hint-placeholder-count="6">
            <div sc-camel-on-click="{{ r.open }}" style="display:grid;grid-template-columns:56px minmax(0,1.6fr) 78px clamp(96px,11vw,120px) clamp(78px,9vw,96px) clamp(112px,13vw,140px);gap:clamp(9px,1.2vw,14px);align-items:center;padding:12px 18px;border-bottom:1px solid #f4f0ea;cursor:pointer" style-hover="background:#fcfbf9">
              <div style="height:38px;border-radius:10px;border:1px solid #e8e2d9;background-color:#f4f1ec;background-image:repeating-linear-gradient(135deg,#eae5dc 0 6px,#f4f1ec 6px 12px)"></div>
              <div style="min-width:0">
                <div style="font-size:14px;color:#221f1c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.name }}</div>
                <div style="margin-top:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#9c948b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.id }}</div>
              </div>
              <div style="font-size:13px;color:#6b645d;white-space:nowrap">{{ r.round }}</div>
              <div>
                <div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:{{ r.fg }};border:1px solid {{ r.border }};border-radius:6px;padding:2px 10px;white-space:nowrap">
                  <div style="width:5px;height:5px;border-radius:50%;background:{{ r.dot }}"></div>{{ r.verdict }}
                </div>
              </div>
              <div style="font-size:13px;color:#3a352f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.reviewer }}</div>
              <div style="font-size:12px;color:#9c948b;text-align:right;white-space:nowrap">{{ r.when }}</div>
            </div>
          </sc-for>

          <sc-if value="{{ review.doneEmpty }}" hint-placeholder-val="{{ false }}">
            <div style="padding:52px 20px;text-align:center">`;

const NEW_LIST = `        <div style="display:flex;flex-direction:column;gap:10px">
          <sc-for list="{{ review.done }}" as="r" hint-placeholder-count="6">
            <div sc-camel-on-click="{{ r.open }}" style="background:#fff;border:1px solid #e8e2d9;border-radius:14px;overflow:hidden;cursor:pointer" style-hover="background:#fcfbf9">
              <div style="display:grid;grid-template-columns:124px minmax(0,1fr) clamp(190px,20vw,220px);gap:clamp(12px,1.6vw,18px);align-items:center;height:122px;padding:14px 16px">
                <div style="height:82px;border-radius:10px;border:1px solid #e8e2d9;background-color:#f4f1ec;background-image:repeating-linear-gradient(135deg,#eae5dc 0 6px,#f4f1ec 6px 12px)"></div>
                <div style="min-width:0;max-height:100%;overflow:hidden;display:flex;flex-direction:column;justify-content:center">
                  <div style="display:flex;align-items:center;gap:7px;flex-wrap:nowrap;min-width:0">
                    <div style="width:19px;height:19px;flex:none;border-radius:50%;background:{{ r.reviewerBg }};color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center">{{ r.reviewerInitial }}</div>
                    <div style="font-size:12px;color:#8b847c;flex:none;white-space:nowrap">{{ r.round }}</div>
                    <div style="width:1px;height:11px;background:#e2dcd2;flex:none"></div>
                    <div style="font-size:12px;color:#6b645d;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.reviewerLabel }}</div>
                  </div>
                  <div style="margin-top:7px;font-size:14px;color:#3a352f;line-height:1.6;text-wrap:pretty;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ r.name }}</div>
                  <div style="margin-top:7px;max-width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#9c948b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.id }}</div>
                </div>
                <div style="display:flex;flex-direction:column;justify-content:center;gap:7px">
                  <div style="display:flex;justify-content:flex-end;min-height:34px;align-items:center">
                    <div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:{{ r.fg }};border:1px solid {{ r.border }};border-radius:6px;padding:3px 10px;white-space:nowrap">
                      <div style="width:5px;height:5px;border-radius:50%;background:{{ r.dot }}"></div>{{ r.verdict }}
                    </div>
                  </div>
                  <div style="font-size:12px;color:#9c948b;text-align:right">{{ r.when }}</div>
                </div>
              </div>
            </div>
          </sc-for>

          <sc-if value="{{ review.doneEmpty }}" hint-placeholder-val="{{ false }}">
            <div style="background:#fff;border:1px solid #e8e2d9;border-radius:14px;padding:52px 20px;text-align:center">`;

swap('审核结果 becomes a card list', OLD_LIST, NEW_LIST);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('审核结果 now uses the 待审核 card');
