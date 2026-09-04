import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {modelStatusCopy} from './postman-ui/model-status.mjs';
import {lifecyclePhotoCopy} from './postman-ui/lifecycle-photos.mjs';
import {ant200MockCopy} from './postman-ui/ant200-mock.mjs';
import {overviewSummaryCopy} from './postman-ui/overview-summary.mjs';
import {reviewAllocationCopy} from './postman-ui/review-allocation.mjs';
import {linkedItemToastCopy} from './postman-ui/linked-item-toast.mjs';
import {removeDeliveryDrafts} from './postman-ui/remove-delivery-drafts.mjs';
import {buildPostman} from './postman-ui/build.mjs';
import {confirmDelivery} from './test-support/delivery-wizard.mjs';
const url=new URL('../public/forge.html',import.meta.url);
const source=fs.readFileSync(url,'utf8');
const decode=s=>JSON.parse(s.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const original=decode(source), built=decode(buildPostman(source));
const logic=t=>t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({URL,URLSearchParams,TextDecoder,TextEncoder,Blob,setTimeout:()=>0,clearTimeout(){},window:{location:{search:''}},DCLogic:class{props={panelWidth:460,hasRuns:true,hasResources:true};setState(p){this.state={...this.state,...p};}}});
vm.runInContext(logic(built)+';globalThis.codec=ForgeRoutes;globalThis.c=new Component();',ctx);
test('independent generator is deterministic and preserves the source bytes',()=>{assert.equal(buildPostman(source),buildPostman(source));assert.equal(fs.readFileSync(url,'utf8'),source);assert.match(built,/Postman UI 优化版/);});
test('UI transformation preserves all business methods outside route adaptation',()=>{
 const strip=s=>s.slice(s.indexOf('class Component')).replace(/  \/\/ pm-delivery-preview-mock:start[\s\S]*?  \/\/ pm-delivery-preview-mock:end\n\n/,'').replace(' || this.pmDeliveryArtifactMock(itemId, runId); // pm-delivery-preview-fallback',';').replace(/  \/\/ pm-item-explorer-demo:start[\s\S]*?  \/\/ pm-item-explorer:end\n\n/,'').replace(/^.*\/\/ pm-item-explorer-values\n/gm,'').replace(/^.*\/\/ pm-node-config-values\n/gm,'').replace(/^.*\/\/ pm-pipeline-access-values\n/gm,'').replace(/  \/\/ forge-routing-methods:start[\s\S]*?\/\/ forge-routing-methods:end/,'').replace(/\n  \/\/ pm-review-queue-methods:start[\s\S]*?\/\/ pm-review-queue-methods:end\n/,'').replace(/\n      \/\/ pm-review-queue-values:start[\s\S]*?\/\/ pm-review-queue-values:end\n/,'').replace(/\n  \/\/ pm-run-records-methods:start[\s\S]*?\/\/ pm-run-records-methods:end\n/,'').replace(/    \/\/ pm-run-records-values:start[\s\S]*?\/\/ pm-run-records-values:end\n\n/,'RUN_RECORDS_VIEW_MODEL').replace(/    const runPal =[\s\S]*?(?=    const delMap =)/,'RUN_RECORDS_VIEW_MODEL').replace('const mineRows = rows.filter(r => (this.reviewQueueClaim(r) || r.assignee).toLowerCase() === me.toLowerCase()); // pm-review-queue-owner','const mineRows = rows.filter(r => r.assignee === me);');
 const normalizeModels=s=>modelStatusCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),s);
 const normalizeCopy=s=>linkedItemToastCopy.reduce((text,[from,to])=>text.replace(to,()=>from),overviewSummaryCopy.reduce((text,[from,to])=>text.replace(from,()=>to),reviewAllocationCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),ant200MockCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),lifecyclePhotoCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),s))))).replace(/\n  \/\/ pm-branch-search:start[\s\S]*?  \/\/ pm-branch-search:end\n/,'').replace('branch: this.pmBranchValues(),','branch: this.branchFormValues(),').replace(/^.*\/\/ pm-photo-slots\n/gm,'').replace(/\n\n  \/\/ pm-lifecycle-photos:start[\s\S]*?  \/\/ pm-lifecycle-photos:end\n/,'');
 assert.equal(normalizeCopy(normalizeModels(strip(logic(built)))),normalizeCopy(strip(removeDeliveryDrafts(logic(original)))));
});
test('representative sheet keeps the five metrics and accessible disabled export',()=>{for(const n of ['pm-sheet-heading','pm-sheet-progress','pm-sheet-metrics','pm-sheet-list'])assert.match(built,new RegExp(n));assert.match(built,/<button[^>]*disabled="disabled"[^>]*title="当前原型尚未接入统一导出服务"/);});
test('all main routes stay in Postman UI after round trip',()=>{for(const path of ['/overview','/production/runs','/production/pipelines','/production/datasets','/production/resources','/review/pending','/delivery','/delivery/ant200','/billing/overview','/models']){const r=ctx.codec.read(path);assert.equal(r.error,'');const p=ctx.codec.write(r.patch);assert.match(p,/^\/forge-postman.html\?route=/);assert.equal(ctx.codec.read(p).patch.view,r.patch.view);}});
test('app shell keeps clean URLs while the standalone preview keeps its isolated entry',()=>{
 const origin='https://forge.test';
 const framed=vm.createContext({URL,URLSearchParams,TextDecoder,TextEncoder,Blob,setTimeout:()=>0,clearTimeout(){},window:{location:{search:'',origin},parent:{location:{origin}},frameElement:{classList:{contains:name=>name==='forge-frame'}}},DCLogic:class{props={panelWidth:460,hasRuns:true,hasResources:true};setState(p){this.state={...this.state,...p};}}});
 vm.runInContext(logic(built)+';globalThis.codec=ForgeRoutes;',framed);
 assert.equal(framed.codec.write(framed.codec.read('/production/pipelines').patch),'/production/pipelines');
 assert.match(ctx.codec.write(ctx.codec.read('/production/pipelines').patch),/^\/forge-postman.html\?route=/);
});
test('category, sorting, search and section anchors survive reload',()=>{const r=ctx.codec.read('/delivery?category=Web3D&sort=oldest');assert.equal(r.patch.delCat,'Web3D');assert.equal(r.patch.delSort,'oldest');const next=ctx.codec.read(ctx.codec.write(r.patch));assert.equal(next.patch.delSort,'oldest');assert.equal(ctx.codec.read('/delivery').patch.delCat,'all');const s=ctx.codec.read('/delivery/ant200?q='+encodeURIComponent('长名称 中文')+'#members');const back=ctx.codec.read(ctx.codec.write(s.patch));assert.equal(back.patch.sheetQuery,'长名称 中文');assert.equal(back.patch.routeAnchor,'members');});
test('direct sample, malformed and missing routes retain their original validation',()=>{assert.equal(ctx.codec.read('/forge-postman.html?view=sheet&sheetKey=ant200').patch.sheetKey,'ant200');assert(ctx.codec.read('/does-not-exist').error);assert(ctx.codec.read('//foreign.example/delivery').error);});
test('delivery defaults render real groups and all five existing sheets',()=>{Object.assign(ctx.c.state,ctx.codec.read('/delivery').patch);const values=ctx.c.renderVals();assert.equal(values.delivery.customers.reduce((n,c)=>n+c.sheets.length,0),5);});
test('edit and create flows retain validation and in-memory save',()=>{const c=ctx.c;c.openDeliveryEditor();assert(c.deliveryEditorValues().disabled);c.patchDeliveryEditor({name:'Postman UI 验证',customer:'验证客户',target:'1'});c.setDeliveryList('天坛');confirmDelivery(c);assert(!c.deliveryEditorValues().disabled);c.saveDeliveryEditor();assert.equal(c.deliverySheet(c.state.sheetKey).name,'Postman UI 验证');});
test('pending case actions make rework primary, approval secondary and selected labels keep semantic color',()=>{
 const button=action=>built.match(new RegExp('<button[^>]*sc-camel-on-click="\\{\\{ '+action.replaceAll('.','\\.')+' \\}\\}"[^>]*>'))?.[0]||'';
 for(const action of ['sheet.pick.rework','it.rework']){assert.match(button(action),/data-pm-primary="true"/);assert.doesNotMatch(button(action),/data-pm-secondary=/);}
 for(const action of ['sheet.pick.pass','it.pass']){assert.match(button(action),/data-pm-secondary="true"/);assert.doesNotMatch(button(action),/data-pm-primary=/);}
 assert.match(built,/\.forge-postman \.forge-case-options \.forge-case-button:not\(:disabled\)\[aria-pressed=true\]\{background:var\(--case-color\)!important;color:var\(--pm-on-action\)!important;border-color:var\(--case-color\)!important/);
 assert.match(built,/data-case=good\]\{--case-color:var\(--pm-success\);--case-soft:var\(--pm-success-soft\)/);
 assert.match(built,/data-case=bad\]\{--case-color:var\(--pm-danger\);--case-soft:var\(--pm-danger-soft\)/);
});
test('billing follows the compact hierarchy, orange data scale and neutral selection',()=>{
 assert.match(built,/\.forge-postman \.forge-billing-metrics>div\{border:0;border-radius:0;padding:0 20px;background:transparent\}/);
 assert.match(built,/\.forge-postman \.forge-billing-cost-bar\{background:var\(--pm-brand\)\}/);
 assert.match(built,/\.forge-postman \.forge-billing-filters\{display:grid;grid-template-columns:minmax\(190px,1\.08fr\).* auto;/);
 assert.match(built,/\.forge-postman \.forge-billing-segment button\[aria-pressed=true\]\{background:var\(--pm-selected\)!important;color:var\(--pm-text\)!important/);
});
test('every major legacy surface has a stable Postman page hook',()=>{
 for(const hook of ['pm-page-overview','pm-page-pipelines','pm-page-pipeedit','pm-page-datasets','pm-page-resources','pm-page-itemlife','pm-page-review','pm-page-submitted','pm-page-run','pm-page-error'])assert.match(built,new RegExp(hook));
 assert.match(built,/class="pm-pipeline-node" data-node-kind="\{\{ n\.kind \}\}"/);
 assert.match(built,/\.forge-model-badge\[data-tone=warning\]/);
});
test('resources keeps its page-level create action in the shared primary tier',()=>{
 const button=Array.from(built.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g),m=>m[0]).find(value=>value.includes('新建资源包'))||'';
 assert.match(button,/data-pm-primary="true"/);
 assert.doesNotMatch(button,/data-pm-secondary=/);
});
test('review scope is a filter beneath status tabs and completed tasks retain result actions',()=>{
 assert.match(built,/aria-label="审核范围"/);
 assert.match(built,/class="pq-tabs" role="tablist"/);
 assert.match(built,/role="table" aria-label="审核任务列表"/);
 assert.doesNotMatch(built,/<span class="pm-preview-label">/);
});

test('Item review allocation saves distinct reviewers and reopens in Item mode',()=>{
 const c=vm.runInContext('new Component()',ctx);
 c.openDeliveryEditor();
 c.patchDeliveryEditor({name:'逐条分配验证',customer:'验证客户',target:'2'});
 c.setDeliveryList('天坛\n长城');
 confirmDelivery(c);
 c.deliveryDatasetReviewValues().byItem();
 let view=c.deliveryDatasetReviewValues();
 assert.equal(view.count,2);
 assert(view.isItem);
 const people=view.rows[0].options;
 assert(people.length>1);
 view.rows[0].onReviewer({target:{value:people[0].accountName}});
 view=c.deliveryDatasetReviewValues();
 view.rows[1].onReviewer({target:{value:people[1].accountName}});
 const expected=c.deliveryEditorReviewDatasets().map(r=>[r.key,r.reviewer]);
 c.deliveryDatasetReviewValues().byDataset();
 assert(c.deliveryDatasetReviewValues().isDataset);
 c.deliveryDatasetReviewValues().byItem();
 assert.deepEqual(c.deliveryEditorReviewDatasets().map(r=>[r.key,r.reviewer]),expected);
 c.deliveryDatasetReviewValues().onQuery({target:{value:'天坛'}});
 assert.equal(c.deliveryDatasetReviewValues().rows.length,1);
 assert.equal(c.deliveryDatasetReviewValues().count,2);
 c.updateDeliveryDatasetReview(expected[1][0],'reviewer','',c.state.deliveryEditor.id);
 assert.match(c.deliveryDatasetReviewIssue(),/长城/);
 c.updateDeliveryDatasetReview(expected[1][0],'reviewer',expected[1][1],c.state.deliveryEditor.id);
 assert.equal(c.deliveryDatasetReviewIssue(),'');
 c.saveDeliveryEditor();
 const key=c.state.sheetKey, saved=c.deliverySheet(key);
 assert.equal(saved.reviewScope,'item');
 assert.deepEqual(Object.keys(saved.datasetReviews),Array.from(expected,r=>r[0]));
 c.openDeliveryEditor(key);
 assert(c.deliveryDatasetReviewValues().isItem);
 assert.deepEqual(c.deliveryEditorReviewDatasets().map(r=>[r.key,r.reviewer]),expected);
});

test('Item assignment paginates, deduplicates and preserves edit permission checks',()=>{
 const c=vm.runInContext('new Component()',ctx);
 c.openDeliveryEditor();
 const entries=Array.from({length:25},(_,i)=>({key:'row'+i,itemId:'id'+i,name:'任务'+i,source:'任务'+i}));
 c.patchDeliveryEditor({entries:[...entries,entries[0]],reviewScope:'item'});
 let view=c.deliveryDatasetReviewValues();
 assert.equal(view.count,25);assert.equal(view.rows.length,20);
 view.next();view=c.deliveryDatasetReviewValues();assert.equal(view.rows.length,5);
 view.onQuery({target:{value:'id24'}});view=c.deliveryDatasetReviewValues();assert.equal(view.rows.length,1);
 assert.equal(view.rows[0].name,'任务24');
 c.patchDeliveryEditor({listLoading:true});
 c.deliveryDatasetReviewValues().byDataset();assert.equal(c.state.deliveryEditor.reviewScope,'item');
 const before=JSON.stringify(c.state.deliveryEditor.datasetReviews);
 c.deliveryDatasetReviewValues().rows[0].onReviewer({target:{value:''}});
 assert.equal(JSON.stringify(c.state.deliveryEditor.datasetReviews),before);
});


test('ant200 mock has 200 distinct entries with matching allocation and live totals',()=>{
 const c=vm.runInContext('new Component()',ctx);
 const sheet=c.deliverySheet('ant200'), rows=c.sheetRows(sheet), extras=c.deliverySheetExtras(sheet);
 assert.equal(rows.length,200);assert.equal(new Set(rows.map(r=>r[2])).size,200);
 assert.equal(rows.filter(r=>r[2].startsWith('mock-ant200-item-')).length,194);
 assert.equal(extras.count,200);assert.equal(extras.shownCount,200);
 assert.equal(extras.reviewAssignment.rows.reduce((n,r)=>n+r.count,0),200);
 for(const [key,predicate] of Object.entries({linked:()=>true,ran:r=>!!r[5],passed:r=>r[3]==='passed',review:r=>r[3]==='review',failed:r=>r[3]==='failed'}))assert.equal(sheet[key],rows.filter(predicate).length,key);
 assert.equal(sheet.passed,156);
 c.setState({view:'sheet',sheetKey:'ant200',sheetFilter:'all',sheetQuery:''});
 assert.equal(c.renderVals().sheet.rows.length,200);
 c.setState({sheetQuery:'mock-ant200-item-200'});assert.equal(c.renderVals().sheet.rows.length,1);
 const item=rows.find(r=>r[2].startsWith('mock-')&&r[3]==='review');
 c.setState({itemStates:{[item[2]]:{businessStatus:'deliverable',currentDeliverableVersion:{label:'Run 1',runId:item[5]},candidateVersion:null}}});
 assert.equal(c.deliverySheet('ant200').passed,157);assert.equal(c.deliverySheet('ant200').review,sheet.review-1);
 assert.equal(c.deliverySheet('step300').linked,96);
});


test('lifecycle photos fill eight slots from paste and upload, with six-slot forms unchanged',async()=>{
 ctx.FileReader=class{readAsDataURL(file){queueMicrotask(()=>{this.result='data:'+file.type+';base64,aQ==';this.onload();});}};
 ctx.Image=class{naturalWidth=1;set src(value){queueMicrotask(()=>this.onload());}};
 const c=vm.runInContext('new Component()',ctx), key='life:701f39aa8af242e2a322670c1d4b8e95';
 c.setState({view:'itemlife',lifeItem:key.slice(5),lifeAppend:true});
 const file=i=>({name:'photo-'+i+'.png',type:'image/png',size:128});
 let prevented=false;
 await c.handleFeedbackPaste({clipboardData:{items:[{kind:'file',getAsFile:()=>file(1)}]},preventDefault(){prevented=true;}});
 assert(prevented);assert.equal(c.pmLifeFeedback(key.slice(5)).emptySlots[0].position,2);
 await c.addFeedbackImages(key,Array.from({length:8},(_,i)=>file(i+2)));
 let view=c.pmLifeFeedback(key.slice(5));assert.equal(view.images.length,8);assert.equal(view.emptySlots.length,0);assert(view.full);assert.match(view.error,/8 张/);
 assert(view.images.every(x=>x.ready&&x.url.startsWith('data:image/png')));
 view.images[3].remove();view=c.pmLifeFeedback(key.slice(5));assert.equal(view.images.length,7);assert.equal(view.emptySlots[0].position,8);
 await c.addFeedbackImages('sheet:other',Array.from({length:8},(_,i)=>file(i)));
 assert.equal(c.feedbackImages('sheet:other').length,6);
 c.renderVals().life.cancelAppend();assert.equal(c.feedbackImages(key).length,0);
});

test('model summary and pending shortcut preserve complete results without hidden impact filters',()=>{
 const c=vm.runInContext('new Component()',ctx);
 Object.assign(c.state,ctx.codec.read('/models?model=claude-sonnet').patch,{modelBusinessOnly:true});
 let view=c.modelStatusValues();
 assert.equal(view.businessOnly,false);
 assert.equal(view.lines.length,3);
 view.showIssues(); view=c.modelStatusValues();
 assert.equal(view.filter,'attention');
 assert.equal(view.model,'');
 assert.equal(view.lines.length,5);
 assert.equal(view.lines.some(line=>line.statusKey==='normal'),false);
 const header=built.match(/<div class="forge-model-table-head"[^>]*>(.*?)<\/div>/)[1];
 assert.equal((header.match(/role="columnheader"/g)||[]).length,9);
 assert.doesNotMatch(header,/操作|供应商 \/ 模型/);
 assert.doesNotMatch(built,/<(?:div|label)[^>]+class="forge-model-(?:actions|impact-filter)"/);
 assert.match(built,/class="pm-model-summary forge-overview-summary"/);
});


test('delivery drafts are removed while unsaved-form protection remains',()=>{
 const c=vm.runInContext('new Component()',ctx);
 for(const method of ['loadDeliveryDrafts','saveDeliveryDraft','resumeDeliveryDraft','deliveryDraftStorage']) assert.equal(c[method],undefined);
 assert.doesNotMatch(built,/deliveryEditor\.draft|forge-delivery-drafts|deliveryDrafts|savedDraftId|保存草稿/);
 c.openDeliveryEditor();
 assert.equal(c.deliveryFormDirty(),false);
 c.patchDeliveryEditor({name:'尚未提交的数据单'});
 c.requestDeliveryLeave();
 assert(c.deliveryLeaveValues().open);
 c.deliveryLeaveValues().keep();
 assert.equal(c.state.deliveryEditor.name,'尚未提交的数据单');
 c.requestDeliveryLeave();
 c.deliveryLeaveValues().discard();
 assert.equal(c.state.deliveryEditor,null);
 assert.equal(c.state.view,'delivery');
 const oldLink=ctx.codec.read('/delivery/new?draft=old-draft#basic');
 assert.equal(oldLink.error,'');
 assert.equal(oldLink.patch.view,'delivery-create');
 assert.equal(oldLink.draft,undefined);
 assert.doesNotMatch(ctx.codec.write(oldLink.patch),/draft/);
});


test('Item explorer scopes evidence to the exact Item and Run and preserves tabs',()=>{
 const c=vm.runInContext('new Component()',ctx), id='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',runId='20260825-034505-c19f2a';
 Object.assign(c.state,{view:'itemlife',lifeItem:id,lifeRun:runId,sheetKey:'ant200'});
 let e=c.pmItemExplorerValues({id}); assert(e.demo); assert.equal(e.fileCount,4); assert(e.hasPrompts);assert(e.hasEvents);
 assert.deepEqual(Array.from(e.nodes,n=>n.name),Array.from(c.pipeData().find(p=>p.name==='web3d-gen-build-eval-v3').dag,n=>n.split('/')[0]));
 e.tabs.find(t=>t.key==='pipeline').pick();e.nodes[1].pick();e=c.pmItemExplorerValues({id});
 assert(e.pipelineTab);assert.equal(e.node.name,'build');assert(e.node.hasConfig);assert(e.node.hasResult);
 e.tabs.find(t=>t.key==='files').pick();e.files[2].pick();e=c.pmItemExplorerValues({id});assert.equal(e.file.name,'prompts/build_product.md');assert.match(e.file.content,/长城/);
 c.props.artifacts={[id]:{[runId]:{files:[{name:'actual.txt',content:'actual evidence',url:'javascript:alert(1)'}],execution:{prompts:[{content:'actual prompt'}],events:[{detail:'actual event'}],nodes:{}}}}};
 e=c.pmItemExplorerValues({id});assert(!e.demo);assert.equal(e.fileCount,1);assert.equal(e.file.url,'');assert.equal(e.prompts[0].content,'actual prompt');
 c.state.lifeRun='unrelated-run';e=c.pmItemExplorerValues({id});assert(e.noFiles);assert(e.noPrompts);assert(e.noEvents);assert(e.noPipeline);
});
test('Pipeline inspector prefers versioned configuration over marked mock defaults',()=>{
 const c=vm.runInContext('new Component()',ctx),p=c.pipeData()[0];
 let d=c.pmNodeDetails(p,'task',null,true);assert(d.demo);assert(d.hasConfig);
 c.props.pipelineConfigs={[p.name]:{[p.version]:{task:{fn:'actual_function',args:{limit:2}}}}};
 d=c.pmNodeDetails(p,'task',null,true);assert(!d.demo);assert.equal(d.configFields[0].value,'actual_function');
 d=c.pmNodeDetails(p,'task',{config:{fn:'snapshot_function'},attempts:[{status:'success'}],result:{ok:true}});
 assert.equal(d.configFields[0].value,'snapshot_function');assert(d.hasAttempts);assert(d.hasResult);
});

test('Item view links retain the selected tab and scope after reload',()=>{
 const route=ctx.codec.read('/items/b3d81c4e77af4a5c9e2f1a6b8c0d3e5f?run=20260825-034505-c19f2a&sheet=ant200&tab=files');
 assert.equal(route.patch.pmItemTab,'files');
 const restored=ctx.codec.read(ctx.codec.write(route.patch));
 assert.equal(restored.patch.pmItemTab,'files');assert.equal(restored.patch.lifeRun,route.patch.lifeRun);
 assert.equal(ctx.codec.read('/items/b3d81c4e77af4a5c9e2f1a6b8c0d3e5f?tab=invalid').patch.pmItemTab,'history');
});

test('Pipeline viewer routes persist and role guards apply even on direct editor links',()=>{
 const c=vm.runInContext('new Component()',ctx), name='web3d-gen-build-eval-v3';
 const viewer=ctx.codec.read('/production/pipelines/'+name+'/view?node=build');
 assert.equal(viewer.error,'');assert(viewer.patch.pmPipelineView);
 const restored=ctx.codec.read(ctx.codec.write(viewer.patch));
 assert(restored.patch.pmPipelineView);assert.equal(restored.patch.editSel,'build');
 for(const role of ['member','outsourcing','unknown','lead','project-owner']) {
  c.props.currentRole=role;
  Object.assign(c.state,ctx.codec.read('/production/pipelines/'+name+'/edit').patch,{editSaved:false,editNodes:null,peDelete:false});
  const pe=c.renderVals().pe, allowed=['lead','project-owner'].includes(role);
  assert.equal(pe.canEdit,allowed);assert.equal(pe.readOnly,!allowed);
  pe.save();assert.equal(c.state.editSaved,allowed);
  pe.askDelete();pe.nodes[0].toggle({stopPropagation(){}});
  assert.equal(c.state.peDelete,allowed);assert.equal(!!c.state.editNodes,allowed);
  if(!allowed){const before=JSON.stringify(c.state);pe.doDelete();pe.run();pe.runAnyway();pe.toggleDs();pe.dsOptions[0].pick();assert.equal(JSON.stringify(c.state),before);}
  pe.nodes[0].select();assert.equal(c.state.editSel,'task');
 }
 c.props.currentRole='lead';Object.assign(c.state,viewer.patch,{editSaved:false});
 let pe=c.renderVals().pe;assert(pe.readOnly);pe.save();assert(!c.state.editSaved);
 Object.assign(c.state,ctx.codec.read('/production/pipelines/'+name+'/edit').patch,{editSaved:false});
 pe=c.renderVals().pe;c.props.currentRole='member';pe.save();assert(!c.state.editSaved);
 const item={id:'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f'};
 Object.assign(c.state,{lifeItem:item.id,lifeRun:'20260825-034505-c19f2a',pmItemTab:'pipeline'});
 for(const role of ['lead','project-owner','member','outsourcing']){
  c.props.currentRole=role;const e=c.pmItemExplorerValues(item);
  assert.equal(e.canEditPipeline,['lead','project-owner'].includes(role));assert(!e.showContext);
  assert(ctx.codec.read(e.pipelineHref).patch.pmPipelineView);
  assert(!ctx.codec.read(e.pipelineEditHref).patch.pmPipelineView);
 }
});


test('Delivery preview mock is scoped to the requested Item and Run, and real manifests win',()=>{
 const c=vm.runInContext('new Component()',ctx),id='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',run='20260825-034505-c19f2a';
 const read=(itemId,runId)=>JSON.parse(c.artifactPreviewData(itemId,runId,'长城',true));
 const files=read(id,run).files;assert(files.length>5);assert.equal(files[0].name,'dist/index.html');
 assert(files.some(file=>file.name==='evidence/final-v5/compressor.svg'));assert(files.some(file=>file.content?.includes('Local mock')));
 assert.equal(read('another-item',run).files.length,0);assert.equal(read(id,'another-run').files.length,0);
 c.props.artifacts={[id]:{[run]:{files:[]}}};assert.equal(read(id,run).files.length,0);
 c.props.artifacts[id][run].files=[{name:'real.html',url:'/real.html'}];assert.equal(read(id,run).files[0].name,'real.html');
});
