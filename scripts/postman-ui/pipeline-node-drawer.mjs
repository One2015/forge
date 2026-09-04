import fs from 'node:fs';
export const pipelineNodeDrawerCopy=[
 ["if (view === 'pipeedit') pe = this.pmPipelineAccess(pe); // pm-pipeline-access-values", "if (view === 'pipeedit') pe = this.pmPipelineNodeDrawer(this.pmPipelineAccess(pe)); // pm-pipeline-access-values"],
 ["      if (e.key === 'Escape' && !this.state.sidebarCollapsed && window.matchMedia?.('(max-width:760px)').matches) {", "      if (e.key === 'Escape' && !e.defaultPrevented && this.state.view === 'pipeedit' && this.state.editSel && !this.state.pmPipelineEditor) { this.pmCloseNodeDrawer(e); return; }\n      if (e.key === 'Escape' && !this.state.sidebarCollapsed && window.matchMedia?.('(max-width:760px)').matches) {"]
];
export function installPipelineNodeDrawer(t){
 for(const [a,b] of pipelineNodeDrawerCopy){if(!t.includes(a))throw Error('Node drawer anchor changed: '+a);t=t.replace(a,()=>b);}
 const start=t.indexOf('      <sc-if value="{{ pe.hasSel }}"'),end=t.indexOf('\n      </sc-if>',start)+'\n      </sc-if>'.length;
 if(start<0 || end<start)throw Error('Node inspector boundary changed');
 t=t.slice(0,start)+t.slice(end);
 const marker='  <sc-if value="{{ isDatasets }}"';
 t=t.replace(marker,fs.readFileSync(new URL('pipeline-node-drawer.html',import.meta.url),'utf8')+marker);
 t=t.replace('<div data-pm-readonly="{{ pe.readOnly }}" class="pm-pipeline-editor ', '<div data-pm-readonly="{{ pe.readOnly }}" data-pm-inspector-open="{{ pe.hasSel }}" class="pm-pipeline-editor ');
 t=t.replace(/<div\b[^>]*sc-camel-on-click="\{\{ pe.back \}\}"[^>]*>([\s\S]*?) 返回<\/div>/,(_,icon)=>'<button type="button" class="pm-pipeline-back" aria-label="返回 Pipeline 列表" title="返回 Pipeline 列表" sc-camel-on-click="{{ pe.back }}">'+icon+'</button>');
 t=t.replace('<span class="pm-pipeline-mode">{{ pe.modeLabel }}</span>','<sc-if value="{{ pe.showModeLabel }}"><span class="pm-pipeline-mode">{{ pe.modeLabel }}</span></sc-if>');
 t=t.replace('class="pm-pipeline-node" data-node-kind="{{ n.kind }}"','class="pm-pipeline-node" role="button" tabindex="0" aria-label="{{ n.actionLabel }}" aria-controls="pm-pipeline-node-details" aria-expanded="{{ n.selected }}" data-node-failed="{{ n.failed }}" data-node-name="{{ n.name }}" sc-camel-on-key-down="{{ n.keySelect }}" data-node-kind="{{ n.kind }}"');
 t=t.replace(/<div([^>]+)>\{\{ n.note \}\}<\/div>/,'<div class="pm-pipeline-node-status"$1>{{ n.note }}</div>');
 t=t.replace(/(<div class="pm-pipeline-legend"[^>]*>)连接边<\/div>/,'$1按连线顺序执行</div>');
 const methods=fs.readFileSync(new URL('pipeline-node-drawer-methods.js',import.meta.url),'utf8').replace('  // pm-pipeline-node-drawer:end',fs.readFileSync(new URL('pipeline-node-editor-methods.js',import.meta.url),'utf8')+fs.readFileSync(new URL('pipeline-node-failures.js',import.meta.url),'utf8')+'  // pm-pipeline-node-drawer:end');
 return t.replace('  tagForeground(hex) {',methods+'  tagForeground(hex) {');
}
