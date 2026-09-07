import fs from 'node:fs';
export const datasetEditorCopy = [
 ['  dsData() {','  pmBaseDatasets() {'],
 ['  runsData() {','  pmBaseDatasetRuns() {'],
 ['      name: d.name, count: d.n + \' 条\', owner: d.owner, used:', "      name: d.displayName || d.name, count: d.n + ' 条', owner: d.owner, used:"],
 ["        name: cur.name, count: cur.n + ' 条 Item',", "        name: cur.displayName || cur.name, count: cur.n + ' 条 Item', edit: () => this.pmOpenDatasetEditor(cur.name),"],
 ["(d.name + d.owner + d.mix.map", "(d.name + (d.displayName || '') + d.owner + d.mix.map"],
 ['      dsGroups,','      dsGroups, datasetEditor: this.pmDatasetEditorValues(), datasetUndo: this.pmDatasetUndoValues(),'],
 ['        datasets: p.datasets.map(d => ({', '        datasets: p.datasets.filter(d => this.dsData().some(dataset => dataset.name === d[0])).map(d => ({']
];
export function installDatasetEditor(t) {
 for(const [from,to] of datasetEditorCopy){if(!t.includes(from))throw Error('Dataset editor anchor changed: '+from);t=t.replace(from,()=>to);}
 const datasetStart=t.indexOf('<sc-if value="{{ isDatasets }}"');
 const datasetEnd=t.indexOf('<script type="text/x-dc"',datasetStart);
 if(datasetStart<0||datasetEnd<datasetStart)throw Error('Dataset page boundary changed');
 let dataset=t.slice(datasetStart,datasetEnd);

 const subtitle='<div style="margin-top:7px;font-size:14px;color:var(--forge-muted)">{{ dsSubtitle }}</div>';
 if(!dataset.includes(subtitle))throw Error('Dataset subtitle anchor changed');
 dataset=dataset.replace(subtitle,'');

 const importStart=dataset.indexOf('<button sc-camel-on-click="{{ openImport }}"');
 const importEnd=dataset.indexOf('</button>',importStart)+9;
 if(importStart<0||importEnd<9)throw Error('Dataset import action anchor changed');
 const importButton=dataset.slice(importStart,importEnd).trim().replace('<button ','<button type="button" class="pm-dataset-import-trigger" ');
 const headingSpacer='<div style="flex:1"></div>';
 const spacerStart=dataset.lastIndexOf(headingSpacer,importStart);
 if(spacerStart<0||importStart-spacerStart>120)throw Error('Dataset heading spacer anchor changed');
 dataset=dataset.slice(0,spacerStart)+dataset.slice(spacerStart+headingSpacer.length,importStart)+dataset.slice(importEnd);

 const detailStart=dataset.indexOf('<sc-if value="{{ hasDs }}"');
 const detailHeading='<div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">';
 const detailHeadingStart=dataset.indexOf(detailHeading,detailStart);
 if(detailStart<0||detailHeadingStart<detailStart)throw Error('Dataset detail heading anchor changed');
 dataset=dataset.slice(0,detailHeadingStart)+'<div class="pm-dataset-detail-heading">'+dataset.slice(detailHeadingStart+detailHeading.length);

 const count='<div style="font-size:13px;color:var(--forge-muted);white-space:nowrap">{{ ds.count }}</div>';
 const countStart=dataset.indexOf(count,detailHeadingStart);
 if(countStart<0)throw Error('Dataset item count anchor changed');
 const actions='<div class="pm-dataset-detail-actions"><button type="button" class="pm-dataset-edit-trigger" sc-camel-on-click="{{ ds.edit }}">编辑数据集</button>'+importButton+'</div>';
 dataset=dataset.slice(0,countStart)+actions+dataset.slice(countStart+count.length);

 const meta='<div style="margin-top:9px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px 16px">';
 const metaStart=dataset.indexOf(meta,detailHeadingStart);
 if(metaStart<0)throw Error('Dataset metadata anchor changed');
 dataset=dataset.slice(0,metaStart)+'<div class="pm-dataset-meta" style="margin-top:9px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px 16px">'+dataset.slice(metaStart+meta.length);
 const statsStart=dataset.indexOf('<sc-for list="{{ ds.stats }}"',metaStart);
 const statsEnd=dataset.indexOf('</sc-for>',statsStart)+9;
 if(statsStart<0||statsEnd<9)throw Error('Dataset metadata stats anchor changed');
 dataset=dataset.slice(0,statsEnd)+'\n                    <div class="pm-dataset-meta-count">{{ ds.count }}</div>'+dataset.slice(statsEnd);

 t=t.slice(0,datasetStart)+dataset+t.slice(datasetEnd);
 const start=t.indexOf('<sc-if value="{{ isDatasets }}"'),page=t.indexOf('\n',t.indexOf('<div class="forge-page pm-page-datasets"',start));
 t=t.slice(0,page)+fs.readFileSync(new URL('dataset-editor.html',import.meta.url),'utf8')+t.slice(page);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('dataset-editor-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
