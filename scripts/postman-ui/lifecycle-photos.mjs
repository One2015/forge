import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
export const lifecyclePhotoCopy = [
  ["  async addFeedbackImages(key, files) {", "  async addFeedbackImages(key, files) {\n    const limit = /^(?:life|sheet|branch):/.test(key) ? 8 : 6;"],
  ["if (images.length >= 6) { errors.push('最多添加 6 张图片，请先移除不需要的图片。'); break; }", "if (images.length >= limit) { errors.push('最多添加 ' + limit + ' 张图片，请先移除不需要的图片。'); break; }"],
  ["  feedbackView(key) {", "  feedbackView(key) {\n    const limit = /^(?:life|sheet|branch):/.test(key) ? 8 : 6;"],
  ["emptySlots: Array.from({ length: Math.max(0, 6 - images.length) }", "emptySlots: Array.from({ length: Math.max(0, limit - images.length) }"],
  ["      count: images.length + ' / 6', full: images.length >= 6,", "      count: images.length + ' / ' + limit, full: images.length >= limit,"],
  ["      countLabel: '已上传 ' + images.length + '/6 张', remaining: Math.max(0, 6 - images.length),", "      countLabel: '已上传 ' + images.length + '/' + limit + ' 张', remaining: Math.max(0, limit - images.length),"],
  ["      uploadLabel: images.length >= 6 ? '已达 6 张上限' : '点击上传图片',", "      uploadLabel: images.length >= limit ? '已达 ' + limit + ' 张上限' : '点击上传图片',"],
  ["      capacityHint: images.length >= 6 ? '移除一张后可继续上传' : '还可上传 ' + (6 - images.length) + ' 张',", "      capacityHint: images.length >= limit ? '移除一张后可继续上传' : '还可上传 ' + (limit - images.length) + ' 张',"],
  ["      : s.view === 'review' && s.reviewOpen", "      : s.view === 'itemlife' && s.lifeAppend && s.lifeItem && !s.zoom ? 'life:' + s.lifeItem\n      : s.view === 'review' && s.reviewOpen"],
  ["openAppend: () => this.setState({ lifeAppend: true, lifeText: '', lifeImgs: 0 }),", "openAppend: () => { this.setFeedbackImages('life:' + r[2], [], ''); this.setState({ lifeAppend: true, lifeText: '', lifeImgs: 0 }); },"],
  ["cancelAppend: () => this.setState({ lifeAppend: false, lifeText: '', lifeImgs: 0 }),", "cancelAppend: () => { this.setFeedbackImages('life:' + r[2], [], ''); this.setState({ lifeAppend: false, lifeText: '', lifeImgs: 0 }); },"],
  ["        canSubmit: (st.lifeText || '').trim().length > 0,\n        cannotSubmit: (st.lifeText || '').trim().length === 0,", "        canSubmit: (st.lifeText || '').trim().length > 0 && !this.feedbackView('life:' + r[2]).loading,\n        cannotSubmit: (st.lifeText || '').trim().length === 0 || this.feedbackView('life:' + r[2]).loading,"],
  ["((st.lifeImgs || 0) ? ' · 携带 ' + st.lifeImgs + ' 张参考图' : '')", "(this.feedbackImages('life:' + r[2]).length ? ' · 携带 ' + this.feedbackImages('life:' + r[2]).length + ' 张参考图' : '')"],
  ["        imgCount: (st.lifeImgs || 0) + '/8 张',\n        images: Array.from({ length: st.lifeImgs || 0 }).map(() => ({\n          remove: e => { e.stopPropagation(); this.setState({ lifeImgs: Math.max(0, (st.lifeImgs || 0) - 1) }); }\n        })),\n        canAddImage: (st.lifeImgs || 0) < 8,\n        addImage: () => this.setState({ lifeImgs: Math.min(8, (st.lifeImgs || 0) + 1) }),", "        feedback: this.pmLifeFeedback(r[2]),"]
];
const methods = `
  // pm-lifecycle-photos:start
  pmLifeFeedback(itemId) {
    const key = 'life:' + itemId, view = this.feedbackView(key), count = view.images.length;
    return { ...view, full: count >= 8, remaining: Math.max(0, 8 - count),
      countLabel: '已上传 ' + count + '/8 张',
      emptySlots: Array.from({length: Math.max(0, 8 - count)}, (_, index) => ({position: count + index + 1, label: '上传参考图片到第 ' + (count + index + 1) + ' 个空位'})) };
  }
  // pm-lifecycle-photos:end
`;
export function installLifecyclePhotos(t) {
  for (const [from, to] of lifecyclePhotoCopy) {
    if (!t.includes(from)) throw Error('Lifecycle photo anchor changed: ' + from.slice(0, 70));
    t = t.replace(from, () => to);
  }
  const start = t.indexOf('<div style="margin-top:12px;border:1px solid #ece7df;border-radius:10px;padding:13px;background:#fff">');
  const end = t.indexOf('<div style="display:flex;align-items:center;gap:11px;margin-top:12px;flex-wrap:wrap">', start);
  if (start < 0 || end < start || !t.slice(start, end).includes('life.imgCount')) throw Error('Lifecycle upload markup boundary changed');
  const slots = read('photo-slots.html').replaceAll('VIEW', 'life.feedback').replaceAll('HELP_ID', 'pm-life-photo-help')
    .replaceAll('/6', '/8').replace('最多 6 张', '最多 8 张')
    .replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => read('../../assets/phosphor/regular/' + name + '.svg').replace(/<svg[^>]*>/, '<svg class="forge-icon" width="' + size + '" height="' + size + '" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));
  t = t.slice(0, start) + '<div class="pm-life-photos">' + slots + '<sc-if value="{{ life.feedback.hasError }}"><p class="forge-feedback-error" role="alert">{{ life.feedback.error }}</p></sc-if></div>\n\n                ' + t.slice(end);
  return t.replace('class Component extends DCLogic {', () => 'class Component extends DCLogic {\n' + methods);
}
