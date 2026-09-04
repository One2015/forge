import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const host = binding => `<div class="forge-artifact-host" data-forge-artifact="{{ ${binding} }}"><div class="forge-artifact-fallback"><span>产物查看器加载中…</span><noscript>请启用 JavaScript 查看产物。</noscript></div></div>`;

export function updateArtifactPreview(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const methods = /  \/\/ artifact-preview:start[\s\S]*?  \/\/ artifact-preview:end/;
  if (methods.test(template)) template = template.replace(methods, () => read('artifact-preview-methods.js'));
  else template = template.replace('  renderVals() {', () => read('artifact-preview-methods.js') + '\n\n  renderVals() {');
  if (!template.includes('sheet.pick.artifactConfig')) {
    const old = /<div style="font-family:ui-monospace[^>]+>{{ sheet\.pick\.previewCaption }}<\/div>/;
    if (!old.test(template)) throw new Error('Delivery preview caption missing');
    template = template.replace(old, () => host('sheet.pick.artifactConfig'));
    template = template.replace('            previewCaption: r[0]', "            artifactConfig: this.artifactPreviewData(r[2], itemState.candidateVersion?.runId || itemState.currentDeliverableVersion?.runId || r[5], r[0], /web3d/i.test(r[1])),\n            previewCaption: r[0]");
  }
  if (!template.includes('it.artifactConfig')) {
    const preview = /<section class="review-workbench-preview" aria-label="产物预览">[\s\S]*?(?=\n  <aside class="review-workbench-panel")/;
    if (!preview.test(template)) throw new Error('Review preview missing');
    template = template.replace(preview, () => '<section class="review-workbench-preview" aria-label="产物预览">\n    ' + host('it.artifactConfig') + '\n  </section>');
    const anchor = '            artifactSummary: ds?.web3d';
    if (!template.includes(anchor)) throw new Error('Review artifact data missing');
    template = template.replace(anchor, "            artifactConfig: this.artifactPreviewData(meta[0], rec?.id, row.shortName || meta[1], ds?.web3d, { mode: st.reviewTab === '文件' ? 'files' : 'preview', serial: st.artifactRequest || 0 }),\n" + anchor);
    template = template.replace("previewFiles: e => { e.stopPropagation(); this.setState({ reviewTab: '文件' }); },", "previewFiles: e => { e.stopPropagation(); this.setState({ reviewTab: '文件', artifactRequest: (this.state.artifactRequest || 0) + 1 }); },");
  }
  const css = /\/\* artifact-preview:start \*\/[\s\S]*?\/\* artifact-preview:end \*\//;
  if (css.test(template)) template = template.replace(css, () => read('artifact-preview.css'));
  else template = template.replace('</style>', () => read('artifact-preview.css') + '\n</style>');
  if (!template.includes('src="/forge-artifact-preview.js"')) template = template.replace('</head>', '<script src="/forge-artifact-preview.js" defer></script>\n</head>');
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateArtifactPreview(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Added shared artifact preview / file list and 3D viewer');
}
