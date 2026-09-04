import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/'+name,import.meta.url),'utf8').trimEnd();
export function updateFlowMotion(source) {
  const opening='<script type="__bundler/template">', closing='\n</script>\n</body>\n</html>';
  const start=source.indexOf(opening),end=source.lastIndexOf(closing);
  if (start<0||end<0) throw new Error('Missing Forge template');
  let t=JSON.parse(source.slice(start+opening.length,end).trim());
  const once=(before,after)=>{ if(t.split(before).length!==2) throw new Error('Expected one flow anchor: '+before.slice(0,100)); t=t.replace(before,()=>after); };
  t=t.replace(/  \/\/ dataset-resize:start[\s\S]*?  \/\/ dataset-resize:end/,()=>read('dataset-resize-methods.js'));
  if(t.includes('/* flow-motion:start */')) t=t.replace(/\/\* flow-motion:start \*\/[\s\S]*?\/\* flow-motion:end \*\//,()=>read('flow-motion.css'));
  else once('</style>',read('flow-motion.css')+'\n</style>');
  if(!t.includes('/forge-flow-motion.mjs')) once('<script src="/forge-surface-motion.js" defer></script>','<script src="/forge-surface-motion.js" defer></script>\n<script type="module" src="/forge-flow-motion.mjs"></script>');
  if(!t.includes('data-flow-view="{{ flowMotion.view }}"')) once('<main class="forge-main">','<main class="forge-main" data-flow-view="{{ flowMotion.view }}">');
  for(const [list,alias,key,family] of [
    ['pipelines','p','p.name','pipelines'],['g.rows','r','r.meta','runs'],['g.items','d','d.name','datasets'],
    ['ds.items','it','it.id','datasetItems'],['c.sheets','d','d.motionKey','delivery'],['sheet.rows','r','r.id','sheetItems'],
    ['review.done','r','r.id','reviewDone'],['review.items','it','it.key','reviewPending']
  ]) {
    const pattern=new RegExp('(<sc-for list="\\{\\{ '+list.replaceAll('.','\\.')+' \\}\\}" as="'+alias+'"[^>]*>\\s*)<div([^>]*)>');
    if(!pattern.test(t)) throw new Error('Missing motion list '+list);
    t=t.replace(pattern,(all,prefix,attrs)=>all.includes('data-flow-family')?all:prefix+'<div'+attrs+' data-flow-family="'+family+'" data-flow-row="{{ '+key+' }}">');
  }
  if(!t.includes('motionKey: d.key, name: d.name, created: d.created')) once('name: d.name, created: d.created','motionKey: d.key, name: d.name, created: d.created');
  if(!t.includes('class="forge-review-toast"')) once('<sc-if value="{{ reviewToast.show }}" hint-placeholder-val="{{ false }}">\n      <div style=', '<sc-if value="{{ reviewToast.motionPresent }}" hint-placeholder-val="{{ false }}">\n      <div class="forge-review-toast" data-motion-key="reviewToast" data-motion-open="{{ reviewToast.motionOpen }}" style=');
  t=t.replace(/<div id="forge-task-link-toast"([^>]*)>/,(all,attrs)=>all.includes('data-motion-key')?all:'<div id="forge-task-link-toast"'+attrs+' data-motion-key="taskLinkToast" data-motion-open="{{ taskLinkToast.motionOpen }}">');
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0,start+opening.length)+'\n'+JSON.stringify(t).replaceAll('</script>','<\\u002Fscript>')+closing;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const file=new URL('./templates/forge-base.html',import.meta.url),source=fs.readFileSync(file,'utf8'),updated=updateFlowMotion(source);
  if(source!==updated) fs.writeFileSync(file,updated);
  fs.copyFileSync(new URL('./flow-motion-runtime.mjs',import.meta.url),new URL('../public/forge-flow-motion.mjs',import.meta.url));
  console.log('Updated page, list, toast and resize feedback motion.');
}
