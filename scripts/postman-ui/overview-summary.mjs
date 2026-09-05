// Presentation fields and copy; availability and running counts keep their source calculations.
export const overviewSummaryCopy = [
  ["note: source.demo ? '示例账单 · ' + range.start + ' · UTC+8' : source.kind === 'ready' ? range.start + ' · UTC+8' : source.message", "note: source.kind === 'ready' ? '截止至 ' + this.billingDay(start + 86400000) + ' 00:00' : source.message"],
  ["title: '交付进度', count: flat.length", "title: '相关交付进度', count: flat.length"],
  ["rows: flat.map(d => {", "rows: flat.map((d, index) => {"],
  ["supplier: this.overviewDeliveryIdentity(d),\n                go:", "supplier: this.overviewDeliveryIdentity(d),\n                owner: [...new Set(this.deliverySheetMembers(d).filter(member => member.role === 'owner').map(member => member.name || member.accountName).filter(Boolean))].join('、') || '未设置',\n                deliveryDate: (Number.isFinite(d.deliveryInDays) ? d.deliveryInDays : 7 + index * 3) + ' 天后',\n                go:"],
  ["{ k: '运行中', v: running.length, unit: '个任务'", "{ k: '运行中', v: running.length, unit: '个运行'"],
  ["note: running.length ? '正在处理 ' + runningItems + ' 项内容' : '暂无运行中的任务'", "note: running.length ? '共 ' + runningItems + ' 个 Item 处理中' : '暂无运行中的任务'"],
  ["description: '正在生成或修复内容的运行任务（Run）数量。一个任务可以处理多项内容；当前 ' + running.length + ' 个任务正在处理 ' + runningItems + ' 项内容，不含排队和待审核内容。'", "description: 'Run 是一次运行，Item 是运行中的一条内容。一轮运行可以包含多个 Item；当前 ' + running.length + ' 个运行中共有 ' + runningItems + ' 个 Item 正在处理，不含排队和待审核 Item。'"],
  ["{ k: '模型状态', v: model.rate, unit: model.hasRate ? '% 当前可用' : ''", "{ k: '模型状态', v: model.hasRate ? model.available + ' / ' + model.total : '—', unit: ''"],
  ["note: (isDemo ? '示例数据 · ' : '') + model.note, detail: modelDetail, checked: model.checked,", "note: model.hasRate ? '模型可用' : model.note, detail: '', checked: '',"],
  ["'当前可用模型占比 = 已确认可用的模型数 ÷ 生产启用的模型总数，按模型去重，保留 1 位小数。至少一条生产可路由且协议匹配的线路在 ' + model.freshnessLabel + ' 内通过生成验证，模型才计为可用。清单不完整、检测过期或存在未知模型时不显示百分比。100% 可用也可能有线路需处理；延迟、质量和账户状态单独衡量。'", "'显示已确认可用的模型数 / 生产启用的模型总数，按模型去重。至少一条生产可路由且协议匹配的线路在 ' + model.freshnessLabel + ' 内通过生成验证，模型才计为可用。清单不完整、检测过期或存在未知模型时显示说明；线路问题在模型状态页查看。'"]
];
export function refineOverviewSummary(t) {
  const subtitle='<div style="margin-top:7px;font-size:14px;color:var(--forge-muted)">{{ over.subtitle }}</div>';
  if(!t.includes(subtitle))throw Error('Overview subtitle anchor changed');
  t=t.replace(subtitle,'');
  const deliverySection='<div style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;overflow:hidden">';
  if(!t.includes(deliverySection))throw Error('Overview delivery section anchor changed');
  t=t.replace(deliverySection,'<section class="pm-overview-delivery-section" aria-labelledby="forge-overview-delivery-heading">');
  const deliveryHeading='<h2 data-forge-route-section="delivery-progress" style="margin:0;font-size:15px;font-weight:600">{{ g.title }}</h2>';
  if(!t.includes(deliveryHeading))throw Error('Overview delivery heading anchor changed');
  t=t.replace(deliveryHeading,'<h2 id="forge-overview-delivery-heading" data-forge-route-section="delivery-progress" style="margin:0;font-size:15px;font-weight:600">{{ g.title }}</h2>');
  const deliveryCount='<div style="font-size:12px;color:var(--forge-muted)">{{ g.count }}</div>';
  if(!t.includes(deliveryCount))throw Error('Overview delivery count anchor changed');
  t=t.replace(deliveryCount,'');
  const deliverySectionEnd='            </sc-if>\n          </div>\n        </sc-for>';
  if(!t.includes(deliverySectionEnd))throw Error('Overview delivery section end anchor changed');
  t=t.replace(deliverySectionEnd,'            </sc-if>\n          </section>\n        </sc-for>');
  const deliveryLink='<div sc-camel-on-click="{{ g.go }}" style="font-size:13px;color:var(--forge-accent);cursor:pointer;white-space:nowrap">{{ g.linkLabel }}</div>';
  if(!t.includes(deliveryLink))throw Error('Overview delivery link anchor changed');
  t=t.replace(deliveryLink,'');
  const rowsStart=t.indexOf('<sc-for list="{{ g.rows }}"');
  const rowsEnd=t.indexOf('</sc-for>',rowsStart)+'</sc-for>'.length;
  if(rowsStart<0||rowsEnd<rowsStart)throw Error('Overview delivery rows anchor changed');
  let rows=t.slice(rowsStart,rowsEnd)
    .replace('<div sc-camel-on-click="{{ r.go }}"','<div class="pm-overview-delivery-row" sc-camel-on-click="{{ r.go }}"')
    .replace('<div style="flex:1;min-width:0">','<div class="pm-overview-delivery-identity" style="flex:1;min-width:0">')
    .replace('<div style="font-size:12px;color:{{ r.fg }};white-space:nowrap">{{ r.right }}</div>',
      '<div class="pm-overview-delivery-owner"><span class="pm-overview-owner-label">项目负责人</span><span>{{ r.owner }}</span></div>\n                <div class="pm-overview-delivery-date"><span class="pm-overview-delivery-mobile-label">交付日期</span><span>{{ r.deliveryDate }}</span></div>\n                <div class="pm-overview-delivery-status" style="font-size:12px;color:{{ r.fg }};white-space:nowrap">{{ r.right }}</div>');
  const columns='<sc-if value="{{ !g.empty }}"><div class="pm-overview-delivery-columns"><span>数据单</span><span>项目负责人</span><span>交付日期</span><span>交付状态</span></div></sc-if>\n';
  t=t.slice(0,rowsStart)+columns+rows+t.slice(rowsEnd);
  for (const [from,to] of overviewSummaryCopy) {
    if(!t.includes(from))throw Error('Overview summary copy anchor changed: '+from.slice(0,60));
    t=t.replace(from,()=>to);
  }
  return t;
}
