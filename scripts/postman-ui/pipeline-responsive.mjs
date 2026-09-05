// Layout-only adaptation; preserve the editor's existing handlers and data.
export function installPipelineResponsive(t) {
 t=installPipelineListLayout(t);
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
 replace('<div style="flex:none;border-bottom:1px solid #eabaa8;', '<div class="pm-pipeline-delete-notice" style="flex:none;border-bottom:1px solid #eabaa8;');
 replace('<div style="display:flex;align-items:center;gap:clamp(7px,1vw,10px)">','<div class="pm-pipeline-node-heading" style="display:flex;align-items:center;gap:clamp(7px,1vw,10px)">');
 replace('<div style="flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:clamp(12.5px,1.1vw,14px);','<div class="pm-pipeline-node-name" title="{{ n.name }}" style="flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:clamp(12.5px,1.1vw,14px);');
 replace('<div style="position:sticky;top:12px;float:right;','<div class="pm-pipeline-legend" style="position:sticky;top:12px;float:right;');
 replace('<div style="min-width:100%;display:flex;','<div class="pm-pipeline-track" style="min-width:100%;display:flex;');
 replace('<div style="position:sticky;left:16px;bottom:16px;float:left;','</div><div class="pm-pipeline-zoom" role="group" aria-label="画布缩放" style="position:sticky;left:16px;bottom:16px;float:left;');
 replace('<div style="flex:none;border-top:1px solid var(--forge-border);background:#fff;padding:13px clamp(14px,2vw,24px);','<div class="pm-pipeline-inspector" role="region" aria-label="节点详情" style="flex:none;border-top:1px solid var(--forge-border);background:#fff;padding:13px clamp(14px,2vw,24px);');
 return t.slice(0,start)+p+t.slice(end);
}

function installPipelineListLayout(t){
 const start=t.indexOf('<sc-if value="{{ isPipelines }}"'),end=t.indexOf('<sc-if value="{{ isPipeEdit }}"',start);
 if(start<0||end<start)throw Error('Pipeline list layout boundary changed');
 let p=t.slice(start,end);
 const replace=(from,to)=>{if(!p.includes(from))throw Error('Pipeline list layout anchor changed: '+from.slice(0,80));p=p.replace(from,to);};
 replace('<div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px">','<div class="pm-production-page-heading pm-pipelines-heading" style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px">');
 replace('<div style="display:flex;align-items:center;gap:9px;margin-bottom:16px;flex-wrap:wrap">','<div class="pm-pipelines-filters" style="display:flex;align-items:center;gap:9px;margin-bottom:16px;flex-wrap:wrap">');
 replace('<div style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;overflow:hidden">','<div class="pm-pipelines-list" style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;overflow:hidden">');
 replace('<div style="display:grid;grid-template-columns:minmax(0,1.7fr)', '<div class="pm-pipelines-columns" style="display:grid;grid-template-columns:minmax(0,1.7fr)');
 replace('<div sc-camel-on-click="{{ p.toggle }}"','<div class="pm-pipelines-row" sc-camel-on-click="{{ p.toggle }}"');
 const rowStart=p.indexOf('<div class="pm-pipelines-row"'),rowEnd=p.indexOf('<sc-if value="{{ p.expanded }}"',rowStart);
 let row=p.slice(rowStart,rowEnd);
 row=row.replace('<div style="min-width:0">','<div class="pm-pipelines-name" style="min-width:0">').replace('white-space:nowrap">{{ p.name }}','white-space:nowrap" title="{{ p.name }}">{{ p.name }}');
 for(const [key,label] of [['version','当前版本'],['nodes','节点'],['last','最近运行'],['runs','运行数'],['unitCost','均价 / 条']]){
  row=row.replace(new RegExp('<div (style="[^"]*")>(\\{\\{ p\\.'+key+' \\}\\})</div>'),'<div class="pm-pipelines-metric" data-label="'+label+'" $1>$2</div>');
 }
 row=row.replace('<div style="display:flex;align-items:center;gap:7px">','<div class="pm-pipelines-metric pm-pipelines-rate" data-label="成功率" style="display:flex;align-items:center;gap:7px">');
 row=row.replace('<div style="font-size:12px;color:var(--forge-muted);text-align:right">','<div class="pm-pipelines-chevron" style="font-size:12px;color:var(--forge-muted);text-align:right">');
 p=p.slice(0,rowStart)+row+p.slice(rowEnd);
 replace('<div style="border-bottom:1px solid var(--forge-border);background:var(--forge-subtle);padding:16px 18px">','<div class="pm-pipelines-detail" style="border-bottom:1px solid var(--forge-border);background:var(--forge-subtle);padding:16px 18px">');
 replace('<div style="display:flex;align-items:center;gap:9px;margin-bottom:16px;flex-wrap:wrap">','<div class="pm-pipelines-detail-actions" style="display:flex;align-items:center;gap:9px;margin-bottom:16px;flex-wrap:wrap">');
 replace('<div style="font-size:12px;color:var(--forge-muted)">累计成本</div>','<div style="font-size:12px;color:var(--forge-muted)">累计使用次数</div>');
 replace('<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:600">{{ p.cost }}</div>\n                        <div style="font-size:12px;color:var(--forge-muted)">· {{ p.runs }}</div>','<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:600">{{ p.runs }}</div>');
 replace('<div style="border:1px solid #ece7df;border-radius:10px;background:var(--forge-subtle);padding:13px 14px;overflow-x:auto">','<div class="pm-pipelines-dag" role="region" tabindex="0" aria-label="Pipeline 流程，可横向滚动" style="border:1px solid #ece7df;border-radius:10px;background:var(--forge-subtle);padding:13px 14px;overflow-x:auto">');
 replace('<div style="display:grid;grid-template-columns:52px minmax(0,1fr) 92px;','<div class="pm-pipelines-version" style="display:grid;grid-template-columns:52px minmax(0,1fr) 92px;');
 return t.slice(0,start)+p+t.slice(end);
}
