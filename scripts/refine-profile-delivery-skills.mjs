import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const replace = (pattern, value) => {
  if (!pattern.test(template)) throw new Error('Missing target: ' + pattern);
  template = template.replace(pattern, () => value);
};
const markup = name => read(name).replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, iconName, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + iconName + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${iconName}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});
replace(/  \/\/ profile-workspace:start[\s\S]*?  \/\/ profile-workspace:end/, read('profile-methods.js'));
replace(/  \/\/ delivery-workflows:start[\s\S]*?  \/\/ delivery-workflows:end/, read('delivery-methods.js'));
replace(/<!-- forge-profile:start -->[\s\S]*?<!-- forge-profile:end -->/, markup('forge-profile.html'));
replace(/\/\* forge-profile:start \*\/[\s\S]*?\/\* forge-profile:end \*\//, read('forge-profile.css'));
template = template.replace("userName: this.props.currentUser || '一万'", "userName: this.profileIdentity().name")
  .replace("userInitial: (this.props.currentUser || '一万').slice(0, 1)", "userInitial: Array.from(this.profileIdentity().name)[0] || ''");
for (const [scope, prefix] of [['review', 'it.skills'], ['sheet', 'sheet.pick.skills']]) {
  replace(new RegExp('<!-- ' + scope + '-skill-session:start -->[\\s\\S]*?<!-- ' + scope + '-skill-session:end -->'),
    `<!-- ${scope}-skill-session:start -->\n` + markup('review-skills.html').replaceAll('skillView.', prefix + '.') + `\n<!-- ${scope}-skill-session:end -->`);
}
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (result !== source) fs.writeFileSync(file, result);
console.log('Updated profile delivery list, personal Skills and conditional evaluation panels');
