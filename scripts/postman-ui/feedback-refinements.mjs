import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const icons=html=>html.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g,(_,name,size)=>read('../../assets/phosphor/regular/'+name+'.svg').replace(/<svg[^>]*>/,'<svg class="forge-icon" width="'+size+'" height="'+size+'" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));
export function installFeedbackRefinements(t){
 const sheetHint='<div class="forge-feedback-submit-context" id="forge-sheet-rework-hint"><strong>提交后创建本轮修复任务</strong><span>{{ sheet.pick.noteHint }}</span></div>';
 if(!t.includes(sheetHint))throw Error('Sheet rework hint boundary changed');
 t=t.replace(sheetHint,'').replace(' aria-describedby="forge-sheet-rework-hint"','');
 const slots=(view,id)=>{
  const html=read('photo-slots.html').replaceAll('VIEW',view).replaceAll('HELP_ID',id);
  return icons(view==='sheet.pick.feedback'?html.replaceAll('/6','/8').replace('最多 6 张','最多 8 张'):html);
 };
 for(const [view,id] of [['sheet.pick.feedback','forge-sheet-rework-image-help'],['it.feedback','forge-rework-image-help']]){
  const field=t.indexOf('class="forge-feedback-image-heading"',t.indexOf('<!-- feedback-image-box:start -->'));
  const start=t.lastIndexOf('<!-- feedback-image-box:start -->',field);
  const end=t.indexOf('<sc-if value="{{ '+view+'.hasError }}"',start);
  if(start<0||end<start||!t.slice(start,end).includes('{{ '+view+'.images }}'))throw Error('Feedback upload boundary changed: '+view);
  t=t.slice(0,start)+slots(view,id)+t.slice(end);
 }
 const branch=t.indexOf('<!-- branch-dialog:start -->');
 const start=t.indexOf('<div class="forge-feedback-upload-row">',branch),end=t.indexOf('<sc-if value="{{ branch.hasError }}"',start);
 if(branch<0||start<0||end<start)throw Error('Branch upload boundary changed');
 t=t.slice(0,start)+slots('branch','forge-branch-image-help')+t.slice(end);
 const select=/<select id="forge-branch-item"[\s\S]*?<\/select>/;
 if(!select.test(t))throw Error('Branch Item selector changed');
 t=t.replace(select,()=>icons(read('branch-item-search.html')));
 t=t.replace('class Component extends DCLogic {',()=> 'class Component extends DCLogic {\n'+read('branch-item-search.js'));
 t=t.replace('branch: this.branchFormValues(),','branch: this.pmBranchValues(),');
 t=t.replace("      count: images.length + ' / 6', full: images.length >= 6,", "      emptySlots: Array.from({ length: Math.max(0, 6 - images.length) }, (_, index) => ({ position: images.length + index + 1, label: '上传参考图片到第 ' + (images.length + index + 1) + ' 个空位' })), // pm-photo-slots\n      count: images.length + ' / 6', full: images.length >= 6,");
 t=t.replace("        removeLabel: '移除 ' + img.name,", "        position: images.indexOf(img) + 1, // pm-photo-slots\n        removeLabel: '移除 ' + img.name,");
 return t;
}
