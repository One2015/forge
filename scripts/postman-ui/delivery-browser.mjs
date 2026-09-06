import fs from 'node:fs';
import {renderPhosphorIcons} from './phosphor-icons.mjs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');

export const deliveryBrowserCopy = [
  ["    const delSortKey = st.delSort || 'newest';\n    const delAll = [];", "    const delSortKey = st.delSort || 'newest';\n    const delStatus = st.delStatus === 'unmet' ? 'unmet' : 'all';\n    const delQuery = String(st.deliveryQuery || '').trim().toLocaleLowerCase();\n    const delView = st.deliveryView === 'folder' ? 'folder' : 'list';\n    const delAll = [];"],
  ["        .filter(d => delCat === 'all' || d.cat === delCat)", "        .filter(d => {\n          if (delCat !== 'all' && d.cat !== delCat) return false;\n          if (delStatus === 'unmet' && this.overviewFinalDeliveryCount(d) >= (Number(d.target) || 0)) return false;\n          if (!delQuery) return true;\n          const memberText = this.deliverySheetMembers(d).flatMap(member => [member.name, member.accountName, member.role]).filter(Boolean).join(' ');\n          return [d.name, d.customer, d.cat, d.created, d.key, memberText].filter(Boolean).join(' ').toLocaleLowerCase().includes(delQuery);\n        })"],
  ["        const on = delCat === k;", "        const on = delStatus === 'all' && delCat === k;"],
  ["          pick: () => this.setState({ delCat: k })", "          pick: () => this.setState({ delCat: k, delStatus: 'all' })"],
  ["      create: () => this.openDeliveryEditor(),\n      subtitle:", "      create: () => this.openDeliveryEditor(),\n      query: st.deliveryQuery || '', hasQuery: !!delQuery,\n      onQuery: event => this.setState({ deliveryQuery: event.target.value }),\n      clearQuery: () => this.setState({ deliveryQuery: '', delCat: 'all', delStatus: 'all' }),\n      unmet: delStatus === 'unmet', unmetBg: delStatus === 'unmet' ? '#fff' : 'transparent',\n      unmetFg: delStatus === 'unmet' ? 'var(--forge-text)' : 'var(--forge-muted)', unmetWeight: delStatus === 'unmet' ? '600' : '400',\n      toggleUnmet: () => this.setState({ delStatus: delStatus === 'unmet' ? 'all' : 'unmet' }),\n      listView: delView === 'list', folderView: delView === 'folder',\n      views: [['list', '列表'], ['folder', '文件夹']].map(([key, label]) => ({ key, label, selected: delView === key, pick: () => this.setState({ deliveryView: key }) })),\n      empty: delShownN === 0,\n      subtitle:"],
  ["            const bar = barOf(d);\n            return {", "            const bar = barOf(d);\n            const cover = (st.deliveryFolderCovers || {})[d.key] || null;\n            const coverError = (st.deliveryFolderCoverErrors || {})[d.key] || '';\n            return {"],
  ["              motionKey: d.key, name: d.name, created: d.created,", "              motionKey: d.key, name: d.name, created: d.created,\n              coverUrl: cover && cover.url || '', hasCover: !!(cover && cover.url), noCover: !(cover && cover.url),\n              coverAlt: d.name + ' 封面', coverLabel: (cover ? '更换' : '上传') + d.name + '的文件夹封面',\n              coverAction: cover ? '更换封面' : '上传封面', coverError,\n              uploadCover: event => this.pmDeliveryFolderCoverUpload(event, d.key),"]
];

export function installDeliveryBrowser(t) {
  for (const [from, to] of deliveryBrowserCopy) {
    if (!t.includes(from)) throw Error('Delivery browser logic anchor changed: ' + from.slice(0, 80));
    t = t.replace(from, () => to);
  }
  const methods = read('delivery-browser-methods.js');
  if (!t.includes('  deliveryData() {')) throw Error('Delivery browser method anchor changed');
  t = t.replace('  deliveryData() {', methods + '  deliveryData() {');

  const deliveryStart = t.indexOf('<sc-if value="{{ isDelivery }}"');
  const deliveryEnd = t.indexOf('<sc-if value="{{ isSheet }}"', deliveryStart);
  if (deliveryStart < 0 || deliveryEnd < deliveryStart) throw Error('Delivery browser page boundary changed');
  let page = t.slice(deliveryStart, deliveryEnd);
  const toolbarStart = page.indexOf('      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">');
  const resultsStart = page.indexOf('      <div style="display:flex;flex-direction:column;gap:20px">', toolbarStart);
  const resultsClose = page.lastIndexOf('      </div>\n    </div>\n  </sc-if>');
  if (toolbarStart < 0 || resultsStart < toolbarStart || resultsClose < resultsStart) throw Error('Delivery browser content boundary changed');
  page = page.slice(0, toolbarStart) + renderPhosphorIcons(read('delivery-browser-toolbar.html')) + '\n\n      ' + renderPhosphorIcons(read('delivery-browser-views.html')) + '\n' + page.slice(resultsClose + '      </div>\n'.length);
  return t.slice(0, deliveryStart) + page + t.slice(deliveryEnd);
}
