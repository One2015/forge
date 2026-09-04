import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
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

// ── 1. Every historical round becomes a branch point ────────────────────────────
// "从某个历史版本直接继续迭代" — the same affordance Postman/v0/Zeplin put on a version.
swap(
  'branch action on each round',
  '                          <div style="margin-top:5px;font-size:12px;color:#8b847c;line-height:1.65">{{ q.who }}</div>',
  '                          <div style="margin-top:5px;font-size:12px;color:#8b847c;line-height:1.65">{{ q.who }}</div>\n'
  + '                          <div sc-camel-on-click="{{ q.branch }}" title="以这一轮的产物为起点，创建一条独立迭代的分支" style="margin-top:7px;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border:1px solid #e8e2d9;background:#fff;border-radius:8px;font-size:12px;color:#6b645d;cursor:pointer;white-space:nowrap" style-hover="border-color:#b1543a;color:#b1543a">⑂ 从这一版分支</div>',
);

// ── 2. Branch tree under the Item, PlanetScale-style ────────────────────────────
swap(
  'branch tree in the info panel',
  '                    <div style="margin-top:7px;font-size:12px;color:#9c948b">与审核结论相互独立 · 通过后仍可修改</div>\n                  </div>',
  '                    <div style="margin-top:7px;font-size:12px;color:#9c948b">与审核结论相互独立 · 通过后仍可修改</div>\n                  </div>\n\n'
  + '                  <sc-if value="{{ sheet.pick.hasBranches }}" hint-placeholder-val="{{ false }}">\n'
  + '                  <div style="margin-top:13px;padding-top:12px;border-top:1px solid #f0ece5">\n'
  + '                    <div style="font-size:12px;color:#9c948b;letter-spacing:.04em;margin-bottom:8px">分支关系</div>\n'
  + '                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:2px">\n'
  + '                      <div style="font-size:13px;font-weight:600;color:#221f1c">{{ sheet.pick.name }}</div>\n'
  + '                      <div style="font-size:11px;color:#3f6b45;border:1px solid #a7cfae;border-radius:6px;padding:1px 7px;white-space:nowrap">主版本</div>\n'
  + '                    </div>\n'
  + '                    <sc-for list="{{ sheet.pick.branches }}" as="b" hint-placeholder-count="1">\n'
  + '                      <div style="position:relative;margin-left:4px;padding:6px 0 6px 18px;border-left:1px solid #ddd6cb">\n'
  + '                        <div style="position:absolute;left:0;top:17px;width:12px;height:1px;background:#ddd6cb"></div>\n'
  + '                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">\n'
  + '                          <div style="font-size:13px;color:#221f1c">{{ b.name }}</div>\n'
  + '                          <div style="font-size:11px;color:#8a5a16;border:1px solid #e0c48c;border-radius:6px;padding:1px 7px;white-space:nowrap">{{ b.state }}</div>\n'
  + '                        </div>\n'
  + '                        <div style="margin-top:3px;font-size:12px;color:#8b847c;line-height:1.5">{{ b.meta }}</div>\n'
  + '                        <div style="margin-top:4px;font-size:12px;color:#3a352f;line-height:1.6;overflow-wrap:anywhere">{{ b.note }}</div>\n'
  + '                      </div>\n'
  + '                    </sc-for>\n'
  + '                    <div style="margin-top:8px;font-size:12px;color:#9c948b">分支与主版本共享同一个交付位 · 不额外计入目标数</div>\n'
  + '                  </div>\n'
  + '                  </sc-if>',
);

// ── 3. Create-branch dialog: state what carries over, then let the rest be chosen ─
swap(
  'branch dialog',
  '                <sc-if value="{{ sheet.pick.passConfirmOpen }}" hint-placeholder-val="{{ false }}">',
  '                <sc-if value="{{ sheet.pick.branchAskOpen }}" hint-placeholder-val="{{ false }}">\n'
  + '                  <div sc-camel-on-click="{{ sheet.pick.cancelBranch }}" style="position:fixed;inset:0;z-index:110;background:rgba(34,31,28,.38);display:flex;align-items:center;justify-content:center;padding:24px">\n'
  + '                    <div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(560px,100%);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(34,31,28,.24);padding:26px clamp(20px,3vw,30px)">\n'
  + '                      <div style="font-size:17px;font-weight:600;color:#221f1c">从这一版创建分支</div>\n'
  + '                      <div style="margin-top:8px;font-size:13px;color:#6b645d;line-height:1.7">分支会复制该版本的产物与配置，独立迭代。<strong>原 Item 的审核结论不受影响</strong>，分支产物需要重新审核。</div>\n'
  + '                      <div style="margin-top:16px;border:1px solid #ece7df;background:#fcfbf9;border-radius:10px;padding:12px 14px;display:grid;grid-template-columns:64px minmax(0,1fr);gap:7px 12px">\n'
  + '                        <div style="font-size:11px;color:#9c948b">分支起点</div><div style="font-size:13px;color:#3a352f;overflow-wrap:anywhere">{{ sheet.pick.branchFrom }}</div>\n'
  + '                      </div>\n'
  + '                      <div style="margin-top:16px;font-size:12px;color:#9c948b">分支名称</div>\n'
  + '                      <input sc-camel-on-change="{{ sheet.pick.onBranchName }}" value="{{ sheet.pick.branchName }}" style="width:100%;box-sizing:border-box;margin-top:5px;height:38px;border:1px solid #ddd6cb;border-radius:10px;padding:0 12px;font-size:13px;color:#221f1c" />\n'
  + '                      <div style="margin-top:4px;font-size:12px;color:#9c948b">用于和原 Item 区分；Item ID 保持不变，血缘记录在分支关系里。</div>\n'
  + '                      <div style="margin-top:14px;font-size:12px;color:#9c948b">这条分支要改什么 <span style="color:#8f4029">必填</span></div>\n'
  + '                      <textarea sc-camel-on-change="{{ sheet.pick.onBranchNote }}" value="{{ sheet.pick.branchNote }}" placeholder="例如：保留结构，改走夜景光照方向，验收看默认视角下的层次。" style="width:100%;box-sizing:border-box;margin-top:5px;min-height:84px;resize:vertical;border:1px solid #ddd6cb;border-radius:10px;padding:10px 12px;font-size:13px;color:#221f1c;line-height:1.65"></textarea>\n'
  + '                      <div style="margin-top:4px;font-size:12px;color:#9c948b">会作为这条分支第 1 轮的输入。</div>\n'
  + '                      <div style="margin-top:16px;border-top:1px solid #f0ece5;padding-top:14px;font-size:12px;color:#9c948b">一并沿用</div>\n'
  + '                      <div style="margin-top:7px;font-size:13px;color:#3a352f;line-height:1.9">· Pipeline 与版本 <span style="color:#8b847c">{{ sheet.pick.branchPipe }}</span><br>· 数据集 <span style="color:#8b847c">{{ sheet.pick.branchDs }}</span><br>· 审核历史仅作参考，<span style="color:#8f4029">不继承审核结论</span></div>\n'
  + '                      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:9px">\n'
  + '                        <button sc-camel-on-click="{{ sheet.pick.cancelBranch }}" style="height:38px;border:1px solid #ddd6cb;background:#fff;border-radius:10px;padding:0 18px;font-size:13px;color:#6b645d;cursor:pointer">取消</button>\n'
  + '                        <sc-if value="{{ sheet.pick.canCreateBranch }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ sheet.pick.createBranch }}" style="height:38px;border:none;background:#b1543a;color:#fff;border-radius:10px;padding:0 20px;font-size:13px;font-weight:600;cursor:pointer">⑂ 创建分支</button></sc-if>\n'
  + '                        <sc-if value="{{ sheet.pick.cannotCreateBranch }}" hint-placeholder-val="{{ true }}"><button disabled style="height:38px;border:none;background:#d9d3ca;color:#fff;border-radius:10px;padding:0 20px;font-size:13px;font-weight:600;cursor:not-allowed">⑂ 创建分支</button></sc-if>\n'
  + '                      </div>\n'
  + '                    </div>\n'
  + '                  </div>\n'
  + '                </sc-if>\n\n'
  + '                <sc-if value="{{ sheet.pick.passConfirmOpen }}" hint-placeholder-val="{{ false }}">',
);

// ── 4. Data ─────────────────────────────────────────────────────────────────────
swap(
  'branch data on the pick',
  "            sampleTabs: [['good', 'good case'], ['bad', 'bad case'], ['none', '未标注']].map(x => {",
  "            branches: ((st.branches || {})[r[2]] || []).map(b => ({\n"
  + "              name: b.name,\n"
  + "              state: b.state,\n"
  + "              meta: '基于 ' + b.from + ' · ' + b.at,\n"
  + "              note: b.note\n"
  + "            })),\n"
  + "            hasBranches: (((st.branches || {})[r[2]] || []).length > 0),\n"
  + "            branchAskOpen: !!(st.branchAsk && st.branchAsk.item === r[2]),\n"
  + "            branchFrom: (st.branchAsk && st.branchAsk.label) || '',\n"
  + "            branchPipe: 'web3d-gen-build-eval-v3 v7',\n"
  + "            branchDs: 'web3d-china-landmarks-v2',\n"
  + "            branchName: st.branchName || '',\n"
  + "            branchNote: st.branchNote || '',\n"
  + "            onBranchName: e => this.setState({ branchName: e.target.value }),\n"
  + "            onBranchNote: e => this.setState({ branchNote: e.target.value }),\n"
  + "            canCreateBranch: !!String(st.branchName || '').trim() && !!String(st.branchNote || '').trim(),\n"
  + "            cannotCreateBranch: !String(st.branchName || '').trim() || !String(st.branchNote || '').trim(),\n"
  + "            cancelBranch: e => { if (e) e.stopPropagation(); this.setState({ branchAsk: null, branchName: '', branchNote: '' }); },\n"
  + "            createBranch: e => {\n"
  + "              if (e) e.stopPropagation();\n"
  + "              const nm = String(st.branchName || '').trim();\n"
  + "              const nt = String(st.branchNote || '').trim();\n"
  + "              if (!nm || !nt) return;\n"
  + "              const list = (st.branches || {})[r[2]] || [];\n"
  + "              this.setState({\n"
  + "                branchAsk: null, branchName: '', branchNote: '',\n"
  + "                branches: Object.assign({}, st.branches || {}, {\n"
  + "                  [r[2]]: list.concat([{ name: nm, note: nt, from: (st.branchAsk && st.branchAsk.label) || '当前版本', at: '刚刚', state: '待生产' }])\n"
  + "                }),\n"
  + "                reviewToast: '已创建分支「' + nm + '」· 与主版本共享同一个交付位',\n"
  + "                reviewToastAt: Date.now()\n"
  + "              });\n"
  + "            },\n"
  + "            sampleTabs: [['good', 'good case'], ['bad', 'bad case'], ['none', '未标注']].map(x => {",
);

swap(
  'branch handler on each round',
  "                toggleNote: e => {\n                  e.stopPropagation();\n                  const nk = r[2] + ':s' + k;",
  "                branch: e => {\n"
  + "                  e.stopPropagation();\n"
  + "                  const n = ((st.branches || {})[r[2]] || []).length + 2;\n"
  + "                  this.setState({\n"
  + "                    branchAsk: { item: r[2], label: '第 ' + (k + 1) + ' 轮 · ' + (r[5] || '当前 Run') },\n"
  + "                    branchName: r[0] + ' · 分支 ' + n,\n"
  + "                    branchNote: ''\n"
  + "                  });\n"
  + "                },\n"
  + "                toggleNote: e => {\n                  e.stopPropagation();\n                  const nk = r[2] + ':s' + k;",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Branch-from-version added');
