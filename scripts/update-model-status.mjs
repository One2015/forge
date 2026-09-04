import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { updateOverviewSummary } from './update-overview-summary.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
export function updateModelStatus(source) {
  const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(open), end = source.lastIndexOf(close);
  if (start < 0 || end < 0) throw new Error('Missing Forge template');
  let template = JSON.parse(source.slice(start + open.length, end).trim());
  const replace = (pattern, value) => {
    if (!pattern.test(template)) throw new Error('Missing model-status boundary: ' + pattern);
    template = template.replace(pattern, () => value);
  };
  const methods = read('model-status-methods.js').replace('  // model-status-methods:end', () => read('model-status-demo.js') + '\n' + read('model-status-dashboard.js') + '\n  // model-status-methods:end');
  if (template.includes('// model-status-methods:start')) replace(/  \/\/ model-status-methods:start[\s\S]*?  \/\/ model-status-methods:end/, methods);
  else replace(/  pendingQueue\(\) \{/, methods + '\n\n  pendingQueue() {');
  const markup = read('model-status.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
    const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
    const body = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
    return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
  });
  if (template.includes('<!-- model-status:start -->')) replace(/<!-- model-status:start -->[\s\S]*?<!-- model-status:end -->/, markup);
  else replace(/<\/main>/, markup + '\n</main>');
  const css = read('model-status.css');
  if (template.includes('/* model-status:start */')) replace(/\/\* model-status:start \*\/[\s\S]*?\/\* model-status:end \*\//, css);
  else replace(/<\/style>/, css + '\n</style>');
  if (!template.includes('    this.mountModelStatusClock();')) replace(/  componentDidMount\(\) \{/, '  componentDidMount() {\n    this.mountModelStatusClock();');
  if (!template.includes('    this.unmountModelStatusClock();')) replace(/  componentWillUnmount\(\) \{/, '  componentWillUnmount() {\n    this.unmountModelStatusClock();');
  if (!template.includes('      modelStatus: this.modelStatusValues(),')) replace(/      isOverview: view === 'overview',/, "      modelStatus: this.modelStatusValues(),\n      isOverview: view === 'overview',");
  template = template.replace(/(navOver(?:Bg|Fg|Weight): )view === 'overview'/g, "$1(view === 'overview' || view === 'models')")
    .replace("overviewCurrent: view === 'overview' ?", "overviewCurrent: (view === 'overview' || view === 'models') ?")
    .replace("productionCurrent: !onDelivery && !onReview && view !== 'overview' ?", "productionCurrent: !onDelivery && !onReview && view !== 'overview' && view !== 'models' ?")
    .replace(/onDelivery \|\| onReview \|\| view === 'overview'\)/g, "onDelivery || onReview || view === 'overview' || view === 'models')")
    .replace(/(showSubNav: \[[^\]]*)'overview', 'pipeedit'/, "$1'overview', 'models', 'pipeedit'");
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return updateOverviewSummary(source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url), source = fs.readFileSync(file, 'utf8');
  const result = updateModelStatus(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated model status');
}
