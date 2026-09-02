import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);
assert(start >= 0 && end > start, 'Forge template bundle not found');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const original = template;

const asset = name => fs.readFileSync(new URL(`../assets/phosphor/regular/${name}.svg`, import.meta.url), 'utf8');
const body = name => asset(name).match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1]
  // The handoff's custom-element compiler expects explicit SVG closing tags.
  .replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
const icon = (name, size = 16, style = '') => `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"${style ? ` style="${style}"` : ''}>${body(name)}</svg>`;
const when = (key, content) => `<sc-if value="{{ ${key} }}" hint-placeholder-val="{{ false }}">${content}</sc-if>`;
const replace = (before, after, expected = 1) => {
  assert.equal(template.split(before).length - 1, expected, `Unexpected match count: ${before.slice(0, 100)}`);
  template = template.replaceAll(before, after);
};

if (!template.includes('data-phosphor=')) {
  // Match legacy geometry, not position in the file. Unknown SVGs fail closed.
  const shapes = [
    ['M12 4v10', 'download-simple'], ['M12 5v6.6', 'download-simple'],
    ['<rect x="7" y="5"', 'pause'], ['M5 10.6l3.6 3.6L15 6.6', 'check'],
    ['M6 6l8 8', 'x'], ['M10 3v9', 'download-simple'],
    ['M6 9a6 6', 'bell'], ['<circle cx="10" cy="10" r="8"', 'check-circle'],
    ['M16.5 6.5A7', 'arrow-clockwise'], ['<circle cx="8.5"', 'magnifying-glass'],
    ['M12.5 3.5h4v4', 'arrows-out-simple'], ['M3 4.6L6 7.6', 'caret-down'],
    ['M4.5 4.5l4.2 11', 'cursor'], ['M4 7.5h16', 'list'],
    ['<circle cx="4" cy="3"', 'git-branch'], ['M3.5 5.5h13', 'trash'],
    ['<rect x="1.5" y="1.5"', 'square'], ['M6 12.6l3.8 3.8L18 8', 'check'],
    ['<rect x="3.5" y="5"', 'tray'], ['M7 13.4l4 4 8-8.8', 'check'],
    ['M10 13V3.5', 'upload-simple'], ['<ellipse cx="12"', 'database'],
  ];
  let svgCount = 0;
  template = template.replace(/<svg\b[\s\S]*?<\/svg>/g, svg => {
    const entry = shapes.find(([signature]) => svg.includes(signature));
    assert(entry, `Unknown legacy SVG: ${svg}`);
    const width = Number(svg.match(/width="(\d+)"/)[1]);
    const size = width <= 12 ? 12 : width <= 16 ? 16 : width <= 20 ? 20 : 24;
    const stroke = svg.match(/\bstroke="([^"]+)"/)?.[1];
    svgCount++;
    return icon(entry[1], size, stroke && stroke !== 'currentColor' ? `color:${stroke}` : '');
  });
  assert.equal(svgCount, 37, 'Unexpected number of legacy SVGs');

  // Text-node glyphs only: do not touch dataset multiplication signs, quoted
  // attributes, pipeline diagrams, or application strings in the logic script.
  const scriptAt = template.indexOf('<script type="text/x-dc"');
  let markup = template.slice(0, scriptAt);
  const glyphs = { '↻': 'arrow-clockwise', '→': 'arrow-right', '←': 'arrow-left',
    '↑': 'arrow-up', '↓': 'arrow-down', '↗': 'arrow-up-right', '×': 'x',
    '＋': 'plus', '−': 'minus', '⑂': 'git-branch' };
  markup = markup.replace(/>([^<]+)</g, (match, text) => {
    const keyLegend = /键盘|使用/.test(text);
    return '>' + text.replace(/[↻→←↑↓↗×＋−⑂]/g, glyph => {
      const svg = icon(glyphs[glyph]);
      return keyLegend && /[↑↓]/.test(glyph)
        ? `<span role="img" aria-label="${glyph === '↑' ? '上方向键' : '下方向键'}">${svg}</span>`
        : svg;
    }) + '<';
  });
  template = markup + template.slice(scriptAt);

  // Keep names on the controls, not decorative SVGs; keep all click handlers.
  const labels = { 'sheet.clearQuery': '清除搜索', 'sheet.prev': '上一项',
    'sheet.next': '下一项', 'img.remove': '移除参考图',
    'life.addImage': '添加参考图', closeZoom: '关闭预览' };
  template = template.replace(/<[^>]+sc-camel-on-click="\{\{ ([\w.]+) \}\}"[^>]*>/g, (tag, action) => {
    return labels[action] && !/aria-label=|title=/.test(tag)
      ? tag.replace(/>$/, ` aria-label="${labels[action]}">`) : tag;
  });

  // Dynamic indicators use the existing selection/expansion state.
  replace("chev: open ? '▴' : '▾',", "chevRotation: open ? '180deg' : '0deg',");
  replace('{{ p.chev }}', icon('caret-down', 12, 'transform:rotate({{ p.chevRotation }})'));
  replace("versionChev: st.dsVersions ? '▲' : '▼',", "versionChevRotation: st.dsVersions ? '180deg' : '0deg',");
  replace('{{ ds.versionChev }}', icon('caret-down', 12, 'transform:rotate({{ ds.versionChevRotation }})'));
  for (const [key, count, size] of [['o.mark', 2, 12], ['v.mark', 1, 12], ['n.check', 1, 16], ['it.check', 1, 12]]) {
    replace(`{{ ${key} }}`, when(key, icon('check', size)), count);
  }
  replace("mark: s.done ? '✓' : String(i + 1),", "mark: String(i + 1), markDone: s.done, markPending: !s.done,");
  replace('{{ s.mark }}', when('s.markDone', icon('check')) + when('s.markPending', '{{ s.mark }}'));

  replace("copyLabel: st.copied === i[0] ? '已复制' : '⧉ 复制 ID',",
    "copyLabel: st.copied === i[0] ? '已复制' : '复制 ID',\n            copyDone: st.copied === i[0], copyIdle: st.copied !== i[0],");
  replace('{{ it.copyLabel }}', when('it.copyIdle', icon('copy')) + when('it.copyDone', icon('check')) + ' {{ it.copyLabel }}');

  replace("toggleLabel: canForkNode", "toggleHasChevron: !canForkNode, toggleRotation: open ? '180deg' : '0deg',\n            toggleLabel: canForkNode");
  replace("toggleLabel: open ? '收起 ↑' : '展开 ↓',", "toggleRotation: open ? '180deg' : '0deg',\n                toggleLabel: open ? '收起' : '展开',");
  replace("(open ? '收起 ↑' : '展开 ↓')", "(open ? '收起' : '展开')");
  replace('{{ n.toggleLabel }}', '{{ n.toggleLabel }} ' + when('n.toggleHasChevron', icon('caret-down', 12, 'transform:rotate({{ n.toggleRotation }})')));
  replace('{{ k.toggleLabel }}', '{{ k.toggleLabel }} ' + icon('caret-down', 12, 'transform:rotate({{ k.toggleRotation }})'));

  // Move ornamental arrows out of labels without changing their text or flow.
  template = template.replaceAll("'← 返回", "'返回").replaceAll(" →'", "'");
  for (const key of ['life.trunkLink', 'life.backLabel', 'review.backLabel']) {
    replace(`{{ ${key} }}`, icon('arrow-left') + ` {{ ${key} }}`);
  }
  for (const key of ['n.cta', 'sheet.pick.runLabel', 's.action']) {
    replace(`{{ ${key} }}`, `{{ ${key} }} ` + icon('arrow-right'));
  }
  replace("emptyCta: noRunsAtAll ?", "emptyCtaForward: noRunsAtAll,\n      emptyCta: noRunsAtAll ?");
  replace('{{ runs.emptyCta }}', '{{ runs.emptyCta }}' + when('runs.emptyCtaForward', ' ' + icon('arrow-right')));
  replace("emptyCta: query ? '清除搜索'", "emptyCtaForward: !query,\n        emptyCta: query ? '清除搜索'");
  replace('{{ review.emptyCta }}', '{{ review.emptyCta }}' + when('review.emptyCtaForward', ' ' + icon('arrow-right')));
  replace("runLabel: st.rerollFrom ? '确认 Reroll'", "showRunArrow: !st.rerollFrom && pickedIds.length > 0,\n        runLabel: st.rerollFrom ? '确认 Reroll'");
  replace('{{ ds.runLabel }}', '{{ ds.runLabel }}' + when('ds.showRunArrow', ' ' + icon('arrow-right')), 2);

  replace('</style>', '\n/* Phosphor Regular: geometry comes only from the vendored official assets. */\n.forge-icon{display:inline-block;flex:none;vertical-align:-.16em;pointer-events:none}\n</style>');
} else {
  // Safe to rerun after changing/updating a vendored asset. Never remigrate UI.
  template = template.replace(/(<svg\b[^>]*data-phosphor="([\w-]+)"[^>]*>)[\s\S]*?<\/svg>/g,
    (_, tag, name) => tag + body(name) + '</svg>');
}

// Approval uses a green outline icon on a light success surface. The legacy
// filled badge had a white stroke; carrying that override into Phosphor makes
// the new currentColor geometry almost invisible. Inherit n.iconFg instead.
template = template.replace(/(<sc-if value="{{ n\.isPass }}"[^>]*>\s*<svg\b[^>]*data-phosphor="check-circle"[^>]*?) style="color:#fff"/g, '$1');

// Keep the license with the standalone HTML as well as the source assets.
if (!template.includes('Phosphor Icons license')) {
  const license = fs.readFileSync(new URL('../assets/phosphor/LICENSE', import.meta.url), 'utf8');
  replace('<html><head>', `<html><head>\n<!-- Phosphor Icons license (@phosphor-icons/core 2.1.1)\n${license}\n-->`);
}

const handlers = text => [...text.matchAll(/sc-camel-on-[\w-]+="[^"]+"/g)].map(m => m[0]).sort();
assert.deepEqual(handlers(template), handlers(original), 'Icon migration changed event bindings');
assert(template.includes("sampleTabs: [['good', 'good case'], ['bad', 'bad case']]"), 'Sample label change must be preserved');
const svgs = [...template.matchAll(/<svg\b[^>]*>/g)];
assert(svgs.every(([tag]) => tag.includes('data-phosphor=')), 'Legacy SVG remains in the interface');
const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log(`Phosphor Regular: ${svgs.length} icon placements; event bindings preserved.`);
