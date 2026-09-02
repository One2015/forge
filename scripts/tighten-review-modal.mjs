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

// 1. 要求返工 becomes the primary CTA and moves to the trailing slot; 通过审核
//    drops to a secondary outline button in the leading slot.
swap(
  'sheet modal review CTAs',
  '<button sc-camel-on-click="{{ sheet.pick.pass }}" style="flex:1 1 130px;height:38px;border:none;background:#4f7a52;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#456b48">通过审核</button>\n                    <button sc-camel-on-click="{{ sheet.pick.rework }}" style="flex:1 1 130px;height:38px;border:1px solid #e0a58f;background:#fff;color:#9a402b;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#fdf5f2">要求返工</button>',
  '<button sc-camel-on-click="{{ sheet.pick.pass }}" style="flex:1 1 130px;height:38px;border:1px solid #a7cfae;background:#fff;color:#3f6b45;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#f2f7f2">通过审核</button>\n                    <button sc-camel-on-click="{{ sheet.pick.rework }}" style="flex:1 1 130px;height:38px;border:none;background:#b1543a;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#95452f">要求返工</button>',
);

// 2a. Drop the "WebGL 预览 1920 × 1080" chrome from the preview pane.
swap(
  'preview WebGL caption',
  '<div style="position:absolute;top:14px;left:54px;display:flex;align-items:center;gap:9px;font-size:12px;color:#d7d3cc;pointer-events:none"><span style="width:7px;height:7px;border-radius:50%;background:#6ac58a"></span>WebGL 预览 <span style="color:#8f8b84">1920 × 1080</span></div>\n                  ',
  '',
);

// 2b. Move the close button out of the preview pane and pin it to the card's top-right,
//     above the info panel, so it never scrolls out of view.
swap(
  'close button removal from preview',
  '<div sc-camel-on-click="{{ sheet.closePick }}" aria-label="关闭 Item 详情" style="position:absolute;top:10px;left:14px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid #e2dcd2;color:#6b645d;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer" style-hover="color:#221f1c">×</div>\n                  ',
  '',
);

swap(
  'close button on info panel',
  '<div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(1500px,calc(100vw - 36px));height:min(920px,calc(100vh - 36px));min-width:0;background:#fff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;box-shadow:0 26px 72px rgba(34,31,28,.26)">',
  '<div sc-camel-on-click="{{ sheet.stopPick }}" style="position:relative;width:min(1500px,calc(100vw - 36px));height:min(920px,calc(100vh - 36px));min-width:0;background:#fff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;box-shadow:0 26px 72px rgba(34,31,28,.26)">\n            <div sc-camel-on-click="{{ sheet.closePick }}" aria-label="关闭 Item 详情" style="position:absolute;top:15px;right:15px;z-index:6;width:28px;height:28px;border-radius:50%;background:#fff;border:1px solid #e2dcd2;color:#6b645d;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer" style-hover="color:#221f1c">×</div>',
);

// 3. 版本关系 loses its legend, tightens up, and hides entirely when it has nothing
//    contextual to add.
swap(
  '版本关系 header',
  '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #f0ece5">\n                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">\n                      <div style="font-size:13px;font-weight:600;color:#3a352f">版本关系</div>\n                      <div style="flex:1"></div>\n                      <div style="font-size:11px;color:#9c948b">当前交付基线 → 返工 → 待审候选</div>\n                    </div>\n                    <div style="padding-left:5px">',
  '<sc-if value="{{ sheet.pick.hasVersionNodes }}" hint-placeholder-val="{{ false }}">\n                  <div style="margin-top:13px;padding-top:12px;border-top:1px solid #f0ece5">\n                    <div style="font-size:12px;color:#9c948b;letter-spacing:.04em;margin-bottom:8px">版本关系</div>\n                    <div style="padding-left:5px">',
);

swap(
  '版本关系 node spacing',
  '<div style="position:relative;border-left:1px solid {{ v.line }};padding:0 0 12px 17px">',
  '<div style="position:relative;border-left:1px solid {{ v.line }};padding:0 0 8px 17px">',
);

swap(
  '版本关系 meta spacing',
  '<div style="margin-top:4px;font-size:12px;color:#8b847c;line-height:1.5">{{ v.meta }}</div>',
  '<div style="margin-top:2px;font-size:12px;color:#8b847c;line-height:1.45">{{ v.meta }}</div>',
);

swap(
  '版本关系 close tag',
  '                      </sc-for>\n                    </div>\n                  </div>\n                </div>\n\n                <div style="grid-column:2;grid-row:2;',
  '                      </sc-for>\n                    </div>\n                  </div>\n                  </sc-if>\n                </div>\n\n                <div style="grid-column:2;grid-row:2;',
);

// 4. The 待审核候选 node repeats the 待审核 tag and the 审核结论 field, and the
//    "尚无版本" fallback is noise. Keep only the baseline and rework context.
swap(
  'versionNodes candidate + fallback',
  "              if (candidate) out.push({ label: candidate.label, badge: '待审核候选', meta: '通过后将替换当前可交付版本', dot: '#c8912f', fg: '#8a5a16', border: '#e0c48c' });\n              if (!out.length) out.push({ label: r[5] ? '当前 Run' : '尚无版本', badge: r[5] ? '当前产物' : '未开始', meta: r[5] || '等待首次运行', dot: r[5] ? '#c8912f' : '#c1b8ab', fg: '#6b645d', border: '#ddd6cb' });\n",
  '',
);

// Hoist versionNodes so the section can ask whether it has anything to show.
const iifeStart = template.indexOf('            versionNodes: (() => {');
const iifeEnd = template.indexOf('            roundSummary:', iifeStart);
if (iifeStart < 0 || iifeEnd < 0) {
  throw new Error('versionNodes property not found');
}
const iife = template
  .slice(iifeStart, iifeEnd)
  .replace('            versionNodes: (() => {', '(() => {')
  .trimEnd()
  .replace(/\)\(\),$/, ')()');

template =
  template.slice(0, iifeStart) +
  '            versionNodes,\n            hasVersionNodes: versionNodes.length > 0,\n' +
  template.slice(iifeEnd);

swap(
  'versionNodes hoist',
  "          const notes = ['首轮：整体结构可用，材质与光照需要重做。', '第二轮：材质已达标，标注层次仍需加强。', '符合预期，可以通过。'];\n          return {",
  `          const notes = ['首轮：整体结构可用，材质与光照需要重做。', '第二轮：材质已达标，标注层次仍需加强。', '符合预期，可以通过。'];\n          const versionNodes = ${iife};\n          return {`,
);

// 5. Every non-final round is a rework by definition, so the 要求返工 tag adds nothing.
//    Only the terminal 已通过 verdict earns a badge.
swap(
  'round badge visibility',
  '<div style="position:relative;border-left:1px solid {{ q.line }};padding:0 0 15px 20px">\n                      <div style="position:absolute;left:-5px;top:4px;width:9px;height:9px;border-radius:50%;background:{{ q.dot }};box-shadow:0 0 0 3px #fff"></div>\n                      <div style="display:flex;align-items:flex-start;gap:11px">\n                        <div style="flex:1;min-width:0">\n                          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">\n                            <div style="font-size:13px;font-weight:600">{{ q.title }}</div>\n                            <div style="font-size:12px;border-radius:6px;padding:1px 8px;border:1px solid {{ q.border }};color:{{ q.fg }};white-space:nowrap">{{ q.badge }}</div>',
  '<div style="position:relative;border-left:1px solid {{ q.line }};padding:0 0 15px 20px">\n                      <div style="position:absolute;left:-5px;top:4px;width:9px;height:9px;border-radius:50%;background:{{ q.dot }};box-shadow:0 0 0 3px #fff"></div>\n                      <div style="display:flex;align-items:flex-start;gap:11px">\n                        <div style="flex:1;min-width:0">\n                          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">\n                            <div style="font-size:13px;font-weight:600">{{ q.title }}</div>\n                            <sc-if value="{{ q.showBadge }}" hint-placeholder-val="{{ false }}"><div style="font-size:12px;border-radius:6px;padding:1px 8px;border:1px solid {{ q.border }};color:{{ q.fg }};white-space:nowrap">{{ q.badge }}</div></sc-if>',
);

swap(
  'round showBadge flag',
  "                title: none ? '尚未审核' : '第 ' + (k + 1) + ' 轮',\n                badge: none ? '未开始' : (ok ? '已通过' : '要求返工'),",
  "                title: none ? '尚未审核' : '第 ' + (k + 1) + ' 轮',\n                badge: none ? '未开始' : (ok ? '已通过' : '要求返工'),\n                showBadge: !none && ok,",
);

// 6. An item with no review rounds shows no placeholder row; the 审核记录 header
//    already reports 尚未审核.
swap(
  'drop placeholder review round',
  'rounds: Array.from({ length: Math.max(1, rn) }).map((_, k) => {',
  'rounds: Array.from({ length: rn }).map((_, k) => {',
);

// 7. A passed Item that has not used up its 20 repair rounds can have one more
//    rework appended. This never rewrites the existing verdict: the 已通过 round
//    stays in history and a new round is added after it.
swap(
  'appended rework state',
  "          const rn = (r[3] === 'pending' || r[3] === 'failed') ? 0 : (passed ? this.roundsOf(r[2]) + 1 : this.roundsOf(r[2]));",
  "          const rn = (r[3] === 'pending' || r[3] === 'failed') ? 0 : (passed ? this.roundsOf(r[2]) + 1 : this.roundsOf(r[2]));\n          const appended = (st.appendedRework || {})[r[2]] || null;",
);

swap(
  'append rework bindings',
  "            rework: e => { e.stopPropagation(); this.setState({ sheetReworkAsk: r[2], sheetReworkText: '' }); },",
  "            rework: e => { e.stopPropagation(); this.setState({ sheetReworkAsk: r[2], sheetReworkText: '', sheetReworkMode: 'review' }); },\n"
  + "            canAppendRework: passed && rn > 0 && rn < 20 && !appended,\n"
  + "            appendHint: '将新增第 ' + (rn + 1) + ' 轮 · 上限 20 轮',\n"
  + "            hasAppendedRound: !!appended,\n"
  + "            appendedTitle: '第 ' + (rn + 1) + ' 轮',\n"
  + "            appendedWho: '一万 · 追加返工',\n"
  + "            appendedNote: appended ? appended.note : '',\n"
  + "            appendRework: e => { e.stopPropagation(); this.setState({ sheetReworkAsk: r[2], sheetReworkText: '', sheetReworkMode: 'append' }); },\n"
  + "            reworkTitle: st.sheetReworkMode === 'append' ? '追加返工' : '要求返工',\n"
  + "            reworkDesc: st.sheetReworkMode === 'append'\n"
  + "              ? '该 Item 已通过审核。追加返工不会撤销已提交的结论，而是在最后一轮之后新增一轮修复。'\n"
  + "              : '说明需要保留、修改和验收的内容。填写并提交本身即为确认，不再增加一次通用弹窗。',",
);

swap(
  'append rework submit branch',
  "              const key = ((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || 'sheet') + ':' + r[2];\n              this.setState({\n                sheetReworkAsk: null, sheetReworkText: '',\n                reviewDecisions:",
  "              const key = ((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || 'sheet') + ':' + r[2];\n"
  + "              if (st.sheetReworkMode === 'append') {\n"
  + "                this.setState({\n"
  + "                  sheetReworkAsk: null, sheetReworkText: '', sheetReworkMode: null,\n"
  + "                  appendedRework: Object.assign({}, st.appendedRework || {}, { [r[2]]: { note, round: rn + 1 } }),\n"
  + "                  repairRuns: Object.assign({}, st.repairRuns || {}, { [key]: { status: 'queued', createdAt: Date.now(), sourceRun: r[5] || null } }),\n"
  + "                  reviewToast: '已追加返工，已创建修复任务；原审核结论保留',\n"
  + "                  reviewToastAt: Date.now()\n"
  + "                });\n"
  + "                return;\n"
  + "              }\n"
  + "              this.setState({\n                sheetReworkAsk: null, sheetReworkText: '', sheetReworkMode: null,\n                reviewDecisions:",
);

// The rework dialog now serves both flows, so its copy follows the mode.
swap(
  'rework dialog title',
  '<div style="font-size:17px;font-weight:600;color:#221f1c">要求返工</div>\n                      <div style="margin-top:8px;font-size:13px;color:#6b645d;line-height:1.7">说明需要保留、修改和验收的内容。填写并提交本身即为确认，不再增加一次通用弹窗。</div>',
  '<div style="font-size:17px;font-weight:600;color:#221f1c">{{ sheet.pick.reworkTitle }}</div>\n                      <div style="margin-top:8px;font-size:13px;color:#6b645d;line-height:1.7">{{ sheet.pick.reworkDesc }}</div>',
);

// Appended round + the trigger, rendered after the review timeline.
swap(
  'append rework timeline UI',
  '                  </sc-for>\n                </div>\n\n                <div style="grid-column:2;grid-row:4;',
  '                  </sc-for>\n'
  + '                  <sc-if value="{{ sheet.pick.hasAppendedRound }}" hint-placeholder-val="{{ false }}">\n'
  + '                    <div style="position:relative;padding:0 0 15px 20px">\n'
  + '                      <div style="position:absolute;left:-5px;top:4px;width:9px;height:9px;border-radius:50%;background:#b1543a;box-shadow:0 0 0 3px #fff"></div>\n'
  + '                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">\n'
  + '                        <div style="font-size:13px;font-weight:600">{{ sheet.pick.appendedTitle }}</div>\n'
  + '                        <div style="font-size:12px;border-radius:6px;padding:1px 8px;border:1px solid #eabaa8;color:#8f4029;white-space:nowrap">追加返工</div>\n'
  + '                      </div>\n'
  + '                      <div style="margin-top:5px;font-size:12px;color:#9c948b">{{ sheet.pick.appendedWho }}</div>\n'
  + '                      <div style="margin-top:6px;font-size:13px;color:#3a352f;line-height:1.7">{{ sheet.pick.appendedNote }}</div>\n'
  + '                    </div>\n'
  + '                  </sc-if>\n'
  + '                  <sc-if value="{{ sheet.pick.canAppendRework }}" hint-placeholder-val="{{ false }}">\n'
  + '                    <div style="margin:2px 0 4px;padding-left:20px">\n'
  + '                      <div sc-camel-on-click="{{ sheet.pick.appendRework }}" style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border:1px dashed #ddd6cb;border-radius:9px;font-size:13px;color:#8f4029;cursor:pointer" style-hover="border-color:#e0a58f;background:#fdf5f2">＋ 追加返工</div>\n'
  + '                      <div style="margin-top:6px;font-size:12px;color:#9c948b">{{ sheet.pick.appendHint }}</div>\n'
  + '                    </div>\n'
  + '                  </sc-if>\n'
  + '                </div>\n\n                <div style="grid-column:2;grid-row:4;',
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Tightened the Item review modal');
