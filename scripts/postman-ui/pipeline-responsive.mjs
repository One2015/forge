// Layout-only adaptation; preserve the editor's existing handlers and data.
export function installPipelineResponsive(t) {
 const start=t.indexOf('<div class="pm-pipeline-editor '), end=t.indexOf('<sc-if value="{{ isDatasets }}"',start);
 if(start<0||end<0) throw Error('Pipeline editor boundary changed');
 let p=t.slice(start,end);
 const replace=(from,to)=>{if(!p.includes(from))throw Error('Pipeline layout anchor changed: '+from.slice(0,80));p=p.replace(from,to);};
 replace('<div style="flex:none;display:flex;align-items:center;gap:clamp(7px,1vw,10px);','<div class="pm-pipeline-toolbar" style="flex:none;display:flex;align-items:center;gap:clamp(7px,1vw,10px);');
 replace('<div sc-camel-on-click="{{ pe.back }}"','<div class="pm-pipeline-heading"><div sc-camel-on-click="{{ pe.back }}"');
 replace('<div style="display:flex;align-items:center;gap:8px;height:38px;','<div class="pm-pipeline-title" title="{{ pe.name }}" style="display:flex;align-items:center;gap:8px;height:38px;');
 replace('<div style="display:flex;align-items:center;height:38px;','</div><div class="pm-pipeline-config"><div class="pm-pipeline-execution" style="display:flex;align-items:center;height:38px;');
 replace('<div style="position:relative;order:3">','<div class="pm-pipeline-dataset" style="position:relative;order:3">');
 replace('<div style="display:flex;align-items:center;gap:6px;height:38px;','<div class="pm-pipeline-validation" style="display:flex;align-items:center;gap:6px;height:38px;');
 replace('<div style="flex:1;min-width:0;order:5"></div>','</div><div class="pm-pipeline-actions">');
 const headerEnd=p.indexOf('      <sc-if value="{{ pe.deleteAsking }}"');
 p=p.slice(0,headerEnd).replace(/      <\/div>\s*$/,'      </div></div>\n\n')+p.slice(headerEnd);
 replace('<div class="pm-pipeline-canvas"','<div class="pm-pipeline-workspace"><div class="pm-pipeline-canvas" tabindex="0" role="region" aria-label="Pipeline 节点画布，可横向滚动"');
 replace('<div style="position:sticky;top:12px;float:right;','<div class="pm-pipeline-legend" style="position:sticky;top:12px;float:right;');
 replace('<div style="min-width:100%;display:flex;','<div class="pm-pipeline-track" style="min-width:100%;display:flex;');
 replace('<div style="position:sticky;left:16px;bottom:16px;float:left;','</div><div class="pm-pipeline-zoom" role="group" aria-label="画布缩放" style="position:sticky;left:16px;bottom:16px;float:left;');
 replace('<div style="flex:none;border-top:1px solid var(--forge-border);background:#fff;padding:13px clamp(14px,2vw,24px);','<div class="pm-pipeline-inspector" role="region" aria-label="节点详情" style="flex:none;border-top:1px solid var(--forge-border);background:#fff;padding:13px clamp(14px,2vw,24px);');
 return t.slice(0,start)+p+t.slice(end);
}
