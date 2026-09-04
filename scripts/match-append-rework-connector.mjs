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

// Match the 追加一次修复 affordance already used in the lifecycle record: a dashed
// connector and a dashed node, so the appendable round reads as part of the timeline
// rather than as a button parked underneath it.
swap(
  'append rework dashed connector',
  '                    <div style="margin:2px 0 4px;padding-left:20px">\n'
  + '                      <div sc-camel-on-click="{{ sheet.pick.appendRework }}" style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border:1px dashed #ddd6cb;border-radius:9px;font-size:13px;color:#8f4029;cursor:pointer" style-hover="border-color:#e0a58f;background:#fdf5f2">＋ 追加返工</div>\n'
  + '                      <div style="margin-top:6px;font-size:12px;color:#9c948b">{{ sheet.pick.appendHint }}</div>\n'
  + '                    </div>',
  '                    <div style="position:relative;border-left:1px dashed #ddd6cb;padding:0 0 4px 20px">\n'
  + '                      <div style="position:absolute;left:-5px;top:3px;width:9px;height:9px;border-radius:50%;background:#fff;border:2px dashed #c1b8ab;box-sizing:border-box"></div>\n'
  + '                      <div sc-camel-on-click="{{ sheet.pick.appendRework }}" style="display:inline-flex;align-items:center;gap:9px;border:1px dashed #d3cabd;background:#fff;border-radius:10px;padding:9px 15px;font-size:13px;color:#6b645d;cursor:pointer" style-hover="border-color:#b1543a;color:#b1543a">\n'
  + '                        <span style="font-size:15px;line-height:1">＋</span>追加返工\n'
  + '                        <span style="font-size:12px;color:#9c948b">{{ sheet.pick.appendHint }}</span>\n'
  + '                      </div>\n'
  + '                    </div>',
);

// Same quota wording as the lifecycle record.
swap(
  'append quota wording',
  "            appendHint: '将新增第 ' + (rn + 1) + ' 轮 · 上限 20 轮',",
  "            appendHint: '已用 ' + rn + ' / 20 轮',",
);

// The last round's connector is transparent, which would leave the dashed node
// floating. Carry the line down whenever a further round can follow.
swap(
  'carry the timeline past the last round',
  "                line: last ? 'transparent' : '#e2dcd2',",
  "                line: (last && !(passed && rn > 0 && rn < 20)) ? 'transparent' : '#e2dcd2',",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Matched the 追加返工 affordance to the lifecycle connector');
