import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const markers = {
  markup: /<!-- overview-summary:start -->[\s\S]*?<!-- overview-summary:end -->/,
  identity: /<!-- overview-delivery-identity:start -->[\s\S]*?<!-- overview-delivery-identity:end -->/,
  css: /\/\* overview-summary:start \*\/[\s\S]*?\/\* overview-summary:end \*\//,
  methods: /  \/\/ overview-summary-methods:start[\s\S]*?  \/\/ overview-summary-methods:end/
};
function icons(html) {
  return html.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
    const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
    const body = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
    return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
  });
}

export function updateOverviewSummary(source) {
  const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(open), end = source.lastIndexOf(close);
  if (start < 0 || end < 0) throw new Error('Missing Forge template');
  let template = JSON.parse(source.slice(start + open.length, end).trim());
  const markup = icons(read('overview-summary.html'));
  if (markers.markup.test(template)) template = template.replace(markers.markup, () => markup);
  else {
    const begin = template.lastIndexOf('<div style="display:grid;', template.indexOf('<sc-for list="{{ over.stats }}"'));
    const finish = template.indexOf('<div style="display:flex;flex-direction:column;gap:14px">', begin);
    if (begin < 0 || finish < 0 || finish - begin > 4000) throw new Error('Overview markup boundaries changed');
    template = template.slice(0, begin) + markup + '\n      ' + template.slice(finish);
  }
  const identity = read('overview-delivery-identity.html');
  if (markers.identity.test(template)) template = template.replace(markers.identity, () => identity);
  else {
    const dot = '<div style="width:6px;height:6px;border-radius:50%;background:{{ r.dot }};flex:none"></div>';
    if (template.split(dot).length !== 2) throw new Error('Overview delivery identity boundary changed');
    template = template.replace(dot, () => identity);
  }
  const css = read('overview-summary.css');
  template = markers.css.test(template) ? template.replace(markers.css, () => css) : template.replace('</style>', () => css + '\n</style>');
  const methods = read('overview-summary-methods.js');
  template = markers.methods.test(template) ? template.replace(markers.methods, () => methods) : template.replace('  pendingQueue() {', () => methods + '\n\n  pendingQueue() {');
  const overview = template.indexOf("if (view === 'overview') {");
  const legacy = template.indexOf('      const runningRuns =', overview);
  const groups = template.indexOf('        groups: [', overview);
  if (legacy !== -1 && legacy < groups) {
    template = template.slice(0, legacy) + `      over = {
        subtitle: '今天的健康度 · ' + runs.length + ' 个运行 · ' + flat.length + ' 张数据单',
        stats: this.overviewSummary(runs, flat),
` + template.slice(groups);
  }
  // Keep the overview's surrounding copy on the same quantity/time basis as the cards.
  const overviewEnd = template.indexOf("    if (view === 'resources') {", overview);
  if (overviewEnd < 0) throw new Error('Overview render boundary changed');
  const render = template.slice(overview, overviewEnd)
    .replace("subtitle: '今天的健康度 · ' + runs.length + ' 个运行 · ' + flat.length + ' 张数据单'", "subtitle: runs.length + ' 个运行记录 · ' + flat.length + ' 张数据单'")
    .replace("right: gap ? '差 ' + gap + ' 条' : '已达标'", "right: gap ? '待补齐 ' + gap + ' 项' : '数量已齐'")
    .replace("dot: gap ? '#c8912f' : '#5f9a63'", 'supplier: this.overviewDeliveryIdentity(d)');
  template = template.slice(0, overview) + render + template.slice(overviewEnd);
  // Loaded in the standalone document as well as in the parent app's iframe.
  if (!template.includes('src="/forge-summary-tooltips.js"')) {
    template = template.replace('</head>', '<script src="/forge-summary-tooltips.js" defer></script>\n</head>');
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateOverviewSummary(source);
  if (source !== result) fs.writeFileSync(file, result);
  console.log('Updated overview summary');
}
