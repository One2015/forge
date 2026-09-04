import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = Math.max(
  source.lastIndexOf(close),
  source.lastIndexOf('\n  </script>\n</body>\n</html>')
);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Forge template bundle not found');
}

let template = JSON.parse(source.slice(start + open.length, end).trim());

function replaceOnce(before, after, label) {
  const count = template.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  template = template.replace(before, after);
}

replaceOnce(
  '<div style="display:flex;align-items:flex-start;gap:14px">',
  '<div style="display:block">',
  'sheet full-width list'
);

replaceOnce(
  '点击任一子项可在右侧查看产物、审核轮次与交付归属；使用 ↑ ↓ 切换，Esc 关闭，拖动分隔条调整宽度。',
  '点击任一子项打开大窗口查看产物、版本关系与审核记录；使用 ↑ ↓ 切换，Esc 关闭。',
  'sheet guidance'
);

replaceOnce(
  '<div style="width:{{ sheetPanelW }};min-width:360px;flex:none;position:sticky;top:68px;height:max(660px,calc(100vh - 88px));display:flex;align-items:stretch">',
  '<div sc-camel-on-click="{{ sheet.closePick }}" role="dialog" aria-modal="true" aria-label="{{ sheet.pick.name }} Item 详情" style="position:fixed;inset:0;z-index:90;background:rgba(34,31,28,.46);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:18px">',
  'sheet modal overlay'
);

replaceOnce(
  `          <div sc-camel-on-mouse-down="{{ startSheetDrag }}" style="width:9px;flex:none;cursor:col-resize;display:flex;align-items:center;justify-content:center">\n            <div style="width:3px;height:44px;border-radius:2px;background:#ddd6cb"></div>\n          </div>\n\n`,
  '',
  'remove sheet resizer'
);

replaceOnce(
  `<div sc-camel-on-click="{{ sheet.closePick }}" role="dialog" aria-modal="true" aria-label="{{ sheet.pick.name }} Item 详情" style="position:fixed;inset:0;z-index:90;background:rgba(34,31,28,.46);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:18px">\n          <div style="flex:1;min-width:0;display:flex;flex-direction:column;background:#fff;border:1px solid #e8e2d9;border-radius:14px;overflow:hidden">`,
  `<div sc-camel-on-click="{{ sheet.closePick }}" role="dialog" aria-modal="true" aria-label="{{ sheet.pick.name }} Item 详情" style="position:fixed;inset:0;z-index:90;background:rgba(34,31,28,.46);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:18px">\n          <div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(1500px,calc(100vw - 36px));height:min(920px,calc(100vh - 36px));min-width:0;background:#fff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;box-shadow:0 26px 72px rgba(34,31,28,.26)">`,
  'sheet modal panel'
);

replaceOnce(
  `<div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(1500px,calc(100vw - 36px));height:min(920px,calc(100vh - 36px));min-width:0;background:#fff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;box-shadow:0 26px 72px rgba(34,31,28,.26)">\n\n            <sc-if value="{{ sheet.hasPick }}" hint-placeholder-val="{{ false }}">\n              <div style="flex:1;min-height:0;display:flex;flex-direction:column">`,
  `<div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(1500px,calc(100vw - 36px));height:min(920px,calc(100vh - 36px));min-width:0;background:#fff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;box-shadow:0 26px 72px rgba(34,31,28,.26)">\n\n            <sc-if value="{{ sheet.hasPick }}" hint-placeholder-val="{{ false }}">\n              <div style="height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(360px,.8fr);grid-template-rows:auto auto minmax(0,1fr) auto">`,
  'sheet modal grid'
);

replaceOnce(
  '<div style="flex:0 1 176px;min-height:80px;position:relative;border-bottom:1px solid #e8e2d9;background-color:#f4f1ec;background-image:repeating-linear-gradient(135deg,#eae5dc 0 6px,#f4f1ec 6px 12px);display:flex;align-items:center;justify-content:center;border-bottom:1px solid #f0ece5;cursor:pointer">',
  '<div style="grid-column:1;grid-row:1 / 5;min-width:0;min-height:0;position:relative;border-right:1px solid #e8e2d9;background-color:#2b2b28;background-image:radial-gradient(circle at 50% 42%,rgba(90,90,80,.44),rgba(31,31,29,.2) 34%,rgba(24,24,23,.68) 78%),repeating-linear-gradient(135deg,rgba(255,255,255,.025) 0 8px,rgba(255,255,255,0) 8px 16px);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden">',
  'sheet modal preview'
);

replaceOnce(
  '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#8b847c;background:rgba(255,255,255,.9);border:1px solid #e8e2d9;border-radius:6px;padding:6px 11px;pointer-events:none">{{ sheet.pick.previewCaption }}</div>',
  `<div style="position:absolute;top:14px;left:16px;display:flex;align-items:center;gap:9px;font-size:12px;color:#d7d3cc;pointer-events:none"><span style="width:7px;height:7px;border-radius:50%;background:#6ac58a"></span>WebGL 预览 <span style="color:#8f8b84">1920 × 1080</span></div>\n                  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#d7d3cc;background:rgba(28,28,26,.78);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:7px 12px;pointer-events:none">{{ sheet.pick.previewCaption }}</div>`,
  'sheet preview labels'
);

replaceOnce(
  '<div style="position:absolute;bottom:10px;left:12px;display:flex;gap:6px">',
  '<div style="position:absolute;bottom:14px;left:16px;display:flex;align-items:center;gap:7px">',
  'sheet preview navigation position'
);

replaceOnce(
  '<div style="height:26px;display:flex;align-items:center;padding:0 9px;border-radius:8px;background:rgba(255,255,255,.92);border:1px solid #e2dcd2;font-size:12px;color:#8b847c">{{ sheet.posLabel }}</div>',
  '<div style="height:26px;display:flex;align-items:center;padding:0 9px;border-radius:8px;background:rgba(255,255,255,.92);border:1px solid #e2dcd2;font-size:12px;color:#6b645d">{{ sheet.posLabel }}</div><div style="margin-left:3px;font-size:11px;color:#aaa59d">键盘 ↑ ↓ 切换 · Esc 关闭</div>',
  'sheet keyboard hint'
);

replaceOnce(
  '<div style="flex:0 1 auto;min-height:0;overflow-y:auto;padding:15px 18px 14px;border-bottom:1px solid #f0ece5">',
  '<div style="grid-column:2;grid-row:1;min-width:0;max-height:44vh;overflow-y:auto;padding:18px 20px 16px;border-bottom:1px solid #f0ece5">',
  'sheet item metadata placement'
);

replaceOnce(
  `                  </div>\n                </div>\n\n                <div style="flex:none;display:flex;align-items:center;gap:8px;padding:11px 18px 9px">`,
  `                  </div>\n\n                  <div style="margin-top:16px;padding-top:14px;border-top:1px solid #f0ece5">\n                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">\n                      <div style="font-size:13px;font-weight:600;color:#3a352f">版本关系</div>\n                      <div style="flex:1"></div>\n                      <div style="font-size:11px;color:#9c948b">当前交付基线 → 返工 → 待审候选</div>\n                    </div>\n                    <div style="padding-left:5px">\n                      <sc-for list="{{ sheet.pick.versionNodes }}" as="v" hint-placeholder-count="3">\n                        <div style="position:relative;border-left:1px solid {{ v.line }};padding:0 0 12px 17px">\n                          <div style="position:absolute;left:-5px;top:4px;width:9px;height:9px;border-radius:50%;background:{{ v.dot }};box-shadow:0 0 0 3px #fff"></div>\n                          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">\n                            <div style="font-size:13px;font-weight:600;color:#221f1c">{{ v.label }}</div>\n                            <div style="font-size:11px;color:{{ v.fg }};border:1px solid {{ v.border }};border-radius:6px;padding:1px 7px">{{ v.badge }}</div>\n                          </div>\n                          <div style="margin-top:4px;font-size:12px;color:#8b847c;line-height:1.5">{{ v.meta }}</div>\n                        </div>\n                      </sc-for>\n                    </div>\n                  </div>\n                </div>\n\n                <div style="grid-column:2;grid-row:2;display:flex;align-items:center;gap:8px;padding:11px 20px 9px">`,
  'sheet version relationship'
);

replaceOnce(
  '<div style="font-size:12px;color:#9c948b;letter-spacing:.04em">审核轮次</div>',
  '<div style="font-size:12px;color:#9c948b;letter-spacing:.04em">审核记录</div>',
  'sheet review history label'
);

replaceOnce(
  '<div style="flex:1 1 0;min-height:180px;overflow-y:auto;padding:4px 18px 10px">',
  '<div style="grid-column:2;grid-row:3;min-height:0;overflow-y:auto;padding:4px 20px 12px">',
  'sheet review history placement'
);

replaceOnce(
  '<div style="flex:none;display:flex;gap:8px;padding:12px 18px;border-top:1px solid #f0ece5;background:#fcfbf9;flex-wrap:wrap">',
  '<div style="grid-column:2;grid-row:4;display:flex;gap:8px;padding:12px 20px;border-top:1px solid #f0ece5;background:#fcfbf9;flex-wrap:wrap">',
  'sheet modal action bar'
);

replaceOnce(
  `        closePick: e => { e.stopPropagation(); this.setState({ sheetRow: null }); },\n        prev:`,
  `        closePick: e => { e.stopPropagation(); this.setState({ sheetRow: null }); },\n        stopPick: e => e.stopPropagation(),\n        prev:`,
  'sheet modal click handling'
);

replaceOnce(
  `            roundSummary: itemState.hasPendingCandidate`,
  `            versionNodes: (() => {\n              const current = itemState.currentDeliverableVersion || null;\n              const candidate = itemState.candidateVersion || null;\n              const out = [];\n              const currentN = current ? Number(String(current.label || '').replace(/\\D/g, '')) || 0 : 0;\n              const candidateN = candidate ? Number(String(candidate.label || '').replace(/\\D/g, '')) || 0 : 0;\n              if (current) out.push({ label: current.label, badge: '当前可交付', meta: '已通过审核 · 本轮审核基线', dot: '#4f7a52', fg: '#3f6b45', border: '#a7cfae' });\n              if (currentN && candidateN > currentN + 1) {\n                for (let n = currentN + 1; n < candidateN; n++) out.push({ label: 'Run ' + n, badge: '返工版本', meta: '根据上一轮反馈生成', dot: '#b1543a', fg: '#8f4029', border: '#eabaa8' });\n              }\n              if (candidate) out.push({ label: candidate.label, badge: '待审核候选', meta: '通过后将替换当前可交付版本', dot: '#c8912f', fg: '#8a5a16', border: '#e0c48c' });\n              if (!out.length) out.push({ label: r[5] ? '当前 Run' : '尚无版本', badge: r[5] ? '当前产物' : '未开始', meta: r[5] || '等待首次运行', dot: r[5] ? '#c8912f' : '#c1b8ab', fg: '#6b645d', border: '#ddd6cb' });\n              return out.map((v, i) => Object.assign(v, { line: i === out.length - 1 ? 'transparent' : '#ddd6cb' }));\n            })(),\n            roundSummary: itemState.hasPendingCandidate`,
  'sheet version relationship data'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
const updated = source.slice(0, start + open.length) + '\n' + encoded + close;
fs.writeFileSync(file, updated);
console.log('Applied full-width delivery list and large Item detail modal');
