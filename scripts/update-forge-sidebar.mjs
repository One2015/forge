import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const templateFile = new URL('./templates/forge-base.html', import.meta.url);
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const body = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
};

export function updateForgeSidebar(source) {
  const start = source.indexOf(open), end = source.lastIndexOf(close);
  if (start < 0 || end < 0) throw new Error('Missing bundled Forge template');
  let template = JSON.parse(source.slice(start + open.length, end).trim());
  const sidebarSource = fs.readFileSync(new URL('./templates/forge-sidebar.html', import.meta.url), 'utf8');
  const nav = sidebarSource.match(/  <nav class="forge-sidebar-nav"[\s\S]*?  <\/nav>/)?.[0]?.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
  if (!nav) throw new Error('Missing sidebar navigation source');
  const navPattern = /  <nav class="forge-sidebar-nav"[\s\S]*?  <\/nav>/;
  if (!navPattern.test(template)) throw new Error('Missing generated sidebar navigation');
  template = template.replace(navPattern, nav);
  if (!template.includes('goMembers:')) {
    template = template.replace('        goSuppliers:', "        goMembers: () => this.setState({ view: 'members', dlOpen: false, notifOpen: false, profileOpen: false }),\n        membersCurrent: view === 'members' ? 'page' : 'false',\n        goSuppliers:");
    template = template.replace("      isOverview: view === 'overview',", "      isMembers: view === 'members',\n      isOverview: view === 'overview',");
    template = template.replace("view !== 'outsourcing-suppliers' ? 'page'", "view !== 'outsourcing-suppliers' && view !== 'members' ? 'page'");
    template = template.replace("'outsourcing-suppliers', 'pipeedit'", "'outsourcing-suppliers', 'members', 'pipeedit'");
    template = template.replace('</main>', '<sc-if value="{{ isMembers }}"><section class="forge-page" data-forge-members-page><h1>成员管理</h1></section></sc-if>\n</main>');
  }
  const css = fs.readFileSync(new URL('./templates/forge-sidebar.css', import.meta.url), 'utf8').trim();
  const cssPattern = /\/\* forge-sidebar:start \*\/[\s\S]*?\/\* forge-sidebar:end \*\//;
  if (!cssPattern.test(template)) throw new Error('Missing generated sidebar CSS');
  template = template.replace(cssPattern, css);
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = fs.readFileSync(templateFile, 'utf8');
  const result = updateForgeSidebar(source);
  if (source !== result) fs.writeFileSync(templateFile, result);
  console.log('Updated Forge sidebar navigation');
}
