import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=name=>fs.readFileSync(new URL('./templates/'+name,import.meta.url),'utf8').trimEnd();
const icon=(_,name,size)=>{const svg=fs.readFileSync(new URL('../assets/phosphor/regular/'+name+'.svg',import.meta.url),'utf8');const body=svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g,'<$1$2></$1>');return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`};
export function updateOutsourcingSuppliers(source){
 const open='<script type="__bundler/template">',close='\n</script>\n</body>\n</html>',a=source.indexOf(open),b=source.lastIndexOf(close);if(a<0||b<0)throw Error('Missing Forge template');let t=JSON.parse(source.slice(a+open.length,b).trim());
 const methods=read('outsourcing-suppliers-methods.js'),markup=read('outsourcing-suppliers.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g,icon),css=read('outsourcing-suppliers.css');
 t=t.includes('// outsourcing-suppliers-methods:start')?t.replace(/  \/\/ outsourcing-suppliers-methods:start[\s\S]*?  \/\/ outsourcing-suppliers-methods:end/,methods):t.replace('  pendingQueue() {',methods+'\n\n  pendingQueue() {');
 t=t.includes('<!-- outsourcing-suppliers:start -->')?t.replace(/<!-- outsourcing-suppliers:start -->[\s\S]*?<!-- outsourcing-suppliers:end -->/,markup):t.replace('</main>',markup+'\n</main>');
 t=t.includes('/* outsourcing-suppliers:start */')?t.replace(/\/\* outsourcing-suppliers:start \*\/[\s\S]*?\/\* outsourcing-suppliers:end \*\//,css):t.replace('</style>',css+'\n</style>');
 if(!t.includes('      outsourcingSuppliers: this.outsourcingSupplierValues(),'))t=t.replace('      isOverview: view === \'overview\',','      outsourcingSuppliers: this.outsourcingSupplierValues(),\n      isOverview: view === \'overview\',');
 if(!t.includes('        goSuppliers:'))t=t.replace('        goDelivery: e => this.navigateFromSidebar(\'goDelivery\', e),','        goDelivery: e => this.navigateFromSidebar(\'goDelivery\', e),\n        goSuppliers: () => this.openOutsourcingSuppliers(),');
 if(!t.includes('        suppliersCurrent:'))t=t.replace("        overviewCurrent: (view === 'overview' || view === 'models' || view === 'billing') ? 'page' : 'false',","        overviewCurrent: (view === 'overview' || view === 'models' || view === 'billing') ? 'page' : 'false',\n        suppliersCurrent: view === 'outsourcing-suppliers' ? 'page' : 'false',");
 t=t.replace("view !== 'overview' && view !== 'models' && view !== 'billing' ? 'page'", "view !== 'overview' && view !== 'models' && view !== 'billing' && view !== 'outsourcing-suppliers' ? 'page'");
 t=t.replace("'overview', 'models', 'billing', 'pipeedit'", "'overview', 'models', 'billing', 'outsourcing-suppliers', 'pipeedit'");
 new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);return source.slice(0,a+open.length)+'\n'+JSON.stringify(t).replaceAll('</script>','<\\u002Fscript>')+close;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const file=new URL('./templates/forge-base.html',import.meta.url),source=fs.readFileSync(file,'utf8'),next=updateOutsourcingSuppliers(source);if(next!==source)fs.writeFileSync(file,next);console.log('Updated outsourcing suppliers');}
