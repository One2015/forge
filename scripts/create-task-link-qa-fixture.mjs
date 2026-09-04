// Isolated, temporary data only. Never link this fixture from the product.
import fs from 'node:fs';
const raw = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const at = raw.indexOf(opening), end = raw.lastIndexOf(closing);
let template = JSON.parse(raw.slice(at + opening.length, end).trim());
const init = `
    const qaItem = 'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f';
    const qaRun = { id: 'qa-branch-final', name: '长城 · 分支 A（测试）', subject: '长城 · 分支 A（测试）', pipe: 'web3d-gen-build-eval-v3', ver: 'v7', dsName: 'web3d-china-landmarks-v2', n: 1, done: 1, running: 0, failed: 0, status: 'success', itemIds: [qaItem], branchSource: { item: qaItem }, artifactVersion: 'Run 3' };
    this.state.submittedRuns = [qaRun];
    this.state.reviewDecisions = { ['qa-branch-final:' + qaItem]: 'pass' };
    this.state.view = 'run'; this.state.activeRun = qaRun.id;
`;
template = template.replace('  componentDidMount() {', () => '  componentDidMount() {' + init);
fs.writeFileSync(new URL('../public/task-link-qa-fixture.html', import.meta.url), raw.slice(0, at + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing);
console.log('Created isolated task-link-qa-fixture.html; remove after verification.');
