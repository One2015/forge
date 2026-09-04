const block = (extra = '') => `<span class="pm-skeleton-block ${extra}"></span>`;
const rows = Array.from({length:4},()=>`<div class="pm-skeleton-row">${block('pm-skeleton-medium')}${block()}${block('pm-skeleton-medium')}</div>`).join('');
function loadingRegion(scope, label, chart = false) {
  const metrics = Array.from({length:3},()=>`<div>${block('pm-skeleton-medium')}${block('pm-skeleton-value')}</div>`).join('');
  return `<div class="pm-loading pm-data-loading" data-loading="{{ ${scope}.loading }}" aria-busy="{{ ${scope}.loading }}">
    <div class="pm-loading-skeleton" aria-hidden="true"><p class="pm-loading-label">${label}</p><div class="pm-skeleton-metrics">${metrics}</div>${chart?block('pm-skeleton-chart'):''}${rows}</div>
    <sc-if value="{{ ${scope}.loading }}"><span class="pm-loading-sr" role="status">${label}</span></sc-if>
    <div class="pm-loading-content">`;
}
export function installLoadingStates(t) {
  const replace = (from, to) => {
    if (!t.includes(from)) throw Error('Loading state boundary changed: '+from.slice(0,90));
    t = t.replace(from,()=>to);
  };
  const billing = t.match(/  <sc-if value="{{ billing.loading }}">[^\n]+<\/sc-if>/)?.[0];
  if (!billing) throw Error('Billing loading state missing');
  replace(billing, loadingRegion('billing','正在读取账单…',true));
  replace('  </sc-if>\n</section>\n</sc-if>\n<!-- billing:end -->','  </sc-if>\n    </div>\n</div>\n</section>\n</sc-if>\n<!-- billing:end -->');
  const model = t.match(/  <sc-if value="{{ modelStatus.loading }}">[^\n]+<\/sc-if>/)?.[0];
  if (!model) throw Error('Model loading state missing');
  replace(model, '');
  replace('  <sc-if value="{{ modelStatus.disconnected }}">',loadingRegion('modelStatus','正在读取检测结果…')+'\n  <sc-if value="{{ modelStatus.disconnected }}">');
  replace('  <sc-if value="{{ modelStatus.drawerOpen }}">','    </div>\n</div>\n  <sc-if value="{{ modelStatus.drawerOpen }}">');
  return t;
}
