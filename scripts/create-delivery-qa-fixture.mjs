// Generates a temporary, isolated UI fixture. Never linked from the application.
// Actual file readers are covered by test-delivery-workflows.mjs; this fixture
// exercises the same editor and review UI with uploaded data already loaded.
import fs from 'node:fs';
import { deflateSync } from 'node:zlib';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
let template = JSON.parse(source.slice(start + opening.length, end).trim());
// Tiny non-brand fixture image (solid green square), generated as a valid PNG.
const crc32 = bytes => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
const chunk = (name, body) => { const type = Buffer.from(name), size = Buffer.alloc(4), crc = Buffer.alloc(4); size.writeUInt32BE(body.length); crc.writeUInt32BE(crc32(Buffer.concat([type, body]))); return Buffer.concat([size, type, body, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
const logo = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from([0, 62, 116, 74]))), chunk('IEND', Buffer.alloc(0))]).toString('base64');
const itemId = '9f2a7c1b5e8d4036a1c4e7b209d6f8a3';
const fixture = {
  key: 'qa-delivery', name: '建筑验收 · 演示数据单', customer: '测试客户', desc: '独立测试页，所有记录仅为测试数据。', target: 3, cat: '自定义', at: 20260902, created: '测试样本',
  logo: { name: 'test-logo.png', url: 'data:image/png;base64,' + logo },
  archive: { name: 'architecture-list.zip', size: 512 },
  tags: [{ id: 'priority', name: '重点验收', color: '#3e744a' }],
  entries: [
    { key: 'one', source: '布达拉宫.glb', name: '布达拉宫', itemId, tagId: 'priority' },
    { key: 'two', source: '天坛.glb', name: '天坛', itemId: '701f39aa8af242e2a322670c1d4b8e95', tagId: '' },
    { key: 'three', source: '客户新模型.glb', name: '客户新模型.glb', itemId: '', tagId: '' }
  ],
  skills: [
    { id: 'trajectory', name: '3d trajectory', command: '3d trajectory', description: '检查相机路径、模型朝向与遮挡。', filename: 'trajectory/SKILL.md', sourceFile: 'review-skills.zip', size: 120, content: '---\nname: 3d trajectory\ndescription: 检查模型轨迹\n---\n# 轨迹检查\n\n核对相机路径是否连续，检查模型朝向与遮挡。\n此文件仅用于验证 Skill 加载演示，不代表真实评估结果。' },
    { id: 'material', name: 'material quality', command: 'material quality', description: '检查屋顶材质、贴图接缝和细节。', filename: 'material-quality.md', sourceFile: 'material-quality.md', size: 90, content: '# 材质检查\n\n核对屋顶材质、贴图接缝与细节完整性。\n这是独立测试样本。' }
  ]
};
const initialization = `
    this.state.deliverySheets = [${JSON.stringify(fixture)}];
    this.state.view = 'sheet'; this.state.sheetKey = 'qa-delivery';
    this.state.sidebarOpen = false;
    this.state.deliverySheets[0].archive.file = new Blob(['isolated test fixture']);
`;
template = template.replace('  componentDidMount() {', () => '  componentDidMount() {' + initialization);
const target = new URL('../public/delivery-qa-fixture.html', import.meta.url);
fs.writeFileSync(target, source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing);
console.log('Created isolated public/delivery-qa-fixture.html; remove after browser QA.');
