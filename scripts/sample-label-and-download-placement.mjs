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

const DOWNLOAD_SVG = '<svg width="13" height="13" sc-camel-view-box="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9"></path><path d="M6.2 8.6L10 12.4l3.8-3.8"></path><path d="M4 15.6h12"></path></svg>';

// 1. The footer is the VERDICT bar. Downloading the artefact is not a verdict, so it leaves
//    the footer and joins the artefact itself, at the top-right of the preview pane.
swap(
  'remove 下载交付物 from the verdict bar',
  '                  <sc-if value="{{ sheet.pick.canExport }}" hint-placeholder-val="{{ false }}">\n'
  + '                    <button style="flex:1 1 130px;height:38px;border:1px solid #a7cfae;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3f6b45;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px" style-hover="background:#f2f7f2">\n'
  + '                      <svg width="15" height="15" sc-camel-view-box="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9"></path><path d="M6.2 8.6L10 12.4l3.8-3.8"></path><path d="M4 15.6h12"></path></svg>下载交付物\n'
  + '                    </button>\n'
  + '                  </sc-if>\n',
  '',
);

swap(
  'download moves onto the preview pane',
  '<div style="position:absolute;bottom:14px;left:16px;display:flex;align-items:center;gap:7px">\n                    <div sc-camel-on-click="{{ sheet.prev }}"',
  '<sc-if value="{{ sheet.pick.canExport }}" hint-placeholder-val="{{ false }}">\n'
  + '                    <div sc-camel-on-click="{{ sheet.stopPick }}" title="下载这一条的交付产物" style="position:absolute;top:14px;right:16px;display:flex;align-items:center;gap:6px;height:28px;padding:0 11px;border-radius:8px;background:rgba(255,255,255,.92);border:1px solid #e2dcd2;color:#3a352f;font-size:12px;cursor:pointer;white-space:nowrap" style-hover="border-color:#b1543a;color:#b1543a">'
  + DOWNLOAD_SVG + '下载交付物</div>\n'
  + '                  </sc-if>\n'
  + '                  <div style="position:absolute;bottom:14px;left:16px;display:flex;align-items:center;gap:7px">\n                    <div sc-camel-on-click="{{ sheet.prev }}"',
);

// 2. good / bad case is a QUALITY ANNOTATION, orthogonal to the review verdict: available in
//    every state, editable after 通过, and deliberately NOT in the verdict bar.
swap(
  'sample label control in the info panel',
  '                    </sc-for>\n                  </div>\n\n                  <sc-if value="{{ sheet.pick.hasVersionNodes }}" hint-placeholder-val="{{ false }}">',
  '                    </sc-for>\n                  </div>\n\n'
  + '                  <div style="margin-top:13px;padding-top:12px;border-top:1px solid #f0ece5">\n'
  + '                    <div style="font-size:12px;color:#9c948b;letter-spacing:.04em;margin-bottom:8px">样本标注</div>\n'
  + '                    <div style="display:inline-flex;gap:2px;background:#f0ece5;border-radius:8px;padding:3px">\n'
  + '                      <sc-for list="{{ sheet.pick.sampleTabs }}" as="s" hint-placeholder-count="3">\n'
  + '                        <div sc-camel-on-click="{{ s.pick }}" style="border-radius:6px;padding:5px 12px;font-size:13px;cursor:pointer;white-space:nowrap;background:{{ s.bg }};color:{{ s.fg }};font-weight:{{ s.weight }};box-shadow:{{ s.shadow }}">{{ s.label }}</div>\n'
  + '                      </sc-for>\n'
  + '                    </div>\n'
  + '                    <div style="margin-top:7px;font-size:12px;color:#9c948b">与审核结论相互独立 · 通过后仍可修改</div>\n'
  + '                  </div>\n\n'
  + '                  <sc-if value="{{ sheet.pick.hasVersionNodes }}" hint-placeholder-val="{{ false }}">',
);

swap(
  'sample label data',
  "            canAppendRework: passed && rn > 0 && rn < 20 && !appended,",
  "            sampleTabs: [['good', 'good case'], ['bad', 'bad case'], ['none', '未标注']].map(x => {\n"
  + "              const cur = (st.sampleLabels || {})[r[2]] || 'none';\n"
  + "              const on = cur === x[0];\n"
  + "              const tone = { good: '#3f6b45', bad: '#8f4029', none: '#3a352f' }[x[0]];\n"
  + "              return {\n"
  + "                label: x[1],\n"
  + "                bg: on ? '#fff' : 'transparent',\n"
  + "                fg: on ? tone : '#8b847c',\n"
  + "                weight: on ? '600' : '400',\n"
  + "                shadow: on ? '0 1px 2px rgba(34,31,28,.08)' : 'none',\n"
  + "                pick: e => {\n"
  + "                  e.stopPropagation();\n"
  + "                  this.setState({ sampleLabels: Object.assign({}, st.sampleLabels || {}, { [r[2]]: x[0] === 'none' ? null : x[0] }) });\n"
  + "                }\n"
  + "              };\n"
  + "            }),\n"
  + "            canAppendRework: passed && rn > 0 && rn < 20 && !appended,",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Verdict bar carries verdicts only; sample label added');
