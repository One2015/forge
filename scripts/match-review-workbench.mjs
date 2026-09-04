import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const swap = (before, after) => {
  if (template.split(before).length !== 2) throw new Error('Expected unique source: ' + before.slice(0, 100));
  template = template.replace(before, after);
};
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const paths = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${paths}</svg>`;
};
const markup = fs.readFileSync(new URL('./templates/review-workbench.html', import.meta.url), 'utf8').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
const css = fs.readFileSync(new URL('./templates/review-workbench.css', import.meta.url), 'utf8');
if (!template.includes('<!-- review-workbench:start -->')) {
  const begin = template.indexOf('\n            <sc-if value="{{ it.expanded }}"');
  const finish = template.indexOf('\n          </div>\n        </sc-for>', begin);
  if (begin < 0 || finish < 0) throw new Error('Missing pending review expansion');
  template = template.slice(0, begin) + '            <sc-if value="{{ it.expanded }}" hint-placeholder-val="{{ false }}">\n' + markup + '            </sc-if>' + template.slice(finish);
  swap('<div sc-camel-on-click="{{ it.stop }}" role="{{ it.dialogRole }}"', '<div data-review-workbench="{{ it.expanded }}" sc-camel-on-click="{{ it.stop }}" role="{{ it.dialogRole }}"');
  swap('<div sc-camel-on-click="{{ it.toggle }}" style="flex:none;display:grid;grid-template-columns:124px', '<div class="review-queue-card-header" sc-camel-on-click="{{ it.toggle }}" style="flex:none;display:grid;grid-template-columns:124px');
  swap('  componentDidMount() {', `  // Keep modal keyboard actions scoped to the active Item, never submit a verdict directly.
  openReviewFocus(key) {
    if (typeof document !== 'undefined') this._reviewTrigger = document.activeElement;
    this.setState({ reviewOpen: key, reviewTab: '预览' });
    setTimeout(() => {
      if (typeof document !== 'undefined') document.querySelector('.review-workbench-back')?.focus();
    }, 0);
  }

  closeReviewFocus() {
    this.setState({ reviewOpen: null, deepReview: null });
    setTimeout(() => {
      if (this._reviewTrigger?.isConnected) this._reviewTrigger.focus();
    }, 0);
  }

  handleReviewKey(e) {
    if (this.state.view !== 'review' || !this.state.reviewOpen) return false;
    if (this.state.passAsk || this.state.reworkAsk || this.state.zoom) return true;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const typing = active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable);
    if (e.key === 'Escape') { e.preventDefault(); this.closeReviewFocus(); return true; }
    if (e.key === 'Tab' && typeof document !== 'undefined') {
      const root = document.querySelector('[data-review-workbench="true"]');
      const controls = root ? Array.from(root.querySelectorAll('button:not([disabled]), a[href], textarea, [tabindex="0"]')).filter(el => el.getClientRects().length) : [];
      const first = controls[0], last = controls[controls.length - 1];
      if (first && (e.shiftKey && active === first || !e.shiftKey && active === last || !root.contains(active))) {
        e.preventDefault(); (e.shiftKey ? last : first).focus();
      }
      return true;
    }
    if (typing || e.altKey || e.ctrlKey || e.metaKey) return true;
    const review = this.renderVals().review;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      (e.key === 'ArrowDown' ? review.next : review.previous)();
    } else {
      const row = review.items.find(item => item.expanded);
      if (row?.pending && ['a', 'r'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        (e.key.toLowerCase() === 'a' ? row.pass : row.rework)(e);
      }
    }
    return true;
  }

  componentDidMount() {`);
  swap(`      if (this.state.view === 'review' && this.state.reviewOpen && e.key === 'Escape') {
        e.preventDefault();
        this.setState({ reviewOpen: null, reworkDrafts: {} });
        return;
      }`, '      if (this.handleReviewKey(e)) return;');
  swap(`      const focusedRow = st.reviewOpen ? shown.find(r => r.key === st.reviewOpen) : null;
      if (focusedRow) shown = [focusedRow];`, '      // Sort the queue before selecting its focused Item so navigation retains the full scope.');
  swap('      const pendingN = shown.filter', `      const navigationRows = shown.slice();
      const focusedIndex = navigationRows.findIndex(r => r.key === st.reviewOpen);
      const switchReview = delta => {
        if (navigationRows.length < 2) return;
        const index = (Math.max(0, focusedIndex) + delta + navigationRows.length) % navigationRows.length;
        this.setState({ reviewOpen: navigationRows[index].key, reviewTab: '预览' });
      };
      if (focusedIndex >= 0) shown = [navigationRows[focusedIndex]];
      const pendingN = shown.filter`);
  swap('        closeFocus: () => this.setState({ reviewOpen: null, reworkDrafts: {} }),', `        closeFocus: () => this.closeReviewFocus(),
        positionLabel: (focusedIndex < 0 ? 0 : focusedIndex + 1) + ' / ' + navigationRows.length,
        cannotSwitch: navigationRows.length < 2,
        next: () => switchReview(1),
        previous: () => switchReview(-1),`);
  swap(`            start: e => { e.stopPropagation(); this.setState({ reviewOpen: key }); },`, `            start: e => { e.stopPropagation(); this.openReviewFocus(key); },`);
  swap(`            toggle: () => this.setState({ reviewOpen: st.reviewOpen === key ? null : key }),`, `            toggle: () => st.reviewOpen === key ? this.closeReviewFocus() : this.openReviewFocus(key),`);
  swap(`          const authorTone = { allen: '#8f4029', yokiguan: '#6b645d', cli: '#6a4bb8' }[row.author] || '#4f7a52';`, `          const authorTone = { allen: '#8f4029', yokiguan: '#6b645d', cli: '#6a4bb8' }[row.author] || '#4f7a52';
          const references = (Array.isArray(rec?.references) ? rec.references : []).filter(ref => ref && ref.url);
          const sample = (st.sampleLabels || {})[meta[0]];
          const markSample = value => e => {
            e.stopPropagation();
            const labels = Object.assign({}, this.state.sampleLabels || {});
            if (labels[meta[0]] === value) delete labels[meta[0]];
            else labels[meta[0]] = value;
            this.setState({ sampleLabels: labels });
          };`);
  swap(`            authorInitial: row.author.slice(0, 1).toUpperCase(),`, `            authorInitial: row.author.slice(0, 1).toUpperCase(),
            submitter: row.author,
            reviewer: row.assignee,
            reviewerInitial: row.assignee.slice(0, 1).toUpperCase(),
            assetType: ds?.web3d ? '建筑' : (ds?.group || '网页'),
            fileFormat: ds?.web3d ? 'Three.js' : 'HTML',
            generatedAt: rec?.createdAt ? this.stampOf(rec.createdAt) : (rec ? this.ago(rec.h) : '—'),
            submittedWhen: rec ? this.ago(rec.h).trim() : '—',
            pipelineLabel: rec ? rec.pipe + ' ' + rec.ver : '—',
            promptText: meta[4] || '—',
            artifactSummary: ds?.web3d ? 'scene.glb · index.html' : 'index.html · main.js',
            goodCase: sample === 'good', badCase: sample === 'bad',
            markGood: markSample('good'), markBad: markSample('bad'),
            hasReferences: references.length > 0,
            referenceCount: references.length + '/' + references.length + ' 可用',
            referenceSource: references.length ? '来源：Case 原始资料' : '当前本地样例未提供参考资料',
            referenceSlots: Array.from({ length: 4 }, (_, i) => ({
              available: !!references[i], empty: !references[i],
              url: references[i]?.url || '', name: references[i]?.name || ('参考图 ' + (i + 1))
            })),
            previewImage: rec?.previewImage || '',
            hasPreviewImage: !!rec?.previewImage, noPreviewImage: !rec?.previewImage,
            workbenchPreviewTitle: row.failed ? '本轮运行没有生成可审核产物' : '暂无产物预览',
            workbenchPreviewHint: row.failed ? '请前往生产配置 Reroll' : '当前本地样例未包含模型或预览文件',
            returnPreview: e => { e.stopPropagation(); this.setState({ reviewTab: '预览' }); },`);
  swap(`            rework: e => { e.stopPropagation(); this.setState({ reworkDrafts: Object.assign({}, st.reworkDrafts, { [key]: true }), reviewOpen: key }); },`, `            rework: e => {
              e.stopPropagation();
              this.setState({ reworkDrafts: Object.assign({}, st.reworkDrafts, { [key]: true }), reviewOpen: key });
              setTimeout(() => {
                if (typeof document !== 'undefined') document.querySelector('.review-workbench-rework-form textarea')?.focus();
              }, 0);
            },`);
} else {
  template = template.replace(/<!-- review-workbench:start -->[\s\S]*?<!-- review-workbench:end -->/, markup.trim());
}
if (!template.includes('// Open an Item-specific pending entry directly in its workbench.')) {
  swap(`      reviewReturn: ret,
      deepReview: null
    }, o));`, `      reviewReturn: ret,
      reviewOpen: null,
      deepReview: null
    }, o));
    // Open an Item-specific pending entry directly in its workbench.
    if (o.deepReview?.itemId && (o.deepReview.runId || runId)) {
      this.setState({ reviewQuery: '' });
      this.openReviewFocus((o.deepReview.runId || runId) + ':' + o.deepReview.itemId);
    }`);
}
// The collapsed queue card and expanded workbench must be siblings; nesting the
// workbench in the queue header would hide it together with that header.
const headerStart = template.indexOf('<div class="review-queue-card-header"');
const workbenchStart = template.indexOf('<!-- review-workbench:start -->');
if (headerStart < 0 || workbenchStart < headerStart) throw new Error('Missing queue header');
const header = fs.readFileSync(new URL('./templates/review-queue-header.html', import.meta.url), 'utf8').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);
template = template.slice(0, headerStart) + header + '\n<sc-if value="{{ it.expanded }}" hint-placeholder-val="{{ false }}">\n' + template.slice(workbenchStart);
if (template.includes('/* review-workbench:start */')) {
  template = template.replace(/\/\* review-workbench:start \*\/[\s\S]*?\/\* review-workbench:end \*\//, css.trim());
} else {
  swap('</style>', css + '\n</style>');
}
const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Updated screenshot-aligned review workbench');
