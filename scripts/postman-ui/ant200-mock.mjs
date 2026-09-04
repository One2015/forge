// A deterministic fixture for the requested 200-Item delivery preview.
// Keep the original six cases and their histories; all additional IDs are visibly mock.
export const ant200MockScript = `
const ForgeAnt200Mock = {
  rows() {
    const subjects = ['江南园林', '皇家宫苑', '徽派民居', '山地寺院', '古城街巷', '滨水楼阁', '岭南院落', '传统书院', '石窟建筑', '闽南宗祠'];
    const features = ['入口牌坊', '主殿屋顶', '回廊转角', '月洞门', '石桥水榭', '庭院假山', '门窗雕饰', '台阶栏杆', '钟鼓楼', '围墙院门', '前庭铺装', '侧院廊亭', '正门门楼', '临水平台', '后院花窗', '八角凉亭', '山墙细部', '中轴庭院', '檐口斗拱', '全景场地'];
    return Array.from({length:194}, (_, i) => {
      const number = String(i + 7).padStart(3, '0');
      const status = i < 153 ? 'passed' : i < 184 ? 'review' : i < 190 ? 'failed' : 'pending';
      return ['Mock ' + number + ' · ' + subjects[i % subjects.length] + ' · ' + features[Math.floor(i / subjects.length)],
        'Web3D / Mock 建筑样本 / ' + subjects[i % subjects.length], 'mock-ant200-item-' + number,
        status, status === 'passed' ? '一万' : '', status === 'pending' ? '' : 'mock-ant200-run-' + number, 'ant200'];
    });
  }
};
`;
export const ant200MockCopy = [
  ["    const sourceRows = Array.isArray(sheet?.entries)", "    base.push(...ForgeAnt200Mock.rows());\n    const sourceRows = Array.isArray(sheet?.entries)"],
  ["      if (Array.isArray(sheet.entries)) {\n        const rows = this.sheetRows(sheet);", "      if (Array.isArray(sheet.entries) || sheet.key === 'ant200') {\n        const rows = this.sheetRows(sheet);"],
  ["      const rows0 = this.sheetRows(d).filter(r => r[3] !== 'pending');", "      const rows0 = this.sheetRows(d).filter(r => d.key === 'ant200' || r[3] !== 'pending');"],
  ["desc: '蚂蚁 Web3D 首批采购 200 条数据；来源：Copula Lab采买200条3d数据-0807.md'", "desc: '蚂蚁 Web3D 首批采购 200 条数据 · Mock 演示：保留 6 条原有案例，补充 194 条建筑样本。'"]
];
export function installAnt200Mock(t) {
  for (const [from, to] of ant200MockCopy) {
    if (!t.includes(from)) throw Error('Ant200 mock anchor changed: ' + from.slice(0, 80));
    t = t.replace(from, () => to);
  }
  return t.replace('class Component extends DCLogic {', () => ant200MockScript + '\nclass Component extends DCLogic {');
}
