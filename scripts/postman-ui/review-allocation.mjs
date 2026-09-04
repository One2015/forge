import fs from 'node:fs';
const legacy=fs.readFileSync(new URL('../templates/delivery-review-assignments.js',import.meta.url),'utf8');
const originalGroups=legacy.slice(legacy.indexOf('  deliveryReviewDatasets(value) {'),legacy.indexOf('  deliveryDatasetReviewSignature(sheet) {'));
// Preserve saved dataset assignments when presenting the Item-only editor.
export const reviewAllocationCopy = [
 [originalGroups,`  deliveryReviewDatasets(value) {
    if (!value) return [];
    const entries = value.entries || this.deliveryEntries(value), saved = value.datasetReviews || {}, items = new Map();
    for (const entry of entries) {
      const id = this.deliveryEntryId(entry) || entry.key, key = 'item:' + id;
      if (items.has(key)) continue;
      const refs = entry.sourceType === 'production' && entry.sourceRefs?.some(ref => ref.dataset)
        ? entry.sourceRefs.filter(ref => ref.dataset) : [{pipeline:entry.sourcePipeline,dataset:entry.sourceDataset}];
      const inherited = refs.map(ref => saved[entry.sourceType === 'production' && ref.dataset
        ? 'production:' + JSON.stringify([ref.pipeline || '',ref.dataset]) : value.archive ? 'zip:' + value.archive.name : 'list']).filter(Boolean);
      const owners = new Set(inherited.map(review => review.reviewer || ''));
      // Conflicting legacy assignments need an explicit Item reviewer choice.
      const previous = saved[key] ?? (owners.size === 1 ? inherited[0] : null);
      items.set(key,{key,name:entry.name || entry.title || id,source:id,itemIds:[id],entries:[entry],count:1,
        reviewer:previous?.reviewer ?? '',status:previous?.status || 'pending',
        updatedBy:previous?.updatedBy || '',updatedAt:previous?.updatedAt || 0});
    }
    return Array.from(items.values());
  }

`],
 ["reviews: sheet?.datasetReviews || {}, entries:", "reviews: sheet?.datasetReviews || {}, reviewScope: sheet?.reviewScope || 'dataset', entries:"],
 ["datasetReviews: editor.datasetReviews || {},", "datasetReviews: editor.datasetReviews || {}, reviewScope: 'item',"],
 ["      datasetReviews: Object.fromEntries(Object.entries(sheet?.datasetReviews", "      reviewScope: 'item', reviewQuery: '', reviewPersonFilter: '', reviewStatusFilter: '',\n      datasetReviews: Object.fromEntries(Object.entries(sheet?.datasetReviews"],
 ["sheet.datasetReviews = reviewPlan.datasetReviews;", "sheet.reviewScope = 'item'; sheet.datasetReviews = reviewPlan.datasetReviews;"],
 ["reviewer: Object.hasOwn(editor.datasetReviews || {}, group.key) ? group.reviewer : defaultReviewer", "reviewer: Object.hasOwn(editor.datasetReviews || {}, group.key) ? group.reviewer : group.reviewer || defaultReviewer"],
 ["    const datasetReviews = Object.fromEntries(this.deliveryEditorReviewDatasets(editor).map(group => {", `    const priorReviews = new Map(this.deliveryReviewDatasets(previous).filter(group=>group.reviewer).map(group=>[group.key,{reviewer:group.reviewer,status:group.status,updatedAt:group.updatedAt,updatedBy:group.updatedBy}]));
    const datasetReviews = Object.fromEntries(this.deliveryEditorReviewDatasets(editor).map(group => {`],
 ["      const before = previous?.datasetReviews?.[group.key];", "      const before = priorReviews.get(group.key);"],
 ["    const groups = this.deliveryEditorReviewDatasets(editor), options = this.deliveryReviewerOptions(editor);", `    const groups = this.deliveryEditorReviewDatasets(editor), options = this.deliveryReviewerOptions(editor);
    const query = editor.reviewQuery || '';
    const personFilter = editor.reviewPersonFilter || '', statusFilter = editor.reviewStatusFilter || '';
    const filtered = groups.filter(group => (group.name + ' ' + group.source).toLowerCase().includes(query.trim().toLowerCase())
      && (!personFilter || (personFilter === '__unassigned' ? !group.reviewer : group.reviewer === personFilter))
      && (!statusFilter || group.status === statusFilter));`],
 ["    return { editable, readonly: !editable, hasRows: !!groups.length, empty: !groups.length, count: groups.length,", `    return { editable, readonly: !editable, hasRows: !!groups.length, empty: !groups.length, count: groups.length,
      query, personFilter, statusFilter, reviewerOptions: options, statusOptions: this.deliveryDatasetReviewStates(),
      onQuery: event => this.patchDeliveryEditor({ reviewQuery: event.target.value }, editor.id),
      onPersonFilter: event => this.patchDeliveryEditor({ reviewPersonFilter: event.target.value }, editor.id),
      onStatusFilter: event => this.patchDeliveryEditor({ reviewStatusFilter: event.target.value }, editor.id),
      noMatches: !!groups.length && !filtered.length,`],
 ["help: editor.key ? '按数据集重新分配 Reviewer 或调整处理状态，保存后生效。' : '每份数据集需指定一位 Reviewer，默认由所有者本人审核，也可分配给同事或 Lead。',", "help: '为每个 Item 分配 Reviewer，保存数据单后生效。',"],
 ["rows: groups.map(group => ({ ...group, options, states:", "rows: filtered.map(group => ({ ...group, options, states:"]
];
export function installReviewAllocation(t) {
 for (const [from,to] of reviewAllocationCopy) {
   if (!t.includes(from)) throw Error('Review allocation anchor changed: '+from.slice(0,70));
   t=t.replace(from,()=>to);
 }
 const savedStart=t.indexOf('    <sc-if value="{{ sheet.extras.reviewAssignment.hasRows }}">');
 const savedEnd=t.indexOf('    <div class="forge-delivery-section-heading"><h2>List 清单',savedStart);
 if(savedStart<0 || savedEnd<savedStart)throw Error('Saved review section boundaries changed');
 t=t.slice(0,savedStart)+t.slice(savedEnd);
 const originalMarkup=fs.readFileSync(new URL('../templates/delivery-review-assignments.html',import.meta.url),'utf8').trim();
 const replacement=fs.readFileSync(new URL('review-allocation.html',import.meta.url),'utf8').trim();
 if(!t.includes(originalMarkup))throw Error('Review assignment template changed');
 t=t.replaceAll(originalMarkup,replacement);
 return t;
}
