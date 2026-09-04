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
 const count='<div style="font-size:13px;color:var(--forge-muted);white-space:nowrap">{{ ds.count }}</div>';
 if(!t.includes(count))throw Error('Dataset header missing');
 t=t.replace(count,count+'<button type="button" class="pm-dataset-edit-trigger" sc-camel-on-click="{{ ds.edit }}">编辑数据集</button>');
 const start=t.indexOf('<sc-if value="{{ isDatasets }}"'),page=t.indexOf('\n',t.indexOf('<div class="forge-page pm-page-datasets"',start));
 t=t.slice(0,page)+fs.readFileSync(new URL('dataset-editor.html',import.meta.url),'utf8')+t.slice(page);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('dataset-editor-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
