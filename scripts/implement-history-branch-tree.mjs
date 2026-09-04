import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url), source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const replace = (pattern, value) => { if (!pattern.test(template)) throw new Error('Missing target: ' + pattern); template = template.replace(pattern, () => value); };
const markup = name => read(name).replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});
// Replace a balanced template element, including nested instances of the same tag.
function elementAt(needle, tag, replacement, from = 0) {
  const at = template.indexOf(needle, from); if (at < 0) throw new Error('Missing element: ' + needle);
  const tokens = new RegExp('</?' + tag + '(?=[\\s>])[^>]*>', 'g'); tokens.lastIndex = at;
  let depth = 0, match;
  while ((match = tokens.exec(template))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) { template = template.slice(0, at) + replacement + template.slice(tokens.lastIndex); return; }
  }
  throw new Error('Unbalanced element: ' + needle);
}
replace(/  \/\/ feedback-workflows:start[\s\S]*?  \/\/ feedback-workflows:end/, read('feedback-methods.js'));
if (template.includes('// history-branch-tree:start')) replace(/  \/\/ history-branch-tree:start[\s\S]*?  \/\/ history-branch-tree:end/, read('history-branch-methods.js'));
else template = template.replace('  // feedback-workflows:start', read('history-branch-methods.js') + '\n\n  // feedback-workflows:start');
if (template.includes('<!-- history-node-header:start -->')) replace(/<!-- history-node-header:start -->[\s\S]*?<!-- history-node-header:end -->/, '<!-- history-node-header:start -->\n' + markup('history-node-header.html') + '\n<!-- history-node-header:end -->');
else {
  elementAt('<div sc-camel-on-click="{{ n.toggle }}" style="display:grid;grid-template-columns:56px', 'div', '<!-- history-node-header:start -->\n' + markup('history-node-header.html') + '\n<!-- history-node-header:end -->');
}
// The new header also contains n.canFork. Remove only the legacy body editor after it.
if (template.includes('{{ n.forkClosed }}')) elementAt('<sc-if value="{{ n.canFork }}"', 'sc-if', '', template.indexOf('<!-- history-node-header:end -->'));
if (template.includes('<!-- history-branch-tree:start -->')) replace(/<!-- history-branch-tree:start -->[\s\S]*?<!-- history-branch-tree:end -->/, markup('history-branch-tree.html'));
else elementAt('<sc-if value="{{ n.hasForks }}"', 'sc-if', markup('history-branch-tree.html'));
if (template.includes('/* history-branch-tree:start */')) replace(/\/\* history-branch-tree:start \*\/[\s\S]*?\/\* history-branch-tree:end \*\//, read('history-branch-tree.css'));
else template = template.replace('</style>', read('history-branch-tree.css') + '\n</style>');
// Reuse existing history expansion and reroll behavior; replace only the inline fork flow.
if (!template.includes('...this.historyBranchNodeValues(')) {
  replace(/            toggleHasChevron: !canForkNode,[\s\S]*?            expanded: open,/, `            toggleHasChevron: true, toggleRotation: open ? '180deg' : '0deg',
            toggleLabel: open ? '收起' : '展开', expandLabel: (open ? '收起' : '展开') + ' · ' + n.kind + ' · ' + n.title,
            toggle: () => this.setState({lifeNodes: Object.assign({}, st.lifeNodes, {[key]: !open})}),
            expanded: open,`);
  replace(/            forkOpen: st\.forkAt === key,[\s\S]*?\n          };\n        \}\),\n        canAppend:/, `            ...this.historyBranchNodeValues({item: r[2], name: r[0], runId: r[5] || st.lifeRun, key, kind: n.kind, origin, parent: br, canFork: canForkNode})
          };
        }),
        canAppend:`);
  template = template.replace("const canForkNode = !br && n.kind !== '交付' && n.kind !== '数据集' && n.badge !== '失败' && !n.inherited;", "const canForkNode = n.kind !== '交付' && n.kind !== '数据集' && n.kind !== '分支' && n.badge !== '失败' && !n.inherited;");
}
// Branch-scoped records use the same live status as their tree node.
if (!template.includes('const lifeBranchRecord =')) {
  template = template.replace('      // rounds always come from the Item itself;', `      const lifeBranchRecord = br && (st.forks?.[br.key] || []).find(record => record.name === br.name);
      const lifeBranchState = lifeBranchRecord ? this.historyBranchStatus(lifeBranchRecord) : 'queued';
      const lifeBranchTone = this.statusOf(['queued', 'running', 'failed'].includes(lifeBranchState) ? 'run' : 'item', lifeBranchState);
      const lifeBranchRun = lifeBranchRecord && this.runsData().find(run => run.id === lifeBranchRecord.runId);
      // rounds always come from the Item itself;`);
  template = template.replace("kind: 'Run 1', title: '分支执行', badge: this.statusOf('run', 'running').label, t: 'brand',", "kind: 'Run 1', title: '分支执行', badge: lifeBranchTone.label, t: ['review', 'deliverable'].includes(lifeBranchState) ? 'green' : 'neutral',");
  template = template.replace("summary: 'build_repair · 运行中',", "summary: (lifeBranchRecord?.runId || '独立分支') + ' · ' + lifeBranchTone.label,");
  template = template.replace("preview: '/api/previews/pv2_' + bid + '/dist/index.html', previewCaption: br.name + ' · 当前产物',", "preview: lifeBranchRun?.previewUrl || null, previewCaption: br.name + ' · 当前产物',");
  template = template.replace("bodyLabel: '执行摘要', body: '继承派生节点的 workspace，按分支说明重做。',", "bodyLabel: '执行摘要', body: lifeBranchState === 'queued' ? '修改请求已加入运行队列，等待执行。来源版本保持不变。' : '按分支说明独立执行，来源版本保持不变。',");
  template = template.replace("state: br ? this.statusOf('run', 'running').label", "state: br ? lifeBranchTone.label");
  template = template.replace("fg: br ? this.statusOf('run', 'running').fg", "fg: br ? lifeBranchTone.fg");
  template = template.replace("border: br ? this.statusOf('run', 'running').border", "border: br ? lifeBranchTone.border");
  template = template.replace("{ k: '分支成本', v: '进行中', fg: '#8a5a16' }", "{ k: '分支成本', v: lifeBranchRun?.cost || '—', fg: 'var(--forge-muted)' }");
  template = template.replace("? '分支进行中 · 不占用主线轮次'", "? lifeBranchTone.label + ' · 不占用主线轮次'");
  template = template.replace("const from = newest ? (raw[Number(newest.split(':')[1])] || {}).kind : '';", "const from = newest ? newest.slice((r[2] + ':').length) : '';");
}
// Scoped hooks keep the current history responsive without changing surrounding pages.
const oldLayout = '<div style="display:flex;align-items:stretch;gap:clamp(12px,1.6vw,20px);flex-wrap:wrap">';
const headerEnd = template.indexOf('<!-- history-node-header:end -->');
const layoutAt = template.indexOf(oldLayout, headerEnd);
if (layoutAt >= 0) template = template.slice(0, layoutAt) + '<div class="forge-life-node-layout" data-branches="{{ n.hasForks }}" data-expanded="{{ n.expanded }}">' + template.slice(layoutAt + oldLayout.length);
if (template.includes('color:#6a4bb8;cursor:pointer;white-space:nowrap')) {
  const shortcut = template.match(/<div sc-camel-on-click="{{ life.jumpBranch }}"[^>]*>([\s\S]*?)<\/div>/);
  if (shortcut) template = template.replace(shortcut[0], '<button type="button" class="forge-life-branch-shortcut" sc-camel-on-click="{{ life.jumpBranch }}" title="点击定位到最近一条分支">' + shortcut[1] + '</button>');
}
template = template.replace('<div style="max-width:1000px;margin:0 auto;padding:26px', '<div class="forge-life-page" style="max-width:1000px;margin:0 auto;padding:26px');
template = template.replace('<div style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;padding:22px clamp(16px,2.4vw,26px)">', '<div class="forge-life-history" style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;padding:22px clamp(16px,2.4vw,26px)">');
template = template.replace('<div style="position:relative;border-left:1px solid var(--forge-control-border);padding:0 0 18px 26px">', '<div class="forge-life-node" style="position:relative;border-left:1px solid var(--forge-control-border);padding:0 0 18px 26px">');
template = template.replace('<div style="flex:{{ n.bodyFlex }};', '<div class="forge-life-node-body" style="flex:{{ n.bodyFlex }};');
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (result !== source) fs.writeFileSync(file, result);
console.log('Updated history append flow and connected branch tree.');
