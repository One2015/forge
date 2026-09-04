import fs from 'node:fs';

export const sheetReviewHistoryCopy = [
  ["const notes = ['首轮：整体结构可用，材质与光照需要重做。', '第二轮：材质已达标，标注层次仍需加强。', '符合预期，可以通过。'];",
   "const notes = ['整体结构可用，材质与光照需要重做。', '材质已达标，标注层次仍需加强。', '符合预期，可以通过。'];"],
  ["note: ok ? notes[2] : notes[Math.min(k, 1)],",
   "note: this.pmSheetReviewNote(r[2], r[5], k + 1, ok ? notes[2] : notes[Math.min(k, 1)]), referenceImages: this.pmSheetReviewImages(r[2], r[5], k + 1),"],
  ["needsMore: (ok ? notes[2] : notes[Math.min(k, 1)]).length > 56,",
   "needsMore: this.pmSheetReviewNote(r[2], r[5], k + 1, ok ? notes[2] : notes[Math.min(k, 1)]).length > 56,"],
  ["who: '一万 · 追加返工', note: entry.note,",
   "who: '一万 · 追加返工', note: this.pmCleanReviewNote(entry.note), referenceImages: this.pmSheetReferenceImages(entry.attachments),"],
];

export function installSheetReviewHistory(t) {
  for (const [from, to] of sheetReviewHistoryCopy) {
    if (!t.includes(from)) throw Error('Sheet history anchor changed: ' + from);
    t = t.replace(from, to);
  }
  const start = t.indexOf('<div class="forge-sheet-history"');
  const end = t.indexOf('<!-- sheet-appended-rounds:start -->', start);
  if (start < 0 || end < start) throw Error('Sheet history markup boundary changed');
  const old = t.slice(start, end);
  const icon = old.match(/<svg[^>]*data-phosphor="git-branch"[\s\S]*?<\/svg>/)?.[0];
  if (!icon) throw Error('History branch icon missing');
  const template = fs.readFileSync(new URL('sheet-review-history.html', import.meta.url), 'utf8').replace('BRANCH_ICON', icon);
  t = t.slice(0, start) + template + t.slice(end);
  const photos = `<sc-if value="{{ round.referenceImages.length }}"><div class="pm-review-reference-strip" role="group" aria-label="本轮返工参考图"><sc-for list="{{ round.referenceImages }}" as="photo" hint-placeholder-count="0"><a href="{{ photo.url }}" target="_blank" rel="noopener noreferrer" title="{{ photo.name }}"><img src="{{ photo.url }}" alt="{{ photo.name }}" loading="lazy" /></a></sc-for></div></sc-if>`;
  t = t.replace('<p>{{ round.note }}</p>', '<p>{{ round.note }}</p>' + photos);
  return t.replace('class Component extends DCLogic {', 'class Component extends DCLogic {' + fs.readFileSync(new URL('sheet-review-history-methods.js', import.meta.url), 'utf8'));
}
