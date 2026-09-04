import fs from 'node:fs';
import './move-navigation-to-sidebar.mjs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const swap = (before, after) => {
  if (template.split(before).length !== 2) throw new Error('Expected one match: ' + before.slice(0, 100));
  template = template.replace(before, () => after);
};
if (!template.includes('// profile-workspace:start')) {
  swap('  componentDidMount() {', read('profile-methods.js') + '\n  componentDidMount() {');
  swap('      sidebar: {', '      profile: this.profileValues(),\n      sidebar: {');
  swap('  componentDidMount() {', `  componentDidMount() {
    // Native popover owns light dismiss, Escape, invoker focus and tab order.
    this._profileToggle = event => this.syncProfilePopover(event);
    document.getElementById('forge-profile-panel')?.addEventListener('toggle', this._profileToggle);`);
  swap('  componentWillUnmount() {', `  componentWillUnmount() {
    document.getElementById('forge-profile-panel')?.removeEventListener('toggle', this._profileToggle);`);
  swap('    this._key = e => {', '    this._key = e => {\n      if (this.state.profileOpen) return;');
  swap('  toggleSidebarUtility(name) {', '  toggleSidebarUtility(name) {\n    this.closeProfile();');
  swap('  navigateFromSidebar(action, event) {', '  navigateFromSidebar(action, event) {\n    this.closeProfile();');
} else template = template.replace(/  \/\/ profile-workspace:start[\s\S]*?  \/\/ profile-workspace:end/, () => read('profile-methods.js'));
if (!template.includes('this._profileViewport =')) {
  swap("    this._profileToggle = event => this.syncProfilePopover(event);", `    this._profileToggle = event => this.syncProfilePopover(event);
    this._profileViewport = () => this.collapseProfileForViewport();
    window.addEventListener('resize', this._profileViewport);`);
  swap("    document.getElementById('forge-profile-panel')?.removeEventListener('toggle', this._profileToggle);", `    document.getElementById('forge-profile-panel')?.removeEventListener('toggle', this._profileToggle);
    window.removeEventListener('resize', this._profileViewport);`);
}
if (template.includes('/* forge-profile:start */')) template = template.replace(/\/\* forge-profile:start \*\/[\s\S]*?\/\* forge-profile:end \*\//, () => read('forge-profile.css'));
else swap('</style>', read('forge-profile.css') + '\n</style>');
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
fs.writeFileSync(file, source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing);
console.log('Updated the Member profile, role-scoped tasks and bound Skills');
