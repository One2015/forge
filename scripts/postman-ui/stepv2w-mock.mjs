// Deterministic child items for the Vision2Web delivery sheet. The aggregate
// counts already exist in the base fixture; these rows make those counts
// inspectable from the sheet instead of leaving the list empty.
export const stepV2WMockScript = `
const ForgeStepV2WMock = {
  rows() {
    const screens = ['数据概览', '用量与费用', '模型监控', '供应商表现', '审核队列', '交付详情', '运行记录', 'Pipeline 编辑', '数据集管理', '成员设置', '登录验证', '通知中心'];
    const variants = ['桌面端', '移动端', '筛选态', '详情态', '空状态', '弹窗态', '加载态'];
    const categories = ['分析看板', '生产工作台', '交付管理', '系统设置'];
    return Array.from({ length: 84 }, (_, i) => {
      const number = String(i + 1).padStart(3, '0');
      const bucket = (i * 37) % 84;
      const status = bucket < 31 ? 'passed' : bucket < 45 ? 'review' : bucket < 50 ? 'failed' : 'pending';
      const active = status === 'pending' && bucket < 52;
      const runId = status === 'pending'
        ? (active ? 'mock-stepv2w-run-active-' + number : '')
        : 'mock-stepv2w-run-' + number;
      return [
        screens[i % screens.length] + ' · ' + variants[Math.floor(i / screens.length) % variants.length],
        'Vision2Web / ' + categories[i % categories.length],
        'mock-stepv2w-item-' + number,
        status,
        status === 'passed' ? 'allen' : status === 'review' ? (i % 2 ? 'allen' : '一万') : '',
        runId,
        'stepv2w'
      ];
    });
  }
};
`;

export const stepV2WMockCopy = [
  [
    '    base.push(...ForgeAnt200Mock.rows());',
    '    base.push(...ForgeAnt200Mock.rows(), ...ForgeStepV2WMock.rows());'
  ],
  [
    "      if (Array.isArray(sheet.entries) || sheet.key === 'ant200') {",
    "      if (Array.isArray(sheet.entries) || sheet.key === 'ant200' || sheet.key === 'stepv2w') {"
  ],
  [
    "      const rows0 = this.sheetRows(d).filter(r => d.key === 'ant200' || r[3] !== 'pending');",
    "      const rows0 = this.sheetRows(d).filter(r => d.key === 'ant200' || d.key === 'stepv2w' || r[3] !== 'pending');"
  ]
];

export function installStepV2WMock(source) {
  let output = source;
  for (const [from, to] of stepV2WMockCopy) {
    if (!output.includes(from)) throw Error('StepV2W mock anchor changed: ' + from.slice(0, 80));
    output = output.replace(from, () => to);
  }
  return output.replace('class Component extends DCLogic {', () => stepV2WMockScript + '\nclass Component extends DCLogic {');
}
