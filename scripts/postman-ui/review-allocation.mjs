// Keep the existing reviewer validation, membership, save and notification pipeline.
export const reviewAllocationCopy = [
 ["    const saved = value.datasetReviews || {};", `    const saved = value.datasetReviews || {};
    if (value.reviewScope === 'item') {
      const items = new Map();
      for (const entry of entries) {
        const id = this.deliveryEntryId(entry) || entry.key, key = 'item:' + id;
        if (items.has(key)) continue;
        items.set(key, { key, name: entry.name || entry.title || entry.source || id,
          source: (entry.sourceDataset ? entry.sourceDataset + ' · ' : '') + id,
          itemIds: [id], entries: [entry], count: 1,
          reviewer: saved[key]?.reviewer ?? '', status: saved[key]?.status || 'pending',
          updatedBy: saved[key]?.updatedBy || '', updatedAt: saved[key]?.updatedAt || 0 });
      }
      return Array.from(items.values());
    }`],
 ["reviews: sheet?.datasetReviews || {}, entries:", "reviews: sheet?.datasetReviews || {}, reviewScope: sheet?.reviewScope || 'dataset', entries:"],
 ["datasetReviews: editor.datasetReviews || {},", "datasetReviews: editor.datasetReviews || {}, reviewScope: editor.reviewScope || 'dataset',"],
 ["      datasetReviews: Object.fromEntries(Object.entries(sheet?.datasetReviews", "      reviewScope: sheet?.reviewScope || 'dataset', reviewQuery: '', reviewPage: 1,\n      datasetReviews: Object.fromEntries(Object.entries(sheet?.datasetReviews"],
 ["sheet.datasetReviews = reviewPlan.datasetReviews;", "sheet.reviewScope = editor.reviewScope || 'dataset'; sheet.datasetReviews = reviewPlan.datasetReviews;"],
 ["    const groups = this.deliveryEditorReviewDatasets(editor), options = this.deliveryReviewerOptions(editor);", `    const groups = this.deliveryEditorReviewDatasets(editor), options = this.deliveryReviewerOptions(editor);
    const scope = editor.reviewScope || 'dataset', query = editor.reviewQuery || '';
    const filtered = groups.filter(group => (group.name + ' ' + group.source).toLowerCase().includes(query.trim().toLowerCase()));
    const pages = Math.max(1, Math.ceil(filtered.length / 20)), page = Math.min(editor.reviewPage || 1, pages);
    const setScope = next => {
      if (!editable || next === scope) return;
      this.patchDeliveryEditor({ reviewScope: next, reviewQuery: '', reviewPage: 1, reviewTouched: true, error: '',
        reviewNotice: '已切换为按' + (next === 'item' ? ' Item ' : '数据集') + '分配，保存后生效。' }, editor.id);
    };`],
 ["    return { editable, readonly: !editable, hasRows: !!groups.length, empty: !groups.length, count: groups.length,", `    return { editable, readonly: !editable, hasRows: !!groups.length, empty: !groups.length, count: groups.length,
      isDataset: scope === 'dataset', isItem: scope === 'item', unit: scope === 'item' ? '个 Item' : '份数据集',
      byDataset: () => setScope('dataset'), byItem: () => setScope('item'), query,
      onQuery: event => this.patchDeliveryEditor({ reviewQuery: event.target.value, reviewPage: 1 }, editor.id),
      noMatches: !!groups.length && !filtered.length, pageLabel: '共 ' + filtered.length + ' 条 · ' + page + ' / ' + pages,
      previousDisabled: page <= 1, nextDisabled: page >= pages,
      previous: () => this.patchDeliveryEditor({ reviewPage: Math.max(1, page - 1) }, editor.id),
      next: () => this.patchDeliveryEditor({ reviewPage: Math.min(pages, page + 1) }, editor.id),`],
 ["help: editor.key ? '按数据集重新分配 Reviewer 或调整处理状态，保存后生效。' : '每份数据集需指定一位 Reviewer，默认由所有者本人审核，也可分配给同事或 Lead。',", "help: '可按数据集批量分配，或切换到 Item 逐条分配。两种方式分别保留草稿，保存当前方式；新建时默认由所有者审核。',"],
 ["rows: groups.map(group => ({ ...group, options, states:", "rows: filtered.slice((page - 1) * 20, page * 20).map(group => ({ ...group, options, states:"]
];
export function installReviewAllocation(t) {
 for (const [from,to] of reviewAllocationCopy) {
   if (!t.includes(from)) throw Error('Review allocation anchor changed: '+from.slice(0,70));
   t=t.replace(from,()=>to);
 }
 t=t.replaceAll('<h3>数据集审核 <span', '<h3>审核分配 <span').replaceAll('aria-label="数据集审核安排"','aria-label="审核安排"');
 t=t.replaceAll('aria-label="数据集审核分配"','aria-label="审核分配"').replaceAll('<h3>数据集审核分配</h3>','<h3>审核分配</h3>');
 const help='<p class="forge-delivery-help">{{ deliveryEditor.reviewAssignment.help }}</p>';
 t=t.replaceAll(help,help+`<div class="pm-allocation-toolbar">
 <div class="pm-sheet-filters" data-forge-segmented="pill" role="group" aria-label="审核分配方式">
 <button type="button" aria-pressed="{{ deliveryEditor.reviewAssignment.isDataset }}" disabled="{{ deliveryEditor.reviewAssignment.readonly }}" sc-camel-on-click="{{ deliveryEditor.reviewAssignment.byDataset }}">按数据集</button>
 <button type="button" aria-pressed="{{ deliveryEditor.reviewAssignment.isItem }}" disabled="{{ deliveryEditor.reviewAssignment.readonly }}" sc-camel-on-click="{{ deliveryEditor.reviewAssignment.byItem }}">按 Item</button></div>
 <input type="search" aria-label="搜索审核分配对象" placeholder="搜索名称或 Item ID" value="{{ deliveryEditor.reviewAssignment.query }}" sc-camel-on-input="{{ deliveryEditor.reviewAssignment.onQuery }}" />
 </div>`);
 const empty='<sc-if value="{{ deliveryEditor.reviewAssignment.empty }}">';
 t=t.replaceAll(empty,`<sc-if value="{{ deliveryEditor.reviewAssignment.hasRows }}"><div class="pm-allocation-pagination"><span>{{ deliveryEditor.reviewAssignment.pageLabel }}</span><button type="button" class="forge-delivery-text-button" disabled="{{ deliveryEditor.reviewAssignment.previousDisabled }}" sc-camel-on-click="{{ deliveryEditor.reviewAssignment.previous }}">上一页</button><button type="button" class="forge-delivery-text-button" disabled="{{ deliveryEditor.reviewAssignment.nextDisabled }}" sc-camel-on-click="{{ deliveryEditor.reviewAssignment.next }}">下一页</button></div></sc-if><sc-if value="{{ deliveryEditor.reviewAssignment.noMatches }}"><p class="forge-delivery-help">没有匹配的数据集或 Item，请调整搜索。</p></sc-if>`+empty);
 t=t.replaceAll('关联生产任务或上传 ZIP 后，可为每份数据集分配审核人。','关联生产任务或上传 ZIP 后，可按数据集或 Item 分配审核人。');
 t=t.replaceAll('{{ deliveryEditor.reviewAssignment.count }} 份数据集','{{ deliveryEditor.reviewAssignment.count }} {{ deliveryEditor.reviewAssignment.unit }}');
 return t;
}
