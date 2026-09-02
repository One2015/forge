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

// The preview pane's 查看原始网页 pointed at a mock artifact URL. The way into the
// full case — Pipeline, dataset, run lineage — is the Item ID itself.
swap(
  'remove 查看原始网页',
  '<a href="{{ sheet.pick.previewUrl }}" target="_blank" rel="noopener" sc-camel-on-click="{{ sheet.stopPick }}" style="position:absolute;top:14px;right:16px;font-size:12px;color:#dedad3;white-space:nowrap;text-decoration:none" style-hover="color:#fff">查看原始网页 ↗</a>\n                  ',
  '',
);

swap(
  'Item ID opens the full record',
  "            fields: [\n              { k: 'Item ID', v: r[2] },\n              { k: 'Run ID', v: r[5] || '—' },\n              { k: '目录', v: r[1] },\n              { k: '审核结论', v: r[4] },\n              { k: '业务状态', v: this.statusOf('item', itemState.businessStatus).label },\n              { k: '导出批次', v: passed ? '统一导出（' + d.passed + '）' : '未计入 · 需先通过审核' }\n            ],",
  "            fields: [\n"
  + "              { k: 'Item ID', v: r[2], link: true, plain: false, go: e => { e.stopPropagation(); this.setState({ view: 'itemlife', lifeItem: r[2], lifeRun: r[5], lifeFrom: 'sheet', lifeVerdict: null }); } },\n"
  + "              { k: 'Run ID', v: r[5] || '—', link: false, plain: true },\n"
  + "              { k: '目录', v: r[1], link: false, plain: true },\n"
  + "              { k: '审核结论', v: r[4], link: false, plain: true },\n"
  + "              { k: '业务状态', v: this.statusOf('item', itemState.businessStatus).label, link: false, plain: true },\n"
  + "              { k: '导出批次', v: passed ? '统一导出（' + d.passed + '）' : '未计入 · 需先通过审核', link: false, plain: true }\n"
  + "            ],",
);

swap(
  'Item ID field renders as a link',
  '                      <div style="font-size:12px;color:#9c948b;white-space:nowrap">{{ f.k }}</div>\n                      <div style="font-size:13px;color:#3a352f;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.v }}</div>\n                    </sc-for>',
  '                      <div style="font-size:12px;color:#9c948b;white-space:nowrap">{{ f.k }}</div>\n'
  + '                      <sc-if value="{{ f.link }}" hint-placeholder-val="{{ false }}">\n'
  + '                        <div sc-camel-on-click="{{ f.go }}" title="打开完整记录 · 含 Pipeline 与数据集" style="font-size:13px;color:#b1543a;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" style-hover="color:#8f4029">{{ f.v }} ↗</div>\n'
  + '                      </sc-if>\n'
  + '                      <sc-if value="{{ f.plain }}" hint-placeholder-val="{{ true }}">\n'
  + '                        <div style="font-size:13px;color:#3a352f;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.v }}</div>\n'
  + '                      </sc-if>\n'
  + '                    </sc-for>',
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Item ID now opens the full case record');
