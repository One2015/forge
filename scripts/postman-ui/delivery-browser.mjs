import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const icons = html => html.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => read('../../assets/phosphor/regular/' + name + '.svg').replace(/<svg[^>]*>/, '<svg class="forge-icon" width="' + size + '" height="' + size + '" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));

export const deliveryBrowserCopy = [
  ["    const delSortKey = st.delSort || 'newest';\n    const delAll = [];", "    const delSortKey = st.delSort || 'newest';\n    const delStatus = st.delStatus === 'unmet' ? 'unmet' : 'all';\n    const delQuery = String(st.deliveryQuery || '').trim().toLocaleLowerCase();\n    const delCreatorValue = st.deliveryCreator || 'all';\n    const delTableSortKeys = ['created', 'status', 'linked', 'review', 'passed'];\n    const delTableSortKey = delTableSortKeys.includes(st.deliveryTableSortKey) ? st.deliveryTableSortKey : '';\n    const delTableSortDirection = st.deliveryTableSortDirection === 'asc' ? 'asc' : 'desc';\n    const creatorOf = d => String(d.created || '').split('·').map(part => part.trim())[1] || '—';\n    const deliveryTableSort = (key, label) => {\n      const active = delTableSortKey === key;\n      const direction = active ? delTableSortDirection : 'none';\n      const nextDirection = active && delTableSortDirection === 'desc' ? 'asc' : 'desc';\n      return {\n        active, direction, ariaSort: active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none',\n        hint: active ? label + '当前' + (direction === 'desc' ? '降序' : '升序') + '，点击切换为' + (nextDirection === 'desc' ? '降序' : '升序') : label + '未排序，点击按降序排序',\n        toggle: () => this.setState({ deliveryTableSortKey: key, deliveryTableSortDirection: nextDirection })\n      };\n    };\n    const delAll = [];"],
  ["    const delCatKeys = ['all'].concat(delAll.map(x => x.cat).filter((v, i, arr) => v && arr.indexOf(v) === i));", "    const delCreatorOptions = ['all'].concat(delAll.map(creatorOf).filter((value, index, values) => value && values.indexOf(value) === index));\n    const delCreator = delCreatorOptions.includes(delCreatorValue) ? delCreatorValue : 'all';\n    const delCatKeys = ['all'].concat(delAll.map(x => x.cat).filter((v, i, arr) => v && arr.indexOf(v) === i));"],
  ["        .filter(d => delCat === 'all' || d.cat === delCat)", "        .filter(d => {\n          if (delCat !== 'all' && d.cat !== delCat) return false;\n          if (delStatus === 'unmet' && this.overviewFinalDeliveryCount(d) >= (Number(d.target) || 0)) return false;\n          if (delCreator !== 'all' && creatorOf(d) !== delCreator) return false;\n          if (!delQuery) return true;\n          const memberText = this.deliverySheetMembers(d).flatMap(member => [member.name, member.accountName, member.role]).filter(Boolean).join(' ');\n          return [d.name, d.customer, d.cat, d.created, d.key, memberText].filter(Boolean).join(' ').toLocaleLowerCase().includes(delQuery);\n        })"],
  ["    const delShownN = delShown.reduce((n, c) => n + c.sheets.length, 0);", "    const delShownN = delShown.reduce((n, c) => n + c.sheets.length, 0);\n    const delTableRows = delShown.flatMap(c => c.sheets.map(d => ({ customer: c.customer, sheets: [d] })));\n    const delTableSortValue = (row, key) => {\n      const d = row.sheets[0];\n      if (key === 'created') return Number(d.at) || 0;\n      if (key === 'status') return d.passed >= d.target ? 1 : 0;\n      return Number(d[key]) || 0;\n    };\n    if (delTableSortKey) delTableRows.sort((a, b) => {\n      const delta = delTableSortValue(a, delTableSortKey) - delTableSortValue(b, delTableSortKey);\n      return delTableSortDirection === 'asc' ? delta : -delta;\n    });"],
  ["        const on = delCat === k;", "        const on = delStatus === 'all' && delCat === k;"],
  ["          pick: () => this.setState({ delCat: k })", "          pick: () => this.setState({ delCat: k, delStatus: 'all' })"],
  ["            const bar = barOf(d);\n            return {", "            const bar = barOf(d);\n            const createdParts = String(d.created || '').split('·').map(part => part.trim());\n            const createdDate = String(createdParts[0] || '—').replace(/\\s*创建$/, '').trim();\n            const creator = createdParts[1] || '—';\n            return {"],
  ["              motionKey: d.key, name: d.name, created: d.created,", "              motionKey: d.key, name: d.name, created: d.created, createdDate, creator,\n              target: d.target, linked: d.linked, review: d.review, passed: d.passed,"],
  ["      customers: delShown.map(c => {", "      customers: delTableRows.map(c => {"],
  ["      create: () => this.openDeliveryEditor(),\n      subtitle:", "      create: () => this.openDeliveryEditor(),\n      query: st.deliveryQuery || '', hasQuery: !!delQuery,\n      onQuery: event => this.setState({ deliveryQuery: event.target.value }),\n      clearQuery: () => this.setState({ deliveryQuery: '', deliveryCreator: 'all', delCat: 'all', delStatus: 'all' }),\n      creatorFilter: delCreator, creatorFilterActive: delCreator !== 'all',\n      creatorFilterHint: delCreator === 'all' ? '筛选创建人，当前为全部' : '筛选创建人，当前为' + delCreator,\n      creatorOptions: delCreatorOptions.map(value => ({ value, label: value === 'all' ? '全部' : value, selected: value === delCreator })),\n      onCreatorFilter: event => this.setState({ deliveryCreator: event.target.value }),\n      sortCreated: deliveryTableSort('created', '创建时间'),\n      sortStatus: deliveryTableSort('status', '状态'),\n      sortLinked: deliveryTableSort('linked', '已关联条数'),\n      sortReview: deliveryTableSort('review', '待审核条数'),\n      sortPassed: deliveryTableSort('passed', '交付条数'),\n      unmet: delStatus === 'unmet', unmetBg: delStatus === 'unmet' ? '#fff' : 'transparent',\n      unmetFg: delStatus === 'unmet' ? 'var(--forge-text)' : 'var(--forge-muted)', unmetWeight: delStatus === 'unmet' ? '600' : '400',\n      toggleUnmet: () => this.setState({ delStatus: delStatus === 'unmet' ? 'all' : 'unmet' }),\n      empty: delShownN === 0,\n      subtitle:"]
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
  const subtitle = '          <div style="margin-top:7px;font-size:14px;color:var(--forge-muted)">{{ delivery.subtitle }}</div>\n';
  if (!page.includes(subtitle)) throw Error('Delivery browser subtitle boundary changed');
  page = page.replace(subtitle, '');
  const headingCreate = '        <button type="button" class="forge-delivery-primary forge-delivery-create" sc-camel-on-click="{{ delivery.create }}">';
  const headingCreateStart = page.indexOf(headingCreate);
  const headingCreateEnd = page.indexOf('</button>', headingCreateStart);
  if (headingCreateStart < 0 || headingCreateEnd < headingCreateStart) throw Error('Delivery browser heading action boundary changed');
  page = page.slice(0, headingCreateStart) + page.slice(headingCreateEnd + '</button>\n'.length);
  const toolbarStart = page.indexOf('      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">');
  const resultsStart = page.indexOf('      <div style="display:flex;flex-direction:column;gap:20px">', toolbarStart);
  const resultsClose = page.lastIndexOf('      </div>\n    </div>\n  </sc-if>');
  if (toolbarStart < 0 || resultsStart < toolbarStart || resultsClose < resultsStart) throw Error('Delivery browser content boundary changed');
  page = page.slice(0, toolbarStart) + icons(read('delivery-browser-toolbar.html')) + '\n\n      ' + icons(read('delivery-browser-views.html')) + '\n' + page.slice(resultsClose + '      </div>\n'.length);
  return t.slice(0, deliveryStart) + page + t.slice(deliveryEnd);
}
