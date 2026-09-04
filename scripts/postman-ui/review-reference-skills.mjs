// Keep saved task bindings and the existing Markdown download action. A shared
// Item can belong to several selected production runs, not only its first row.
export const reviewReferenceSkillCopy = [[
  '|| Object.values(this.state.deliveryLinks?.[sheet.key] || {}).some(link => [link.current, link.candidate]',
  '|| (sheet.entries || []).some(entry => entry.itemId === context.itemId && (entry.sourceRefs || []).some(ref => ref.itemId === context.itemId && ref.runId === context.runId)) || Object.values(this.state.deliveryLinks?.[sheet.key] || {}).some(link => [link.current, link.candidate]'
], [
  '(!rec?.itemIds || rec.itemIds.includes(s.deepReview.itemId))',
  '(!rec?.itemIds?.length || rec.itemIds.includes(s.deepReview.itemId))'
]];

export function installReviewReferenceSkills(template) {
  let t = template;
  const marker = '<!-- review-skill-session:start -->';
  const start = t.indexOf('<section class="forge-review-related-skills"', t.indexOf(marker));
  const end = t.indexOf('</section>', start) + '</section>'.length;
  if (start < 0 || end < start) throw Error('Review Skill download section changed');
  const existing = t.slice(start, end);
  const listStart = existing.indexOf('<ul class="forge-review-skill-downloads">');
  const listEnd = existing.indexOf('</ul>', listStart) + '</ul>'.length;
  if (listStart < 0 || listEnd < listStart) throw Error('Review Skill download list changed');
  const skills = `<section class="forge-review-related-skills pm-review-reference-skills" aria-label="参考 Skill">
  <div class="review-workbench-section-heading"><h3>参考 Skill</h3><sc-if value="{{ it.skills.available }}" hint-placeholder-val="{{ false }}"><span>{{ it.skills.count }} 个</span></sc-if></div>
  <sc-if value="{{ it.skills.available }}" hint-placeholder-val="{{ false }}">${existing.slice(listStart, listEnd)}</sc-if>
  <sc-if value="{{ it.skills.empty }}" hint-placeholder-val="{{ true }}"><p class="pm-review-reference-empty">未分配参考 Skill</p></sc-if>
  <sc-if value="{{ it.skills.downloadError }}" hint-placeholder-val="{{ false }}"><p class="forge-feedback-error" role="alert">{{ it.skills.downloadError }}</p></sc-if>
</section>`;
  t = t.slice(0, start) + t.slice(end);
  const source = '<p class="review-workbench-source">{{ it.referenceSource }}</p>';
  if (!t.includes(source)) throw Error('Review reference evidence anchor changed');
  t = t.replace(source, source + '\n' + skills);
  t = t.replace('<div class="review-workbench-section-heading"><h2>参考依据</h2></div>', '<div class="review-workbench-section-heading"><h2>参考依据</h2></div><h3 class="pm-review-reference-image-heading">参考图</h3>');
  for (const [from, to] of reviewReferenceSkillCopy) {
    if (!t.includes(from)) throw Error('Review Skill binding anchor changed');
    t = t.replace(from, to);
  }
  return t;
}
