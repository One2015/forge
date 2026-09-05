import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { updateOverviewSummary } from './update-overview-summary.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
export function updateBilling(source) {
  const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(open), end = source.lastIndexOf(close);
  if (start < 0 || end < 0) throw new Error('Missing Forge template');
  let template = JSON.parse(source.slice(start + open.length, end).trim());
  const replace = (pattern, value) => {
    if (!pattern.test(template)) throw new Error('Missing billing boundary: ' + pattern);
    template = template.replace(pattern, () => value);
  };
  const methods = read('billing-methods.js');
  if (template.includes('// billing-methods:start')) replace(/  \/\/ billing-methods:start[\s\S]*?  \/\/ billing-methods:end/, methods);
  else replace(/  pendingQueue\(\) \{/, methods + '\n\n  pendingQueue() {');
  const markup = read('billing.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
    const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
    const body = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
    return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
  });
  if (template.includes('<!-- billing:start -->')) replace(/<!-- billing:start -->[\s\S]*?<!-- billing:end -->/, markup);
  else replace(/<\/main>/, markup + '\n</main>');
  const css = read('billing.css');
  if (template.includes('/* billing:start */')) replace(/\/\* billing:start \*\/[\s\S]*?\/\* billing:end \*\//, css);
  else replace(/<\/style>/, css + '\n</style>');
  if (!template.includes('      billing: this.billingValues(),')) replace(/      isOverview: view === 'overview',/, "      billing: this.billingValues(),\n      isOverview: view === 'overview',");
  template = template.replace("    const subs = this.state.submittedRuns || [];\n    const billingRuns = this.billingRunRecords();\n    return subs.slice().reverse().concat(billingRuns, [",
    "    const subs = this.state.submittedRuns || [];\n    return subs.slice().reverse().concat([");
  template = template.replace(
    "    if (view === 'review') {\n      const pool = this.runsData().concat(this.billingRunRecords());",
    "    if (view === 'review') {\n      const pool = this.runsData();"
  );
  const plainRunPool = "    let run = null;\n    if (view === 'run') {\n      const pool = this.runsData();";
  const billingRunPool = "    let run = null;\n    if (view === 'run') {\n      const pool = this.runsData().concat(this.billingRunRecords());";
  if (template.includes(plainRunPool)) template = template.replace(plainRunPool, billingRunPool);
  else if (!template.includes(billingRunPool)) throw new Error('Missing billing run detail pool');
  if (!template.includes("rec.itemCosts?.[k] || (state === 'queued'")) {
    replace(/: \(state === 'queued' \|\| state === 'cancelled' \? '—' : '\\u0024' \+ \(state === 'success'/,
      ": (rec.itemCosts?.[k] || (state === 'queued' || state === 'cancelled' ? '—' : '\\u0024' + (state === 'success'");
    template = template.replace("(12.4 + k * 2.6).toFixed(2)));\n            const elapsed", "(12.4 + k * 2.6).toFixed(2))));\n            const elapsed");
  }
  template = template.replaceAll("view === 'overview' || view === 'models')", "view === 'overview' || view === 'models' || view === 'billing')")
    .replace("view !== 'overview' && view !== 'models' ?", "view !== 'overview' && view !== 'models' && view !== 'billing' ?")
    .replace("'overview', 'models', 'pipeedit'].indexOf(view)", "'overview', 'models', 'billing', 'pipeedit'].indexOf(view)");
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return updateOverviewSummary(source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url), source = fs.readFileSync(file, 'utf8');
  const result = updateBilling(source);
  if (source !== result) fs.writeFileSync(file, result);
  console.log('Updated billing analytics');
}
