import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import {updateGeistDesignSystem} from './update-geist-design-system.mjs';
import {setButtonBusy,installButtonGuards} from '../public/design-system/behavior.mjs';
const source=fs.readFileSync(new URL('../public/forge.html',import.meta.url),'utf8');
const decode=s=>JSON.parse(s.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const t=decode(source),code=t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function component(props={}){
 const ctx=vm.createContext({URLSearchParams,window:{location:{search:'?view=runs'}},setTimeout:()=>0,clearTimeout(){},DCLogic:class{props={hasRuns:true,hasResources:true,panelWidth:460,...props};setState(p){Object.assign(this.state,p);}}});
 vm.runInContext(code+';this.instance=new Component()',ctx);return ctx.instance;
}
test('Geist migration is idempotent and leaves non-pilot markup and logic intact',()=>{
 assert.equal(updateGeistDesignSystem(source),source);
 assert.equal((t.match(/geist-runs:start/g)||[]).length,1);
 assert.equal((t.match(/\/\* forge-geist:start/g)||[]).length,1);
});
test('Runs retain record identity, monetary values, grouping, review semantics and detail navigation',()=>{
 const c=component(),r=c.renderVals().runs;
 assert.equal(r.count,'9 / 9');assert.equal(r.groups.length,8);
 assert.equal(r.rows[0].meta,'20260825-093412-a4f7c1');assert.equal(r.rows[0].cost,'$76.30');
 assert.equal(r.rows[0].progress,'1 待审核 · 2 运行中 · 5 排队 / 8 条');
 const sedan=r.groups.find(g=>g.subject==='Sedan');assert.equal(sedan.rows.length,2);assert.equal(sedan.meta,'2 次运行 · $813.68');
 r.rows[0].open();assert.equal(c.state.activeRun,'20260825-093412-a4f7c1');assert.equal(c.state.view,'run');
});
test('Status, owner and query compose; empty recovery restores all filters without deleting data',()=>{
 const c=component(),pick=label=>c.renderVals().runs.filters.find(f=>f.label===label).pick();
 pick('运行中');assert.equal(c.renderVals().runs.count,'2 / 9');
 c.renderVals().runs.toggleMine();assert.equal(c.renderVals().runs.count,'1 / 9');assert(c.renderVals().runs.mineSelected);
 c.renderVals().runs.onQuery({target:{value:'不存在'}});assert(c.renderVals().runs.empty);
 c.renderVals().runs.clear();assert.equal(c.renderVals().runs.count,'9 / 9');assert.equal(c.renderVals().runs.query,'');assert(!c.renderVals().runs.mineSelected);
 pick('失败');assert.equal(c.renderVals().runs.count,'4 / 9');assert(c.renderVals().runs.filters.find(f=>f.label==='失败').selected);
});
test('First-use empty state offers existing Pipeline flow; technical success does not approve Items',()=>{
 const empty=component({hasRuns:false});assert(empty.renderVals().runs.empty);assert(!empty.renderVals().runs.hasAny);empty.renderVals().runs.clear();assert.equal(empty.state.view,'pipelines');
 const c=component();c.renderVals().runs.filters.find(f=>f.label==='成功').pick();
 assert.equal(c.renderVals().runs.count,'3 / 9');assert(c.renderVals().runs.rows.every(r=>r.progress.includes('待审核')));
 c.renderVals().goPipelines();assert.equal(c.state.view,'pipelines');
});
test('Loading guard suppresses repeated activation, stays focusable and restores previous availability',()=>{
 const data=new Map(),button={dataset:{},getAttribute:k=>data.get(k)||null,setAttribute:(k,v)=>data.set(k,v),removeAttribute:k=>data.delete(k)};
 setButtonBusy(button,true);setButtonBusy(button,true);assert.equal(data.get('aria-disabled'),'true');assert(!data.has('disabled'));
 let guard,prevented=false,stopped=false;installButtonGuards({addEventListener:(_,fn)=>guard=fn});
 guard({target:{closest:()=>button},preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});assert(prevented&&stopped);
 setButtonBusy(button,false);assert(!data.has('aria-disabled'));assert.equal(data.get('aria-busy'),'false');
 button.setAttribute('aria-disabled','true');setButtonBusy(button,true);setButtonBusy(button,false);assert.equal(data.get('aria-disabled'),'true');
});
test('Core text and status palettes satisfy 4.5:1 contrast',()=>{
 const lum=hex=>{const v=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 for(const [fg,bg] of [['171717','ffffff'],['666666','fafafa'],['18794e','effaf3'],['596451','f1f3ee'],['0068d6','edf6ff'],['915900','fff8e5'],['c52b2b','fff0f0'],['ffffff','c52b2b']])assert((Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05)>=4.5,fg);
 const tokens=fs.readFileSync(new URL('../public/design-system/tokens.css',import.meta.url),'utf8');
 const components=fs.readFileSync(new URL('../public/design-system/components.css',import.meta.url),'utf8');
 const runsCss=fs.readFileSync(new URL('../public/design-system/runs.css',import.meta.url),'utf8');
 assert.match(tokens,/--fg-running:#596451;--fg-running-bg:#f1f3ee;--fg-running-bar:#7a8572/);
 assert.match(components,/data-tone=running\]\{color:var\(--fg-running\);background:var\(--fg-running-bg\)\}/);
 assert.doesNotMatch(components,/data-tone=running\][^{]*\{[^}]*--fg-info/);
 assert.match(runsCss,/data-state=running\]\{background:var\(--fg-running-bar\)\}/);
});
