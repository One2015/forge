import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildPostman} from './postman-ui/build.mjs';
const source=fs.readFileSync(new URL('./templates/forge-base.html',import.meta.url),'utf8');
const output=buildPostman(source);
const template=JSON.parse(output.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code=template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function fixture(path='/review/pending'){
 const timers=[];
 const ctx=vm.createContext({URL,URLSearchParams,TextDecoder,TextEncoder,Blob,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},window:{location:{search:''}},
 DCLogic:class{props={currentUser:'一万',hasRuns:true,hasResources:true,panelWidth:460};setState(p){this.state={...this.state,...p}}}});
 vm.runInContext(code+';globalThis.c=new Component();globalThis.codec=ForgeRoutes;',ctx);
 Object.assign(ctx.c.state,ctx.codec.read(path).patch);
 return {c:ctx.c,codec:ctx.codec,q:()=>ctx.c.renderVals().review.queue,flush:()=>{while(timers.length)timers.shift()()}};
}
test('summary derives counts from existing tasks and completed records',()=>{
 const {c,q}=fixture();assert.equal(q().pending,19);assert.equal(q().rework,16);
 q().summary[1].pick();assert.equal(q().total,16);assert(q().rows.every(r=>r.n>1));
 q().summary[2].pick();assert.equal(c.state.reviewPhase,'done');assert.equal(q().total,q().today);assert(q().rows.every(r=>r.actionLabel==='查看结果'));
 q().summary[0].pick();assert.equal(q().total,19);assert(!q().hasFilters);
});
test('scope, type, round, query and sorting combine and reset pagination',()=>{
 const {c,q}=fixture();c.setState({queuePage:2});q().setType({target:{value:'rework'}});assert.equal(c.state.queuePage,1);
 q().setOwner({target:{value:'mine'}});q().setRound({target:{value:'3'}});q().onQuery({target:{value:'布达拉宫'}});
 assert.equal(q().total,1);assert.equal(q().rows[0].title,'布达拉宫');assert(q().hasFilters);
 q().reset();q().setSort({target:{value:'oldest'}});assert(q().rows[0].stamp<=q().rows.at(-1).stamp);
 q().onQuery({target:{value:'no-such-item'}});assert(q().empty);assert.equal(q().total,0);
 q().reset();q().onQuery({target:{value:q().rows[0].runId}});assert(q().rows.every(r=>r.runId===q().rows[0].runId));
});
test('pagination counts and page sizes use the filtered collection',()=>{
 const {q}=fixture();assert.equal(q().rows.length,10);assert.equal(q().pages,2);
 q().next();assert.equal(q().rows.length,9);assert(q().last);q().setSize({target:{value:'20'}});assert.equal(q().page,1);assert.equal(q().rows.length,19);
 q().setSize({target:{value:'50'}});assert.equal(q().pages,1);assert(q().first&&q().last);
});
test('claimed reviews can preview without claiming or changing review drafts',async()=>{
 const {c,q,flush}=fixture();q().setSize({target:{value:'50'}});
 const actions=new Set(q().rows.map(r=>r.actionLabel));for(const label of ['去审核','审核中','查看进度'])assert(actions.has(label),label);
 const rework=q().rows.find(r=>r.type==='rework'&&r.actionTone==='start');assert(rework);assert.equal(rework.badge,'请求修改');assert.equal(rework.actionLabel,'去审核');assert(!actions.has('复审'));
 for(const title of ['天坛','布达拉宫']){const claimed=q().rows.find(r=>r.title===title);assert.equal(claimed.actionLabel,'审核中');assert(claimed.actionDisabled);await claimed.action();assert.equal(c.state.reviewOpen,null);const claims=JSON.stringify(c.state.reviewClaims);await claimed.open();assert.equal(c.state.reviewOpen,claimed.key);assert(c.state.queuePreviewOnly);assert.equal(JSON.stringify(c.state.reviewClaims),claims);const focused=c.renderVals().review.items.find(item=>item.expanded);assert(focused);assert(focused.pending);assert(focused.actionsDisabled);assert(!focused.needsNote);await focused.pass();assert(!c.state.passAsk);c.closeReviewFocus();assert(!c.state.queueBusy);}
 const preview=q().rows.find(r=>r.title==='天坛');await preview.open();assert(!c.renderVals().review.positionLabel.startsWith('0 /'));const savedClaims=JSON.stringify(c.state.reviewClaims);await c.renderVals().review.next();assert(c.state.queuePreviewOnly);assert.equal(JSON.stringify(c.state.reviewClaims),savedClaims);const nextFocused=c.renderVals().review.items.find(item=>item.expanded);assert(nextFocused.pending);assert(nextFocused.actionsDisabled);c.closeReviewFocus();
 const progressRow=q().rows.find(r=>r.actionLabel==='查看进度');assert(!progressRow.actionDisabled);const progress=progressRow.action();flush();await progress;assert.equal(c.state.view,'run');
 c.setState({view:'review'});const row=q().rows.find(r=>r.actionTone==='start');const opening=row.action();assert.equal(c.state.queueBusy,row.key);flush();await opening;assert.equal(c.state.reviewOpen,row.key);assert.equal(c.state.reviewClaims[row.key],'一万');assert.equal(c.state.queuePreviewOnly,false);
 c.setState({reviewOpen:null});assert.equal(q().rows.find(r=>r.key===row.key).actionLabel,'审核中');assert(q().rows.find(r=>r.key===row.key).actionDisabled);
 const draft=q().rows.find(r=>r.actionTone==='start');c.setState({reworkDrafts:{[draft.key]:{text:'未完成'}}});const drafted=q().rows.find(r=>r.key===draft.key);assert.equal(drafted.badge,'审核中');assert(drafted.actionDisabled);const before=JSON.stringify(c.state.reworkDrafts);await drafted.open();assert.equal(c.state.reviewOpen,drafted.key);assert.equal(JSON.stringify(c.state.reworkDrafts),before);assert(!c.renderVals().review.items.find(item=>item.expanded).needsNote);
});
test('direct links keep existing claims read-only while a claim from this session remains actionable',()=>{
 const {c,q}=fixture();q().setSize({target:{value:'50'}});
 const claimed=q().rows.find(r=>r.title==='布达拉宫');c.openReview(claimed.runId,{deepReview:{runId:claimed.runId,itemId:claimed.id}});
 let item=c.renderVals().review.items.find(row=>row.expanded);assert(item.pending);assert(item.actionsDisabled);item.pass();assert(!c.state.passAsk);
 c.closeReviewFocus();const available=q().rows.find(r=>r.actionTone==='start');c.setState({reviewClaims:{[available.key]:'一万'},reviewOpen:available.key,queuePreviewOnly:false});
 item=c.renderVals().review.items.find(row=>row.expanded);assert(item.pending);assert.equal(item.actionsDisabled,false);item.pass({stopPropagation(){}});assert.equal(c.state.passAsk,available.key);
});
test('stale claims and action failures surface a toast without changing list contents',async()=>{
 const {c,q,flush}=fixture();const row=q().rows.find(r=>r.type==='rework'&&r.actionLabel==='去审核');c.setState({reviewClaims:{[row.key]:'allen'}});
 const action=row.action();flush();await action;assert(q().hasError);assert.match(q().error,/已由 allen 领取/);assert.equal(q().total,19);assert(!c.state.queueBusy);
 q().dismissError();assert(!q().hasError);
 const refresh=q().refresh, original=c.runsData;
 c.runsData=()=>{throw Error('test refresh failure')};const failed=refresh();assert(c.state.queueLoading);flush();await failed;
 c.runsData=original;assert(q().hasError);assert.match(q().error,/刷新失败/);assert(!q().loading);
});
test('completed decisions leave pending and results contain no review-entry CTA',()=>{
 const {c,q}=fixture();const row=q().rows[0];const today=q().today;c._queueClock=Date.now()-3600000;c.setState({reviewDecisions:{[row.key]:'pass'}});assert.equal(q().pending,18);assert.equal(q().today,today+1);
 q().tabs[1].pick();assert(q().done);assert(q().rows.every(r=>r.actionLabel==='查看结果'&&r.hasHistory));assert(q().rows.some(r=>r.badge==='请求修改')||q().pages>1);
 q().onQuery({target:{value:row.id}});assert(q().rows.some(r=>r.badge==='已通过'));
});
test('history with no timestamp is excluded from today and never invents a date',()=>{
 const {q}=fixture('/review/results?size=50');const historic=q().rows.filter(r=>r.stamp===null);assert(historic.length>0);assert(historic.every(r=>r.timeLabel==='历史记录'));
 q().summary[2].pick();assert(q().rows.every(r=>r.stamp!==null));
});
test('all new filters survive URL reload including run scoped review',()=>{
 const {codec}=fixture();const path='/review/results?run=20260825-093412-a4f7c1&owner=mine&type=rework&round=3&completed=today&page=2&size=20';
 const r=codec.read(path), back=codec.read(codec.write(r.patch));for(const key of ['reviewRun','reviewOwner','queueType','queueRound','queueToday','queuePage','queuePageSize'])assert.equal(back.patch[key],r.patch[key]);
});
test('thumbnail accepts only exact Item/Run images and failed images become placeholders',()=>{
 const {c,q}=fixture();const row=q().rows[0];const runs=c.runsData();const run=runs.find(x=>x.id===row.runId);
 c.runsData=()=>runs;run.previewImage='/unrelated-batch.png';assert(!q().rows[0].hasPreview);
 run.itemPreviews={[row.id]:'/real-item.png'};assert.equal(q().rows[0].preview,'/real-item.png');c.taskLinkImageError('/real-item.png');assert(q().rows[0].noPreview);
});
test('queue markup has six stable columns, semantic table, labels and no alarm design',()=>{
 const html=fs.readFileSync(new URL('./postman-ui/review-queue.html',import.meta.url),'utf8');const css=fs.readFileSync(new URL('../public/postman-ui/review-queue.css',import.meta.url),'utf8');assert.equal((html.match(/role="columnheader"/g)||[]).length,6);
 assert.doesNotMatch(html,/超时|即将|SLA|截止|等待时间/);assert.doesNotMatch(html,/review\.owners|review-queue-card-header/);
 assert.match(html,/sc-camel-on-input/);assert.match(html,/aria-busy/);assert.match(html,/role="alert"/);
 assert.match(html,/Case \/ Item ID/);assert.match(html,/class="pq-thumb"/);assert.match(html,/class="pq-task-copy"><strong[^>]*>\{\{ task\.title \}\}<\/strong><code[^>]*>\{\{ task\.id \}\}<\/code>/);
 assert.match(html,/class="pq-section-title">运行记录<\/h2>/);assert.match(html,/<option value="all">全部轮次<\/option>/);
 assert.doesNotMatch(html,/pq-context|pq-issue|task\.dataset|task\.issue|data-owned/);
 assert.doesNotMatch(css,/pq-row\[data-owned/);
 assert.match(css,/\.forge-postman \.pm-review-queue \.pq-row\{[^}]*border-left:0!important/);
 assert.match(css,/\.pq-table-scroll\{[^}]*border:1px solid var\(--pm-border\)[^}]*border-radius:6px/);
 assert.match(css,/\.forge-postman \.pm-review-queue \.pq-row\{[^}]*min-height:64px/);
 assert.match(css,/\.pq-filter\{[^}]*padding-left:0/);assert.match(css,/\.pq-filter select\{[^}]*padding:4px 22px 4px 10px/);
 assert.match(css,/\.pq-table-head>\[role=columnheader\]\{text-align:left\}/);
 assert.match(css,/\.pq-task-copy\{[^}]*flex-direction:column[^}]*align-items:flex-start[^}]*gap:2px[^}]*text-align:left/);
 assert.match(css,/\.pq-person\{[^}]*justify-content:flex-start/);
 assert.match(css,/\.pq-time\{text-align:left/);
 assert.match(css,/\.pq-actions\{[^}]*align-items:flex-start/);
 assert.doesNotMatch(css,/text-align:right/);
 assert.match(template,/review-workbench-actions/);
 assert.match(template,/class="review-workbench-approve"[^>]*disabled="\{\{ it\.actionsDisabled \}\}"/);
 assert.match(template,/class="review-workbench-reject"[^>]*disabled="\{\{ it\.actionsDisabled \}\}"/);
});
