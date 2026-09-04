import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = Math.max(
  source.lastIndexOf(close),
  source.lastIndexOf('\n  </script>\n</body>\n</html>')
);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Forge template bundle not found');
}

let template = JSON.parse(source.slice(start + open.length, end).trim());

function replaceOnce(before, after, label) {
  const count = template.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  template = template.replace(before, after);
}

const overview = `<button sc-camel-on-click="{{ goOverview }}" style="padding:6px 11px;border:0;border-radius:8px;cursor:pointer;background:{{ navOverBg }};color:{{ navOverFg }};font-size:14px;font-weight:{{ navOverWeight }}">概览</button>`;
const delivery = `<button sc-camel-on-click="{{ goDelivery }}" style="padding:6px 11px;border:0;border-radius:8px;cursor:pointer;background:{{ navDelBg }};color:{{ navDelFg }};font-size:14px;font-weight:{{ navDelWeight }}">交付</button>`;
const production = `<button sc-camel-on-click="{{ goRuns }}" style="padding:6px 11px;border:0;border-radius:8px;cursor:pointer;background:{{ navTaskBg }};color:{{ navTaskFg }};font-size:14px;font-weight:{{ navTaskWeight }}">生产</button>`;
const review = `<button sc-camel-on-click="{{ goReview }}" style="padding:6px 11px;border:0;border-radius:8px;cursor:pointer;background:{{ navReviewBg }};color:{{ navReviewFg }};font-size:14px;font-weight:{{ navReviewWeight }}">审核</button>`;

replaceOnce(
  [overview, delivery, production, review].join('\n      '),
  [overview, production, review, delivery].join('\n      '),
  'task-oriented navigation order'
);

replaceOnce(
  `title: showingDone ? '审核结果' : (st.reviewOpen ? '专注审核' : '待审核')`,
  `title: showingDone ? '审核结果' : (st.reviewOpen ? '审核工作台' : '审核队列')`,
  'review labels'
);

replaceOnce(
  `{ label: '运行记录', key: 'runs' }`,
  `{ label: '运行任务', key: 'runs' }`,
  'production task label'
);

replaceOnce(
  `一次只审核一条；结论操作仅在检查产物后显示。`,
  `一次只处理一条。预览、审核标准与结论保持在同一工作台。`,
  'focused review guidance'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
const updated = source.slice(0, start + open.length) + '\n' + encoded + close;
fs.writeFileSync(file, updated);
console.log('Applied Forge IA and review-workbench refresh');
