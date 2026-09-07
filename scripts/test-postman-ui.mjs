import {sheetReviewHistoryCopy} from './postman-ui/sheet-review-history.mjs';
import {itemPreviewLinkCopy} from './postman-ui/item-preview-page.mjs';
import {itemRunEntryActionsLogicCopy} from './postman-ui/item-run-entry-actions.mjs';
import {reviewReferenceSkillCopy} from './postman-ui/review-reference-skills.mjs';
import {pipelineNodeDrawerCopy} from './postman-ui/pipeline-node-drawer.mjs';
import {billingDateRangeCopy} from './postman-ui/billing-date-range.mjs';
import {profileSkillEditorCopy} from './postman-ui/profile-skill-editor.mjs';
import {deliveryEditPageCopy} from './postman-ui/delivery-edit-page.mjs';
import {taskTagCopy} from './postman-ui/task-tags.mjs';
import {wizardChecklistCopy} from './postman-ui/wizard-checklist.mjs';
import {pipelineOwnerCopy} from './postman-ui/pipeline-owner-editor.mjs';
import {pipelineVersionHistoryCopy} from './postman-ui/pipeline-version-history.mjs';
import {datasetEditorCopy} from './postman-ui/dataset-editor.mjs';
import {datasetPipelineCopy} from './postman-ui/dataset-pipeline-guide.mjs';
import {sheetInlineCopy} from './postman-ui/sheet-inline-assignment.mjs';
import {listAssociationCopy} from './postman-ui/list-association.mjs';
import {entryTagStyleCopy} from './postman-ui/entry-tag-style.mjs';
import {deliveryBrowserCopy} from './postman-ui/delivery-browser.mjs';
import {notificationToggleCopy} from './postman-ui/notification-toggle.mjs';
import {utilityPanelLogicCopy} from './postman-ui/utility-panels.mjs';
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
const url=new URL('./templates/forge-base.html',import.meta.url);
const source=fs.readFileSync(url,'utf8');
const behaviorSource=fs.readFileSync(new URL('../public/postman-ui/behavior.mjs',import.meta.url),'utf8');
const decode=s=>JSON.parse(s.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const original=decode(source), built=decode(buildPostman(source));
const logic=t=>t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({URL,URLSearchParams,TextDecoder,TextEncoder,Blob,setTimeout:()=>0,clearTimeout(){},window:{location:{search:''}},DCLogic:class{props={panelWidth:460,hasRuns:true,hasResources:true};setState(p){this.state={...this.state,...p};}}});
vm.runInContext(logic(built)+';globalThis.codec=ForgeRoutes;globalThis.c=new Component();',ctx);
test('independent generator is deterministic and preserves the source bytes',()=>{assert.equal(buildPostman(source),buildPostman(source));assert.equal(fs.readFileSync(url,'utf8'),source);assert.match(built,/Postman UI 优化版/);});
test('task Tag picker closes when a click continues outside it',()=>{
 assert.match(behaviorSource,/details\.pm-task-tag-picker\[open\]/);
 assert.match(behaviorSource,/if\(!picker\.contains\(event\.target\)\)picker\.removeAttribute\('open'\)/);
});
test('sidebar utility counts follow the label and use the Forge accent',()=>{
 assert.match(built,/\.forge-postman \.forge-app-shell\[data-sidebar-collapsed=false\] \.forge-sidebar-tool-count\{[^}]*position:static[^}]*margin:0 0 0 12px[^}]*background:var\(--pm-utility-badge\)/);
 assert.match(built,/\.forge-postman \.forge-app-shell\[data-sidebar-collapsed=true\] \.forge-sidebar-tool-count\{[^}]*position:absolute[^}]*top:1px[^}]*right:1px[^}]*background:var\(--pm-utility-badge\)/);
 assert.match(built,/--pm-utility-badge:var\(--pm-brand\)/);
});
test('workspace typography and page rhythm share one compact scale',()=>{
 assert.match(built,/--pm-title-size:20px; --pm-title-leading:28px;/);
 assert.match(built,/--pm-body-size:13px; --pm-body-leading:20px;/);
 assert.match(built,/--pm-page-gutter:24px; --pm-page-top:22px; --pm-page-bottom:40px;/);
 assert.match(built,/\.forge-postman \.forge-page,\.forge-postman \.fg-runs\{[^}]*padding:var\(--pm-page-top\) var\(--pm-page-gutter\) var\(--pm-page-bottom\)!important/);
 assert.match(built,/\.forge-postman \.pm-review-queue\{[^}]*padding:var\(--pm-page-top\) var\(--pm-page-gutter\) var\(--pm-page-bottom\)!important/);
 assert.match(built,/\.pm-review-queue \.pq-heading h1\{[^}]*font-size:var\(--pm-title-size\)[^}]*line-height:var\(--pm-title-leading\)/);
 assert.match(built,/\.pm-review-queue \.pq-table-head\{[^}]*font-size:var\(--pm-meta-size\)[^}]*line-height:var\(--pm-meta-leading\)/);
 assert.match(built,/\.forge-postman \.pm-delivery-search\{[^}]*height:var\(--pm-control-height\)/);
 assert.match(built,/\.forge-overview-summary\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(built,/class="forge-overview-signals"/);
 assert.doesNotMatch(built,/>错误类型</);
 assert.doesNotMatch(built,/class="forge-supplier-performance"/);
});
test('production list pages share one stable title and primary-action grid',()=>{
 const headings=Array.from(built.matchAll(/<(?:header|div) class="[^"]*\bpm-production-page-heading\b[^"]*"/g),match=>match[0]);
 assert.equal(headings.length,4);
 assert(headings.some(value=>value.includes('fg-page-header')));
 assert(headings.some(value=>value.includes('pm-pipelines-heading')));
 for(const [flag,endAnchor] of [['isDatasets','<script type="text/x-dc"'],['isResources','<sc-if value="{{ isItemLife }}"']]){
  const start=built.indexOf('<sc-if value="{{ '+flag+' }}"');
  const end=built.indexOf(endAnchor,start);
  assert.match(built.slice(start,end),/class="pm-production-page-heading"/);
 }
 assert.match(built,/\.forge-postman :is\(\.forge-page,\.fg-runs\)>\.pm-production-page-heading\{display:grid!important;grid-template-columns:minmax\(0,1fr\) auto;align-items:start!important;gap:24px!important;min-height:52px;margin-bottom:20px!important\}/);
 assert.match(built,/\.forge-postman \.pm-production-page-heading>button\{align-self:start;justify-self:end;flex:none;margin:0!important\}/);
});
test('workflow indicators distinguish completed, current and upcoming steps',()=>{
 const wizard=built.slice(built.indexOf('<nav class="forge-wizard-steps pm-steps"'),built.indexOf('</nav>',built.indexOf('<nav class="forge-wizard-steps pm-steps"')));
 assert.match(wizard,/aria-label="\{\{ step\.ariaLabel \}\}"/);
 assert.match(wizard,/data-current="\{\{ step\.current \}\}" data-complete="\{\{ step\.complete \}\}" data-state="\{\{ step\.state \}\}"/);
 assert.doesNotMatch(built,/forge-wizard-progress-heading|aria-label="创建数据单进度"/);
 assert.match(built,/\.forge-postman \.pm-steps \.pm-step\[data-complete=true\]::after\{background:var\(--pm-step-current\)\}/);
 assert.match(built,/\.pm-step:is\(\[aria-current=step\],\[data-current=true\],\[data-current="600"\]\) \.pm-step-number\{[^}]*background:var\(--pm-step-current\)[^}]*color:var\(--pm-on-action\)/);
 const c=vm.runInContext('new Component()',ctx); c.openDeliveryEditor('ant200'); c.goDeliveryWizardStep(2);
 const steps=c.deliveryWizardValues().steps;
 assert.deepEqual(Array.from(steps,row=>row.state),['complete','current','upcoming','upcoming']);
 assert.equal(steps.filter(row=>row.current).length,1); assert(!steps[1].complete); assert.match(steps[1].ariaLabel,/当前步骤/);
});
test('utility rows clear unread elevation after viewing and download states use one contextual action',()=>{
 const panels=built.slice(built.indexOf('id="forge-download-panel"'),built.indexOf('<!-- forge-sidebar-floating-panels:end -->'));
 assert.match(panels,/class="pm-utility-row pm-download-row" data-unread="\{\{ d\.unread \}\}"/);
 assert.match(panels,/class="pm-utility-row pm-notification-row" data-unread="\{\{ n\.weight === '600' \}\}"/);
 assert.match(built,/\.forge-postman \.pm-utility-row\[data-unread=true\]\{[^}]*background:var\(--pm-utility-unread\)!important;box-shadow:0 2px 7px rgba\(20,20,20,\.08\)!important/);
 assert.match(built,/\.forge-postman \.pm-utility-row\[data-unread=false\]\{background:transparent!important;box-shadow:none!important\}/);
 assert.match(panels,/class="pm-download-progress"[^>]*aria-label="\{\{ d\.state \}\} \{\{ d\.pct \}\}"/);
 assert.match(panels,/sc-camel-on-click="\{\{ d\.cancelPacking \}\}"[^>]*>取消打包<\/button>/);
 assert.match(panels,/sc-camel-on-click="\{\{ d\.stopDownload \}\}"[^>]*>停止<\/button>/);
 assert.doesNotMatch(panels,/>暂停<\/div>|>继续<\/div>|从列表移除/);
 assert.match(built,/\.forge-postman \.forge-sidebar-popover-list\{display:grid;gap:8px;padding:8px/);
 assert.match(built,/\.forge-postman \.pm-download-state\{[^}]*background:transparent!important/);
 const c=vm.runInContext('new Component()',ctx);
 let notification=c.renderVals().notif.items[0]; assert.equal(notification.weight,'600');
 notification.go();
 notification=c.renderVals().notif.items.find(item=>item.title.includes('天坛')); assert.equal(notification.weight,'400');
 let downloads=c.renderVals().dl;
 assert(downloads.items.every(item=>item.unread));
 downloads.toggle(); downloads=c.renderVals().dl;
 assert(downloads.open); assert(downloads.items.every(item=>!item.unread));
 const packing=downloads.items.find(item=>item.isPacking); assert(packing.canCancelPacking&&!packing.canStopDownload);
 const downloading=downloads.items.find(item=>item.isDownloading); assert(downloading.canStopDownload&&!downloading.canCancelPacking);
 downloading.stopDownload({stopPropagation(){}});
 assert(c.renderVals().dl.items.find(item=>item.name.includes('天坛')).isDone);
});
test('current sidebar route keeps its selected treatment without a dark focus frame',()=>{
 assert.match(built,/\.forge-postman \.forge-app-shell \.forge-sidebar \.forge-sidebar-link\[aria-current=page\]:focus-visible\{outline:0!important;box-shadow:none!important\}/);
 assert.match(built,/\.forge-postman \.forge-sidebar :is\(\.forge-sidebar-link\[aria-current=page\],[^}]+background:var\(--pm-nav-soft\)!important;color:var\(--pm-nav\)!important/);
});
test('notification preference uses a compact semantic switch',()=>{
 const panel=built.slice(built.indexOf('id="forge-notification-panel"'),built.indexOf('<!-- forge-sidebar-floating-panels:end -->'));
 assert.match(panel,/<button[^>]*class="pm-notification-switch"[^>]*role="switch"[^>]*aria-label="同步到飞书"[^>]*aria-checked="\{\{ notif\.feishuChecked \}\}"/);
 assert.doesNotMatch(panel,/<div[^>]+sc-camel-on-click="\{\{ notif\.toggleFeishu \}\}"/);
 assert.match(built,/\.forge-postman \.pm-notification-switch\{[^}]*width:36px[^}]*height:20px[^}]*border-radius:999px/);
 assert.match(built,/\.forge-postman \.pm-notification-switch>span\{[^}]*width:16px[^}]*height:16px/);
 const c=vm.runInContext('new Component()',ctx);
 const before=c.renderVals().notif.feishuChecked;
 c.renderVals().notif.toggleFeishu({stopPropagation(){}});
 assert.notEqual(c.renderVals().notif.feishuChecked,before);
});
test('profile Skill creation menu stays compact and aligned to its trigger',()=>{
 assert.match(built,/\.forge-postman \.pm-profile-create-menu\{[^}]*width:240px[^}]*max-width:calc\(100vw - 24px\)/);
 assert.match(built,/width=Math\.min\(240,window\.innerWidth-24\)/);
});
test('overview delivery progress is a flat section with toggleable delivery-date sorting',()=>{
 const start=built.indexOf('<section class="pm-overview-delivery-section"');
 const end=built.indexOf('</section>',start);
 assert(start>=0&&end>start);
 const section=built.slice(start,end);
 assert.match(section,/aria-labelledby="forge-overview-delivery-heading"/);
 assert.match(section,/id="forge-overview-delivery-heading"[^>]*>\{\{ g\.title \}\}<\/h2>/);
 assert.doesNotMatch(section,/\{\{ g\.count \}\}/);
 assert.match(section,/class="pm-overview-delivery-columns"><span>数据单<\/span><span>项目负责人<\/span><button[^>]*type="button"[^>]*class="pm-overview-delivery-date-sort"[^>]*aria-label="\{\{ over\.deliveryDateSortHint \}\}"[^>]*sc-camel-on-click="\{\{ over\.toggleDeliveryDateSort \}\}"[\s\S]*\[\[icon:arrow-up:12\]\][\s\S]*\[\[icon:arrow-down:12\]\][\s\S]*<span>交付状态<\/span>/);
 assert.doesNotMatch(section,/筛选交付日期|pm-overview-delivery-date-filter|<select/);
 assert.doesNotMatch(section,/pm-overview-delivery-sort-direction|\{\{ over\.deliveryDateSortLabel \}\}/);
 assert.match(section,/class="pm-overview-delivery-date"[\s\S]*\{\{ r\.deliveryDate \}\}/);
 const c=vm.runInContext('new Component()',ctx); c.state.view='overview';
 let overview=c.renderVals().over;
 assert.equal(overview.groups[0].hasRows,true);
 assert(overview.groups[0].rows.every(row=>/^\d+ 天后$/.test(row.deliveryDate)));
 assert.equal(overview.deliveryDateSortLabel,'最近优先');
 assert.deepEqual(Array.from(overview.groups[0].rows,row=>Number.parseInt(row.deliveryDate)),[7,10,13,16,19]);
 overview.toggleDeliveryDateSort(); overview=c.renderVals().over;
 assert.equal(overview.deliveryDateSortLabel,'最晚优先');
 assert.deepEqual(Array.from(overview.groups[0].rows,row=>Number.parseInt(row.deliveryDate)),[19,16,13,10,7]);
 overview.toggleDeliveryDateSort(); overview=c.renderVals().over;
 assert.equal(overview.deliveryDateSortLabel,'最近优先');
 assert.match(built,/\.forge-postman \.pm-overview-delivery-section\{[^}]*border:1px solid var\(--pm-border\)[^}]*border-radius:6px[^}]*box-shadow:none!important[^}]*overflow:hidden/);
});
test('delivery browser uses a two-row table header with the create action in the filter row',()=>{
 const page=built.slice(built.indexOf('<sc-if value="{{ isDelivery }}"'),built.indexOf('<sc-if value="{{ isSheet }}"'));
 assert.match(page,/id="pm-delivery-search"[^>]*placeholder="搜索数据单、客户或负责人"/);
 assert.doesNotMatch(page,/pm-delivery-view-toggle|delivery\.folderView|pm-delivery-folder-card/);
 assert.doesNotMatch(page,/\{\{ delivery\.count \}\}/);
 assert.match(built,/\.forge-postman \.pm-delivery-search\{[^}]*height:var\(--pm-control-height\)[^}]*min-height:var\(--pm-control-height\)/);
 assert.doesNotMatch(page,/pm-delivery-sort|delivery\.sortLabel|最新/);
 assert.match(page,/class="forge-delivery-primary forge-delivery-create pm-delivery-create-inline"[^>]*>[^<]*<svg[\s\S]*?<span>创建数据单<\/span>/);
 assert.equal((page.match(/sc-camel-on-click="\{\{ delivery\.create \}\}"/g)||[]).length,1);
 assert.match(page,/class="pm-delivery-table-head"[\s\S]*>客户<[\s\S]*>数据单名字<[\s\S]*>创建日期<[\s\S]*>创建人<[\s\S]*>状态<[\s\S]*>目标数<[\s\S]*>已关联条数<[\s\S]*>待审核<[\s\S]*>可交付<[\s\S]*>进度<[\s\S]*>操作</);
 assert.doesNotMatch(page,/forge-delivery-customer-heading|查看子项/);
 assert.match(built,/\.forge-postman \.pm-delivery-browser-toolbar\{[^}]*background:transparent/);
 assert.match(built,/\.forge-postman \.pm-delivery-table-head[^}]*grid-template-columns:/);

 const c=vm.runInContext('new Component()',ctx);
 c.state.view='delivery';
 let view=c.renderVals().delivery;
 const first=view.customers[0].sheets[0];
 assert.match(first.createdDate,/^\d{4}\/\d{2}\/\d{2}$/);
 assert(first.creator);
 for(const key of ['target','linked','review','passed'])assert.equal(typeof first[key],'number');
 view.onQuery({target:{value:'yokiguan'}});
 view=c.renderVals().delivery;
 assert.equal(view.customers.reduce((count,customer)=>count+customer.sheets.length,0),1);
 assert.equal(view.customers[0].sheets[0].name,'WebDev 美学评测 150 条');
 view.onQuery({target:{value:'不存在的交付'}});
 assert(c.renderVals().delivery.empty);
});
test('branch configuration uses three searchable single-select pickers with clean collapsed values',()=>{
 const branch=built.slice(built.indexOf('<!-- branch-dialog:start -->'),built.indexOf('<!-- branch-dialog:end -->'));
 for(const [type,prop] of [['pipeline','pipelinePicker'],['dataset','datasetPicker'],['item','itemPicker']]){
  assert.match(branch,new RegExp('<button[^>]+id="forge-branch-'+type+'"[^>]+aria-haspopup="listbox"'));
  assert.match(branch,new RegExp('branch\\.'+prop+'\\.valueLabel'));
  assert.match(branch,new RegExp('id="forge-branch-'+type+'-search"[^>]+role="combobox"'));
  assert.doesNotMatch(branch,new RegExp('<select id="forge-branch-'+type+'"'));
 }
 const itemTrigger=branch.match(/<button[^>]+id="forge-branch-item"[\s\S]*?<\/button>/)[0];
 assert.doesNotMatch(itemTrigger,/magnifying-glass/);
 assert.match(branch,/搜索 Pipeline、Item ID 或 Run ID/);
 assert.match(branch,/搜索数据集、Item ID 或 Run ID/);
 assert.match(branch,/搜索 Item 名称、ID 或 Run ID/);
});
test('UI transformation preserves all business methods outside route adaptation',()=>{
 const strip=source=>{source=sheetReviewHistoryCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),source).replace(/  \/\/ pm-sheet-review-history:start[\s\S]*?  \/\/ pm-sheet-review-history:end\n/,'');source=itemPreviewLinkCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),source);source=reviewReferenceSkillCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),source);const s=pipelineNodeDrawerCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),source);return s.slice(s.indexOf('class Component')).replace(/^.*\/\/ pm-run-model-summary-values\n/gm,'').replace(/  \/\/ pm-delivery-preview-mock:start[\s\S]*?  \/\/ pm-delivery-preview-mock:end\n\n/,'').replace(' || this.pmDeliveryArtifactMock(itemId, runId); // pm-delivery-preview-fallback',';').replace(/  \/\/ pm-item-explorer-demo:start[\s\S]*?  \/\/ pm-item-explorer:end\n\n/,'').replace(/^.*\/\/ pm-item-explorer-values\n/gm,'').replace(/^.*\/\/ pm-node-config-values\n/gm,'').replace(/^.*\/\/ pm-pipeline-access-values\n/gm,'').replace(/  \/\/ forge-routing-methods:start[\s\S]*?\/\/ forge-routing-methods:end/,'').replace(/\n  \/\/ pm-review-queue-methods:start[\s\S]*?\/\/ pm-review-queue-methods:end\n/,'').replace(/\n      \/\/ pm-review-queue-values:start[\s\S]*?\/\/ pm-review-queue-values:end\n/,'').replace(/\n  \/\/ pm-run-records-methods:start[\s\S]*?\/\/ pm-run-records-methods:end\n/,'').replace(/    \/\/ pm-run-records-values:start[\s\S]*?\/\/ pm-run-records-values:end\n\n/,'RUN_RECORDS_VIEW_MODEL').replace(/    const runPal =[\s\S]*?(?=    const delMap =)/,'RUN_RECORDS_VIEW_MODEL').replace('const mineRows = rows.filter(r => (this.reviewQueueClaim(r) || r.assignee).toLowerCase() === me.toLowerCase()); // pm-review-queue-owner','const mineRows = rows.filter(r => r.assignee === me);')};
 const normalizeModels=s=>modelStatusCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),s);
 const normalizeCopy=beforeDrawer=>{const beforeVersions=pipelineVersionHistoryCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeDrawer).replace(/  \/\/ pm-pipeline-version-history:start[\s\S]*?  \/\/ pm-pipeline-version-history:end\n/,'');const beforeDates=pipelineNodeDrawerCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeVersions).replace(/  \/\/ pm-pipeline-node-drawer:start[\s\S]*?  \/\/ pm-pipeline-node-drawer:end\n/,'');const beforeProfile=billingDateRangeCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeDates).replace(/  \/\/ pm-billing-date-range:start[\s\S]*?  \/\/ pm-billing-date-range:end\n/,'');const beforeEditPage=profileSkillEditorCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeProfile).replace(/  \/\/ pm-profile-skill-editor:start[\s\S]*?  \/\/ pm-profile-skill-editor:end\n/,'');const beforeTaskTags=beforeEditPage.includes('const page = true;')?deliveryEditPageCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeEditPage):beforeEditPage;const beforeChecklist=taskTagCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeTaskTags).replace(/  \/\/ pm-task-tags:start[\s\S]*?  \/\/ pm-task-tags:end\n/,'');const beforeOwner=wizardChecklistCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeChecklist).replace(/  \/\/ pm-wizard-checklist:start[\s\S]*?  \/\/ pm-wizard-checklist:end\n/,'');const beforeEditor=pipelineOwnerCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeOwner).replace(/  \/\/ pm-pipeline-owner:start[\s\S]*?  \/\/ pm-pipeline-owner:end\n/,''); const sourceInput=datasetEditorCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),beforeEditor).replace(/  \/\/ pm-dataset-editor:start[\s\S]*?  \/\/ pm-dataset-editor:end\n/,''); const originalInput=datasetPipelineCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),sourceInput).replace(/  \/\/ pm-dataset-pipeline-guide:start[\s\S]*?  \/\/ pm-dataset-pipeline-guide:end\n/,''); const raw=sheetInlineCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),originalInput).replace(/  \/\/ pm-sheet-inline:start[\s\S]*?  \/\/ pm-sheet-inline:end\n/,''); const input=listAssociationCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),raw).replace(/  \/\/ pm-list-association:start[\s\S]*?  \/\/ pm-list-association:end\n/,''); const s=entryTagStyleCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),input).replace(/  \/\/ pm-entry-tag-style:start[\s\S]*?  \/\/ pm-entry-tag-style:end\n/,'');return linkedItemToastCopy.reduce((text,[from,to])=>text.replace(to,()=>from),overviewSummaryCopy.reduce((text,[from,to])=>text.replace(from,()=>to),reviewAllocationCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),ant200MockCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),lifecyclePhotoCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),s))))).replace(/\n  \/\/ pm-branch-search:start[\s\S]*?  \/\/ pm-branch-search:end\n/,'').replace('branch: this.pmBranchValues(),','branch: this.branchFormValues(),').replace(/^.*\/\/ pm-photo-slots\n/gm,'').replace(/\n\n  \/\/ pm-lifecycle-photos:start[\s\S]*?  \/\/ pm-lifecycle-photos:end\n/,'');};
 // This presentation field exposes the existing enabled state to assistive
 // technology; the enabled-state calculation and toggle callback stay intact.
 const withoutUtilityPanels=utilityPanelLogicCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),logic(built));
 const withoutCheckboxAria=notificationToggleCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),withoutUtilityPanels).replace("\n            ariaChecked: n.on ? 'true' : 'false',",'');
 const withoutDeliveryBrowser=deliveryBrowserCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),withoutCheckboxAria).replace(/\n  \/\/ pm-delivery-browser:start[\s\S]*?  \/\/ pm-delivery-browser:end\n/,'');
 const withoutItemRunEntryActions=itemRunEntryActionsLogicCopy.slice().reverse().reduce((text,[from,to])=>text.replace(to,()=>from),withoutDeliveryBrowser);
 const withoutRunItemOrigin=text=>text
  .replace("\n    const lifeFromRun = view === 'itemlife' && st.lifeFrom === 'run';",'')
  .replace(' && !lifeFromRun);',');')
  .replace("\n      const fromRun = st.lifeFrom === 'run';",'')
  .replace(/        backLabel:[\s\S]*?\n        showBranchBadge:/, '        ITEM_LIFE_NAVIGATION\n        showBranchBadge:')
  .replace("\n            const itemId = meta[0] || (rec.id.replace(/[^a-f0-9]/g, '') + String(k).padStart(2, '0')).slice(0, 32);",'')
  .replace('              id: itemId,',"              id: meta[0] || (rec.id.replace(/[^a-f0-9]/g, '') + String(k).padStart(2, '0')).slice(0, 32),")
  .replace(/              rowCursor:[\s\S]*?\n              noAction:/,'              RUN_ITEM_DETAIL_ENTRY\n              noAction:');
 const businessActual=withoutRunItemOrigin(normalizeCopy(normalizeModels(strip(withoutItemRunEntryActions))));
 const businessExpected=withoutRunItemOrigin(normalizeCopy(strip(removeDeliveryDrafts(logic(original)))));
 assert.equal(businessActual,businessExpected);
});
test('Pipeline checkbox aria state follows enable and disable without opening details',()=>{
 const c=vm.runInContext('new Component()',ctx);
 Object.assign(c.state,ctx.codec.read('/production/pipelines/web3d-gen-build-eval-v3/edit').patch);
 let node=c.renderVals().pe.nodes[0];
 assert.equal(node.ariaChecked,'true');
 let stopped=0;
 node.toggle({stopPropagation(){stopped++;}});
 node=c.renderVals().pe.nodes[0];
 assert.equal(node.ariaChecked,'false');
 assert.equal(node.check,'');
 assert(!c.state.editSel);
 node.toggle({stopPropagation(){stopped++;}});
 assert.equal(c.renderVals().pe.nodes[0].ariaChecked,'true');
 assert.equal(stopped,2);
});
test('representative sheet keeps the five metrics and exports deliverable items',()=>{
 for(const n of ['pm-sheet-heading','pm-sheet-progress','pm-sheet-metrics','pm-sheet-list'])assert.match(built,new RegExp(n));
 assert.match(built,/<button[^>]*disabled="\{\{ sheet\.exportUnavailable \}\}"[^>]*sc-camel-on-click="\{\{ sheet\.exportItems \}\}"/);
 assert.doesNotMatch(built,/当前原型尚未接入统一导出服务/);
 const c=vm.runInContext('new Component()',ctx);c.setState({view:'sheet',sheetKey:'ant200',sheetFilter:'all',sheetQuery:''});
 const sheet=c.renderVals().sheet;assert.equal(sheet.exportUnavailable,false);const csv=sheet.exportItems();assert.match(csv,/"Item 名称","Item ID","目录","Run ID","审核结论"/);assert.equal(csv.split('\r\n').length,Number(sheet.exportLabel.match(/\d+/)[0])+1);
 assert.doesNotMatch(built,/分支与主版本共享同一个交付位 · 不额外计入目标数/);
});
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
test('billing keeps one set of chart controls and renders the required stacked distribution',()=>{
 assert.match(built,/\.forge-postman \.forge-billing-metrics>div\{border:0;border-radius:0;padding:0 20px;background:transparent\}/);
 assert.match(built,/\.forge-postman \.forge-billing-cost-bar\{background:var\(--pm-focus\)\}/);
 assert.match(built,/id="forge-billing-calendar"/);
 assert.doesNotMatch(built,/<div class="forge-billing-filters">/);
 assert.match(built,/class="forge-billing-custom-time"[^>]*aria-controls="forge-billing-calendar"/);
 assert.doesNotMatch(built,/forge-billing-metrics-meta|forge-billing-definition|计费说明/);
 assert.match(built,/class="pm-metric-help" data-forge-tooltip="\{\{ metric\.help \}\}"/);
 assert.match(built,/class="forge-billing-stack"/);
 assert.doesNotMatch(built,/按项目/);
 assert.match(built,/变化补充说明/); assert.match(built,/异常成本 Run/);
 assert.match(built,/forge-billing-chart[\s\S]*forge-billing-breakdown[\s\S]*billing-anomaly-title/);
 assert.match(built,/\{\{ billing\.tableLabel \}\}费用明细/);
 assert.match(built,/\.forge-postman \.forge-billing-chart\{[^}]*border-bottom:0/);
 assert.match(built,/<ul class="forge-billing-reasons"><sc-for[\s\S]*?<li>/);
 assert.match(built,/<a class="forge-billing-run-link" href="\{\{ run\.href \}\}"[^>]*>查看详情<\/a>/);
 assert.match(built,/const pool = this\.runsData\(\)\.concat\(this\.billingRunRecords\(\)\);/);
 assert.match(built,/if \(view === 'review'\) \{\s+const pool = this\.runsData\(\);/);
 assert.match(built,/runs = this\.runsData\(\)\.concat\(this\.billingRunRecords\(\)\)/);
 assert.match(built,/\.forge-postman \.forge-billing-segment button\[aria-pressed=true\]\{background:var\(--pm-selected\)!important;color:var\(--pm-text\)!important/);
 assert.match(built,/\.forge-postman \.forge-app-shell \.forge-billing-segment\[data-pm-tabs\]\{overflow:visible!important;scrollbar-width:none\}/);
});
test('every major legacy surface has a stable Postman page hook',()=>{
 for(const hook of ['pm-page-overview','pm-page-pipelines','pm-page-pipeedit','pm-page-datasets','pm-page-resources','pm-page-itemlife','pm-page-review','pm-page-submitted','pm-page-run','pm-page-error'])assert.match(built,new RegExp(hook));
 assert.match(built,/class="pm-pipeline-node"[^>]*data-node-kind="\{\{ n\.kind \}\}"/);
 assert.match(built,/\.forge-model-badge\[data-tone=warning\]/);
});
test('resources keeps its page-level create action in the shared primary tier',()=>{
 const button=Array.from(built.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g),m=>m[0]).find(value=>value.includes('新建资源包'))||'';
 assert.match(button,/data-pm-primary="true"/);
 assert.doesNotMatch(button,/data-pm-secondary=/);
});
test('review scope remains a filter and completed tasks retain result actions',()=>{
 assert.match(built,/aria-label="审核范围"/);
 assert.doesNotMatch(built,/aria-label="审核状态"/);
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
 c.patchDeliveryEditor({entries:[...entries,entries[0]],reviewScope:'item',importMode:'zip'});
 let view=c.deliveryDatasetReviewValues();
 assert.equal(view.count,25);assert.equal(view.rows.length,25);
 const reviewer=view.rows[0].options[1].accountName;
 view.rows[24].onReviewer({target:{value:reviewer}});
 c.patchDeliveryEditor({tags:[{id:'reviewing',name:'running',color:'#397448'},{id:'paused',name:'paused',color:'#64748b'}]});
 c.pmToggleTaskTag(c.state.deliveryEditor.id,'row24','reviewing',true,c.profileIdentity().accountName);
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

test('Item assignment exposes outsourcing contacts as external experts',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();
 c.patchDeliveryEditor({entries:[{key:'external-row',itemId:'external-id',name:'外部复核任务',source:'external-id'}],reviewScope:'item',importMode:'zip'});
 let view=c.deliveryDatasetReviewValues(),expert=view.reviewerOptions.find(person=>person.accountName==='outsourcing:stepfun');
 assert(expert?.external);assert.equal(expert.label,'外部专家 · 陈安 · 维象制作');
 view.rows[0].onReviewer({target:{value:expert.accountName}});
 assert.equal(c.state.deliveryEditor.members.find(member=>member.accountName===expert.accountName).role,'reviewer-outsourcing');
 view=c.deliveryDatasetReviewValues();view.onPersonFilter({target:{value:expert.accountName}});
 assert.equal(c.deliveryDatasetReviewValues().rows.length,1);
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
 await c.addFeedbackImages('review-run:other',Array.from({length:8},(_,i)=>file(i)));
 assert.equal(c.feedbackImages('review-run:other').length,6);
 c.renderVals().life.cancelAppend();assert.equal(c.feedbackImages(key).length,0);
});

for (const scope of ['sheet', 'branch']) test(scope+' accepts eight reference images across upload and paste, then allows replacing one',async()=>{
 ctx.FileReader=class{readAsDataURL(file){queueMicrotask(()=>{this.result='data:'+file.type+';base64,aQ==';this.onload();});}};
 ctx.Image=class{naturalWidth=1;set src(value){queueMicrotask(()=>this.onload());}};
 const c=vm.runInContext('new Component()',ctx),item='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',key=scope+':'+item;
 c.setState({view:'sheet',sheetKey:'ant200',sheetRow:item,sheetReworkAsk:scope==='sheet'?item:null,branchAsk:scope==='branch'?{attachmentKey:key}:null});
 const file=i=>({name:'photo-'+i+'.png',type:'image/png',size:128});
 let view=c.feedbackView(key);assert.equal(view.emptySlots.length,8);assert.equal(view.remaining,8);
 await view.upload({target:{files:Array.from({length:7},(_,i)=>file(i)),value:'selected'}});
 let prevented=false;
 await c.handleFeedbackPaste({clipboardData:{items:[7,8].map(i=>({kind:'file',getAsFile:()=>file(i)}))},preventDefault(){prevented=true;}});
 view=c.feedbackView(key);assert(prevented);assert.equal(view.images.length,8);assert(view.full);assert.equal(view.emptySlots.length,0);
 assert.equal(view.countLabel,'已上传 8/8 张');assert.equal(view.remaining,0);assert.equal(view.uploadLabel,'已达 8 张上限');assert.match(view.error,/最多添加 8 张/);
 assert(view.images.every(image=>image.ready));
 view.images[3].remove();view=c.feedbackView(key);assert.equal(view.images.length,7);assert(!view.full);assert.equal(view.error,'');assert.equal(view.emptySlots[0].position,8);
 await view.upload({target:{files:[file('replacement')],value:'selected'}});
 view=c.feedbackView(key);assert.equal(view.images.length,8);assert.equal(view.images[7].name,'photo-replacement.png');assert.equal(view.remaining,0);
});

test('model line filters remain explicit, compose without clearing scope, and expose a dismissible risk notice',()=>{
 const c=vm.runInContext('new Component()',ctx);
 Object.assign(c.state,ctx.codec.read('/models?model=claude-sonnet').patch);
 let view=c.modelStatusValues();
 assert(view.lines.every(line=>line.modelId==='claude-sonnet'));
 assert(view.riskVisible); view.dismissRisk(); view=c.modelStatusValues(); assert(!view.riskVisible);
 view.onFilter({target:{value:'attention'}}); view=c.modelStatusValues();
 assert.equal(view.filter,'attention');
 assert.equal(view.model,'claude-sonnet');
 assert(view.lines.every(line=>line.modelId==='claude-sonnet'));
 assert.equal(view.lines.some(line=>line.statusKey==='normal'),false);
 const routeTable=built.match(/<div class="forge-model-table forge-model-routes-table"[\s\S]*?<\/div><\/div><\/section>/)[0];
 for(const label of ['模型供应商','模型','线路 \/ 标记','P95 TTFT','Tokens\/s','任务耗时','成功 \/ 错误率','稳定性','质量','单次成本','余额 \/ 可用时间','运行任务 \/ 影响'])assert(routeTable.includes(label));
 const linesSection=built.match(/<section class="forge-model-table-section forge-model-lines-section">[\s\S]*?<\/section>/)[0];
 assert(linesSection.indexOf('class="forge-model-filters"')<linesSection.indexOf('class="forge-model-table-scroll"'));
 assert.doesNotMatch(linesSection,/aria-label="筛选(?:状态|模型供应商|模型|线路)"/);
 assert.doesNotMatch(built,/class="forge-model-impact-filter"|仅看有业务影响|modelStatus\.onBusiness/);
 assert.match(built,/运行概览/); assert.doesNotMatch(built,/Benchmark 结果|forge-model-line-comparison|modelStatus\.comparisonRows|modelStatus\.compareTab/);
 const overviewGrid=built.match(/\.forge-postman \.forge-model-overview-table \[role="row"\]\{grid-template-columns:([^}]+)\}/)[1].trim().split(/\s+/);
 assert.equal(overviewGrid.length,9);
 const overviewTable=built.match(/<div class="forge-model-overview-table"[\s\S]*?<\/sc-for><\/div>/)[0];
 const overviewHeader=overviewTable.match(/<div role="row" class="forge-model-table-head">[\s\S]*?<\/div>/)[0];
 assert.equal((overviewHeader.match(/<span>/g)||[]).length,9);
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
 Object.assign(c.state,{view:'itemlife',lifeItem:id,lifeRun:runId,lifeRunIndex:21,lifeFrom:'run',sheetKey:'ant200'});
 let e=c.pmItemExplorerValues({id}); assert(e.demo); assert.equal(e.fileCount,4); assert(e.hasPrompts);assert(e.hasEvents);
 assert(e.hasRunOverview);assert.equal(e.runState,'失败');assert.equal(e.runProgress,'8 / 18');assert.equal(e.runNode,'ref_search');assert.match(e.pipelineLabel,/web3d-gen-build-eval-v3/);assert.equal(e.trajectoryLabel,'4 个事件');
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
 const route=ctx.codec.read('/items/b3d81c4e77af4a5c9e2f1a6b8c0d3e5f?run=20260825-034505-c19f2a&itemIndex=21&sheet=ant200&tab=files&from=run');
 assert.equal(route.patch.pmItemTab,'files');
 const restored=ctx.codec.read(ctx.codec.write(route.patch));
 assert.equal(restored.patch.pmItemTab,'files');assert.equal(restored.patch.lifeRun,route.patch.lifeRun);assert.equal(restored.patch.lifeRunIndex,21);assert.equal(restored.patch.lifeFrom,'run');
 assert.equal(ctx.codec.read('/items/b3d81c4e77af4a5c9e2f1a6b8c0d3e5f?tab=invalid').patch.pmItemTab,'history');
});

test('every Run Item opens its scoped detail while row actions remain separate',()=>{
 const c=vm.runInContext('new Component()',ctx),runId='20260825-034505-c19f2a';
 Object.assign(c.state,{view:'run',activeRun:runId,runItem:null});
 let values=c.renderVals(), failed=values.run.items.find(item=>item.id==='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f'&&item.state==='失败');
 assert(failed);assert.equal(failed.rowCursor,'pointer');
 failed.open({target:{closest:()=>null},preventDefault(){},stopPropagation(){}});
 assert.equal(c.state.view,'itemlife');assert.equal(c.state.lifeItem,failed.id);assert.equal(c.state.lifeRun,runId);assert.equal(c.state.lifeRunIndex,21);assert.equal(c.state.lifeFrom,'run');assert.equal(c.state.pmItemTab,'history');
 values=c.renderVals();assert.equal(values.life.backLabel,'返回运行详情');values.life.back();assert.equal(c.state.view,'run');assert.equal(c.state.activeRun,runId);
 const success=c.renderVals().run.items.find(item=>item.state==='待审核');
 success.keyOpen({key:'Enter',target:null,currentTarget:null,preventDefault(){}});assert.equal(c.state.view,'itemlife');assert.equal(c.state.lifeItem,success.id);
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
 assert.match(built,/\.forge-postman \.pm-task-tag-chip\{[^}]*display:inline-flex[^}]*background:color-mix\(in srgb,var\(--task-tag-bg,#64748b\) 16%,white\)[^}]*border:1px solid color-mix\(in srgb,var\(--task-tag-bg,#64748b\) 50%,white\)[^}]*font-weight:400/);
 assert.match(built,/\.forge-postman \.pm-task-tag-chip::before\{[^}]*width:7px[^}]*height:7px[^}]*background:var\(--task-tag-bg,#64748b\)/);
 });

test('editing links production runs, preserves tags through dedup and saves source identities',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor('ant200');
 const before=JSON.stringify(c.state.deliveryEditor.entries);
 c.deliveryEditorValues();assert.equal(JSON.stringify(c.state.deliveryEditor.entries),before);
 const tasks=c.deliveryProductionTasks().filter(t=>!t.disabled),task=tasks.find(t=>t.id==='20260825-034505-c19f2a');
 c.syncDeliveryProductionTasks([task.id]);
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

test('expanded Pipeline history includes every version and preserves available changelogs',()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3',pipe=c.pipeData().find(p=>p.name===key);
 const history=c.pmPipelineHistory(pipe);assert.equal(history.length,7);assert.equal(history.map(h=>h[0]).join(','),'v7,v6,v5,v4,v3,v2,v1');
 assert.equal(history[0][1],pipe.history[0][1]);assert.equal(history[3][1],'暂无更新说明');assert.equal(history[3][2],'—');
 Object.assign(c.state,ctx.codec.read('/production/pipelines/'+key+'?status=all').patch);
 const list=c.renderVals().pipelines.find(p=>p.name===key);assert.equal(list.versions.length,7);assert.match(built,/<button[^>]+class="pm-pipelines-version"[^>]+aria-label="\{\{ v\.ariaLabel \}\}"/);
 let stopped=0;list.versions[0].open({stopPropagation(){stopped++;}});let detail=c.pmPipelineVersionValues();assert.equal(stopped,1);assert(detail.hasSnapshot);assert.equal(detail.version,'v7');assert.equal(detail.nodeCount,pipe.dag.length);
 detail.close();c.renderVals().pipelines.find(p=>p.name===key).versions[1].open({stopPropagation(){}});detail=c.pmPipelineVersionValues();assert(detail.missingSnapshot);assert.equal(detail.version,'v6');assert.equal(detail.change,history[1][1]);detail.close();
 c.pmOpenPipelineEditor(key);c.pmPipelineEditorValues().save();const saved=c.pmPipelineHistory(c.pipeData().find(p=>p.name===key));
 assert.equal(saved.length,8);assert.equal(saved[0][0],'v8');assert.equal(saved.filter(h=>h[0]==='v7').length,1);
 c.pmOpenPipelineVersion(key,'v7',{stopPropagation(){}});detail=c.pmPipelineVersionValues();assert(detail.hasSnapshot);assert.equal(detail.nodes.length,pipe.dag.length);assert.equal(c.pipeData().find(p=>p.name===key).version,'v8');
});

test('Pipeline YAML upload previews nodes and saves only to a new owned version',async()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3',before=JSON.stringify(c.pipeData().find(p=>p.name===key)),runs=JSON.stringify(c.runsData());
 c.pmOpenPipelineEditor(key);
 const yaml='name: ignored-file-name\nowner: someone-else\nversion: v99\ndescription: Uploaded configuration\ntimeout: 120\nnodes:\n  - name: prepare\n    type: function\n    config:\n      fn: prep_task\n  - name: generate\n    type: AGENT\n    model: example-model\n    config:\n      prompt: |\n        Build an example.\n        Preserve line breaks.\n      max_iterations: 8\n';
 const file={name:'updated.yaml',size:yaml.length,text:async()=>yaml};
 await c.pmPipelineEditorValues().onFile({target:{files:[file],value:'fakepath'}});
 assert.equal(JSON.stringify(c.pipeData().find(p=>p.name===key)),before);assert.equal(c.pmPipelineEditorValues().nodes.length,2);
 assert.match(c.pmPipelineEditorValues().uploadStatus,/updated.yaml.*2 个节点.*待保存/);
 c.pmPipelineEditorValues().nodes[1].onConfig({target:{value:'{"model":"edited-model","max_iterations":9}'}});c.pmPipelineEditorValues().save();
 const saved=c.pipeData().find(p=>p.name===key);assert.equal(saved.name,key);assert.equal(saved.owner,'一万');assert.equal(saved.version,'v8');assert.equal(saved.pipelineOptions.timeout,120);
 assert.equal(saved.dag.join(','),'prepare/FUNCTION,generate/AGENT');assert.equal(saved.nodeConfigs.generate.model,'edited-model');assert.equal(saved.nodeConfigs.generate.max_iterations,9);
 assert.equal(JSON.stringify(c.state.pmPipelineVersions[key].v7),before);assert.equal(JSON.stringify(c.runsData()),runs);
 c.pmOpenPipelineEditor(key);assert.equal(c.pmPipelineEditorValues().nodes[1].name,'generate');c.pmClosePipelineEditor();
});

test('Pipeline upload accepts JSON, keyed YAML, legacy dag and rejects malformed definitions without losing edits',async()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3';c.pmOpenPipelineEditor(key);
 for(const [name,text] of [
  ['config.json','{"nodes":[{"name":"prepare","type":"FUNCTION","enabled":false},{"name":"build","type":"AGENT","config":{"temperature":0.4}}]}'],
  ['config.yml','nodes:\n  prepare:\n    type: FUNCTION\n    config: {fn: prep_task}\n'],
  ['dag.json','{"dag":["prep/FUNCTION"],"nodeConfigs":{"prep":{"fn":"prep_task"}},"enabledNodes":{"prep":true}}']
 ]) {await c.pmPipelineEditorValues().onFile({target:{files:[{name,size:text.length,text:async()=>text}],value:''}});assert.equal(c.pmPipelineEditorValues().error,'');}
 const before=JSON.stringify(c.state.pmPipelineEditor.nodes);
 for(const [name,text] of [
  ['broken.yml','nodes: ['],['empty.yml','nodes: []'],['duplicate.yml','nodes: []\nnodes: []'],
  ['unknown.json','{"nodes":[{"name":"a","type":"UNKNOWN"}]}'],
  ['disabled.json','{"nodes":[{"name":"a","type":"AGENT","enabled":false}]}'],
  ['duplicate.json','{"nodes":[{"name":"a","type":"AGENT"},{"name":"a","type":"LLM"}]}'],
  ['cycle.yml','nodes: &loop\n  a: *loop'],['text.txt','anything']
 ]) {await c.pmPipelineEditorValues().onFile({target:{files:[{name,size:text.length,text:async()=>text}],value:''}});assert(c.pmPipelineEditorValues().error,name);assert.equal(JSON.stringify(c.state.pmPipelineEditor.nodes),before,name);}
 await c.pmPipelineEditorValues().onFile({target:{files:[{name:'big.yml',size:6*1024*1024,text:async()=>{throw Error('must not read');}}],value:''}});assert.match(c.pmPipelineEditorValues().error,/5 MiB/);
 c.pmClosePipelineEditor();assert.equal(c.pipeData().find(p=>p.name===key).version,'v7');
});

test('Pipeline asynchronous upload cannot overwrite a newer upload, closed draft or changed actor',async()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-gen-build-eval-v3',text='nodes: [{name: uploaded, type: FUNCTION}]';
 c.pmOpenPipelineEditor(key);let resolve;
 const pending=c.pmPipelineEditorValues().onFile({target:{files:[{name:'old.yml',size:100,text:()=>new Promise(r=>resolve=r)}],value:''}});
 c.pmPipelineEditorValues().save();assert.equal(c.pipeData().find(p=>p.name===key).version,'v7');
 await c.pmPipelineEditorValues().onFile({target:{files:[{name:'new.yml',size:text.length,text:async()=>text}],value:''}});
 resolve('nodes: [{name: outdated, type: AGENT}]');await pending;assert.equal(c.pmPipelineEditorValues().nodes[0].name,'uploaded');
 const closed=c.pmPipelineEditorValues().onFile({target:{files:[{name:'closed.yml',size:100,text:()=>new Promise(r=>resolve=r)}],value:''}});
 c.pmClosePipelineEditor();c.pmOpenPipelineEditor(key);resolve(text);await closed;assert.notEqual(c.pmPipelineEditorValues().nodes[0].name,'uploaded');
 const changed=c.pmPipelineEditorValues().onFile({target:{files:[{name:'actor.yml',size:100,text:()=>new Promise(r=>resolve=r)}],value:''}});
 c.profileIdentity=()=>({accountName:'allen',key:'member'});resolve(text);await changed;assert.equal(c.pipeData().find(p=>p.name===key).version,'v7');assert.notEqual(c.state.pmPipelineEditor.nodes[0].name,'uploaded');
});


test('Run model summary is scoped, deduplicated and explicit empty telemetry suppresses fixtures',()=>{
 const c=vm.runInContext('new Component()',ctx),rec=c.runsData().find(r=>r.id==='20260825-093412-a4f7c1');
 assert(c.runModelSummary(rec).mock);assert(c.runModelSummary({id:'other'}).empty);
 c.props.runTelemetry=[{runId:rec.id,modelName:'Model A',calls:1},{runId:rec.id,modelName:'Model A',calls:2},{runId:rec.id,modelName:'Model B',calls:1},{runId:rec.id,modelName:'Unused',calls:0},{runId:'other',modelName:'Other',calls:10}];
 const summary=c.runModelSummary(rec);assert.equal(summary.names.map(m=>m.name).join(','),'Model A,Model B');assert(!summary.mock);
 c.props.runTelemetry=[];assert(c.runModelSummary(rec).empty);assert(!c.runModelSummary(rec).mock);
 assert.equal(c.runModelSummary({...rec,modelsUsed:['Model C']}).names[0].name,'Model C');
});

test('Wizard checklist defaults to target count and supports individual and bulk selection',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();c.patchDeliveryEditor({name:'Checklist',customer:'测试',target:'2'});
 const id=c.state.deliveryEditor.id,run='20260825-093412-a4f7c1';c.syncDeliveryProductionTasks([run],id);
 const first=c.state.deliveryEditor.entries[0],count=c.pmWizardCandidates().length;
 assert(count>2);assert.equal(c.state.deliveryEditor.entries.length,2);assert.equal(c.deliveryWizardValues().selectedCount,2);assert.equal(c.deliveryWizardValues().candidateCount,count);
 c.pmSelectWizardEntry(first.key,false,id);assert.equal(c.state.deliveryEditor.entries.length,1);assert.equal(c.pmWizardCandidates().length,count);assert(c.state.deliveryEditor.productionExcluded.includes(first.itemId));
 c.syncDeliveryProductionTasks([run],id);assert(!c.state.deliveryEditor.entries.some(r=>r.key===first.key));assert.equal(c.pmWizardCandidates().length,count);
 c.deliveryWizardValues().selectAll();assert.equal(c.state.deliveryEditor.entries.length,count);assert(c.deliveryWizardValues().selectAllDisabled);
 c.deliveryWizardValues().clearSelection();assert.equal(c.state.deliveryEditor.entries.length,0);assert(c.deliveryWizardValues().clearSelectionDisabled);
 c.pmSelectWizardEntry(first.key,true,id);assert.equal(c.state.deliveryEditor.entries.length,1);assert.equal(c.state.deliveryEditor.entries[0].key,first.key);
 c.patchDeliveryEditor({target:'1'});confirmDelivery(c);c.saveDeliveryEditor();const sheet=c.deliverySheet(c.state.sheetKey);assert(sheet);assert.equal(sheet.entries.length,1);
});

test('delivery preview ignores the removed exception filter and retains production Run associations',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();
 c.patchDeliveryEditor({name:'关联预览',customer:'测试',target:'5',onlyExceptions:true});
 const task=c.deliveryProductionTasks().find(task=>task.pipeline==='web3d-gen-build-eval-v3' && task.count===5);
 c.syncDeliveryProductionTasks([task.id],c.state.deliveryEditor.id);
 const view=c.deliveryWizardValues();assert.equal(view.rows.length,5);assert.equal(view.noRows,false);assert.equal(view.onExceptions,undefined);
 assert(view.rows.every(row=>row.sourceRefs.some(ref=>ref.runId===task.id && ref.pipeline===task.pipeline && ref.dataset===task.dataset)));
 view.rows[0].onSelect({target:{checked:false}});assert.equal(c.deliveryWizardValues().rows.length,5);assert.equal(c.deliveryWizardValues().stats.valid,4);
 assert.doesNotMatch(built,/只看异常|关闭异常筛选/);
 assert.match(built,/<div class="pm-wizard-preview-title"><h3>条目预览<\/h3><span class="forge-wizard-preview-summary" role="status">\{\{ deliveryEditor\.wizard\.selectionSummary \}\}<\/span><\/div>/);
 assert.match(built,/aria-label="Item 批量选择"[\s\S]*?>全选<\/button>[\s\S]*?>取消全选<\/button>/);
 const previewMarkup=built.slice(built.indexOf('aria-label="同步条目预览"'),built.indexOf('<\/section>',built.indexOf('aria-label="同步条目预览"')));
 assert.doesNotMatch(previewMarkup,/匹配状态|forge-wizard-status/);
 assert.doesNotMatch(built,/<p class="forge-wizard-preview-summary"/);
 assert.match(built,/\.forge-postman \.pm-wizard-preview-heading\{[^}]*justify-content:space-between!important;flex-wrap:nowrap!important;gap:16px!important/);
 assert.match(built,/\.forge-postman \.forge-wizard-preview-summary\{[^}]*width:max-content!important[^}]*min-width:max-content[^}]*white-space:nowrap!important;word-break:normal!important;writing-mode:horizontal-tb!important/);
 assert.match(built,/\.forge-postman \.forge-wizard-preview-summary>\*\{display:inline!important;white-space:inherit!important\}/);
 assert.match(built,/class="forge-delivery-text-button pm-wizard-select-all"[^>]*>全选<\/button><button[^>]*class="forge-delivery-text-button pm-wizard-clear-selection"/);
 assert.match(built,/\.forge-postman \.pm-wizard-selection-actions \.pm-wizard-select-all\{[^}]*border:1px solid var\(--pm-control\)!important[^}]*background:var\(--pm-canvas\)!important/);
 assert.match(built,/\.forge-postman \.pm-wizard-selection-actions \.pm-wizard-clear-selection\{[^}]*border:0!important[^}]*background:transparent!important[^}]*color:var\(--pm-muted\)!important/);
 assert.doesNotMatch(built,/<p class="forge-wizard-preview-summary"/);
});
test('Wizard ZIP checklist preserves tags, recomputes duplicates and resets with a new import',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();c.patchDeliveryEditor({importMode:'zip'});c.setDeliveryList('天坛\n天坛\n长城');
 const id=c.state.deliveryEditor.id,[first,second]=c.state.deliveryEditor.entries;
 c.pmSelectWizardEntry(first.key,false,id);assert.equal(c.state.deliveryEditor.entries[0].key,second.key);assert.equal(c.state.deliveryEditor.entries[0].parseStatus,'matched');
 c.pmWizardEntryTag(first.key,'tag-green',id);c.pmSelectWizardEntry(first.key,true,id);assert.equal(c.state.deliveryEditor.entries[0].tagId,'tag-green');assert.equal(c.state.deliveryEditor.entries[1].parseStatus,'duplicate');
 c.pmSelectWizardEntry(first.key,false,id);c.setDeliveryList('长城');assert.equal(c.pmWizardCandidates().length,1);
});

test('each Item keeps one task Tag and a new choice replaces the previous value',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();c.patchDeliveryEditor({name:'Task tags',customer:'蚂蚁',target:'2',importMode:'zip'});c.setDeliveryList('天坛\n长城');
 for(const tagName of ['repair','reroll']){c.patchDeliveryEditor({tagName,tagColor:'#397448'});c.addDeliveryTag();}
 const editor=c.state.deliveryEditor,id=editor.id,actor=c.profileIdentity().accountName,[repair,reroll]=editor.tags;
 assert.equal(c.deliveryWizardValues().taskTags.selected.length,0);
 assert.match(c.deliveryWizardRulesIssue(),/2 个 Item 未分配 Tag/);
 for(const option of c.deliveryWizardValues().taskTags.options)option.toggle({target:{checked:true}});
 assert.equal(c.deliveryWizardValues().tagAssignmentLabel,'已分配 2 / 2 个 Item');assert(c.deliveryWizardValues().tagAssignmentComplete);
 assert.equal(c.deliveryWizardValues().taskTags.selected[0].name,'Reroll');assert.equal(c.deliveryDatasetReviewValues().rows[0].taskTags.selected[0].name,'Reroll');
 const first=editor.entries[0];c.pmToggleTaskTag(id,first.key,repair.id,true,actor);
 assert.equal(c.deliveryDatasetReviewValues().rows[0].taskTags.selected[0].name,'Repair');
 assert.equal(c.deliveryDatasetReviewValues().rows[1].taskTags.selected[0].name,'Reroll');
 confirmDelivery(c);assert.equal(c.state.deliveryEditor.step,4);c.saveDeliveryEditor();const key=c.state.sheetKey,sheet=c.deliverySheet(key);
 assert.equal(sheet.defaultTaskTagIds.length,1);assert.equal(sheet.entries[0].taskTagIds.length,1);assert.equal(sheet.datasetReviews['item:'+first.itemId].taskTagIds.length,1);
 c.openDeliveryEditor(key);assert.equal(c.deliveryDatasetReviewValues().rows[0].taskTags.selected[0].name,'Repair');
 const option=c.deliveryDatasetReviewValues().rows[0].taskTags.options.find(tag=>tag.name==='Reroll');option.toggle({target:{checked:true}});assert.deepEqual([...c.state.deliveryEditor.entries[0].taskTagIds],[reroll.id]);c.saveDeliveryEditor();
 assert.equal(c.pmSheetAssignments(c.deliverySheet(key)).get(first.itemId).taskTags.selected[0].name,'Reroll');
 c.pmToggleSavedTaskTag(key,first.itemId,repair.id,true,actor);c.openDeliveryEditor(key);assert.equal(c.deliveryDatasetReviewValues().rows[0].taskTags.selected[0].name,'Repair');
 assert.match(built,/pm-task-tag-picker[^>]*--pm-task-tag-width/);assert.match(built,/role="radiogroup"/);assert.match(built,/input type="radio" name=/);
 assert.match(built,/\.forge-postman \.pm-task-tag-options\{[^}]*width:100%[^}]*min-width:100%/);
});
test('Task Tag explicit clearing, deselection, removed tags and stale actors are safe',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();c.patchDeliveryEditor({importMode:'zip'});c.setDeliveryList('天坛');c.patchDeliveryEditor({tagName:'repair',tagColor:'#397448'});c.addDeliveryTag();
 const {id,entries,tags}=c.state.deliveryEditor,actor=c.profileIdentity().accountName,key=entries[0].key;
 c.pmToggleTaskTag(id,key,tags[0].id,false,actor);assert(c.deliveryWizardValues().rows[0].taskTags.empty);
 c.pmSelectWizardEntry(key,false,id);c.pmSelectWizardEntry(key,true,id);assert(c.deliveryWizardValues().rows[0].taskTags.empty);
 const picker=c.deliveryWizardValues().taskTags;c.props.currentUser='someone-else';const before=JSON.stringify(c.state.deliveryEditor);picker.options[0].toggle({target:{checked:false}});assert.equal(JSON.stringify(c.state.deliveryEditor),before);
 c.props.currentUser=actor;c.patchDeliveryEditor({tags:[]});assert.equal(c.pmTaskTagIds(c.state.deliveryEditor).length,0);
});
test('confirmation Task status summarizes per-Item Tag assignments without a default',()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();c.patchDeliveryEditor({name:'Task status',customer:'蚂蚁',target:'1',importMode:'zip'});c.setDeliveryList('天坛');
 c.patchDeliveryEditor({tagName:'111',tagColor:'#64748b'});c.addDeliveryTag();
 const editor=c.state.deliveryEditor,tag=editor.tags[0];c.pmToggleTaskTag(editor.id,editor.entries[0].key,tag.id,true,c.profileIdentity().accountName);
 assert.equal(c.deliveryWizardValues().taskTagNames,'111');assert.equal(c.deliveryWizardValues().taskTags.selected.length,0);
 assert.match(built,/<dt>Task 状态<\/dt><dd>\{\{ deliveryEditor\.wizard\.taskTagNames \}\}<\/dd>/);
});

test('existing delivery opens the prefilled wizard and updates the same sheet',()=>{
 const c=vm.runInContext('new Component()',ctx),sheet=c.deliverySheet('ant200');
 c.openDeliveryEditor(sheet.key);
 assert.equal(c.state.view,'delivery-create');assert.equal(c.deliveryEditorValues().page,true);assert.equal(c.deliveryEditorValues().modal,false);
 assert.equal(c.state.deliveryEditor.name,sheet.name);assert.equal(c.state.deliveryEditor.entries.length,200);assert.equal(c.deliveryFormDirty(),false);
 assert.equal(ctx.codec.read('/delivery/ant200/edit#confirm').editor.tab,'confirm');
 c.goDeliveryWizardStep(2);assert.equal(c.deliveryWizardValues().rows.length,8);
 const entry=c.deliveryWizardValues().rows[0];entry.onSelect({target:{checked:false}});assert.equal(c.state.deliveryEditor.entries.length,199);c.deliveryWizardValues().rows.find(row=>row.key===entry.key).onSelect({target:{checked:true}});assert.equal(c.state.deliveryEditor.entries.length,200);
 c.patchDeliveryEditor({name:'已修改的数据单'});c.goDeliveryWizardStep(4);assert.equal(c.deliveryWizardValues().action,'保存更改');
 assert.equal(c.deliveryWizardValues().title,'确认保存');assert.equal(c.deliveryWizardValues().disabled,false);
 c.deliveryWizardValues().next();assert.equal(c.state.sheetKey,sheet.key);assert.equal(c.state.view,'sheet');assert.equal(c.deliverySheet(sheet.key).name,'已修改的数据单');assert.equal(c.state.deliverySheets?.length || 0,0);
 c.openDeliveryEditor(sheet.key);c.deliveryEditorValues().cancel();assert.equal(c.state.view,'sheet');assert.equal(c.state.deliveryEditor,null);
 c.openDeliveryEditor(sheet.key);c.patchDeliveryEditor({name:'未保存'});c.deliveryEditorValues().cancel();assert(c.state.deliveryLeave);c.discardDeliveryForm(c.state.deliveryEditor.id);assert.equal(c.state.sheetKey,sheet.key);assert.equal(c.deliverySheet(sheet.key).name,'已修改的数据单');
});

test('legacy delivery restores selected production tasks without replacing its saved Items',()=>{
 const c=vm.runInContext('new Component()',ctx),sheet=c.deliverySheet('ant200');
 const savedBefore=JSON.stringify(sheet),expected=['20260825-081120-7b3e9d','20260825-034505-c19f2a','20260821-094005-3f8b2e'];
 c.openDeliveryEditor(sheet.key);c.goDeliveryWizardStep(2);
 const editor=c.state.deliveryEditor,entriesBefore=JSON.stringify(editor.entries);
 assert.equal(editor.importMode,'production');assert.deepEqual(Array.from(editor.productionTaskIds),expected);
 let wizard=c.deliveryWizardValues();
 assert.equal(wizard.productionCount,3);assert.equal(wizard.stats.valid,200);assert.equal(wizard.disabled,false);
 assert(wizard.productionRows.slice(0,3).every(task=>task.selected));
 assert(wizard.productionRows.slice(3).every(task=>!task.selected));
 assert(wizard.rows.every(row=>row.selected));assert.equal(c.deliveryFormDirty(),false);
 c.patchDeliveryEditor({productionQuery:'Science Mechanism'});
 assert(c.deliveryWizardValues().productionRows.every(task=>!task.selected));
 c.patchDeliveryEditor({productionQuery:''});
 c.setDeliveryImportMode('zip',editor.id);assert.equal(c.state.deliveryEditor.productionTaskIds.length,0);
 c.setDeliveryImportMode('production',editor.id);
 assert.equal(JSON.stringify(c.state.deliveryEditor.entries),entriesBefore);
 assert.deepEqual(Array.from(c.state.deliveryEditor.productionTaskIds),expected);
 assert.equal(c.pmWizardCandidates().length,200);assert(c.deliveryWizardValues().rows.every(row=>row.selected));
 assert.equal(JSON.stringify(c.deliverySheet(sheet.key)),savedBefore);
 c.patchDeliveryEditor({name:'回填保存验证'});c.goDeliveryWizardStep(4);c.saveDeliveryEditor();
 c.openDeliveryEditor(sheet.key);
 assert.deepEqual(Array.from(c.state.deliveryEditor.productionTaskIds),expected);
 assert.equal(c.state.deliveryEditor.entries.length,200);assert.equal(c.deliveryFormDirty(),false);
});

test('saved task choices and selected Item subsets take precedence over legacy inference',()=>{
 const c=vm.runInContext('new Component()',ctx),runId='20260825-093412-a4f7c1';
 c.openDeliveryEditor();c.patchDeliveryEditor({name:'部分条目',customer:'验证',target:'7'});
 c.syncDeliveryProductionTasks([runId]);c.deliveryWizardValues().selectAll();
 const removed=c.state.deliveryEditor.entries[0];
 c.pmSelectWizardEntry(removed.key,false,c.state.deliveryEditor.id);confirmDelivery(c);c.saveDeliveryEditor();
 const key=c.state.sheetKey,entries=JSON.stringify(c.deliverySheet(key).entries);
 c.openDeliveryEditor(key);c.goDeliveryWizardStep(2);
 assert.deepEqual(Array.from(c.state.deliveryEditor.productionTaskIds),[runId]);
 assert.equal(JSON.stringify(c.state.deliveryEditor.entries),entries);
 assert.equal(c.state.deliveryEditor.entries.length,7);assert(!c.state.deliveryEditor.entries.some(entry=>entry.itemId===removed.itemId));
 assert.equal(c.deliveryWizardValues().productionRows.filter(task=>task.selected).length,1);
 c.state.deliveryEditor.productionTaskIds.push('draft-only');
 assert.deepEqual(Array.from(c.deliverySheet(key).sourceRunIds),[runId],'Editing does not mutate saved task IDs');
});

test('ZIP sources stay unselected and switching sources restores the production draft after upload',async()=>{
 const c=vm.runInContext('new Component()',ctx);
 c.openDeliveryEditor('ant200');const id=c.state.deliveryEditor.id,ids=Array.from(c.state.deliveryEditor.productionTaskIds);
 const entries=JSON.stringify(c.state.deliveryEditor.entries);
 c.setDeliveryImportMode('zip',id);c.zipDirectory=()=>[{path:'天坛.glb'}];
 await c.uploadDeliveryList({name:'items.zip',size:20,arrayBuffer:async()=>new ArrayBuffer(0)});
 assert.equal(c.state.deliveryEditor.entries.length,1);assert.equal(c.state.deliveryEditor.productionTaskIds.length,0);
 c.setDeliveryImportMode('production',id);
 assert.deepEqual(Array.from(c.state.deliveryEditor.productionTaskIds),ids);
 assert.equal(JSON.stringify(c.state.deliveryEditor.entries),entries);
 assert.equal(c.pmWizardCandidates().length,200);
 c.setDeliveryImportMode('zip',id);c.patchDeliveryEditor({target:'1'});c.goDeliveryWizardStep(4);c.saveDeliveryEditor();
 c.openDeliveryEditor('ant200');
 assert.equal(c.state.deliveryEditor.importMode,'zip');assert.equal(c.state.deliveryEditor.entries.length,1);
 assert.equal(c.state.deliveryEditor.productionTaskIds.length,0);
 assert.deepEqual(Array.from(c.pmDeliverySourceTaskIds({sourceRunIds:[]},c.state.deliveryEditor.entries)),[]);
 assert.deepEqual(Array.from(c.pmDeliverySourceTaskIds({archive:{name:'legacy.zip'}},c.state.deliveryEditor.entries)),[]);
});

test('Profile creates and edits full Skill definitions and exposes them to order creation',async()=>{
 const c=vm.runInContext('new Component()',ctx);c.setState({profileOpen:true,profileTab:'skills'});c.pmCreateProfileSkill();
 let fields=c.buildProfileValues().draftSkills[0];fields.onName({target:{value:'个人验收'}});fields.onCommand({target:{value:'personal-check'}});fields.onDescription({target:{value:'交付验收'}});fields.onContent({target:{value:'核对所有文件。'}});
 assert.equal(c.profileSkillDraftIssue(),'');c.saveProfileSkills();assert.equal(c.personalProfileSkills().length,1);
 const skill=c.personalProfileSkills()[0];assert.equal(skill.content,'核对所有文件。');assert.equal(c.buildProfileValues().skills[0].action,'编辑 Skill');
 c.openProfileSkill('personal:'+skill.id);c.buildProfileValues().draftSkills[0].onContent({target:{value:'更新验收指令。'}});c.saveProfileSkills();assert.equal(c.personalProfileSkills().length,1);assert.equal(c.personalProfileSkills()[0].content,'更新验收指令。');
 c.openDeliveryEditor();assert(c.deliverySkillLibrary().some(row=>row.command==='personal-check' && row.content==='更新验收指令。'));c.closeDeliveryEditor();
 const content='---\nname: profile-upload\ndescription: Uploaded instructions\n---\nInspect files.';
 await c.uploadProfileSkills([{name:'profile-upload.md',size:content.length,text:async()=>content}]);c.saveProfileSkills();assert.equal(c.personalProfileSkills().length,2);
 c.editPersonalSkill(skill.id);c.buildProfileValues().draftSkills[0].onContent({target:{value:''}});assert(c.profileSkillDraftIssue());c.saveProfileSkills();assert.equal(c.personalProfileSkills()[0].content,'更新验收指令。');
});

test('Skills created or uploaded in orders remain editable in Profile without duplicate personal records',async()=>{
 const c=vm.runInContext('new Component()',ctx);c.openDeliveryEditor();const id=c.state.deliveryEditor.id;
 c.patchDeliverySkillDraft({name:'订单验收',command:'order-check',description:'用于验收',content:'检查产物。'},id);c.createDeliverySkill();
 const md='---\nname: order-upload\ndescription: Imported instructions\n---\nInspect output.';
 await c.uploadDeliverySkills([{name:'order-upload.md',size:md.length,text:async()=>md}]);c.deliverySkillWorkspaceValues().publishUploads();
 assert.equal(c.personalProfileSkills().length,2);const created=c.personalProfileSkills().find(s=>s.command==='order-check');c.closeDeliveryEditor();c.setState({profileOpen:true,profileTab:'skills'});
 c.editPersonalSkill(created.id);c.buildProfileValues().draftSkills[0].onContent({target:{value:'更完整的验收指令。'}});c.saveProfileSkills();
 assert.equal(c.personalProfileSkills().length,2);assert.equal(c.state.createdPlatformSkills.find(s=>s.id===created.id).content,'更完整的验收指令。');
 c.openDeliveryEditor();assert(c.deliverySkillLibrary().some(s=>s.command==='order-check' && s.content==='更完整的验收指令。'));
});

test('custom billing dates preserve Token filters, reset drilldown and adapt chart resolution',()=>{
 const c=vm.runInContext('new Component()',ctx);c.setState({view:'billing'});c.updateBilling({preset:'yesterday',start:'2026-08-31',end:'2026-08-31',grain:'hour',metric:'tokens',provider:'test-provider',bin:'old',page:3});
 c.billingValues().onPreset({target:{value:'custom'}});assert.equal(c.billingValues().custom,true);
 c.billingValues().onStart({target:{value:'2026-08-01'}});assert.equal(c.state.billing.grain,'day');assert.equal(c.state.billing.metric,'tokens');assert.equal(c.state.billing.provider,'test-provider');assert.equal(c.state.billing.bin,null);assert.equal(c.state.billing.page,1);
 assert.equal(c.billingValues().error,'');assert.equal(c.billingValues().bars.length,31);
 const restored=ctx.codec.read(ctx.codec.write({view:'billing',billing:c.state.billing})).patch.billing;assert.equal(restored.start,'2026-08-01');assert.equal(restored.preset,'custom');assert.equal(restored.metric,'tokens');
 c.billingValues().onEnd({target:{value:'2026-07-01'}});assert.match(c.billingValues().error,/结束日期不能早于开始日期/);
 c.billingValues().onEnd({target:{value:'2026-08-02'}});assert.equal(c.billingValues().error,'');assert.equal(c.billingValues().bars.length,2);
 c.billingValues().onPreset({target:{value:'week'}});assert.equal(c.billingValues().custom,false);assert.equal(c.state.billing.metric,'tokens');
});

test('Pipeline node drawer switches nodes, retains exit content and keeps execution untouched',()=>{
 const c=vm.runInContext('new Component()',ctx);c.setState({view:'pipeedit',editPipe:'web3d-ant-delivery-v1',editSel:null});
 const before=JSON.stringify(c.state.editNodes);assert.equal(c.renderVals().pe.drawerMounted,false);
 c.renderVals().pe.nodes.find(node=>node.name==='prep_task').select({detail:1});let pe=c.renderVals().pe;
 assert.equal(pe.drawerOpen,true);assert.equal(pe.sel.name,'prep_task');assert.equal(pe.drawerMotion,'slide');
 pe.nodes.find(node=>node.name==='ref_search').select({detail:1});pe=c.renderVals().pe;assert.equal(pe.sel.name,'ref_search');assert(pe.nodeDetail.configFields.length);
 pe.closeSel({type:'click',detail:1,preventDefault(){}});pe=c.renderVals().pe;assert.equal(c.state.editSel,null);assert.equal(pe.drawerOpen,false);assert.equal(pe.drawerMounted,true);assert.equal(pe.sel.name,'ref_search');
 const target={};pe.nodes[0].keySelect({key:'Enter',target,currentTarget:target,preventDefault(){}});assert.equal(c.renderVals().pe.drawerMotion,'instant');
 assert.equal(JSON.stringify(c.state.editNodes),before);
 c.setState({editPipe:'web3d-car',editSel:null});assert.equal(c.renderVals().pe.drawerMounted,false);
 c.pmOpenNodeDrawer('unknown-node',{detail:1});assert.equal(c.state.editSel,null);
});

test('Node editing admits administrators and owners while viewer routes stay read-only',()=>{
 for(const role of ['member','project-owner','outsourcing','lead','admin'])for(const user of ['一万','yokiguan']){
  const c=vm.runInContext('new Component()',ctx);c.props.currentUser=user;c.props.currentRole=role;
  c.setState({view:'pipeedit',editPipe:'web3d-ant-delivery-v1',editSel:'ref_search',pmPipelineView:false});
  const allowed=user==='yokiguan' || ['lead','admin'].includes(role),pe=c.renderVals().pe;
  assert.equal(pe.nodeEditor.editable,allowed);assert.equal(pe.canEdit,user==='yokiguan');
  c.setState({pmPipelineView:true});assert(!c.renderVals().pe.nodeEditor.editable);
  c.setState({view:'pipelines'});c.renderVals().pipelines.find(p=>p.name==='web3d-ant-delivery-v1').edit({stopPropagation(){}});assert.equal(c.state.pmPipelineView,!allowed);
 }
 assert(!built.includes('>连接边</div>'));assert(built.includes('按连线顺序执行'));
});

test('Saving a node versions its configuration and preserves other nodes plus historical runs',()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-ant-delivery-v1';c.props.currentRole='lead';
 c.props.pipelineConfigs={[key]:{v16:{task:{fn:'original'},ref_search:{model:'configured-model',max_iterations:8}}}};
 c.setState({view:'pipeedit',editPipe:key,editSel:'ref_search'});
 const original=JSON.stringify(c.pipeData().find(p=>p.name===key)),runs=JSON.stringify(c.runsData());
 let e=c.renderVals().pe.nodeEditor;assert.equal(e.config,'{\n  "model": "configured-model",\n  "max_iterations": 8\n}');assert(!e.demo);
 e.onName({target:{value:'reference_search'}});e.onKind({target:{value:'LLM'}});e.onEnabled({target:{checked:false}});e.onConfig({target:{value:'{"model":"configured-model","max_iterations":12,"nested":{"enabled":false},"ids":[1,2]}'}});
 c.renderVals().pe.nodeEditor.save();const next=c.pipeData().find(p=>p.name===key);
 assert.equal(next.version,'v17');assert.equal(next.owner,'yokiguan');assert.equal(next.dag[2],'reference_search/LLM');assert.equal(next.enabledNodes.reference_search,false);
 assert.equal(next.nodeConfigs.reference_search.max_iterations,12);assert.equal(next.nodeConfigs.reference_search.nested.enabled,false);assert.deepEqual(Array.from(next.nodeConfigs.reference_search.ids),[1,2]);
 assert.equal(next.nodeConfigs.task.fn,'original');assert(!next.nodeConfigs.ref_search);
 assert.equal(c.state.pmPipelineVersions[key].v16.nodeConfigs.ref_search.max_iterations,8);
 const history={...c.state.pmPipelineVersions[key].v16};delete history.nodeConfigs;assert.equal(JSON.stringify(history),original);
 assert.equal(JSON.stringify(c.runsData()),runs);assert.equal(c.state.editSel,'reference_search');assert(c.renderVals().pe.nodeEditor.cannotSave);
 e=c.renderVals().pe.nodeEditor;e.onConfig({target:{value:JSON.stringify(next.nodeConfigs.reference_search)}});c.renderVals().pe.nodeEditor.save();assert.equal(c.pipeData().find(p=>p.name===key).version,'v17');
});

test('Node drafts survive switching and validate JSON, unique names and concurrent edits',()=>{
 const c=vm.runInContext('new Component()',ctx),key='web3d-ant-delivery-v1';c.props.currentRole='lead';c.setState({view:'pipeedit',editPipe:key,editSel:'ref_search'});
 let e=c.renderVals().pe.nodeEditor;e.onConfig({target:{value:'invalid'}});e.save();assert.match(c.renderVals().pe.nodeEditor.error,/JSON/);
 c.pmOpenNodeDrawer('task',{detail:1});assert(!c.renderVals().pe.nodeEditor.dirty);c.pmOpenNodeDrawer('ref_search',{detail:1});assert.equal(c.renderVals().pe.nodeEditor.config,'invalid');
 e=c.renderVals().pe.nodeEditor;e.onConfig({target:{value:'[]'}});e.save();assert.match(c.renderVals().pe.nodeEditor.error,/JSON/);
 e=c.renderVals().pe.nodeEditor;e.onConfig({target:{value:'{}'}});e.onName({target:{value:'task'}});e.save();assert.match(c.renderVals().pe.nodeEditor.error,/已存在/);
 e=c.renderVals().pe.nodeEditor;e.reset();assert(c.renderVals().pe.nodeEditor.cannotSave);assert.equal(c.pipeData().find(p=>p.name===key).version,'v16');
 c.renderVals().pe.nodeEditor.onConfig({target:{value:'{"limit":5}'}});
 const pipe=c.pipeData().find(p=>p.name===key);c.setState({pmPipelineOverrides:{[key]:{...pipe,version:'v17'}}});c.renderVals().pe.nodeEditor.save();
 assert.match(c.renderVals().pe.nodeEditor.error,/已更新/);assert.equal(c.pipeData().find(p=>p.name===key).version,'v17');
 c.renderVals().pe.nodeEditor.reset();assert(!c.renderVals().pe.nodeEditor.error);
});

test('Stale node edit callbacks cannot write after role, account, route or selection changes',()=>{
 for(const change of ['role','account','viewer','node','pipeline']){
  const c=vm.runInContext('new Component()',ctx);c.props.currentRole='lead';c.setState({view:'pipeedit',editPipe:'web3d-ant-delivery-v1',editSel:'ref_search'});
  const e=c.renderVals().pe.nodeEditor;e.onConfig({target:{value:'{"limit":5}'}});
  if(change==='role')c.props.currentRole='member';if(change==='account')c.props.currentUser='another-admin';
  if(change==='viewer')c.setState({pmPipelineView:true});if(change==='node')c.setState({editSel:'task'});if(change==='pipeline')c.setState({editPipe:'web3d-car'});
  const before=JSON.stringify(c.state);e.onConfig({target:{value:'{"limit":9}'}});e.save();e.reset();assert.equal(JSON.stringify(c.state),before);
 }
});

test('Node failures are scoped to execution evidence and resolved attempts remove failure markers',()=>{
 const c=vm.runInContext('new Component()',ctx),pipeline='web3d-ant-delivery-v1';c.setState({view:'pipeedit',editPipe:pipeline,editSel:'prep_task'});
 let pe=c.renderVals().pe;assert(pe.nodes.find(n=>n.name==='prep_task').failed);assert(pe.failures[0].demo);assert.match(pe.failures[0].statusLabel,/示例/);
 c.props.pipelineNodeExecutions=[];assert(!c.renderVals().pe.hasFailures);assert(!c.renderVals().pe.nodes.some(n=>n.failed));
 c.props.pipelineNodeExecutions=[
  {pipeline,version:'v16',runId:'failed-run',itemId:'item-a',node:'prep_task',status:'failed',occurredAt:'2026-09-04T09:00:00Z',error:{code:'BAD_INPUT',message:'缺少 subject 字段'}},
  {pipeline:'another-pipeline',version:'v16',runId:'wrong-run',node:'prep_task',status:'failed'},
  {pipeline,version:'v16',runId:'success-run',node:'task',status:'success',error:'旧错误'}
 ];
 pe=c.renderVals().pe;assert.equal(pe.failures.length,1);assert.equal(pe.failures[0].errorCode,'BAD_INPUT');assert.equal(pe.failures[0].runId,'failed-run');assert(!pe.failures[0].demo);assert.equal(pe.nodes.find(n=>n.name==='task').failed,false);
 c.props.pipelineNodeExecutions.push({...c.props.pipelineNodeExecutions[0],status:'success',occurredAt:'2026-09-04T09:01:00Z'});
 assert(!c.renderVals().pe.hasFailures);
 c.props.itemExecution={'item-b':{'from-item':{pipeline:{name:pipeline,version:'v15'},nodes:{prep_task:{status:'failed',error:'读取输入失败'}}}}};
 pe=c.renderVals().pe;assert.equal(pe.failures[0].version,'v15');assert.equal(pe.failures[0].itemId,'item-b');assert.equal(pe.failures[0].errorMessage,'读取输入失败');
});

test('Unconnected issue sync names the future group and never claims successful delivery',async()=>{
 const c=vm.runInContext('new Component()',ctx);c.setState({view:'pipeedit',editPipe:'web3d-ant-delivery-v1',editSel:'prep_task'});
 let failure=c.renderVals().pe.failures[0];assert.match(failure.syncTarget,/Forge任务报错群 · 待接入/);
 await failure.sync();failure=c.renderVals().pe.failures[0];assert.equal(failure.syncLabel,'同步问题');assert.match(failure.message,/尚未接入.*暂未发送/);assert(!failure.syncDisabled);
});

test('Issue sync guards duplicates and stale nodes and only reports confirmed adapter success',async()=>{
 const c=vm.runInContext('new Component()',ctx);c.setState({view:'pipeedit',editPipe:'web3d-ant-delivery-v1',editSel:'prep_task'});
 let finish,calls=[];c.props.syncPipelineNodeIssue=payload=>{calls.push(payload);return new Promise(resolve=>{finish=resolve;});};
 const failure=c.renderVals().pe.failures[0],pending=failure.sync();assert.equal(c.renderVals().pe.failures[0].syncLabel,'同步中…');
 await failure.sync();assert.equal(calls.length,1);assert.equal(calls[0].groupName,'Forge任务报错群');assert.equal(calls[0].issue.node,'prep_task');assert(calls[0].issue.demo);assert(!('config' in calls[0].issue));
 finish({ok:true});await pending;assert.equal(c.renderVals().pe.failures[0].syncLabel,'已同步');await failure.sync();assert.equal(calls.length,1);
 c.setState({pmNodeIssueSync:{},editSel:'task'});await failure.sync();assert.equal(calls.length,1);
 c.setState({editSel:'prep_task'});c.props.syncPipelineNodeIssue=async()=>({ok:false,message:'群机器人拒绝接收'});await failure.sync();assert.equal(c.renderVals().pe.failures[0].syncLabel,'同步问题');assert.match(c.renderVals().pe.failures[0].message,/拒绝/);
 c.props.syncPipelineNodeIssue=async()=>{throw Error('timeout');};await failure.sync();assert.equal(c.renderVals().pe.failures[0].syncLabel,'结果待确认');assert(c.renderVals().pe.failures[0].syncDisabled);
});

test('sheet review references stay on their exact Item, Run and round and preserve full feedback',()=>{
 const c=vm.runInContext('new Component()',ctx),item='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',run='20260825-034505-c19f2a';
 const images=[{name:'屋顶参考',url:'data:image/png;base64,aGVsbG8='},{name:'细节',url:'/reference.png'},{name:'unsafe',url:'javascript:alert(1)'},{url:'/loading.png',loading:true}];
 c.state.repairRuns={[run+':'+item]:{round:2,note:'第二轮：'+ '请保留此处的完整修改要求。'.repeat(10),attachments:images}};
 c.setState({view:'sheet',sheetKey:'ant200',sheetRow:item});
 const rounds=c.renderVals().sheet.pick.rounds;
 assert.equal(rounds[0].referenceImages.length,0);assert.equal(rounds[1].referenceImages.length,2);assert.equal(rounds[2].referenceImages.length,0);
 assert(rounds[1].needsMore);assert(!rounds[1].note.startsWith('第二轮'));
 assert.equal(c.pmSheetReviewImages('other',run,2).length,0);assert.equal(c.pmSheetReviewImages(item,'other',2).length,0);
 assert.equal(c.pmCleanReviewNote('第三轮：检查屋顶'), '检查屋顶');
 assert.equal(c.pmCleanReviewNote('这里提到第二轮：请保留'), '这里提到第二轮：请保留');
 rounds[0].branch({stopPropagation(){}});assert.equal(c.state.branchAsk.round,1);
});

test('appended review photos remain with their saved feedback after the upload draft is cleared',()=>{
 const c=vm.runInContext('new Component()',ctx),item='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',click={stopPropagation(){},preventDefault(){}};
 c.setState({view:'sheet',sheetKey:'ant200',sheetRow:item});
 c.renderVals().sheet.pick.appendRework(click);
 c.renderVals().sheet.pick.onReworkText({target:{value:'第三轮：调整材质'}});
 c.setFeedbackImages('sheet:'+item,[{id:'photo',name:'材质参考',url:'data:image/png;base64,aGVsbG8=',size:5,loading:false}],'');
 c.renderVals().sheet.pick.submitRework(click);
 c.setFeedbackImages('sheet:'+item,[],'');
 const round=c.renderVals().sheet.pick.appendedRounds.at(-1);
 assert.equal(round.note,'调整材质');assert.equal(round.referenceImages.length,1);assert.equal(round.referenceImages[0].name,'材质参考');
 assert.equal(c.state.appendedRework[item].note,'第三轮：调整材质');
});
