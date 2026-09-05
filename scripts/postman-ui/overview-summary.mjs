// Delivery progress presentation refinements. KPI copy and calculations live in
// the overview templates so the generated runtime has one source of truth.
export const overviewSummaryCopy = [
  ["title: '交付进度', count: flat.length", "title: '相关交付进度', count: flat.length"],
  ["rows: flat.map(d => {", "rows: flat.map((d, index) => {"],
  ["supplier: this.overviewDeliveryIdentity(d),\n                go:", "supplier: this.overviewDeliveryIdentity(d),\n                owner: [...new Set(this.deliverySheetMembers(d).filter(member => member.role === 'owner').map(member => member.name || member.accountName).filter(Boolean))].join('、') || '未设置',\n                deliveryDate: (Number.isFinite(d.deliveryInDays) ? d.deliveryInDays : 7 + index * 3) + ' 天后',\n                go:"],
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
