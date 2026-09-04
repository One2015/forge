import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
export function updateRouting(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw Error('Missing bundled template');
  let t = JSON.parse(source.slice(start + opening.length, end).trim());
  const replace = (pattern, value) => { if (!pattern.test(t)) throw Error('Missing routing anchor: ' + pattern); t = t.replace(pattern, () => value); };
  if (t.includes('// forge-routing-core:start')) replace(/\/\/ forge-routing-core:start[\s\S]*?\/\/ forge-routing-core:end/, read('routing-core.js'));
  else replace(/class Component extends DCLogic \{/, read('routing-core.js') + '\n\nclass Component extends DCLogic {');
  if (t.includes('// forge-routing-methods:start')) replace(/  \/\/ forge-routing-methods:start[\s\S]*?  \/\/ forge-routing-methods:end/, read('routing-methods.js'));
  else replace(/  componentDidMount\(\) \{/, read('routing-methods.js') + '\n\n  componentDidMount() {');
  if (!t.includes('    this.mountForgeRoutes();')) replace(/    window\.addEventListener\('keydown', this\._key\);/, "    window.addEventListener('keydown', this._key);\n    this.mountForgeRoutes();");
  if (!t.includes('    this.unmountForgeRoutes();')) replace(/  componentWillUnmount\(\) \{/, '  componentWillUnmount() {\n    this.unmountForgeRoutes();');
  if (!t.includes('isRouteError:')) replace(/      isOverview: view === 'overview',/, "      isRouteError: view === 'route-error', routeError: st.routeError || '',\n      isOverview: view === 'overview',");
  t = t.replace('showSubNav: [', "showSubNav: view !== 'route-error' && [");
  t = t.replace('productionCurrent: !onDelivery', "productionCurrent: view !== 'route-error' && !onDelivery");
  // The overview's group header predates semantic section headings.
  if (!t.includes('data-forge-route-section="delivery-progress"')) replace(/<div style="font-size:15px;font-weight:600">\{\{ g\.title \}\}<\/div>/, '<h2 data-forge-route-section="delivery-progress" style="margin:0;font-size:15px;font-weight:600">{{ g.title }}</h2>');
  for (const [title, id] of [['履约进度', 'progress'], ['完整记录', 'history'], ['逐条 Item 状态', 'items'], ['Item 列表', 'items']]) {
    const pattern = new RegExp('<div style="([^"]*)">' + title + '</div>');
    if (pattern.test(t)) t = t.replace(pattern, (_, style) => '<h2 data-forge-route-section="' + id + '" style="margin:0;' + style + '">' + title + '</h2>');
  }
  t = t.replace('const last = list[list.length - 1];\n            return last ? last.pipe', 'const last = list.find(value => value.id === st.activeRun) || list[list.length - 1];\n            return last ? last.pipe');
  if (t.includes('<!-- forge-routing-ui:start -->')) replace(/<!-- forge-routing-ui:start -->[\s\S]*?<!-- forge-routing-ui:end -->/, read('routing.html'));
  else replace(/<main class="forge-main"[^>]*>/, t.match(/<main class="forge-main"[^>]*>/)[0] + '\n' + read('routing.html'));
  if (t.includes('/* forge-routing-style:start */')) replace(/\/\* forge-routing-style:start \*\/[\s\S]*?\/\* forge-routing-style:end \*\//, read('routing.css'));
  else replace(/<\/style>/, read('routing.css') + '\n</style>');
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(t).replaceAll('</script>', '<\\u002Fscript>') + closing;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url), source = fs.readFileSync(file, 'utf8'), next = updateRouting(source);
  if (source !== next) fs.writeFileSync(file, next);
  console.log('Synchronized Forge page, detail, section and history routes.');
}
