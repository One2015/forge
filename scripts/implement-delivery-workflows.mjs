import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing Forge template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const swap = (before, after) => {
  const count = template.split(before).length - 1;
  if (count !== 1) throw new Error('Expected one match, got ' + count + ': ' + before.slice(0, 100));
  template = template.replace(before, () => after);
};
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};
const markup = name => read(name).replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
const block = (marker, value) => {
  const regex = new RegExp('<!-- ' + marker + ':start -->[\\s\\S]*?<!-- ' + marker + ':end -->');
  if (regex.test(template)) template = template.replace(regex, value);
  else swap('</main>', value + '\n</main>');
};

if (!template.includes('// delivery-workflows:start')) {
  swap('  deliveryData() {', '  baseDeliveryData() {');
  swap("    return base.filter(r => !sheet || !sheet.key || r[6] === sheet.key).map(r => {", `    const sourceRows = Array.isArray(sheet?.entries)
      ? base.filter(row => sheet.entries.some(entry => entry.itemId === row[2]))
      : base.filter(row => !sheet || !sheet.key || row[6] === sheet.key);
    return sourceRows.map(r => {`);
  swap('    const delivery = {\n      subtitle:', `    const delivery = {
      create: () => this.openDeliveryEditor(),
      subtitle:`);
  swap('          name: c.customer,', `          name: c.customer,
          logo: c.sheets.find(sheet => sheet.logo)?.logo?.url || '',
          hasLogo: c.sheets.some(sheet => !!sheet.logo), logoAlt: c.customer + ' 品牌 Logo',`);
  swap('        name: d.name, customer: d.customer, desc: d.desc,', `        name: d.name, customer: d.customer, desc: d.desc,
        extras: this.deliverySheetExtras(d), edit: () => this.openDeliveryEditor(d.key),`);
  swap("            feedback: this.feedbackView('sheet:' + r[2]),", `            feedback: this.feedbackView('sheet:' + r[2]),
            skills: this.reviewSkillValues({ itemId: r[2], itemName: r[0], runId: itemState.candidateVersion?.runId || r[5], sheetKey: d.key, scope: 'sheet' }),`);
  swap('            shortName: shortName(meta),', `            shortName: shortName(meta),
            skills: this.reviewSkillValues({ itemId: String(meta[0] || ''), itemName: shortName(meta), runId: rec?.id || '', scope: 'review' }),`);
  swap('      branch: this.branchFormValues(),', '      branch: this.branchFormValues(),\n      deliveryEditor: this.deliveryEditorValues(),');
  swap('    this._key = e => {', `    this._key = e => {
      if (this.state.deliveryEditor) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.saveDeliveryEditor(); }
        return;
      }`);
  swap('  componentDidMount() {', read('delivery-methods.js') + '\n  componentDidMount() {');
} else template = template.replace(/  \/\/ delivery-workflows:start[\s\S]*?  \/\/ delivery-workflows:end/, () => read('delivery-methods.js'));

if (!template.includes('class="forge-delivery-primary forge-delivery-create"')) {
  swap('{{ delivery.subtitle }}</div>\n        </div>\n      </div>', '{{ delivery.subtitle }}</div>\n        </div>\n        <button type="button" class="forge-delivery-primary forge-delivery-create" sc-camel-on-click="{{ delivery.create }}">' + icon('', 'plus', 16) + '<span>创建数据单</span></button>\n      </div>');
}
template = template.replace(/<button (style="[^"]*" style-hover="[^"]*")>编辑数据单<\/button>/, '<button type="button" sc-camel-on-click="{{ sheet.edit }}" $1>编辑数据单</button>');
if (!template.includes('class="forge-delivery-customer-logo"')) {
  swap('<div style="font-size:15px;font-weight:600">{{ c.name }}</div>', '<sc-if value="{{ c.hasLogo }}" hint-placeholder-val="{{ false }}"><img class="forge-delivery-customer-logo" src="{{ c.logo }}" alt="{{ c.logoAlt }}" /></sc-if>\n              <div style="font-size:15px;font-weight:600">{{ c.name }}</div>');
  swap('<h1 style="margin:0;font-size:25px;font-weight:600;letter-spacing:-0.02em">{{ sheet.name }}</h1>', '<sc-if value="{{ sheet.extras.hasLogo }}" hint-placeholder-val="{{ false }}"><img class="forge-delivery-sheet-logo" src="{{ sheet.extras.logo }}" alt="{{ sheet.extras.logoAlt }}" /></sc-if>\n            <h1 style="margin:0;font-size:25px;font-weight:600;letter-spacing:-0.02em">{{ sheet.name }}</h1>');
}
template = template.replace("<div style=\"display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap\">\n              <sc-if value=\"{{ c.hasLogo }}\"", "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap\">\n              <sc-if value=\"{{ c.hasLogo }}\"");
if (template.includes('<!-- delivery-sheet-extras:start -->')) template = template.replace(/<!-- delivery-sheet-extras:start -->[\s\S]*?<!-- delivery-sheet-extras:end -->/, markup('delivery-sheet-extras.html'));
else {
  const marker = '      <div style="background:#fff;border:1px solid var(--forge-border);border-radius:12px;padding:16px 18px;margin-bottom:14px">';
  swap(marker, markup('delivery-sheet-extras.html') + '\n' + marker);
}
for (const [scope, prefix, marker] of [
  ['review', 'it.skills', '      <section class="review-workbench-history">'],
  ['sheet', 'sheet.pick.skills', '                  <div class="forge-sheet-history-heading"']
]) {
  const panel = `<!-- ${scope}-skill-session:start -->\n` + markup('review-skills.html').replaceAll('skillView.', prefix + '.') + `\n<!-- ${scope}-skill-session:end -->`;
  const pattern = new RegExp('<!-- ' + scope + '-skill-session:start -->[\\s\\S]*?<!-- ' + scope + '-skill-session:end -->');
  if (pattern.test(template)) template = template.replace(pattern, panel);
  else if (scope === 'sheet') {
    // Keep the session inside the existing detail scroll, not in a second dialog.
    const position = template.indexOf('<div class="forge-sheet-history-heading"');
    if (position < 0) throw new Error('Missing delivery detail history');
    template = template.slice(0, position) + panel + '\n' + template.slice(position);
  } else swap(marker, panel + '\n' + marker);
}
block('delivery-editor', markup('delivery-editor.html'));
if (template.includes('/* delivery-workflows:start */')) template = template.replace(/\/\* delivery-workflows:start \*\/[\s\S]*?\/\* delivery-workflows:end \*\//, read('delivery-workflows.css'));
else swap('</style>', read('delivery-workflows.css') + '\n</style>');
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
fs.writeFileSync(file, source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing);
console.log('Updated delivery creation, uploads, Tags and scoped review Skill demo');
