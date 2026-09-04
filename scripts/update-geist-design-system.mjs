import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RunsPage} from './design-system/runs.mjs';
const read=name=>fs.readFileSync(new URL('../public/design-system/'+name,import.meta.url),'utf8');
export function updateGeistDesignSystem(source){
 const opening='<script type="__bundler/template">',closing='\n</script>\n</body>\n</html>';
 const start=source.indexOf(opening),end=source.lastIndexOf(closing);
 if(start<0||end<0)throw Error('Missing bundled template');
 let t=JSON.parse(source.slice(start+opening.length,end).trim());
 const pattern=/<!-- geist-runs:start -->[\s\S]*?<!-- geist-runs:end -->/;
 if(pattern.test(t))t=t.replace(pattern,()=>RunsPage());
 else{
  const from=t.indexOf('  <sc-if value="{{ isRuns }}"'),to=t.indexOf('  <sc-if value="{{ isSubmitted }}"',from);
  if(from<0||to<from)throw Error('Runs page boundary changed');
  t=t.slice(0,from)+RunsPage()+'\n\n'+t.slice(to);
 }
 // Presentation-only fields; original query, filtering, grouping, costs and callbacks stay intact.
 const replaceOnce=(from,to)=>{if(t.includes(to))return;if(!t.includes(from))throw Error('Missing anchor: '+from);t=t.replace(from,to);};
 replaceOnce("query: st.runsQuery || '',", "mineSelected: !!st.runsMine,\n      query: st.runsQuery || '',");
 // Restrict the selected-state addition to the Runs filters, not similarly shaped filters elsewhere.
 t=t.replace("label, selected: on, bg: on ? '#fff'", "label, bg: on ? '#fff'");
 const filters=/filters: \['全部', '运行中', '成功', '失败'\]\.map\(label => \{[\s\S]*?label, (?:selected: on, )?bg:/;
 if(!filters.test(t))throw Error('Missing Runs filters');
 t=t.replace(filters,block=>block.replace(/label, (?:selected: on, )?bg:/,'label, selected: on, bg:'));
 replaceOnce('name: r.name, meta: r.id, status, fg, border, dot,','name: r.name, meta: r.id, status, tone: r.status, fg, border, dot,');
 const css='/* forge-geist:start */\n'+['tokens.css','components.css','runs.css'].map(read).join('\n')+'\n/* forge-geist:end */';
 const cssPattern=/\/\* forge-geist:start \*\/[\s\S]*?\/\* forge-geist:end \*\//;
 t=cssPattern.test(t)?t.replace(cssPattern,()=>css):t.replace('</style>',()=>css+'\n</style>');
 const script='<script type="module" src="/design-system/behavior.mjs"></script>';
 if(!t.includes(script))t=t.replace('</head>',()=>script+'\n</head>');
 new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
 return source.slice(0,start+opening.length)+'\n'+JSON.stringify(t).replaceAll('</script>','<\\u002Fscript>')+closing;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=new URL('../public/forge.html',import.meta.url),s=fs.readFileSync(file,'utf8'),next=updateGeistDesignSystem(s);
 if(s!==next)fs.writeFileSync(file,next);
 console.log('Forge Geist v1: synchronized shared foundation and Runs pilot.');
}
