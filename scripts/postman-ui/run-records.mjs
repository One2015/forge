import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
export function installRunRecords(t){
 const start=t.indexOf('<!-- geist-runs:start -->'),end=t.indexOf('<!-- geist-runs:end -->',start);
 if(start<0||end<start)throw Error('Run records template boundary changed');
 let html=read('run-records.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g,(_,name,size)=>read('../../assets/phosphor/regular/'+name+'.svg').replace(/<svg[^>]*>/,'<svg class="forge-icon" width="'+size+'" height="'+size+'" viewBox="0 0 256 256" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));
 t=t.slice(0,start)+'<!-- geist-runs:start -->\n'+html+t.slice(end);
 t=t.replace('class Component extends DCLogic {',()=>read('run-records-data.js')+'\nclass Component extends DCLogic {\n'+read('run-records-methods.js'));
 const a=t.indexOf('    const runPal ='),b=t.indexOf('    const delMap =',a);
 if(a<0||b<a)throw Error('Run records values boundary changed');
 t=t.slice(0,a)+'    // pm-run-records-values:start\n    const me = this.props.currentUser || \"一万\";\n    const runs = this.runRecordsValues();\n    // pm-run-records-values:end\n\n'+t.slice(b);
 t=t.replace('<div sc-camel-on-click="{{ it.open }}" title="{{ it.rowTitle }}"', '<div class="pm-run-item" sc-camel-on-click="{{ it.open }}" title="{{ it.rowTitle }}"');
 return t;
}
