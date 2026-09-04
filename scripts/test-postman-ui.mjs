import {pipelineOwnerCopy} from './postman-ui/pipeline-owner-editor.mjs';
import {datasetEditorCopy} from './postman-ui/dataset-editor.mjs';
import {datasetPipelineCopy} from './postman-ui/dataset-pipeline-guide.mjs';
import {sheetInlineCopy} from './postman-ui/sheet-inline-assignment.mjs';
import {listAssociationCopy} from './postman-ui/list-association.mjs';
import {entryTagStyleCopy} from './postman-ui/entry-tag-style.mjs';
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
 const normalizeCopy=beforeOwner=>{const beforeEditor=pipelineOwnerCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeOwner).replace(/  \/\/ pm-pipeline-owner:start[\s\S]*?  \/\/ pm-pipeline-owner:end\n/,''); const sourceInput=datasetEditorCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeEditor).replace(/  \/\/ pm-dataset-editor:start[\s\S]*?  \/\/ pm-dataset-editor:end\n/,''); const originalInput=datasetPipelineCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),sourceInput).replace(/  \/\/ pm-dataset-pipeline-guide:start[\s\S]*?  \/\/ pm-dataset-pipeline-guide:end\n/,''); const raw=sheetInlineCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),originalInput).replace(/  \/\/ pm-sheet-inline:start[\s\S]*?  \/\/ pm-sheet-inline:end\n/,''); const input=listAssociationCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),raw).replace(/  \/\/ pm-list-association:start[\s\S]*?  \/\/ pm-list-association:end\n/,''); const s=entryTagStyleCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),input).replace(/  \/\/ pm-entry-tag-style:start[\s\S]*?  \/\/ pm-entry-tag-style:end\n/,'');return linkedItemToastCopy.reduce((text,[from,to])=>text.replace(to,()=>from),overviewSummaryCopy.reduce((text,[from,to])=>text.replace(from,()=>to),reviewAllocationCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),ant200MockCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),lifecyclePhotoCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),s))))).replace(/\n  \/\/ pm-branch-search:start[\s\S]*?  \/\/ pm-branch-search:end\n/,'').replace('branch: this.pmBranchValues(),','branch: this.branchFormValues(),').replace(/^.*\/\/ pm-photo-slots\n/gm,'').replace(/\n\n  \/\/ pm-lifecycle-photos:start[\s\S]*?  \/\/ pm-lifecycle-photos:end\n/,'');};
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
test('billing uses a gray cost chart with dimensions controlled by tabs',()=>{
 assert.match(built,/\.forge-postman \.forge-billing-metrics>div\{border:0;border-radius:0;padding:0 20px;background:transparent\}/);
 assert.match(built,/\.forge-postman \.forge-billing-cost-bar\{background:var\(--pm-focus\)\}/);
 assert.doesNotMatch(built,/<div class="forge-billing-filters">/);
 assert.doesNotMatch(built,/id="forge-billing-calendar"/);
 assert.match(built,/{{ billing.period }} · USD · 北京时间 UTC\+8/);
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
 let view=c.deliveryDatasetReviewValues();
 assert.equal(view.count,2);
 assert.equal(c.state.deliveryEditor.reviewScope,'item');
 const people=view.rows[0].options;
 assert(people.length>1);
 view.rows[0].onReviewer({target:{value:people[0].accountName}});
 view=c.deliveryDatasetReviewValues();
 view.rows[1].onReviewer({target:{value:people[1].accountName}});
 const expected=c.deliveryEditorReviewDatasets().map(r=>[r.key,r.reviewer]);
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
 assert.equal(c.state.deliveryEditor.reviewScope,'item');
 assert.deepEqual(c.deliveryEditorReviewDatasets().map(r=>[r.key,r.reviewer]),expected);
});

test('Item assignment filters all rows, deduplicates and preserves edit permission checks',()=>{
 const c=vm.runInContext('new Component()',ctx);
 c.openDeliveryEditor();
 const entries=Array.from({length:25},(_,i)=>({key:'row'+i,itemId:'id'+i,name:'任务'+i,source:'任务'+i}));
 c.patchDeliveryEditor({entries:[...entries,entries[0]],reviewScope:'item'});
 let view=c.deliveryDatasetReviewValues();
 assert.equal(view.count,25);assert.equal(view.rows.length,25);
 const reviewer=view.rows[0].options[1].accountName;
 view.rows[24].onReviewer({target:{value:reviewer}});
 c.deliveryDatasetReviewValues().rows[24].onStatus({target:{value:'reviewing'}});
 view=c.deliveryDatasetReviewValues();
 view.onPersonFilter({target:{value:reviewer}});
 view=c.deliveryDatasetReviewValues();assert.equal(view.rows.length,1);
 view.onStatusFilter({target:{value:'paused'}});
 view=c.deliveryDatasetReviewValues();assert.equal(view.rows.length,0);assert(view.noMatches);
 view.onStatusFilter({target:{value:'reviewing'}});
 view=c.deliveryDatasetReviewValues();assert.equal(view.rows.length,1);
 view.onQuery({target:{value:'id24'}});view=c.deliveryDatasetReviewValues();assert.equal(view.rows.length,1);
 assert.equal(view.rows[0].name,'任务24');
 c.patchDeliveryEditor({listLoading:true});
 const before=JSON.stringify(c.state.deliveryEditor.datasetReviews);
 c.deliveryDatasetReviewValues().rows[0].onReviewer({target:{value:''}});
 assert.equal(JSON.stringify(c.state.deliveryEditor.datasetReviews),before);
});


test('legacy reviewer assignments migrate to Items without duplicate notifications',()=>{
 const c=vm.runInContext('new Component()',ctx);
 const keyA='production:'+JSON.stringify(['pipeline','A']), keyB='production:'+JSON.stringify(['pipeline','B']);
 const review={reviewer:'allen',status:'reviewing',updatedBy:'owner',updatedAt:123};
 const entries=[{itemId:'id1',name:'长城',sourceType:'production',sourcePipeline:'pipeline',sourceDataset:'A'},
   {itemId:'id2',name:'天坛',sourceType:'production',sourceRefs:[{pipeline:'pipeline',dataset:'A'},{pipeline:'pipeline',dataset:'B'}]}];
 const previous={entries,datasetReviews:{[keyA]:review,[keyB]:{...review,reviewer:'other'}}};
 let rows=c.deliveryReviewDatasets(previous);
 assert.equal(rows[0].reviewer,'allen');assert.equal(rows[0].source,'id1');
 assert.equal(rows[1].reviewer,'');
 previous.datasetReviews['item:id2']={...review,reviewer:'explicit'};
 rows=c.deliveryReviewDatasets(previous);assert.equal(rows[1].reviewer,'explicit');
 const plan=c.deliveryDatasetReviewPlan({...previous,key:'existing',members:[]},previous);
 assert.equal(plan.changes.length,0);
 assert.equal(plan.datasetReviews['item:id1'].updatedAt,123);
 previous.datasetReviews['item:id2'].reviewer='';
 assert.equal(c.deliveryReviewDatasets(previous)[1].reviewer,'');
 assert.doesNotMatch(built,/编辑审核分配|>按数据集<|>按 Item</);
 assert.match(built,/placeholder="搜索名称或 Item ID"/);
 assert.doesNotMatch(built,/dataset.source }} · {{ dataset.count }} 项/);
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

test('Pipeline owner guards apply on direct editor links, viewer routes and stale callbacks',()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3';
 for(const user of ['一万','yokiguan'])for(const role of ['member','lead','project-owner']){
  c.props.currentUser=user;c.props.currentRole=role;
  Object.assign(c.state,ctx.codec.read('/production/pipelines/'+key+'/edit').patch,{editSaved:false,editNodes:null,peDelete:false});
  const pe=c.renderVals().pe,allowed=user==='一万';assert.equal(pe.canEdit,allowed);
  pe.save();assert.equal(c.state.editSaved,allowed);pe.askDelete();assert.equal(c.state.peDelete,allowed);
  pe.nodes[0].toggle({stopPropagation(){}});assert.equal(!!c.state.editNodes,allowed);
  if(!allowed){const before=JSON.stringify(c.state);pe.doDelete();pe.run();pe.runAnyway();pe.toggleDs();pe.dsOptions[0].pick();assert.equal(JSON.stringify(c.state),before);}
 }
 c.props.currentUser='一万';Object.assign(c.state,ctx.codec.read('/production/pipelines/'+key+'/view').patch,{editSaved:false});
 assert(c.renderVals().pe.readOnly);c.renderVals().pe.save();assert(!c.state.editSaved);
 Object.assign(c.state,ctx.codec.read('/production/pipelines/'+key+'/edit').patch);
 const pe=c.renderVals().pe;c.props.currentUser='yokiguan';pe.save();pe.askDelete();assert(!c.state.editSaved);
 c.pmOpenPipelineEditor(key);assert(!c.state.pmPipelineEditor);
 c.props.currentUser='一万';c.pmOpenPipelineEditor(key);const draft=c.pmPipelineEditorValues();c.props.currentUser='yokiguan';
 const before=JSON.stringify(c.state);draft.onName({target:{value:'forbidden'}});draft.save();draft.askDelete();draft.delete();assert.equal(JSON.stringify(c.state),before);
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

 test('entry Tag styling follows assignment, palette updates and explicit no Tag',()=>{
 const c=vm.runInContext('new Component()',ctx);
 c.openDeliveryEditor('ant200');
 c.patchDeliveryEditor({tags:[{id:'green',name:'repair',color:'#39804a'}]});
 let v=c.deliveryEditorValues();v.entries[0].onTag({target:{value:'green'}});
 v=c.deliveryEditorValues();assert.equal(v.entries[0].tagBackground,'#39804a');assert(v.entries[0].hasTagStyle);
 assert.equal(v.entries[0].tagForeground,v.tags[0].fg);
 c.patchDeliveryEditor({tags:[{id:'green',name:'repair',color:'#ffe099'}]});
 assert.equal(c.deliveryEditorValues().entries[0].tagBackground,'#ffe099');
 c.deliveryEditorValues().entries[0].onTag({target:{value:''}});
 assert.equal(c.deliveryEditorValues().entries[0].hasTagStyle,false);
 c.patchDeliveryEditor({defaultTagId:'green'});
 assert.equal(c.pmEntryTagStyle({tagId:''},c.state.deliveryEditor,true).tagBackground,'#ffe099');
 assert.equal(c.pmEntryTagStyle({tagId:'__none__'},c.state.deliveryEditor,true).hasTagStyle,false);
 c.patchDeliveryEditor({tags:[]});
 assert.equal(c.pmEntryTagStyle({tagId:'green'},c.state.deliveryEditor).hasTagStyle,false);
 });

test('editing links production runs, preserves tags through dedup and saves source identities',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor('ant200');
 const before=JSON.stringify(c.state.deliveryEditor.entries);
 c.deliveryEditorValues();assert.equal(JSON.stringify(c.state.deliveryEditor.entries),before);
 const tasks=c.deliveryProductionTasks().filter(t=>!t.disabled),task=tasks.find(t=>t.id==='20260825-034505-c19f2a');
 c.pmListAssociation().pick({target:{value:task.id}});
 assert.equal(c.state.deliveryEditor.entries.length,task.entries.length);
 assert.equal(c.state.deliveryEditor.importMode,'production');
 c.patchDeliveryEditor({tags:[{id:'green',name:'重点',color:'#39804a'}]});
 const item=c.state.deliveryEditor.entries[0].itemId;
 c.deliveryEditorValues().entries[0].onTag({target:{value:'green'}});
 const other=tasks.find(t=>t.id!==task.id&&t.entries.some(e=>e.itemId===item));
 c.pmListAssociation().pick({target:{value:other.id}});
 assert.equal(new Set(c.state.deliveryEditor.entries.map(e=>e.itemId)).size,c.state.deliveryEditor.entries.length);
 assert.equal(c.state.deliveryEditor.entries.find(e=>e.itemId===item).tagId,'green');
 c.pmListAssociation().selected.find(t=>t.id===other.id).remove();
 // Assign required reviewers before saving, as in the normal editor flow.
 c.patchDeliveryEditor({datasetReviews:Object.fromEntries(c.deliveryEditorReviewDatasets(c.state.deliveryEditor).map(g=>[g.key,{reviewer:'一万',status:'pending'}]))});
 assert.equal(c.deliveryEditorIssue(),'');c.saveDeliveryEditor();c.openDeliveryEditor('ant200');
 assert.deepEqual(Array.from(c.state.deliveryEditor.productionTaskIds),[task.id]);
 assert.equal(c.state.deliveryEditor.entries.find(e=>e.itemId===item).tagId,'green');
});

test('Item runtime labels track source execution and leave unknown or unmatched Items honest',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor('ant200');
 c.pmListAssociation().pick({target:{value:'20260825-034505-c19f2a'}});
 const editor=c.state.deliveryEditor,entry=editor.entries[0],run=c.runsData().find(r=>r.id===entry.sourceRunId);
 const index=Array.from({length:run.n},(_,i)=>i).find(i=>c.taskRunItem(run,i).itemId===entry.itemId);
 for(const [state,label] of [['success','ready'],['failed','fail'],['running','running'],['queued','queued']]) {
  c.setState({runItemTech:{[run.id+':'+index]:{status:state}}});
  assert.equal(c.pmListEntries(editor).find(e=>e.itemId===entry.itemId).runLabel,label);
 }
 assert.equal(c.pmListEntries({...editor,entries:[{name:'未匹配'}]})[0].runLabel,'未关联');
 assert.equal(c.pmListEntries({...editor,entries:[{itemId:'unknown-id'}]})[0].runLabel,'暂无运行');
});

test('ZIP replacement clears production association only after successful parsing',async()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor('ant200');
 c.pmListAssociation().pick({target:{value:'20260825-034505-c19f2a'}});
 const before=JSON.stringify(c.state.deliveryEditor.entries);
 await c.uploadDeliveryList({name:'invalid.zip',size:20,arrayBuffer:async()=>new ArrayBuffer(0)});
 assert.equal(c.state.deliveryEditor.importMode,'production');assert.equal(JSON.stringify(c.state.deliveryEditor.entries),before);
 c.zipDirectory=()=>[{path:'天坛.glb'},{path:'new-upload.glb'}];
 await c.uploadDeliveryList({name:'items.zip',size:20,arrayBuffer:async()=>new ArrayBuffer(0)});
 assert.equal(c.state.deliveryEditor.importMode,'zip');assert.equal(c.state.deliveryEditor.productionTaskIds.length,0);
 const rows=c.deliveryEditorValues().entries;assert.equal(rows.length,2);assert(rows[0].itemId);assert.equal(rows[1].runLabel,'未关联');
});

test('sheet rows assign an owner and task tag without opening preview or changing execution',()=>{
 const c=vm.runInContext('new Component()',ctx),key='ant200';
 const sheet=c.deliverySheet(key),id=c.deliveryEntries(sheet)[0].itemId;
 const before=JSON.stringify(c.sheetRows(sheet)),actor=c.profileIdentity().accountName;
 const values=c.pmSheetAssignments(sheet).get(id);
 assert.equal(values.assignmentReadonly,false);
 values.assignOwner({target:{value:'allen'}});
 let saved=c.deliverySheet(key);
 assert.equal(saved.datasetReviews['item:'+id].reviewer,'allen');
 assert(saved.members.some(m=>m.accountName==='allen'));
 assert.equal(c.state.sheetRow,null);
 c.pmSheetAssignments(saved).get(id).assignTag({target:{value:'__task_repair'}});
 saved=c.deliverySheet(key);
 assert.equal(saved.tags.find(t=>t.id===saved.entryTags[id]).name,'repair');
 assert.equal(c.pmSheetAssignments(saved).get(id).hasTagStyle,true);
 assert.equal(JSON.stringify(c.sheetRows(saved)),before);
 c.openDeliveryEditor(key);
 assert.equal(c.deliveryEditorValues().entries.find(e=>e.itemId===id).tagId,saved.entryTags[id]);
 assert.equal(c.deliveryEditorReviewDatasets().find(g=>g.key==='item:'+id).reviewer,'allen');
 assert.equal(c.deliveryEditorIssue(),'');
 c.saveDeliveryEditor();
 assert.equal(c.pmSheetAssignments(c.deliverySheet(key)).get(id).owner,'allen');
 c.pmAssignSheetItem(key,id,'tag','',actor);
 c.pmAssignSheetItem(key,id,'owner','',actor);
 assert.equal(c.pmSheetAssignments(c.deliverySheet(key)).get(id).taskTag,'');
 assert.equal(c.pmSheetAssignments(c.deliverySheet(key)).get(id).owner,'');
});

test('inline assignment enforces permissions, valid choices, exact sheet scope and latest state',()=>{
 const c=vm.runInContext('new Component()',ctx),sheet=c.deliverySheet('ant200'),id=c.deliveryEntries(sheet)[0].itemId,actor=c.profileIdentity().accountName;
 const other=JSON.stringify(c.deliverySheet('step300'));
 c.pmAssignSheetItem('ant200',id,'tag','missing',actor);
 c.pmAssignSheetItem('ant200',id,'owner','not-a-person',actor);
 assert.equal(JSON.stringify(c.deliverySheet('ant200')),JSON.stringify(sheet));
 const captured=c.pmSheetAssignments(sheet).get(id);
 c.profileIdentity=()=>({accountName:'viewer',key:'member',name:'viewer'});
 captured.assignOwner({target:{value:'allen'}});
 assert.equal(JSON.stringify(c.deliverySheet('ant200')),JSON.stringify(sheet));
 assert.equal(c.pmSheetAssignments(sheet).get(id).assignmentReadonly,true);
 assert.equal(JSON.stringify(c.deliverySheet('step300')),other);
});

test('direct dataset entry guides to Pipeline and retains compatible Item selection without submitting',()=>{
 const c=vm.runInContext('new Component()',ctx),name='group01-science-mechanism-query-v1';
 c.setState({view:'datasets',selDs:name,dsVersion:'v1',runPipeline:null});
 let ds=c.renderVals().ds;
 assert(ds.needsPipeline);assert(!ds.canRun);assert(!ds.cannotRun);assert.match(ds.runHint,/先选择 Pipeline/);
 ds.items[0].toggle();const item=c.renderVals().ds.items[0].id;
 c.renderVals().ds.submit();assert.equal(c.state.view,'datasets');
 c.renderVals().ds.choosePipeline();assert.equal(c.state.view,'pipelines');
 assert.equal((c.state.submittedRuns || []).length,0);
 const pipe=c.pipeData().find(p=>p.datasets.some(d=>d[0]===name));
 c.selectRunPipeline(pipe);
 assert.equal(c.state.selDs,name);assert.equal(c.state.dsVersion,'v1');assert.equal(c.state.picked[item],true);
 assert(c.renderVals().ds.canRun);assert(!c.renderVals().ds.needsPipeline);
 assert.equal((c.state.submittedRuns || []).length,0);
 c.renderVals().ds.submit();assert.equal(c.state.submittedRuns.length,1);
 assert.equal(c.state.submittedRuns[0].pipe,pipe.name);
});

test('Pipeline guidance does not carry Items into an unrelated dataset',()=>{
 const c=vm.runInContext('new Component()',ctx),name='group01-science-mechanism-query-v1';
 c.setState({view:'datasets',selDs:name,runPipeline:null});c.renderVals().ds.items[0].toggle();c.renderVals().ds.choosePipeline();
 const pipe=c.pipeData().find(p=>!p.datasets.some(d=>d[0]===name));c.selectRunPipeline(pipe);
 assert.equal(c.state.selDs,null);assert.equal(Object.keys(c.state.picked).length,0);assert.equal(c.state.pmDatasetRunContext,null);
});

test('dataset edits update display metadata and Item fields while preserving identity and historical run Items',()=>{
 const c=vm.runInContext('new Component()',ctx),name='group01-science-mechanism-query-v1',original=c.dsData().find(d=>d.name===name);
 const run=c.runsData().find(r=>r.dsName===name),history=Array.from({length:run.n},(_,i)=>c.taskRunItem(run,i));
 c.pmOpenDatasetEditor(name);let editor=c.pmDatasetEditorValues();
 editor.onName({target:{value:'Science 更新'}});editor.onDescription({target:{value:'新的数据集说明'}});
 editor.items[0].onContent({target:{value:'Updated item content'}});editor.items[0].onStyle({target:{value:'updated-style'}});editor.items[1].remove();
 c.pmSaveDatasetEditor();const saved=c.dsData().find(d=>d.name===name);
 assert.equal(saved.displayName,'Science 更新');assert.equal(saved.description,'新的数据集说明');assert.equal(saved.items[0][4],'Updated item content');assert.equal(saved.items[0][3],'updated-style');assert.equal(saved.items[0][0],original.items[0][0]);assert.equal(saved.n,original.n-1);
 const savedRun=c.runsData().find(r=>r.id===run.id);assert.deepEqual(Array.from({length:run.n},(_,i)=>c.taskRunItem(savedRun,i)),history);
 c.pmOpenDatasetEditor(name);assert.equal(c.pmDatasetEditorValues().name,'Science 更新');c.pmDatasetEditorValues().onName({target:{value:'discard'}});c.pmCloseDatasetEditor();assert.equal(c.dsData().find(d=>d.name===name).displayName,'Science 更新');
});

test('dataset deletion requires confirmation, preserves run evidence and supports undo',()=>{
 const c=vm.runInContext('new Component()',ctx),name='group01-science-mechanism-query-v1',run=c.runsData().find(r=>r.dsName===name),first=c.taskRunItem(run,0);
 c.setState({view:'datasets',selDs:name,picked:{[first.itemId]:true}});c.pmOpenDatasetEditor(name);c.pmDeleteDataset();assert(c.dsData().some(d=>d.name===name));
 c.pmDatasetEditorValues().askDelete();c.pmDatasetEditorValues().delete();
 assert(!c.dsData().some(d=>d.name===name));assert.equal(c.state.selDs,null);assert.equal(Object.keys(c.state.picked).length,0);assert.deepEqual(c.taskRunItem(c.runsData().find(r=>r.id===run.id),0),first);
 c.pmDatasetUndoValues().restore();assert(c.dsData().some(d=>d.name===name));assert.equal(c.pmDatasetUndoValues().visible,false);
});

test('dataset validation rejects duplicate names and blank Item content without applying changes',()=>{
 const c=vm.runInContext('new Component()',ctx),[first,other]=c.dsData();c.pmOpenDatasetEditor(first.name);
 c.pmDatasetEditorValues().onName({target:{value:other.name}});c.pmSaveDatasetEditor();assert.match(c.pmDatasetEditorValues().error,/名称已存在/);
 c.pmDatasetEditorValues().onName({target:{value:first.name}});c.pmDatasetEditorValues().items[0].onContent({target:{value:' '}});c.pmSaveDatasetEditor();assert.match(c.pmDatasetEditorValues().error,/Item/);assert.equal(c.dsData()[0].items[0][4],first.items[0][4]);
});

test('Pipeline configuration saves a new version and cancellation leaves the definition intact',()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3',original=c.pipeData().find(p=>p.name===key),runs=JSON.stringify(c.runsData());
 c.pmOpenPipelineEditor(key);let v=c.pmPipelineEditorValues();v.onName({target:{value:'Web3D 编辑验证'}});v.onDescription({target:{value:'更新生成配置'}});
 v.nodes[1].onConfig({target:{value:'{"model":"example","max_iterations":12}'}});v.nodes[2].onEnabled({target:{checked:false}});
 v=c.pmPipelineEditorValues();v.nodes[1].down();v.save();
 const updated=c.pipeData().find(p=>p.name===key);assert.equal(updated.displayName,'Web3D 编辑验证');assert.equal(updated.version,'v8');assert.equal(updated.nodeConfigs.build.max_iterations,12);assert.equal(updated.enabledNodes.human_review_initial,false);assert.equal(updated.dag[2],'build/AGENT');assert.equal(updated.owner,'一万');
 assert.equal(JSON.stringify(c.state.pmPipelineVersions[key].v7),JSON.stringify(original));assert.equal(JSON.stringify(c.runsData()),runs);
 c.pmOpenPipelineEditor(key);c.pmPipelineEditorValues().nodes[0].remove();c.pmClosePipelineEditor();assert.equal(c.pipeData().find(p=>p.name===key).dag.length,original.dag.length);
});
test('Pipeline validates configuration and deletion requires current ownership plus confirmation',()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3',runs=JSON.stringify(c.runsData());
 c.pmOpenPipelineEditor(key);let v=c.pmPipelineEditorValues();v.nodes[0].onConfig({target:{value:'invalid'}});v.save();assert.match(c.state.pmPipelineEditor.error,/JSON/);assert.equal(c.pipeData().find(p=>p.name===key).version,'v7');
 v=c.pmPipelineEditorValues();v.nodes[0].onConfig({target:{value:'{}'}});v.nodes[0].onName({target:{value:'build'}});v.save();assert.match(c.state.pmPipelineEditor.error,/唯一/);
 v.delete();assert(c.pipeData().some(p=>p.name===key));v.askDelete();c.pmPipelineEditorValues().delete();assert(!c.pipeData().some(p=>p.name===key));assert.equal(JSON.stringify(c.runsData()),runs);assert(c.state.pmPipelineVersions[key].v7);
 const before=JSON.stringify(c.state);c.selectRunPipeline({name:key});assert.equal(JSON.stringify(c.state),before);
});
