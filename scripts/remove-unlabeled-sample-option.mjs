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

const swap = (label, before, after) => {
  const count = template.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected 1 match, found ${count}`);
  }
  template = template.replace(before, after);
  console.log(`${label}: updated`);
};

swap(
  'sample label placeholder count',
  '<sc-for list="{{ sheet.pick.sampleTabs }}" as="s" hint-placeholder-count="3">',
  '<sc-for list="{{ sheet.pick.sampleTabs }}" as="s" hint-placeholder-count="2">',
);

swap(
  'sample label options',
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
    + "            }),",
  "            sampleTabs: [['good', 'good case'], ['bad', 'bad case']].map(x => {\n"
    + "              const cur = (st.sampleLabels || {})[r[2]] || 'none';\n"
    + "              const on = cur === x[0];\n"
    + "              const tone = { good: '#3f6b45', bad: '#8f4029' }[x[0]];\n"
    + "              return {\n"
    + "                label: x[1],\n"
    + "                bg: on ? '#fff' : 'transparent',\n"
    + "                fg: on ? tone : '#8b847c',\n"
    + "                weight: on ? '600' : '400',\n"
    + "                shadow: on ? '0 1px 2px rgba(34,31,28,.08)' : 'none',\n"
    + "                pick: e => {\n"
    + "                  e.stopPropagation();\n"
    + "                  this.setState({ sampleLabels: Object.assign({}, st.sampleLabels || {}, { [r[2]]: x[0] }) });\n"
    + "                }\n"
    + "              };\n"
    + "            }),",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Removed the unlabeled sample option');
