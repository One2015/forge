import {phosphorIcon} from './phosphor-icons.mjs';

// Delivery progress presentation refinements. KPI copy and calculations live in
// the overview templates so the generated runtime has one source of truth.
const deliverySortIcon = '<span class="pm-overview-delivery-sort-icons" aria-hidden="true">' +
  ['arrow-up', 'arrow-down'].map(name => phosphorIcon(name,12,{className:`pm-overview-delivery-sort-icon pm-overview-delivery-sort-icon-${name === 'arrow-up' ? 'ascending' : 'descending'}`})).join('') +
  '</span>';

export const overviewSummaryCopy = [
  ["      over = {\n        subtitle:", "      const deliveryOwners = sheet => { const names = [...new Set(this.deliverySheetMembers(sheet).filter(member => member.role === 'owner').map(member => member.name || member.accountName).filter(Boolean))]; return names.length ? names : ['未设置']; };\n      const deliveryOwnerOptions = [...new Set(flat.flatMap(deliveryOwners))];\n      over = {\n        subtitle:"],
  ["title: '交付进度', count: flat.length", "title: '相关交付进度', count: flat.length"],
  ["go: () => this.setState({ view: 'delivery' }),\n            rows:", "go: () => this.setState({ view: 'delivery' }),\n            ownerFilter: st.overviewDeliveryOwner || '',\n            ownerOptions: deliveryOwnerOptions.map(name => ({ name, selected: name === st.overviewDeliveryOwner })),\n            onOwner: event => this.setState({ overviewDeliveryOwner: event.target.value }),\n            noOwnerMatches: !!st.overviewDeliveryOwner && !flat.some(sheet => deliveryOwners(sheet).includes(st.overviewDeliveryOwner)),\n            sortAria: st.overviewDeliverySort === 'latest' ? 'descending' : 'ascending',\n            sortDirection: st.overviewDeliverySort === 'latest' ? 'descending' : 'ascending',\n            sortLabel: st.overviewDeliverySort === 'latest' ? '最晚优先' : '最近优先',\n            sortActionLabel: st.overviewDeliverySort === 'latest' ? '交付日期，当前最晚优先，点击切换为最近优先' : '交付日期，当前最近优先，点击切换为最晚优先',\n            toggleSort: () => this.setState({ overviewDeliverySort: st.overviewDeliverySort === 'latest' ? 'soonest' : 'latest' }),\n            rows:"],
  ["rows: flat.map(d => {", "rows: flat.map((d, index) => {"],
  ["supplier: this.overviewDeliveryIdentity(d),\n                go:", "supplier: this.overviewDeliveryIdentity(d),\n                owners: deliveryOwners(d),\n                owner: deliveryOwners(d).join('、'),\n                deliveryDays: Number.isFinite(d.deliveryInDays) ? d.deliveryInDays : 7 + index * 3,\n                deliveryOrder: index,\n                deliveryDate: (Number.isFinite(d.deliveryInDays) ? d.deliveryInDays : 7 + index * 3) + ' 天后',\n                go:"],
  ["            }),\n            empty: flat.length === 0", "            }).filter(row => !st.overviewDeliveryOwner || row.owners.includes(st.overviewDeliveryOwner)).sort((a, b) => st.overviewDeliverySort === 'latest' ? b.deliveryDays - a.deliveryDays || a.deliveryOrder - b.deliveryOrder : a.deliveryDays - b.deliveryDays || a.deliveryOrder - b.deliveryOrder),\n            empty: flat.length === 0"],
];
export function refineOverviewSummary(t) {
  const subtitle='<div style="margin-top:7px;font-size:14px;color:var(--forge-muted)">{{ over.subtitle }}</div>';
  if(!t.includes(subtitle))throw Error('Overview subtitle anchor changed');
  t=t.replace(subtitle,'');
  const deliverySection='<div style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;overflow:hidden">';
  if(!t.includes(deliverySection))throw Error('Overview delivery section anchor changed');
  t=t.replace(deliverySection,'<section class="pm-overview-delivery-section" aria-labelledby="forge-overview-delivery-heading">');
  const deliveryHeading=`            <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--forge-border)">
              <h2 data-forge-route-section="delivery-progress" style="margin:0;font-size:15px;font-weight:600">{{ g.title }}</h2>
              <div style="font-size:12px;color:var(--forge-muted)">{{ g.count }}</div>
              <div style="flex:1"></div>
              <div sc-camel-on-click="{{ g.go }}" style="font-size:13px;color:var(--forge-accent);cursor:pointer;white-space:nowrap">{{ g.linkLabel }}</div>
            </div>`;
  if(!t.includes(deliveryHeading))throw Error('Overview delivery heading anchor changed');
  t=t.replace(deliveryHeading,'          <h2 id="forge-overview-delivery-heading" class="pm-overview-delivery-heading" data-forge-route-section="delivery-progress">{{ g.title }}</h2>\n          <div class="pm-overview-delivery-table">');
  const deliverySectionEnd='            </sc-if>\n          </div>\n        </sc-for>';
  if(!t.includes(deliverySectionEnd))throw Error('Overview delivery section end anchor changed');
  t=t.replace(deliverySectionEnd,'            </sc-if>\n          </div>\n          </section>\n        </sc-for>');
  const rowsStart=t.indexOf('<sc-for list="{{ g.rows }}"');
  const rowsEnd=t.indexOf('</sc-for>',rowsStart)+'</sc-for>'.length;
  if(rowsStart<0||rowsEnd<rowsStart)throw Error('Overview delivery rows anchor changed');
  const identity = t.slice(t.indexOf('<!-- overview-delivery-identity:start -->', rowsStart), t.indexOf('<!-- overview-delivery-identity:end -->', rowsStart) + '<!-- overview-delivery-identity:end -->'.length);
  const rows = `<sc-for list="{{ g.rows }}" as="r">
    <div class="pm-overview-delivery-row" role="link" tabindex="0" aria-label="打开数据单：{{ r.title }}" sc-camel-on-click="{{ r.go }}" sc-camel-on-keydown="{{ r.onKey }}">
      <div class="pm-overview-delivery-identity">${identity}<div class="pm-overview-delivery-name"><strong title="{{ r.title }}">{{ r.displayTitle }}</strong><span>{{ r.supplier.name }}</span></div></div>
      <div class="pm-overview-delivery-progress" aria-label="{{ r.progress.label }}">
        <div class="pm-overview-progress-numbers"><span>{{ r.progress.deliveredLabel }} <span class="pm-overview-progress-target">/ {{ r.progress.targetLabel }}</span></span><strong>{{ r.progress.percentageLabel }}</strong></div>
        <div class="pm-overview-progress-track" aria-hidden="true"><span style="width:{{ r.progress.percentage }}%"></span></div>
      </div>
      <div class="pm-overview-delivery-remaining"><span class="pm-overview-delivery-mobile-label">剩余</span><strong>{{ r.progress.remainingLabel }}</strong><span class="pm-overview-unit">项</span></div>
      <div class="pm-overview-delivery-owner"><span class="pm-overview-owner-label">负责人</span><span>{{ r.owner }}</span></div>
      <div class="pm-overview-delivery-date"><span class="pm-overview-delivery-mobile-label">交付日期</span><span>{{ r.deliveryDate }}</span></div>
    </div>
  </sc-for>`;
  const columns='<sc-if value="{{ !g.empty }}"><div class="pm-overview-delivery-columns"><span>数据单</span><span>交付进度</span><span class="pm-overview-remaining-heading">剩余数量</span><span class="pm-overview-delivery-owner-column" role="columnheader"><select class="pm-overview-owner-filter" aria-label="筛选项目负责人" value="{{ g.ownerFilter }}" sc-camel-on-change="{{ g.onOwner }}"><option value="">负责人</option><sc-for list="{{ g.ownerOptions }}" as="option"><option value="{{ option.name }}" selected="{{ option.selected }}">{{ option.name }}</option></sc-for></select></span><span class="pm-overview-delivery-sort-column" role="columnheader" aria-sort="{{ g.sortAria }}"><button type="button" class="pm-overview-delivery-sort" data-direction="{{ g.sortDirection }}" sc-camel-on-click="{{ g.toggleSort }}" aria-label="{{ g.sortActionLabel }}" title="{{ g.sortLabel }}"><span>交付日期</span>'+deliverySortIcon+'</button></span></div></sc-if>\n';
  t=t.slice(0,rowsStart)+columns+rows+'<sc-if value="{{ g.noOwnerMatches }}"><div class="pm-overview-owner-empty" role="status">没有该负责人负责的交付数据单</div></sc-if>'+t.slice(rowsEnd);
  t=t.replace("                title: d.name,", `                title: d.name,
                displayTitle: d.customer && d.name.startsWith(d.customer + ' ') ? d.name.slice(d.customer.length + 1) : d.name,
                progress: this.overviewDeliveryProgress(d),
                onKey: event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); this.setState({ view: 'sheet', sheetKey: d.key, sheetRow: null }); } },`);
  for (const [from,to] of overviewSummaryCopy) {
    if(!t.includes(from))throw Error('Overview summary copy anchor changed: '+from.slice(0,60));
    t=t.replace(from,()=>to);
  }
  return t;
}
