import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const template = JSON.parse(fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url),'utf8').split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const click = {stopPropagation(){},preventDefault(){}};
const id = 'd9c4f7b1a6e3850f2d5b8e1a4c7f0b3d', sheet = 'step300';
function component() {
  const context=vm.createContext({URLSearchParams,window:{location:{search:''}},setTimeout:()=>0,clearTimeout(){},
    DCLogic:class{props={hasRuns:true,hasResources:true,panelWidth:460};setState(patch){this.state={...this.state,...patch};}}});
  vm.runInContext(code+';globalThis.c=new Component();',context);return context.c;
}
function pick(c,item=id,key=sheet){c.setState({view:'sheet',sheetKey:key,sheetRow:item});return c.renderVals().sheet.pick;}
const current=c=>c.renderVals().sheet.pick;
function append(c,item=id,key=sheet){pick(c,item,key).appendRework(click);current(c).onReworkText({target:{value:'调整屋顶材质'}});current(c).submitRework(click);return c.state.appendedRework[item];}
function complete(c,record,status='success'){c.setState({repairRuns:{...c.state.repairRuns,[record.repairKey]:{...c.state.repairRuns[record.repairKey],status}}});}
const names=p=>Array.from(p.versionNodes,node=>node.label);

test('approved Run 2 has no invented Run 3, and append creates that exact next version',()=>{
  const c=component(),p=pick(c);assert.deepEqual(names(p),['Run 2']);assert(p.approvedDetail&&p.canAppendRework);
  const record=append(c);const next=current(c);
  assert.equal(record.version,'Run 3');assert.equal(record.round,3);
  assert.deepEqual(names(next),['Run 2','Run 3']);assert.equal(next.versionNodes[1].badge,'排队中');
  assert(next.needsReview);assert(next.cannotReviewCandidate);assert(!next.approvedDetail);assert(!next.showHistoryAction);
  assert.equal(next.appendedRounds.length,1);assert.match(next.appendedRounds[0].label,/Run 3/);
  assert(c.runsData().some(run=>run.id===record.runId));
  assert.equal(next.fields.find(field=>field.k==='Run ID').v,record.runId);
});

test('old approval never auto-approves the appended candidate; technical completion only enables review',()=>{
  const c=component();c.state.reviewDecisions={['20260825-034505-c19f2a:'+id]:'pass'};
  const record=append(c);complete(c,record,'running');assert.equal(current(c).versionNodes[1].badge,'运行中');
  complete(c,record);const p=current(c);
  assert.equal(p.passFields.find(field=>field.k==='审核轮次').v,'第 3 轮');
  assert(p.canReviewCandidate);assert(!p.cannotReviewCandidate);assert(p.needsReview);assert(!p.approvedDetail);
  assert.equal(p.versionNodes[0].badge,'当前可交付');assert.equal(p.versionNodes[1].badge,'待审核');
  assert.equal(c.itemStateOf(id).currentDeliverableVersion.label,'Run 2');
  assert.equal(c.itemStateOf(id).candidateVersion.label,'Run 3');
  assert(c.pendingQueue().some(row=>row.id===id&&row.rec.id===record.runId));
  assert.equal(c.taskRunItem(c.runsData().find(run=>run.id===record.runId),0).itemId,id);
});

test('approving Run 3 promotes only it, retains Run 2, and permits a subsequent Run 4 append',()=>{
  const c=component(),record=append(c);complete(c,record);
  current(c).pass(click);current(c).confirmPass(click);
  assert.equal(c.state.reviewDecisions[record.runId+':'+id],'pass');
  assert(current(c).approvedDetail);assert(current(c).canAppendRework);
  assert.deepEqual(names(current(c)),['Run 2','Run 3']);assert.equal(current(c).versionNodes[1].badge,'当前可交付');
  assert.equal(current(c).appendedRounds[0].approved,true);
  const second=append(c);assert.equal(second.version,'Run 4');assert.equal(second.round,4);
  assert.equal(second.sourceRun,record.runId);assert.equal(second.approvedVersion.label,'Run 3');
  assert.deepEqual(names(current(c)),['Run 2','Run 3','Run 4']);
  assert.equal(c.state.submittedRuns.length,2);
});

test('requiring rework on Run 3 queues Run 4 without revoking the approved Run 2',()=>{
  const c=component(),first=append(c);complete(c,first);
  current(c).rework(click);assert(current(c).reworkFormOpen);
  current(c).onReworkText({target:{value:'台阶仍需修改'}});current(c).submitRework(click);
  assert(current(c).reworkConfirm.open);current(c).reworkConfirm.confirm(click);
  const next=c.state.appendedRework[id];assert.equal(next.version,'Run 4');assert.equal(next.sourceRun,first.runId);
  assert.equal(c.state.reviewDecisions[first.runId+':'+id],'rework');
  assert.equal(c.itemStateOf(id).currentDeliverableVersion.label,'Run 2');
  assert.deepEqual(names(current(c)),['Run 2','Run 3','Run 4']);
  assert.equal(current(c).versionNodes[1].badge,'要求返工');assert(current(c).cannotReviewCandidate);
  complete(c,next);current(c).confirmPass(click);
  assert.equal(c.itemStateOf(id).currentDeliverableVersion.label,'Run 4');
});

test('queued, running and failed runs cannot pass or open rework even through callbacks',()=>{
  for(const status of ['queued','running','failed','cancelled','stopped']) {
    const c=component(),record=append(c);complete(c,record,status);let p=current(c);
    assert(p.needsReview);assert(p.cannotReviewCandidate);assert(!p.showHistoryAction);
    p.pass(click);p.confirmPass(click);p.rework(click);
    assert(!c.state.sheetPassAsk);assert(!c.state.sheetReworkAsk);assert(!c.state.reviewDecisions?.[record.runId+':'+id]);
    c.state.reviewDecisions={[record.runId+':'+id]:'pass'};
    assert.equal(c.itemStateOf(id).currentDeliverableVersion.label,'Run 2','A premature decision must not become a delivered artifact');
    assert(p.showAppendRun);p.openAppendRun(click);assert.equal(c.state.activeRun,record.runId);
  }
});

test('old session append notes get a real candidate and do not jump from Run 3 to Run 4 on approval',()=>{
  const c=component();c.state.appendedRework={[id]:{note:'旧追加记录',round:3}};
  let p=pick(c);assert.deepEqual(names(p),['Run 2','Run 3']);assert(p.needsReview&&p.cannotReviewCandidate);
  const key='20260825-034505-c19f2a:'+id;c.state.repairRuns={[key]:{status:'success'}};
  p=current(c);assert(p.canReviewCandidate);p.confirmPass(click);
  assert.deepEqual(names(current(c)),['Run 2','Run 3']);assert(current(c).approvedDetail);
  assert.equal(c.itemStateOf(id,{legacy:'passed',runId:'20260825-034505-c19f2a'}).currentDeliverableVersion.label,'Run 3');
});

test('linked delivery slot gets its own next version without changing the original source approval',()=>{
  const c=component(),source='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',target='4c8e1f9a2b7d5e3016a9c2f4b8d7e0a1';
  c.openTaskLink({sheetKey:'ant200',itemId:source});c.taskLinkValues().items.find(item=>item.id===target).choose();
  c.taskLinkValues().onAck({target:{checked:true}});c.submitTaskLink();
  const before=JSON.stringify(c.taskLinkSource({sheetKey:'ant200',itemId:source}));
  const record=append(c,target,'ant200');assert.equal(record.version,'v4');assert.equal(record.sourceItemId,source);
  const entry=c.deliveryEntries(c.deliverySheet('ant200')).find(entry=>c.deliveryEntryId(entry)===target);
  let link=c.deliveryLinkState(c.deliverySheet('ant200'),entry);assert.equal(link.current.label,'v3');assert(!link.candidate.source.ready);
  complete(c,record);current(c).confirmPass(click);
  link=c.deliveryLinkState(c.deliverySheet('ant200'),entry);assert.equal(link.current.label,'v4');assert(!link.candidate);
  assert.equal(link.current.source.itemId,target);assert.equal(c.state.reviewDecisions[record.runId+':'+target],'pass');
  assert.equal(JSON.stringify(c.taskLinkSource({sheetKey:'ant200',itemId:source})),before);
});

test('another association supersedes appended draft state without losing the old run record',()=>{
  const c=component(),record=append(c),source='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f';
  c.openTaskLink({sheetKey:'ant200',itemId:source});c.taskLinkValues().onSheet({target:{value:sheet}});
  c.taskLinkValues().items.find(item=>item.id===id).choose();c.taskLinkValues().onAck({target:{checked:true}});c.submitTaskLink();
  assert.equal(c.appendedRecord(id),null);assert(pick(c).approvedDetail);
  assert(c.state.submittedRuns.some(run=>run.id===record.runId));
});

test('stale confirmation never approves a replacement candidate',()=>{
  const c=component(),first=append(c);complete(c,first);current(c).pass(click);const stale=current(c).confirmPass;
  current(c).rework(click);current(c).onReworkText({target:{value:'再修改'}});current(c).submitRework(click);
  current(c).reworkConfirm.confirm(click);
  const second=c.state.appendedRework[id];complete(c,second);stale(click);
  assert(!c.state.reviewDecisions[second.runId+':'+id]);assert.equal(c.state.reviewDecisions[first.runId+':'+id],'rework');
});

test('version nodes are derived from actual records, and footer review controls declare disabled state',()=>{
  const c=component();const p=pick(c,'701f39aa8af242e2a322670c1d4b8e95','ant200');
  assert.deepEqual(names(p),['Run 2','Run 4'],'No fabricated intermediate Run 3');
  const footer=fs.readFileSync(new URL('./templates/detail-footer.html',import.meta.url),'utf8');
  assert.equal((footer.match(/disabled="{{ sheet.pick.cannotReviewCandidate }}"/g)||[]).length,2);
  assert(footer.includes('role="status"'));assert(template.includes('{{ sheet.pick.appendedRounds }}'));
});
