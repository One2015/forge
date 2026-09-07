import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildPostman} from './postman-ui/build.mjs';
const source=fs.readFileSync(new URL('./templates/forge-base.html',import.meta.url),'utf8');
const built=JSON.parse(buildPostman(source).split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const logic=built.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function fixture(){const copied=[];const ctx=vm.createContext({URL,URLSearchParams,TextDecoder,TextEncoder,Blob,setTimeout:()=>0,clearTimeout(){},navigator:{clipboard:{writeText:async id=>copied.push(id)}},window:{location:{search:''}},DCLogic:class{props={hasRuns:true,hasResources:true,currentUser:'一万'};setState(p){this.state={...this.state,...p}}}});vm.runInContext(logic+';globalThis.c=new Component();globalThis.api=ForgeRunRecords;globalThis.codec=ForgeRoutes;',ctx);Object.assign(ctx.c.state,ctx.codec.read('/production/runs').patch);return {...ctx,q:()=>ctx.c.renderVals().runs,copied};}
test('existing records compute a read-only summary without confusing item failure with run failure',()=>{const {q}=fixture();assert.deepEqual(Array.from(q().kpis,k=>[k.label,k.value]),[['全部',9],['运行中',2],['待审核',45],['运行失败',2]]);assert(q().kpis.every(k=>!k.pick));const partial=q().rows.find(r=>r.id==='20260825-034505-c19f2a');assert.equal(partial.statusLabel,'运行完成');assert.equal(partial.progress,'21 待审核 · 3 失败 / 24');});
test('calendar-day cost, comparison and weighted model success are calculated independently',()=>{const {api}=fixture(),now=new Date(2026,8,3,12).getTime();const r=(id,at,cost)=>({id,n:1,done:1,running:0,failed:0,status:'success',startedAt:at,cost});const out=api.calculate([r('a',now-1000,'$100'),r('b',now-86400000,'$50')],{now,telemetry:[{runId:'a',calls:100,successes:80},{runId:'b',calls:900,successes:900}]});assert.equal(out.todayCost,100);assert.equal(out.delta,'较昨日 +100.0%');assert.equal(out.modelLabel,'98.0%');assert.equal(api.calculate([],{now}).modelLabel,'—');});
test('status, search and owner filters compose below the read-only summary',()=>{const {q}=fixture();q().onFilter({target:{value:'failed'}});assert.equal(q().total,2);assert(q().statusFiltered);q().onQuery({target:{value:'web3d-car'}});assert.equal(q().total,1);q().toggleMine();assert.equal(q().total,0);q().clear();assert.equal(q().total,9);assert(!q().hasFilters);q().onFilter({target:{value:'running'}});assert.equal(q().total,2);q().onFilter({target:{value:'all'}});assert.equal(q().total,9);q().onFilter({target:{value:'completed'}});assert.equal(q().total,5);});
test('legacy summary metrics do not filter runs; real model usage overrides the demo',()=>{
 const {c,q}=fixture();
 for(const metric of ['running','review','failed','cost','models']){c.state.runsMetric=metric;assert.equal(q().total,9);assert(!q().hasMetric);assert(!q().hasFilters);}
 const run=c.runsData()[0];c.props.runTelemetry=[{runId:run.id,calls:10,successes:9,modelName:'Actual model'}];
 const models=c.runModelSummary(run);assert.equal(models.names.length,1);assert.equal(models.names[0].name,'Actual model');assert(!models.mock);
});
test('one primary action per row opens existing detail, failure item or review flow',()=>{const {c,q}=fixture();const partial=q().rows.find(r=>r.counts.failed&&r.state==='completed');assert.equal(partial.actionLabel,'查看失败项');partial.action();assert.equal(c.state.view,'run');assert.equal(c.state.activeRun,partial.id);assert.equal(c.state.runItem,partial.id+':21');c.state.view='runs';const review=q().rows.find(r=>r.actionLabel==='去审核');review.action();assert.equal(c.state.view,'review');assert.equal(c.state.reviewRun,review.id);});
test('every run Item row, including failures, opens lifecycle detail',()=>{
 const {c,codec}=fixture(),runId='20260824-215530-2c2f09';
 Object.assign(c.state,codec.read('/production/runs/'+runId).patch);
 const items=c.renderVals().run.items,failedIndex=items.findIndex(item=>item.state==='失败'),failed=items[failedIndex],review=items.find(item=>item.state==='待审核');
 assert(failed);assert(review);assert(items.every(item=>item.rowCursor==='pointer'&&item.rowTitle==='查看 Item 详情'&&typeof item.open==='function'&&typeof item.keyOpen==='function'));
 failed.open({target:{closest:()=>null},preventDefault(){},stopPropagation(){}});
 assert.equal(c.state.view,'itemlife');assert.equal(c.state.lifeItem,failed.id);assert.equal(c.state.lifeRun,runId);assert.equal(c.state.lifeRunIndex,failedIndex);assert.equal(c.state.pmItemTab,'history');
 const detail=c.renderVals();assert(detail.explorer.hasRunOverview);assert.equal(detail.explorer.runState,'失败');assert.equal(detail.explorer.runProgress,'11 / 18');assert.equal(detail.explorer.runNode,'runtime');assert.equal(detail.explorer.runCostTime,'$35.80 · 16m 15s');assert.equal(detail.life.backLabel,'返回运行详情');
 const restored=codec.read(codec.write(c.state));assert.equal(restored.patch.lifeFrom,'run');assert.equal(restored.patch.lifeRunIndex,failedIndex);
 detail.life.back();assert.equal(c.state.view,'run');assert.equal(c.state.activeRun,runId);
 c.state.view='run';failed.open({target:{closest:()=>({})}});assert.equal(c.state.view,'run');
 let prevented=false;c.state.view='run';review.keyOpen({target:null,currentTarget:null,key:'Enter',preventDefault(){prevented=true;}});assert(prevented);assert.equal(c.state.view,'itemlife');assert.equal(c.state.lifeItem,review.id);
 assert.match(built,/role="link" tabindex="0" aria-label="查看 Item \{\{ it\.id \}\} 详情"/);
});
test('copy succeeds and errors produce truthful feedback without navigation',async()=>{const {c,q,copied,navigator}=fixture();await c.copyRunRecordId(q().rows[0].id);assert.equal(copied.length,1);assert.match(c.state.runsNotice,/已复制/);assert.equal(c.state.view,'runs');navigator.clipboard.writeText=async()=>{throw Error('denied')};await c.copyRunRecordId('test');assert.match(c.state.runsNotice,/复制失败/);});
test('pagination and URLs preserve all list filters',()=>{const {c,q,codec}=fixture();const rows=c.runsData();c.runsData=()=>Array.from({length:23},(_,i)=>({...rows[i%rows.length],id:'r'+i}));assert.equal(q().pages,3);q().next();assert.equal(q().page,2);q().setSize({target:{value:'20'}});assert.equal(q().page,1);assert.equal(q().rows.length,20);for(const status of ['queued','cancelled','completed','failed']){const a=codec.read('/production/runs?status='+status+'&metric=cost&page=2&size=20&owner=mine&q=car');const b=codec.read(codec.write(a.patch));for(const key of ['runsFilter','runsMetric','runsPage','runsPageSize','runsMine','runsQuery'])assert.equal(b.patch[key],a.patch[key]);}});
test('review decisions and item overrides preserve separate progress counts',()=>{const {api}=fixture();const row={id:'r',n:4,done:2,running:1,failed:1,status:'partial',itemIds:['a','b','c','d']};const out=api.calculate([row],{decisions:{'r:a':'pass'},itemTech:{'r:2':{status:'queued'}}});assert.equal(out.review,1);assert.equal(out.rows[0].counts.passed,1);assert.equal(out.rows[0].counts.queued,1);assert.equal(out.rows[0].state,'completed');assert.equal(out.failed,0);});
test('summary cards stay read-only while status filtering lives in the table header',()=>{const html=fs.readFileSync(new URL('./postman-ui/run-records.html',import.meta.url),'utf8');assert.doesNotMatch(html,/runs.groups|分组：|失败 Item|需立即处理|rr-kpi|k\.selected|k\.pick|rr-status-tabs/);assert.match(html,/data-actionable="false"/);assert.match(html,/<h1 id="fg-runs-title">运行<\/h1>/);assert.match(html,/<h2 id="rr-list-title">运行任务<\/h2>/);assert.equal((html.match(/role="columnheader"/g)||[]).length,7);assert.match(html,/aria-label="筛选运行状态" value="{{ runs.filterValue }}" sc-camel-on-change="{{ runs.onFilter }}"/);assert.match(html,/rr-context/);assert.match(html,/sc-camel-on-input/);assert(html.indexOf('只看我的')<html.indexOf('aria-label="搜索运行、Pipeline 或数据集"'));});
test('desktop search occupies the right edge after the owner filter',()=>{const css=fs.readFileSync(new URL('../public/postman-ui/global-responsive.css',import.meta.url),'utf8');assert.match(css,/@media\(min-width:761px\)\{[\s\S]*?\.forge-postman \.rr-filter-controls\{flex:0 1 460px;flex-wrap:nowrap;margin-left:auto\}/);});
test('execution duration prefers real timings and explicitly marks legacy snapshots',()=>{
 const {api,q}=fixture();assert(q().rows.every(r=>r.durationLabel!=='—'));assert(q().rows.every(r=>r.durationSynthetic));
 const now=1000000,base={id:'a',n:1,done:1,running:0,failed:0,status:'success',cost:'$0'};
 const calc=r=>api.calculate([r],{now,timings:[{runId:'a',durationMs:42000,synthetic:true}]}).rows[0];
 assert.equal(calc({...base,durationMs:5000}).duration,5000);assert.equal(calc({...base,durationMs:5000}).durationSynthetic,false);
 assert.equal(calc({...base,startedAt:10000,completedAt:30000}).duration,20000);
 assert.equal(calc({...base,status:'running',startedAt:900000}).duration,100000);
 assert.equal(calc({...base,createdAt:900000}).duration,42000);
 assert.equal(api.calculate([{...base,id:'unknown',createdAt:900000}],{now}).rows[0].duration,null);
 assert.equal(api.calculate([{...base,status:'queued'}],{now}).rows[0].duration,0);
});
test('every execution state has one visible operation and no overflow menu',()=>{
 const {c,q}=fixture();assert(q().rows.every(r=>r.actionLabel && typeof r.action==='function'));
 const live=q().rows.find(r=>r.state==='running');assert.equal(live.actionLabel,'查看进度');let stopped=false;live.action({stopPropagation(){stopped=true;}});assert(stopped);assert.equal(c.state.activeRun,live.id);assert.equal(c.state.view,'run');
 const source=c.runsData()[0];
 c.runsData=()=>['running','queued','cancelled','success','failed'].map(status=>({...source,id:'state-'+status,status,n:1,done:status==='success'?1:0,running:status==='running'?1:0,failed:status==='failed'?1:0,approved:status==='success'?1:0,itemIds:['item-'+status]}));
 const labels={running:'查看进度',queued:'查看详情',cancelled:'查看详情',completed:'查看结果',failed:'查看原因'};
 for(const row of q().rows){assert.equal(row.actionLabel,labels[row.state]);row.action();assert.equal(c.state.view,'run');assert.equal(c.state.activeRun,row.id);}
 const html=fs.readFileSync(new URL('./postman-ui/run-records.html',import.meta.url),'utf8');assert.doesNotMatch(html,/rr-more|rr-menu|r.hasMenu|r.hasAction/);assert.match(html,/<div class="rr-operations" role="cell"><button/);
});
