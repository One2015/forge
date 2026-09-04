import fs from 'node:fs';
export const pipelineOwnerCopy = [
 ['  pipeData() {','  pmBasePipelines() {'],
 ["return ['lead','project-owner'].includes(this.profileIdentity().key);", "return this.pmOwnsPipeline(this.state.editPipe);"],
 ['canEditPipeline:!!current && this.pmCanEditPipeline(),','canEditPipeline:!!current && this.pmOwnsPipeline(current.name),'],
 ["    const allowed = () => !this.state.pmPipelineView && this.pmCanEditPipeline();", "    const key=this.state.editPipe, actor=this.profileIdentity().accountName;\n    const allowed = () => this.state.editPipe===key && this.profileIdentity().accountName===actor && !this.state.pmPipelineView && this.pmCanEditPipeline();"],
 ["    const pipeline = evidence.pipeline || (current && (!version || version===current.version) ? current : null);", "    const pipeline = evidence.pipeline || this.state.pmPipelineVersions?.[pipelineName]?.[version] || (current && (!version || version===current.version) ? current : null);"],
 ["  selectRunPipeline(p, datasetName = null) {", "  selectRunPipeline(p, datasetName = null) {\n    if(!this.pipeData().some(pipe=>pipe.name===p?.name))return;"],
 ['    const canEdit = allowed();','    values = this.pmPipelineEditorActions(values);\n    const canEdit = allowed();'],
 ['const enabled = st.editNodes || {};','const enabled = st.editNodes || p.enabledNodes || {};'],
 ["name: p.name, owner: p.owner, version: p.version, nodes:","name: p.displayName || p.name, canEdit: this.pmOwnsPipeline(p.name), editConfig: () => this.pmOpenPipelineEditor(p.name), owner: p.owner, version: p.version, nodes:"],
 ["(p.name + p.owner).toLowerCase()", "(p.name + (p.displayName || '') + p.owner).toLowerCase()"],
 ["editZoom: 100 }); },\n        dag:","editZoom: 100, editSaved:false, peDelete:false, peToast:'', pmPipelineView:!this.pmOwnsPipeline(p.name) }); },\n        dag:"],
 ['      pipeEmpty: pipelines.length === 0,','      pipelineEditor: this.pmPipelineEditorValues(),\n      pipeEmpty: pipelines.length === 0,'],
 ['    if (view === \'pipeedit\') pe = this.pmPipelineAccess(pe); // pm-pipeline-access-values', "    if (view === 'pipeedit') pe = this.pmPipelineAccess(pe); // pm-pipeline-access-values"],
];
export function installPipelineOwnerEditor(t) {
 for(const [from,to] of pipelineOwnerCopy){if(!t.includes(from))throw Error('Pipeline owner anchor changed: '+from);t=t.replace(from,()=>to);}
 const button=/<button\b[^>]*sc-camel-on-click="\{\{ p.copy \}\}"/;
 t=t.replace(button,match=>'<sc-if value="{{ p.canEdit }}"><button type="button" class="pm-dataset-edit-trigger" sc-camel-on-click="{{ p.editConfig }}">编辑 Pipeline</button></sc-if>'+match);
 const save=/<sc-if value="\{\{ pe.canEdit \}\}"><button\b[^>]*sc-camel-on-click="\{\{ pe.save \}\}"/;
 t=t.replace(save,match=>'<sc-if value="{{ pe.canEdit }}"><button type="button" class="pm-dataset-edit-trigger" sc-camel-on-click="{{ pe.editConfig }}">编辑配置</button></sc-if>'+match);
 const main='<main class="forge-main"';const start=t.indexOf('>',t.indexOf(main))+1;
 t=t.slice(0,start)+fs.readFileSync(new URL('pipeline-owner-editor.html',import.meta.url),'utf8')+t.slice(start);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('pipeline-owner-editor-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
