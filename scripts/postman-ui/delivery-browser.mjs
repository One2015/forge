import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const icons = html => html.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => read('../../assets/phosphor/regular/' + name + '.svg').replace(/<svg[^>]*>/, '<svg class="forge-icon" width="' + size + '" height="' + size + '" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));

export const deliveryBrowserCopy = [
  ["    const delSortKey = st.delSort || 'newest';\n    const delAll = [];", "    const delSortKey = st.delSort || 'newest';\n    const delStatus = st.delStatus === 'unmet' ? 'unmet' : 'all';\n    const delQuery = String(st.deliveryQuery || '').trim().toLocaleLowerCase();\n    const delAll = [];"],
  ["        .filter(d => delCat === 'all' || d.cat === delCat)", "        .filter(d => {\n          if (delCat !== 'all' && d.cat !== delCat) return false;\n          if (delStatus === 'unmet' && this.overviewFinalDeliveryCount(d) >= (Number(d.target) || 0)) return false;\n          if (!delQuery) return true;\n          const memberText = this.deliverySheetMembers(d).flatMap(member => [member.name, member.accountName, member.role]).filter(Boolean).join(' ');\n          return [d.name, d.customer, d.cat, d.created, d.key, memberText].filter(Boolean).join(' ').toLocaleLowerCase().includes(delQuery);\n        })"],
  ["        const on = delCat === k;", "        const on = delStatus === 'all' && delCat === k;"],
  ["          pick: () => this.setState({ delCat: k })", "          pick: () => this.setState({ delCat: k, delStatus: 'all' })"],
  ["      create: () => this.openDeliveryEditor(),\n      subtitle:", "      create: () => this.openDeliveryEditor(),\n      query: st.deliveryQuery || '', hasQuery: !!delQuery,\n      onQuery: event => this.setState({ deliveryQuery: event.target.value }),\n      clearQuery: () => this.setState({ deliveryQuery: '', delCat: 'all', delStatus: 'all' }),\n      unmet: delStatus === 'unmet', unmetBg: delStatus === 'unmet' ? '#fff' : 'transparent',\n      unmetFg: delStatus === 'unmet' ? 'var(--forge-text)' : 'var(--forge-muted)', unmetWeight: delStatus === 'unmet' ? '600' : '400',\n      toggleUnmet: () => this.setState({ delStatus: delStatus === 'unmet' ? 'all' : 'unmet' }),\n      empty: delShownN === 0,\n      subtitle:"]
];

export function installDeliveryBrowser(t) {
  for (const [from, to] of deliveryBrowserCopy) {
    if (!t.includes(from)) throw Error('Delivery browser logic anchor changed: ' + from.slice(0, 80));
    t = t.replace(from, () => to);
  }
  const deliveryStart = t.indexOf('<sc-if value="{{ isDelivery }}"');
  const deliveryEnd = t.indexOf('<sc-if value="{{ isSheet }}"', deliveryStart);
  if (deliveryStart < 0 || deliveryEnd < deliveryStart) throw Error('Delivery browser page boundary changed');
  let page = t.slice(deliveryStart, deliveryEnd);
  const toolbarStart = page.indexOf('      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">');
  const resultsStart = page.indexOf('      <div style="display:flex;flex-direction:column;gap:20px">', toolbarStart);
  const resultsClose = page.lastIndexOf('      </div>\n    </div>\n  </sc-if>');
  if (toolbarStart < 0 || resultsStart < toolbarStart || resultsClose < resultsStart) throw Error('Delivery browser content boundary changed');
  page = page.slice(0, toolbarStart) + icons(read('delivery-browser-toolbar.html')) + '\n\n      ' + icons(read('delivery-browser-views.html')) + '\n' + page.slice(resultsClose + '      </div>\n'.length);
  return t.slice(0, deliveryStart) + page + t.slice(deliveryEnd);
}
