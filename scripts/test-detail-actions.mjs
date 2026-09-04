import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const template = JSON.parse(fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8').split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const markup = template.slice(0, template.indexOf('<script type="text/x-dc"'));
const footer = markup.match(/<!-- detail-footer:start -->([\s\S]*?)<!-- detail-footer:end -->/)[1];
const click = {stopPropagation(){}, preventDefault(){}};
const sourceId = 'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f';
const candidateId = '701f39aa8af242e2a322670c1d4b8e95';
const pendingId = '9f2a7c1b5e8d4036a1c4e7b209d6f8a3';
function component() {
  const context = vm.createContext({URLSearchParams, window: {location:{search:''}}, setTimeout:()=>0, clearTimeout(){},
    DCLogic: class {props={panelWidth:460,hasRuns:true,hasResources:true}; setState(p){this.state={...this.state,...p};}}});
  vm.runInContext(code + ';globalThis.c = new Component();', context); return context.c;
}
function pick(c, id = sourceId) {c.setState({view:'sheet',sheetKey:'ant200',sheetRow:id}); return c.renderVals().sheet.pick;}

test('association is a named pencil beside Item IDs, not a large title/action button', () => {
  assert(!markup.includes('class="forge-task-link-cta"'));
  const edits = [...markup.matchAll(/<button\b[^>]*class="forge-task-link-edit"[^>]*>[\s\S]*?<\/button>/g)];
  assert.equal(edits.length, 5);
  for (const [button] of edits) {
    assert(button.includes('title="更换关联任务"'));
    assert(button.includes('aria-label="更换关联任务"'));
    assert(button.includes('data-phosphor="pencil-simple"'));
    assert(!button.includes('<span>关联任务'));
  }
  for (const field of ['f.v', 'life.id', 'run.itemId', 'it.id']) {
    assert(markup.includes('title="{{ ' + field + ' }}"'));
  }
  assert(markup.includes('<h2 id="forge-task-link-title">更换关联任务</h2>'));
  assert(markup.includes('class="forge-item-id-row"'));
});

test('approved details show their verdict and a secondary append action with adjacent download', () => {
  const c=component(), p=pick(c);
  assert.equal(p.state,'已通过审核'); assert(p.showState);
  assert(p.approvedDetail); assert(!p.needsReview); assert(!p.showHistoryAction);
  assert(p.canAppendRework); assert(!p.cannotAppendRework);
  const approved = footer.match(/<sc-if value="{{ sheet.pick.approvedDetail }}"[^>]*>([\s\S]*?)<\/sc-if>/)[1];
  assert(approved.includes('forge-detail-secondary')); assert(approved.includes('追加返工'));
  assert(approved.includes('aria-label="下载已通过版本"'));
  assert(!approved.includes('forge-detail-primary')); assert(!approved.includes('sheet.pick.pass'));
  assert(!markup.includes('{{ sheet.pick.canAppendRework }}'), 'No duplicate history action');
});

test('a new candidate never inherits the final version approval or append controls', () => {
  const c=component();
  for(const id of [candidateId,pendingId]) {
    const p=pick(c,id); assert(p.needsReview); assert(!p.approvedDetail);
    assert.equal(p.state,'待审核候选'); assert.equal(p.showState, false); assert(p.cannotAppendRework);
    assert.match(p.previewCaption,/待审核候选/);
    p.appendRework(click); assert(!c.state.sheetReworkAsk);
    p.download(click); assert(!c.state.dlQueued);
  }
});

test('pending details keep rework primary, approval secondary and confirm before mutating review state', () => {
  const review = footer.match(/<sc-if value="{{ sheet.pick.needsReview }}"[^>]*>([\s\S]*?)<\/sc-if>\s*<\/sc-if>/)?.[1];
  assert(review); assert(review.indexOf('forge-detail-approve') < review.indexOf('forge-detail-primary'));
  assert.match(review, /forge-detail-approve[^>]*>通过审核<\/button>/);
  assert.match(review, /forge-detail-primary[^>]*>要求返工<\/button>/);
  const c = component(); let p = pick(c, pendingId);
  p.rework(click); p = c.renderVals().sheet.pick;
  p.onReworkText({target:{value:'  修复材质并保持现有构图  '}}); p = c.renderVals().sheet.pick;
  const before = JSON.stringify(c.state.reviewDecisions);
  p.submitRework(click); p = c.renderVals().sheet.pick;
  assert(p.reworkConfirm.open); assert.equal(JSON.stringify(c.state.reviewDecisions), before); assert(!c.state.repairRuns);
  assert(p.reworkConfirm.fields.some(field => field.k === '返工说明' && field.v === '修复材质并保持现有构图'));
  p.reworkConfirm.cancel(click); p = c.renderVals().sheet.pick;
  assert(!p.reworkConfirm.open); assert(p.reworkFormOpen); assert.equal(p.reworkText, '  修复材质并保持现有构图  ');
  p.submitRework(click); p = c.renderVals().sheet.pick;
  const decisionKey = c.state.sheetReworkConfirmAsk.reviewKey;
  p.reworkConfirm.confirm(click);
  const run = Object.values(c.state.repairRuns)[0];
  assert.equal(run.note, '修复材质并保持现有构图'); assert.equal(c.state.reviewDecisions[decisionKey], 'rework');
  assert(!c.renderVals().sheet.pick.reworkFormOpen); assert(!c.state.sheetReworkConfirmAsk);
});

test('append rework stays inline, requires a note and preserves the final and approval', () => {
  const c=component(), before=JSON.stringify(c.sheetRows(c.deliverySheet('ant200')).find(row=>row[2]===sourceId)[6].currentDeliverableVersion);
  const decisions=JSON.stringify(c.state.reviewDecisions);
  pick(c).appendRework(click);
  let p=c.renderVals().sheet.pick;
  assert(p.reworkFormOpen); assert.equal(p.reworkTitle,'追加返工'); assert.equal(p.detailDisplay,'none');
  assert(p.cannotSubmitRework); p.submitRework(click); assert(!c.state.repairRuns);
  p.onReworkText({target:{value:'  调整屋顶材质  '}});
  c.setFeedbackImages('sheet:'+sourceId,[{id:'ref',name:'roof.png',url:'data:image/png;base64,dGVzdA==',type:'image/png',size:4,status:'ready'}],'');
  p=c.renderVals().sheet.pick; p.submitRework(click);
  const run=Object.values(c.state.repairRuns)[0];
  assert.equal(run.note,'调整屋顶材质'); assert.equal(run.status,'queued'); assert.equal(run.attachments.length,1);
  assert.equal(JSON.stringify(c.state.reviewDecisions),decisions);
  assert.equal(JSON.stringify(c.sheetRows(c.deliverySheet('ant200')).find(row=>row[2]===sourceId)[6].currentDeliverableVersion),before);
  assert(c.renderVals().sheet.pick.cannotAppendRework);
  assert.match(c.state.reviewToast,/原审核结论保留/);
});

test('quota and already-appended states disable controls and stale callbacks cannot queue again', () => {
  const c=component(), stale=pick(c);
  c.state.appendedRework={[sourceId]:{note:'已提交',round:4}};
  stale.appendRework(click); assert(!c.state.sheetReworkAsk);
  assert.match(pick(c).appendHint,/已有追加返工/);
  c.state.appendedRework={}; c.roundsOf=()=>19;
  const limit=pick(c); assert(limit.cannotAppendRework); assert.match(limit.appendHint,/20 轮上限/);
  limit.appendRework(click); assert(!c.state.sheetReworkAsk);
  const fresh=component(); pick(fresh).appendRework(click);
  fresh.renderVals().sheet.pick.onReworkText({target:{value:'追加'}});
  const staleSubmit=fresh.renderVals().sheet.pick.submitRework;
  fresh.state.appendedRework={[sourceId]:{note:'已提交',round:4}};
  staleSubmit(click); assert(!fresh.state.repairRuns);
});

test('download selects the approved source version, deduplicates and labels its demo boundary', () => {
  const c=component(), p=pick(c), before=JSON.stringify(c.state.reviewDecisions);
  const current=c.sheetRows(c.deliverySheet('ant200')).find(row=>row[2]===sourceId)[6].currentDeliverableVersion;
  p.download(click); p.download(click);
  assert.equal(c.state.dlQueued.length,1);
  const job=c.state.dlQueued[0];
  assert.equal(job.itemId,sourceId); assert.equal(job.sourceItemId,sourceId);
  assert.equal(job.runId,current.runId); assert.equal(job.version,current.label);
  assert.match(job.meta,/本地演示/); assert.equal(job.pct,0);
  assert.match(c.state.taskLinkToast.text,/已在下载列表/);
  assert.equal(JSON.stringify(c.state.reviewDecisions),before);
});

test('download follows the associated task, not the delivery slot original task', () => {
  const c=component(), target='4c8e1f9a2b7d5e3016a9c2f4b8d7e0a1';
  c.openTaskLink({sheetKey:'ant200',itemId:sourceId});
  c.taskLinkValues().items.find(value=>value.id===target).choose();
  c.taskLinkValues().onAck({target:{checked:true}}); c.submitTaskLink();
  pick(c,target).download(click);
  const job=c.state.dlQueued[0];
  assert.equal(job.itemId,target); assert.equal(job.sourceItemId,sourceId); assert.equal(job.version,'v3');
});

test('export-batch metadata is removed without deleting delivery exports or history access', () => {
  assert(!template.includes('导出批次'));
  assert(markup.includes('{{ sheet.exportLabel }}')); assert(markup.includes('{{ f.go }}'));
  const c=component();
  assert(!pick(c).fields.some(field=>field.k==='导出批次'));
  pick(c).fields.find(field=>field.k==='Item ID').go(click);
  assert.equal(c.state.view,'itemlife'); assert.equal(c.state.lifeItem,sourceId);
});

test('small actions keep fixed icon targets, truncating IDs, focus and disabled styles', () => {
  const css=fs.readFileSync(new URL('./templates/detail-actions.css',import.meta.url),'utf8').trimEnd();
  assert(template.includes(css));
  assert(css.includes('text-overflow:ellipsis'));
  assert(css.includes('.forge-task-link-edit:focus-visible'));
  assert(css.includes('.forge-detail-action:disabled'));
  assert(css.includes('.forge-rework-confirm-dialog'));
  assert(css.includes('.forge-rework-confirm-primary'));
  assert(css.includes('@media(pointer:coarse)'));
  assert(css.includes('.forge-detail-download{flex:0 0 40px;width:40px;padding:0}'));
  assert(css.includes('@media(max-width:760px)'));
});
