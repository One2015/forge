import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);
assert(start >= 0 && end > start, 'Forge bundle not found');
let template = JSON.parse(source.slice(start + open.length, end).trim());
const alignRerollCopy = text => text
  .replaceAll('沿用原数据集与 Item 发起 Reroll', '前往生产，选择 Pipeline、数据集和 Item 后发起 Reroll')
  .replaceAll('查看失败原因后可直接 Reroll', '查看失败原因后可前往生产配置 Reroll');
const writeBundle = text => {
  const encoded = JSON.stringify(alignRerollCopy(text)).replaceAll('</script>', '<\\u002Fscript>');
  fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
};
if (template.includes('  selectRunPipeline(p, datasetName = null) {')) {
  writeBundle(template);
  console.log('Reroll already uses the production selection flow');
  process.exit(0);
}
const swap = (before, after, expected = 1) => {
  assert.equal(template.split(before).length - 1, expected, `Unexpected match count: ${before.slice(0, 100)}`);
  template = template.replaceAll(before, after);
};
const replaceSection = (from, to, replacement) => {
  const a = template.indexOf(from);
  const b = template.indexOf(to, a + from.length);
  assert(a >= 0 && b > a, `Missing section: ${from}`);
  template = template.slice(0, a) + replacement + template.slice(b);
};

// Reroll carries provenance, never a preselected execution configuration.
swap("    const picked = item ? { [String(c.itemId)]: true } : {};\n", '');
swap("      view: 'datasets',\n      runPipeline: known ? known.name + ' ' + recommended : '',\n      selDs: ds ? ds.name : null,\n      dsVersion: ds ? (ds.version || 'v1') : null,\n      picked,",
  "      view: 'pipelines',\n      runPipeline: null, selDs: null, dsVersion: null, dsVersions: false, picked: {},\n      pipeQuery: '', pipeFilter: '全部', openPipe: null, dsQuery: '', copied: null,\n      reviewOpen: null, sheetRow: null,");
swap("      rerollEditing: false,\n", '');
swap("    rerollEditing: forgeCaptureValue('rerollEditing') === 'true',\n", '');
swap("    if (item) setTimeout(() => {\n      const el = document.querySelector('[data-reroll-target=\"true\"]');\n      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });\n    }, 80);\n", '');

const methods = `  // Shared by ordinary creation and Reroll. Only explicit user choices advance.
  openPipelineSelection(keepReroll = false) {
    this.setState(Object.assign({
      view: 'pipelines', runPipeline: null, selDs: null, dsVersion: null,
      dsVersions: false, picked: {}, dsQuery: '', pipeQuery: '', pipeFilter: '全部', openPipe: null,
    }, keepReroll ? {} : {
      rerollFrom: null, rerollSubject: '', rerollDs: '', rerollPipe: '', rerollReason: '',
      rerollRecommended: '', rerollHasHigher: false, rerollDsValid: false,
      rerollItemValid: false, rerollContext: null,
    }));
  }

  selectRunPipeline(p, datasetName = null) {
    const related = new Set((p.datasets || []).map(d => d[0]));
    const selected = datasetName && related.has(datasetName)
      ? this.dsData().find(d => d.name === datasetName) : null;
    this.setState({
      view: 'datasets', runPipeline: p.name + ' ' + p.version,
      selDs: selected ? selected.name : null, dsVersion: selected ? selected.version || 'v1' : null,
      dsVersions: false, dsQuery: '', copied: null, picked: {},
    });
  }

`;
swap('  startReroll(ctx) {', methods + '  startReroll(ctx) {');
swap("        run: () => this.setState({\n          view: 'datasets', runPipeline: p.name + ' ' + p.version,\n          selDs: st.rerollFrom && st.rerollDsValid ? st.rerollDs : null,\n          picked: st.rerollFrom && st.rerollItemValid ? { [st.rerollFrom]: true } : {}\n        }),",
  "        run: () => this.selectRunPipeline(p),");
swap("open: e => { e.stopPropagation(); this.setState({ view: 'datasets', selDs: d[0], runPipeline: p.name + ' ' + p.version, picked: {} }); }",
  "open: e => { e.stopPropagation(); this.selectRunPipeline(p, d[0]); }");
swap("run: () => this.setState({ view: 'datasets', runPipeline: p.name + ' ' + p.version, selDs: st.editDs, picked: {} }),",
  "run: () => this.selectRunPipeline(p, st.editDs),");
swap("runAnyway: () => this.setState({ view: 'datasets', runPipeline: p.name + ' ' + p.version, selDs: st.editDs || null, picked: {} }),",
  "runAnyway: () => this.selectRunPipeline(p, st.editDs || null),");
swap("        picked: st.rerollFrom && d.name === st.rerollDs && (d.items || []).some(i => i[0] === st.rerollFrom)\n          ? { [st.rerollFrom]: true }\n          : {}",
  "        dsVersions: false, copied: null, picked: {}");
swap("picked: st.rerollFrom && cur.items.some(i => i[0] === st.rerollFrom) ? { [st.rerollFrom]: true } : {}", 'picked: {}');

// The same dataset picker in both flows shows only the chosen pipeline's links.
swap("    let dss = this.dsData();", `    const selectedPipelineName = String(st.runPipeline || '').replace(/\\s+v\\d+$/, '');
    const selectedPipeline = this.pipeData().find(p => p.name === selectedPipelineName) || null;
    const linkedNames = new Set(selectedPipeline ? (selectedPipeline.datasets || []).map(d => d[0]) : []);
    const availableDatasets = this.dsData().filter(d => !st.runPipeline || linkedNames.has(d.name));
    let dss = availableDatasets;`);
swap("    const cur = this.dsData().find(d => d.name === st.selDs) || null;", "    const cur = availableDatasets.find(d => d.name === st.selDs) || null;");
swap('        canRun: pickedIds.length > 0,\n        cannotRun: pickedIds.length === 0,',
  '        canRun: !!selectedPipeline && pickedIds.length > 0,\n        cannotRun: !selectedPipeline || pickedIds.length === 0,');
swap('showRunArrow: !st.rerollFrom && pickedIds.length > 0,', 'showRunArrow: !!selectedPipeline && !st.rerollFrom && pickedIds.length > 0,');
swap("        submit: () => {\n          const id = '20260825-'", "        submit: () => {\n          if (!selectedPipeline || !pickedIds.length) return;\n          const id = '20260825-'");
swap("              itemIds: pickedIds.slice(), dsName: cur.name", `              itemIds: pickedIds.slice(), dsName: cur.name,
              dsVersion: st.dsVersion || cur.version || 'v1',
              rerollSource: st.rerollFrom ? Object.assign({}, st.rerollContext) : null`);
swap("            view: 'submitted',\n            runIds:", "            view: 'submitted',\n            rerollFrom: null, rerollContext: null,\n            runIds:");

// Remove the alternate auto-filled confirmation surface; leave the normal picker.
replaceSection('      <sc-if value="{{ rerollCompact }}"', '      <div style="display:{{ datasetPickerDisplay }};', '');
swap('display:{{ datasetPickerDisplay }};', 'display:flex;', 2);
replaceSection('      rerollHintText: (() => {', '      clearPipeQuery:', `      rerollHintText: (() => {
        const parts = [];
        if (view === 'pipelines') {
          parts.push('请先选择 Pipeline，再选择关联数据集和 Item，完成后确认 Reroll。');
          if (st.rerollRecommended) parts.push('参考 Pipeline：' + st.rerollRecommended + '（未选择）');
        } else if (!st.runPipeline) {
          parts.push('请先返回生产选择 Pipeline，再选择数据集和 Item。');
        } else if (!cur) {
          parts.push('已选择 ' + st.runPipeline + '，请从列表选择关联数据集。');
        } else if (!(ds.canRun)) {
          parts.push('已选择数据集 ' + cur.name + '，请手动勾选要运行的 Item。');
        } else {
          parts.push('请核对所选 Pipeline、数据集和 Item；确认后创建新运行，原运行记录保持不变。');
        }
        if (st.rerollDs && !st.rerollDsValid) parts.push('来源数据集已不可用，可选择其他关联数据集');
        else if (st.rerollDsValid && !st.rerollItemValid) parts.push('原 Item 已不在来源数据集中，请重新选择');
        return parts.join(' · ');
      })(),
      clearReroll: () => this.setState({
        rerollFrom: null, rerollSubject: '', rerollDs: '', rerollPipe: '', rerollReason: '',
        rerollRecommended: '', rerollHasHigher: false, rerollDsValid: false,
        rerollItemValid: false, rerollContext: null, picked: {},
      }),
      showRunSteps: !!st.runPipeline,
`);
swap("goPipelines: () => this.setState({ view: 'pipelines' }),", 'goPipelines: () => this.openPipelineSelection(),');
swap("{ label: '选择 Pipeline', value: st.runPipeline || '未选择', done: true, action: '换一个', onClick: () => this.setState({ view: 'pipelines' }) },",
  "{ label: '选择 Pipeline', value: st.runPipeline || '未选择', done: !!selectedPipeline, action: '换一个', onClick: () => this.openPipelineSelection(true) },");
swap("dsSubtitle: this.dsData().length + ' 个数据集 · Item 字段与完整 ID 直接可见',",
  "dsSubtitle: st.runPipeline ? '当前 Pipeline 关联 ' + availableDatasets.length + ' 个数据集 · 请选择数据集和 Item' : this.dsData().length + ' 个数据集 · Item 字段与完整 ID 直接可见',");
swap("dsCount: dss.length + ' / ' + this.dsData().length,", "dsCount: dss.length + ' / ' + availableDatasets.length,");
swap('      dsEmpty: dss.length === 0,', `      dsEmpty: dss.length === 0,
      dsEmptyHint: st.runPipeline && !availableDatasets.length
        ? '当前 Pipeline 暂无可用的关联数据集，请返回选择其他 Pipeline。'
        : '试试搜 SD / PA 编号或 style_tag，也可以清空搜索查看可选数据集。',
      dsEmptyCta: st.runPipeline && !availableDatasets.length ? '返回选择 Pipeline' : '清除搜索',
      dsEmptyAction: () => st.runPipeline && !availableDatasets.length
        ? this.openPipelineSelection(true) : this.setState({ dsQuery: '' }),`);
swap('试试搜 SD / PA 编号或 style_tag，也可以清空搜索看全部数据集。', '{{ dsEmptyHint }}');
swap('sc-camel-on-click="{{ clearDsQuery }}"', 'sc-camel-on-click="{{ dsEmptyAction }}"');
template = template.replace(/(sc-camel-on-click="\{\{ dsEmptyAction \}\}"[^>]*>)清除搜索/, '$1{{ dsEmptyCta }}');

assert(!template.includes('rerollCompact'));
assert(!template.includes('系统已沿用原配置'));
assert(template.includes("sampleTabs: [['good', 'good case'], ['bad', 'bad case']]"));
assert.equal([...template.matchAll(/data-phosphor=/g)].length, 99);
writeBundle(template);
console.log('Reroll now follows Pipeline → related dataset → explicit Item selection → confirmation.');
