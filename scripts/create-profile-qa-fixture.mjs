// Isolated UI fixture; file readers and permission guards are exercised by tests.
// Never linked from the app. Delete generated public/profile-qa-fixture.html after QA.
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const initialization = `
    this.state.profileRoleOverrides = { '一万': 'lead' };
    this.state.profileTab = 'skills';
    this.state.profileSkillDraft = { id: 'qa-upload', owner: '一万', loading: false, error: '', targetSheet: 'ant200', skills: [
      { id: 'qa-trajectory', name: '3D 轨迹评估', command: '3d trajectory', filename: 'trajectory/SKILL.md', sourceFile: 'trajectory.zip', description: '检查镜头轨迹是否连续，并核对模型朝向与遮挡。', content: '# 轨迹检查\\n仅用于独立页面的界面校验，不产生真实评估结果。', size: 128 }
    ] };
`;
if (!template.includes('  componentDidMount() {')) throw new Error('Missing initialization hook');
template = template.replace('  componentDidMount() {', () => '  componentDidMount() {' + initialization);
fs.writeFileSync(new URL('../public/profile-qa-fixture.html', import.meta.url), source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing);
console.log('Created isolated public/profile-qa-fixture.html; remove after browser QA.');
