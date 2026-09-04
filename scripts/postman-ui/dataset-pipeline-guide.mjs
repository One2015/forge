export const datasetPipelineCopy = [
 ["        cannotRun: !selectedPipeline || pickedIds.length === 0,", "        cannotRun: !!selectedPipeline && pickedIds.length === 0,\n        needsPipeline: !selectedPipeline, choosePipeline: () => this.pmChooseDatasetPipeline(cur, pickedIds),"],
 ["          : (pickedIds.length ? '运行前需要先选择 Pipeline' : '勾选 Item 后即可运行')", "          : '运行 Item 前，请先选择 Pipeline。'"],
 ["  openPipelineSelection(keepReroll = false) {\n    this.setState(Object.assign({", "  openPipelineSelection(keepReroll = false) {\n    this.setState(Object.assign({ pmDatasetRunContext: null,"],
 ["  selectRunPipeline(p, datasetName = null) {\n    const related", "  selectRunPipeline(p, datasetName = null) {\n    const context = this.state.pmDatasetRunContext;\n    if (!datasetName && context) datasetName = context.dataset;\n    const related"],
 ["      selDs: selected ? selected.name : null, dsVersion: selected ? selected.version || 'v1' : null,\n      dsVersions: false, dsQuery: '', copied: null, picked: {},", "      selDs: selected ? selected.name : null, dsVersion: selected ? (context?.dataset === selected.name ? context.version : null) || selected.version || 'v1' : null,\n      dsVersions: false, dsQuery: '', copied: null, pmDatasetRunContext: null,\n      picked: selected && context?.dataset === selected.name ? Object.fromEntries(selected.items.filter(item => context.items.includes(item[0])).map(item => [item[0],true])) : {},"]
];
export function installDatasetPipelineGuide(t) {
 for(const [from,to] of datasetPipelineCopy) {
  if(!t.includes(from))throw Error('Dataset Pipeline guide anchor changed: '+from);
  t=t.replace(from,()=>to);
 }
 const anchor='<sc-if value="{{ ds.canRun }}" hint-placeholder-val="{{ false }}">';
 if(!t.includes(anchor))throw Error('Dataset run CTA anchor changed');
 t=t.replace(anchor,`<sc-if value="{{ ds.needsPipeline }}" hint-placeholder-val="{{ false }}"><button type="button" class="pm-dataset-choose-pipeline" sc-camel-on-click="{{ ds.choosePipeline }}">选择 Pipeline</button></sc-if>\n                  `+anchor);
 return t.replace('  tagForeground(hex) {',`  // pm-dataset-pipeline-guide:start
  pmChooseDatasetPipeline(dataset, items) {
    const context = { dataset:dataset.name, version:this.state.dsVersion || dataset.version || 'v1', items:items.slice() };
    this.openPipelineSelection(!!this.state.rerollFrom);
    this.setState({pmDatasetRunContext:context});
  }
  // pm-dataset-pipeline-guide:end
  tagForeground(hex) {`);
}
