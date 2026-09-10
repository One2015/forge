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
test('scope, column filters, query and sorting combine and reset pagination',()=>{
 const {c,q}=fixture();c.setState({queuePage:2});q().setType({target:{value:'rework'}});assert.equal(c.state.queuePage,1);
 q().setOwner({target:{value:'mine'}});q().setRound({target:{value:'3'}});q().setPerson({target:{value:'yokiguan'}});q().onQuery({target:{value:'布达拉宫'}});
 assert.equal(q().total,1);assert.equal(q().rows[0].title,'布达拉宫');assert(q().hasFilters);assert.equal(q().filterCount,4);
 q().reset();assert.equal(q().person,'all');assert.equal(q().filterCount,0);q().setSort({target:{value:'oldest'}});assert(q().rows[0].stamp<=q().rows.at(-1).stamp);assert.equal(q().filterCount,1);
 q().onQuery({target:{value:'no-such-item'}});assert(q().empty);assert.equal(q().total,0);
 q().reset();q().onQuery({target:{value:q().rows[0].runId}});assert(q().rows.every(r=>r.runId===q().rows[0].runId));
});
test('custom filter menus expose selected state, positioning and selection without native selects',()=>{
 const {c,q}=fixture();const type=q().typeFilter;assert.equal(type.label,'全部类型');assert.equal(type.options.length,3);
 const event={detail:1,preventDefault(){},stopPropagation(){},currentTarget:{getBoundingClientRect(){return {left:420,right:528,top:100,bottom:136,width:108}}}};
 type.toggle(event);assert.equal(c.state.queueFilterMenu.key,'type');assert.equal(q().activeFilter.ariaLabel,'审核类型');assert.equal(q().activeFilter.left,420);assert.equal(q().activeFilter.width,108);assert.equal(q().activeFilter.placement,'bottom');
 q().activeFilter.options.find(option=>option.value==='rework').pick(event);assert.equal(q().type,'rework');assert.equal(q().menuOpen,false);assert.equal(q().typeFilter.label,'返工复审');
 q().onQuery({target:{value:'Item'}});assert(q().hasQuery);q().clearQuery();assert(!q().hasQuery);
});
test('pagination counts and page sizes use the filtered collection',()=>{
 const {q}=fixture();assert.equal(q().rows.length,10);assert.equal(q().pages,2);
 q().next();assert.equal(q().rows.length,9);assert(q().last);q().setSize({target:{value:'20'}});assert.equal(q().page,1);assert.equal(q().rows.length,19);
 q().setSize({target:{value:'50'}});assert.equal(q().pages,1);assert(q().first&&q().last);
});
test('only candidates whose artifact is still incomplete route to Run progress',()=>{
 const {c,q}=fixture();q().setSize({target:{value:'50'}});const row=q().rows.find(r=>r.actionLabel==='人工审核');assert(row);
 c.setState({itemStates:{[row.id]:{technicalStatus:'running'}}});const pending=q().rows.find(r=>r.id===row.id);
 assert.equal(pending.actionLabel,'查看进度');assert.equal(pending.claimLabel,'产物尚不可审核，可查看运行进度');
});
test('claimed reviews can preview without claiming or changing review drafts',async()=>{
 const {c,q,flush}=fixture();q().setSize({target:{value:'50'}});
 const actions=new Set(q().rows.map(r=>r.actionLabel));for(const label of ['人工审核','审核中'])assert(actions.has(label),label);
 const completed=q().rows.find(r=>r.title.startsWith('an interior walkthrough'));assert(completed);assert.equal(completed.actionLabel,'人工审核');assert.equal(completed.claimLabel,'尚未领取');assert(!actions.has('查看进度'));
 const rework=q().rows.find(r=>r.type==='rework'&&r.actionTone==='start');assert(rework);assert.equal(rework.actionLabel,'人工审核');assert(!actions.has('复审'));
 for(const title of ['天坛','布达拉宫']){const claimed=q().rows.find(r=>r.title===title);assert.equal(claimed.actionLabel,'审核中');assert(claimed.actionDisabled);await claimed.action();assert.equal(c.state.reviewOpen,null);const claims=JSON.stringify(c.state.reviewClaims);await claimed.open();assert.equal(c.state.reviewOpen,claimed.key);assert(c.state.queuePreviewOnly);assert.equal(JSON.stringify(c.state.reviewClaims),claims);const focused=c.renderVals().review.items.find(item=>item.expanded);assert(focused);assert(focused.pending);assert(focused.actionsDisabled);assert(!focused.needsNote);await focused.pass();assert(!c.state.passAsk);c.closeReviewFocus();assert(!c.state.queueBusy);}
 const preview=q().rows.find(r=>r.title==='天坛');await preview.open();assert(!c.renderVals().review.positionLabel.startsWith('0 /'));const savedClaims=JSON.stringify(c.state.reviewClaims);await c.renderVals().review.next();assert(c.state.queuePreviewOnly);assert.equal(JSON.stringify(c.state.reviewClaims),savedClaims);const nextFocused=c.renderVals().review.items.find(item=>item.expanded);assert(nextFocused.pending);assert(nextFocused.actionsDisabled);c.closeReviewFocus();
 const progress=c.reviewQueueAction({key:'still-running',rec:{id:'active-run'}},'progress')();flush();await progress;assert.equal(c.state.view,'run');assert.equal(c.state.activeRun,'active-run');
 c.setState({view:'review'});const row=q().rows.find(r=>r.actionLabel==='人工审核');const opening=row.action();assert.equal(c.state.queueBusy,row.key);flush();await opening;assert.equal(c.state.reviewOpen,row.key);assert.equal(c.state.reviewClaims[row.key],'一万');assert.equal(c.state.queuePreviewOnly,false);
 c.setState({reviewOpen:null});assert.equal(q().rows.find(r=>r.key===row.key).actionLabel,'审核中');assert(q().rows.find(r=>r.key===row.key).actionDisabled);
 const draft=q().rows.find(r=>r.actionLabel==='人工审核');c.setState({reworkDrafts:{[draft.key]:{text:'未完成'}}});const drafted=q().rows.find(r=>r.key===draft.key);assert.equal(drafted.badge,'审核中');assert(drafted.actionDisabled);const before=JSON.stringify(c.state.reworkDrafts);await drafted.open();assert.equal(c.state.reviewOpen,drafted.key);assert.equal(JSON.stringify(c.state.reworkDrafts),before);assert(!c.renderVals().review.items.find(item=>item.expanded).needsNote);
});
test('direct links keep existing claims read-only while a claim from this session remains actionable',()=>{
 const {c,q}=fixture();q().setSize({target:{value:'50'}});
 const claimed=q().rows.find(r=>r.title==='布达拉宫');c.openReview(claimed.runId,{deepReview:{runId:claimed.runId,itemId:claimed.id}});
 let item=c.renderVals().review.items.find(row=>row.expanded);assert(item.pending);assert(item.actionsDisabled);item.pass();assert(!c.state.passAsk);
 c.closeReviewFocus();const available=q().rows.find(r=>r.actionLabel==='人工审核');c.setState({reviewClaims:{[available.key]:'一万'},reviewOpen:available.key,queuePreviewOnly:false});
 item=c.renderVals().review.items.find(row=>row.expanded);assert(item.pending);assert.equal(item.actionsDisabled,false);item.pass({stopPropagation(){}});assert.equal(c.state.passAsk,available.key);
});
test('starting rework from a direct link keeps the active draft editable and swaps the footer actions',()=>{
 const {c,q,flush}=fixture();q().setSize({target:{value:'50'}});const row=q().rows.find(r=>r.actionLabel==='人工审核');assert(row);
 c.openReview(row.runId,{deepReview:{runId:row.runId,itemId:row.id}});
 let item=c.renderVals().review.items.find(candidate=>candidate.expanded);assert(item);assert(item.pending);assert(!item.needsNote);assert.equal(item.actionsDisabled,false);
 item.rework({stopPropagation(){}});flush();
 item=c.renderVals().review.items.find(candidate=>candidate.expanded);assert(item);assert(!item.pending);assert(item.needsNote);assert(!item.notNeedsNote);assert.equal(item.actionsDisabled,false);assert(item.cannotSubmitNote);
 item.onNote({target:{value:'请修正构件连接并重新提交。'}});item=c.renderVals().review.items.find(candidate=>candidate.expanded);assert(!item.cannotSubmitNote);
 item.cancelNote({stopPropagation(){}});item=c.renderVals().review.items.find(candidate=>candidate.expanded);assert(item.pending);assert(!item.needsNote);
});
test('stale claims and action failures surface a toast without changing list contents',async()=>{
 const {c,q,flush}=fixture();const row=q().rows.find(r=>r.type==='rework'&&r.actionLabel==='人工审核');c.setState({reviewClaims:{[row.key]:'allen'}});
 const action=row.action();flush();await action;assert(q().hasError);assert.match(q().error,/已由 allen 领取/);assert.equal(q().total,19);assert(!c.state.queueBusy);
 q().dismissError();assert(!q().hasError);
 const refresh=q().refresh, original=c.runsData;
 c.runsData=()=>{throw Error('test refresh failure')};const failed=refresh();assert(c.state.queueLoading);flush();await failed;
 c.runsData=original;assert(q().hasError);assert.match(q().error,/刷新失败/);assert(!q().loading);
});
test('completed decisions leave pending and results contain no review-entry CTA',()=>{
 const {c,q}=fixture();const row=q().rows[0];const today=q().today;c._queueClock=Date.now()-3600000;c.setState({reviewDecisions:{[row.key]:'pass'}});assert.equal(q().pending,18);assert.equal(q().today,today+1);
 q().summary[2].pick();q().clearToday();assert(q().done);assert(q().rows.every(r=>r.actionLabel==='查看结果'&&r.hasHistory));assert(q().rows.some(r=>r.badge==='请求修改')||q().pages>1);
 q().onQuery({target:{value:row.id}});assert(q().rows.some(r=>r.badge==='已通过'));
});
test('history with no timestamp is excluded from today and never invents a date',()=>{
 const {q}=fixture('/review/results?size=50');const historic=q().rows.filter(r=>r.stamp===null);assert(historic.length>0);assert(historic.every(r=>r.timeLabel==='历史记录'));
 q().summary[2].pick();assert(q().rows.every(r=>r.stamp!==null));
});
test('all new filters survive URL reload including run scoped review',()=>{
 const {codec}=fixture();const path='/review/results?run=20260825-093412-a4f7c1&owner=mine&type=rework&round=3&person=allen&completed=today&page=2&size=20';
 const r=codec.read(path), back=codec.read(codec.write(r.patch));for(const key of ['reviewRun','reviewOwner','queueType','queueRound','queuePerson','queueToday','queuePage','queuePageSize'])assert.equal(back.patch[key],r.patch[key]);
});
test('thumbnail accepts only exact Item/Run images and failed images become placeholders',()=>{
 const {c,q}=fixture();const row=q().rows[0];const runs=c.runsData();const run=runs.find(x=>x.id===row.runId);
 c.runsData=()=>runs;run.previewImage='/unrelated-batch.png';assert(!q().rows[0].hasPreview);
 run.itemPreviews={[row.id]:'/real-item.png'};assert.equal(q().rows[0].preview,'/real-item.png');c.taskLinkImageError('/real-item.png');assert(q().rows[0].noPreview);
});
test('queue markup has six stable columns, semantic table, labels and no alarm design',()=>{
 const html=fs.readFileSync(new URL('./postman-ui/review-queue.html',import.meta.url),'utf8');const css=fs.readFileSync(new URL('../public/postman-ui/review-queue.css',import.meta.url),'utf8');const responsive=fs.readFileSync(new URL('../public/postman-ui/global-responsive.css',import.meta.url),'utf8');assert.equal((html.match(/role="columnheader"/g)||[]).length,6);
 assert.doesNotMatch(html,/超时|即将|SLA|截止|等待时间/);assert.doesNotMatch(html,/review\.owners|review-queue-card-header/);
 assert.match(html,/<h1 id="queue-title">审核<\/h1>/);assert.doesNotMatch(html,/review\.queue\.subtitle|<h1 id="queue-title">审核队列<\/h1>/);assert.match(html,/<h2 class="pq-list-title">审核列表<\/h2>/);
 assert.match(html,/sc-camel-on-input/);assert.match(html,/aria-busy/);assert.match(html,/role="alert"/);
 assert.doesNotMatch(html,/class="pq-tabs"/);
 assert.doesNotMatch(html,/review\.queue\.filters|id="pq-filter-(?:owner|round)"|class="pq-inline-filter"/);
 assert.match(html,/role="search" aria-label="搜索审核任务"/);
 assert.match(html,/review\.queue\.activeFilter\.ariaLabel/);
 assert.match(html,/class="pq-filter-menu forge-motion-menu"[^>]*role="menu"/);assert.match(html,/role="menuitemradio"[^>]*aria-checked="\{\{ option\.selected \}\}"/);
 assert.match(html,/data-placement="\{\{ review\.queue\.activeFilter\.placement \}\}"/);
 assert.match(html,/class="pq-filter-scrim"/);assert.match(html,/class="pq-search-clear"[^>]*aria-label="清除搜索"/);assert.doesNotMatch(html,/pq-filter-control|<select aria-label="审核/);
 assert.doesNotMatch(html,/pq-mobile-column-filters|pq-column-filter/);
 assert.match(html,/Case \/ Item ID/);assert.match(html,/class="pq-thumb"/);assert.match(html,/class="pq-task-copy"><strong[^>]*>\{\{ task\.title \}\}<\/strong><code[^>]*>\{\{ task\.id \}\}<\/code>/);
 assert.doesNotMatch(html,/pq-context|pq-issue|task\.dataset|task\.issue|data-owned/);
 assert.doesNotMatch(css,/pq-row\[data-owned/);
 assert.match(css,/\.forge-postman \.pq-summary\.forge-overview-summary\{[^}]*margin:20px 0 32px/);
 assert.match(css,/\.forge-postman \.pm-review-queue \.pq-row\{[^}]*min-height:72px[^}]*border-left:0!important/);
 assert.match(css,/\.pm-review-queue \.pq-task\{[^}]*min-height:60px[^}]*padding:9px 0 9px var\(--content-inset-compact\)[^}]*border-radius:0!important/);
 assert.match(css,/\.pm-review-queue \.pq-filters\{[^}]*display:flex[^}]*flex-wrap:nowrap[^}]*overflow-x:auto[^}]*scrollbar-width:none/);
 assert.match(css,/\.pm-review-queue \.pq-filters::\-webkit-scrollbar\{display:none\}/);
 assert.match(css,/\.forge-postman \.pm-review-queue \.pq-search input\{[^}]*padding-inline:36px 36px!important[^}]*border-radius:var\(--radius-control\)!important[^}]*background:var\(--surface-raised\)[^}]*font-size:var\(--type-component-size\)!important/);
 assert.match(css,/\.pm-review-queue \.pq-filter-trigger\{[^}]*grid-template-columns:minmax\(0,1fr\) 14px[^}]*border-radius:var\(--radius-control\)[^}]*background:var\(--surface-raised\)[^}]*color:var\(--text-disabled\)[^}]*font-size:var\(--type-component-size\)/);
 assert.match(css,/\.pm-review-queue \.pq-filter-trigger\[data-filtered=true\],[^}]*\{color:var\(--text-primary\);font-weight:var\(--weight-medium\)\}/);
 assert.match(css,/\.pm-review-queue \.pq-filter-trigger\[aria-expanded=true\]\{[^}]*background:var\(--surface-raised\)[^}]*box-shadow:none/);
 assert.match(css,/\.forge-postman \.pm-review-queue \.pq-filter-menu\{[^}]*position:fixed[^}]*border-radius:0!important[^}]*background:var\(--surface-overlay\)!important[^}]*box-shadow:var\(--shadow-overlay\)!important/);
 assert.match(css,/\.pq-filter-menu\[data-placement=top\]\{--forge-menu-origin:bottom left\}/);
 assert.match(css,/\.pm-review-queue \.pq-filter-option\[data-selected=true\]\{background:var\(--accent-soft\);color:var\(--text-primary\);font-weight:var\(--weight-medium\)\}/);
 assert.match(css,/\.pq-table-head>\[role=columnheader\]\{[^}]*text-align:left[^}]*font-weight:var\(--weight-semibold\)/);
 assert.match(css,/\.forge-postman \.pm-review-queue \.pq-table-head\{[^}]*background:var\(--surface-inset\)!important[^}]*border-bottom:1px solid var\(--border-default\)!important/);
 assert.match(css,/:root\[data-forge-theme=dark\] \.forge-postman \.pm-review-queue \.pq-table-head\{background:var\(--surface-inset\)!important;border-color:var\(--border-default\)!important\}/);
 assert.match(css,/\.pq-table\{min-width:1010px\}/);
 assert.match(css,/\.pq-columns\{[^}]*grid-template-columns:minmax\(300px,1fr\) 112px 80px 132px 152px 112px/);
 assert.doesNotMatch(css,/pq-column-filter|pq-mobile-column-filters/);
 assert.match(responsive,/\.pq-filter-trigger\{height:44px!important;min-height:44px!important;font-size:16px!important\}/);
 assert.match(responsive,/@container pm-review \(max-width:980px\)\{[\s\S]*?\.pq-table-scroll\{max-height:none;overflow:hidden\}/);
 assert.match(responsive,/\.pq-table>div:last-child>\.pq-row:first-child\{border-radius:calc\(var\(--radius-surface\) - 1px\) calc\(var\(--radius-surface\) - 1px\) 0 0\}/);
 assert.match(responsive,/\.pq-table>div:last-child>\.pq-row:last-child\{border-radius:0 0 calc\(var\(--radius-surface\) - 1px\) calc\(var\(--radius-surface\) - 1px\)\}/);
 assert.match(css,/\.pq-task-copy\{[^}]*flex-direction:column[^}]*align-items:flex-start[^}]*gap:2px[^}]*text-align:left/);
 assert.match(css,/\.pq-person\{[^}]*justify-content:flex-start/);
 assert.match(css,/\.pq-time\{text-align:left/);
 assert.match(css,/\.pq-actions\{[^}]*align-items:flex-start/);
 assert.doesNotMatch(css,/text-align:right/);
 assert.match(template,/review-workbench-actions/);
 assert.match(template,/class="review-workbench-approve"[^>]*disabled="\{\{ it\.actionsDisabled \}\}"/);
 assert.match(template,/class="review-workbench-reject"[^>]*disabled="\{\{ it\.actionsDisabled \}\}"/);
 assert.match(template,/class="review-workbench-rework-form forge-feedback"/);
 assert.match(template,/>取消返工<\/button>/);assert.match(template,/>提交返工<\/button>/);
 assert.match(template,/class="review-workbench-reject"[^>]*disabled="\{\{ it\.cannotSubmitNote \}\}">提交返工/);
 const methods=fs.readFileSync(new URL('./postman-ui/review-queue-methods.js',import.meta.url),'utf8');
 assert.match(methods,/querySelector\('\.review-workbench-rework-form'\)/);assert.match(methods,/form\.querySelector\('textarea'\)\?\.focus\(\)/);
});

test('column sort toggles both directions and keeps person filtering',()=>{
 const {c,q}=fixture();q().setSize({target:{value:'50'}});q().setPerson({target:{value:'yokiguan'}});
 q().toggleRoundSort();assert.equal(q().roundSort,'ascending');assert(q().rows.every((r,i,a)=>!i||a[i-1].n<=r.n));
 q().toggleRoundSort();assert.equal(q().roundSort,'descending');assert(q().rows.every((r,i,a)=>!i||a[i-1].n>=r.n));
 q().toggleTimeSort();assert.equal(q().timeSort,'ascending');assert.equal(q().roundSort,'none');assert(q().rows.every((r,i,a)=>!i||a[i-1].stamp<=r.stamp));
 q().toggleTimeSort();assert.equal(q().timeSort,'descending');assert(q().rows.every((r,i,a)=>!i||a[i-1].stamp>=r.stamp));assert.equal(q().person,'yokiguan');
});

test('external QA requires explicit decisions, keeps internal queue intact and tracks versioned resubmission',()=>{
 const {c,q}=fixture();const internal=q().total;
 let qa=c.externalReviewValues();assert.equal(qa.pending,1);qa.showExternal();qa=c.externalReviewValues();qa.rows[0].open();
 qa=c.externalReviewValues();assert(!qa.canSubmit);qa.submit();assert(c.externalReviewValues().hasError);
 qa.choices.find(choice=>choice.id==='rework').pick();qa=c.externalReviewValues();assert(!qa.canSubmit);qa.submit();assert(c.externalReviewValues().hasError);
 qa.onNote({target:{value:'标签遮挡，请修复交互并重新提交。'}});qa=c.externalReviewValues();assert(qa.canSubmit);qa.submit();
 qa=c.externalReviewValues();assert.equal(qa.pending,0);assert.equal(qa.rework,1);assert.equal(qa.history.length,1);assert.equal(q().total,internal);
 const submission={...c.externalReviewSource()[0],version:'v2',round:2};c.props.externalReviewItems=[submission];
 qa=c.externalReviewValues();assert.equal(qa.pending,1);qa.phases.find(phase=>phase.id==='pending').pick();qa=c.externalReviewValues();qa.rows[0].open();
 qa=c.externalReviewValues();qa.choices.find(choice=>choice.id==='pass').pick();qa=c.externalReviewValues();qa.submit();qa.submit();
 qa=c.externalReviewValues();assert.equal(qa.passed,1);assert.equal(qa.history.length,2);assert.equal(qa.pending,0);assert.equal(q().total,internal);
});
test('external QA rejection requires a note and empty connected data never substitutes demo tasks',()=>{
 const {c}=fixture();c.props.externalReviewItems=[];assert.equal(c.externalReviewValues().pending,0);assert(!c.externalReviewValues().demo);
 delete c.props.externalReviewItems;let qa=c.externalReviewValues();qa.rows[0].open();qa=c.externalReviewValues();qa.choices.find(choice=>choice.id==='reject').pick();qa=c.externalReviewValues();assert(!qa.canSubmit);
 qa.onNote({target:{value:'结果不符合交付要求。'}});qa=c.externalReviewValues();qa.submit();assert.equal(c.externalReviewValues().rejected,1);
});

test('review audience tabs support arrow keys and Home/End without changing pending counts',()=>{
 const {c}=fixture();const before=c.externalReviewValues().pending;
 for(const [key,expected] of [['ArrowRight',true],['ArrowLeft',false],['End',true],['Home',false]]){
  let prevented=false;c.externalReviewValues().audienceKey({key,preventDefault(){prevented=true}});
  assert(prevented);assert.equal(c.externalReviewValues().external,expected);assert.equal(c.externalReviewValues().pending,before);
 }
 assert.match(template,/role="tablist" aria-label="审核分类"/);
 assert.match(template,/class="eq-pending-badge"/);
 assert.match(template,/externalQA.pending > 0/);
});


test('external review preview navigation follows the visible queue and stops at its ends',()=>{
 const {c}=fixture();const first=c.externalReviewSource()[0];
 c.props.externalReviewItems=[first,{...first,id:'external-next',itemId:'next-item',name:'第二项'}];
 let qa=c.externalReviewValues();qa.rows[0].open();qa=c.externalReviewValues();
 assert(qa.cannotPrevious);assert(!qa.cannotNext);assert.equal(qa.positionLabel,'第 1 项，共 2 项');
 qa.previous();assert.equal(c.externalReviewValues().selected.id,first.id);
 qa.next();qa=c.externalReviewValues();assert.equal(qa.selected.id,'external-next');assert(qa.cannotNext);
 qa.next();assert.equal(c.externalReviewValues().selected.id,'external-next');
 qa.previous();assert.equal(c.externalReviewValues().selected.id,first.id);
 const html=fs.readFileSync(new URL('./postman-ui/external-review.html',import.meta.url),'utf8');
 assert.match(html,/data-pm-artifact-toolbar/);
 for(const key of ['ArrowUp','ArrowDown','Escape'])assert(html.includes('aria-keyshortcuts="'+key+'"'));
});


test('external review bottom actions submit pass directly and require a note for return or rejection',()=>{
 const {c}=fixture();let qa=c.externalReviewValues();qa.rows[0].open();qa=c.externalReviewValues();
 qa.requestRework();qa=c.externalReviewValues();assert(qa.requiresNote);assert(!qa.canSubmit);assert.equal(qa.submitLabel,'提交返修');
 qa.cancelDecision();qa=c.externalReviewValues();assert(!qa.requiresNote);assert.equal(qa.pending,1);
 qa.requestReject();qa=c.externalReviewValues();assert.equal(qa.submitLabel,'提交不通过');assert(!qa.canSubmit);
 qa.cancelDecision();qa=c.externalReviewValues();qa.approve();qa.approve();
 qa=c.externalReviewValues();assert.equal(qa.passed,1);assert.equal(qa.history.length,1);
 const html=fs.readFileSync(new URL('./postman-ui/external-review.html',import.meta.url),'utf8');
 assert.match(html,/footer class="review-workbench-actions eq-review-actions"/);
 assert.doesNotMatch(html,/class="eq-choices"|class="eq-submit"|class="forge-artifact-toolbar"/);
});


test('external review rows open from cells and keyboard without duplicating nested actions',()=>{
 const {c}=fixture();c.externalReviewValues().showExternal();
 const row=c.externalReviewValues().rows[0],cell={closest:()=>null};
 row.openRow({target:cell});assert.equal(c.state.externalReviewOpen,row.key);c.externalReviewValues().close();
 row.openRow({target:{closest:()=>({tagName:'BUTTON'})}});assert(!c.state.externalReviewOpen);
 for(const key of ['Enter',' ']){let prevented=false;row.keyOpenRow({key,target:cell,currentTarget:cell,preventDefault(){prevented=true}});assert(prevented);assert.equal(c.state.externalReviewOpen,row.key);c.externalReviewValues().close();}
 row.keyOpenRow({key:'Enter',target:{},currentTarget:cell,preventDefault(){throw Error('nested button handles its own key')}});assert(!c.state.externalReviewOpen);
 row.open();assert.equal(c.state.externalReviewOpen,row.key);assert.equal(Object.keys(c.externalReviewRecords()).length,0);
});
