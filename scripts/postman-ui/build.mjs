import {installPipelineNodeDrawer} from './pipeline-node-drawer.mjs';
import {installReviewReferenceSkills} from './review-reference-skills.mjs';
import {installProfileSkillEditor} from './profile-skill-editor.mjs';
import {installDeliveryEditPage} from './delivery-edit-page.mjs';
import {installTaskTags} from './task-tags.mjs';
import {installWizardChecklist} from './wizard-checklist.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {semanticMarkup,legacyPaletteCss} from './semantic-colors.mjs';
import {installReviewQueue} from './review-queue.mjs';
import {installRunRecords} from './run-records.mjs';
import {removeDeliveryDrafts} from './remove-delivery-drafts.mjs';
import {installPipelineResponsive} from './pipeline-responsive.mjs';
import {installItemExplorer} from './item-explorer.mjs';
import {installItemPipelineView} from './item-pipeline-view.mjs';
import {installItemRunEntryActions} from './item-run-entry-actions.mjs';
import {installTabs} from './tabs.mjs';
import {installImportMotion} from './import-motion.mjs';
import {installGlobalResponsive} from './global-responsive.mjs';
import {installProgressIndicators} from './progress-indicators.mjs';
import {installModelStatus} from './model-status.mjs';
import {installLifecyclePhotos} from './lifecycle-photos.mjs';
import {installAnt200Mock} from './ant200-mock.mjs';
import {installStepV2WMock} from './stepv2w-mock.mjs';
import {refineOverviewSummary} from './overview-summary.mjs';
import {installFeedbackRefinements} from './feedback-refinements.mjs';
import {installLinkedItemToast} from './linked-item-toast.mjs';
import {installReviewAllocation} from './review-allocation.mjs';
import {installItemPreviewPage} from './item-preview-page.mjs';
import {installReviewPreviewPage} from './review-preview-page.mjs';
import {installSheetReviewHistory} from './sheet-review-history.mjs';
import {installListAssociation} from './list-association.mjs';
import {installSheetInlineAssignment} from './sheet-inline-assignment.mjs';
import {installDatasetPipelineGuide} from './dataset-pipeline-guide.mjs';
import {installPipelineOwnerEditor} from './pipeline-owner-editor.mjs';
import {installPipelineVersionHistory} from './pipeline-version-history.mjs';
import {installDatasetEditor} from './dataset-editor.mjs';
import {installEntryTagStyle} from './entry-tag-style.mjs';
import {installDeliveryBrowser} from './delivery-browser.mjs';
import {installLoadingStates} from './loading-states.mjs';
import {installCheckboxMotion} from './checkbox-motion.mjs';
import {installNotificationToggle} from './notification-toggle.mjs';
import {installUtilityPanels} from './utility-panels.mjs';
const root=new URL('../../',import.meta.url);
export function buildPostman(source){
 const opening='<script type="__bundler/template">', closing='\n</script>\n</body>\n</html>';
 const start=source.indexOf(opening),end=source.lastIndexOf(closing);
 if(start<0||end<0)throw Error('Missing prototype template boundary');
 let t=removeDeliveryDrafts(JSON.parse(source.slice(start+opening.length,end).trim()));
 const replace=(a,b)=>{if(!t.includes(a))throw Error('Prototype anchor changed: '+a.slice(0,100));t=t.replace(a,b);};
 replace('<html><head>','<html lang="zh-CN"><head><title>Forge · Postman UI 优化版</title>');
 t=t.replace(/<title>[^<]*<\/title>/,'<title>Forge · Postman UI 优化版</title>');
 t=t.replace('<body','<body class="forge-postman"');
 replace('<main class="forge-main"',`<header class="pm-topbar"><span class="pm-brand-dot" aria-hidden="true"></span><strong>Forge</strong><span class="pm-workspace-name">生产与交付工作台</span></header>\n<main class="forge-main"`);
 const deliveryStart=t.indexOf('<sc-if value="{{ isDelivery }}"');
 const deliveryEnd=t.indexOf('<sc-if value="{{ isSheet }}"',deliveryStart);
 let delivery=t.slice(deliveryStart,deliveryEnd);
 const from=delivery.indexOf('            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">');
 const to=delivery.indexOf('              </sc-for>\n            </div>',from);
 if(from<0||to<from)throw Error('Delivery row boundary changed');
 delivery=delivery.slice(0,from)+fs.readFileSync(new URL('scripts/postman-ui/delivery-rows.html',root),'utf8')+delivery.slice(to+'              </sc-for>\n            </div>'.length);
 delivery=delivery.replace('class="forge-page"','class="forge-page pm-delivery-page"');
 t=t.slice(0,deliveryStart)+delivery+t.slice(deliveryEnd);
 t=installDeliveryBrowser(t);
 const sheetStart=t.indexOf('<sc-if value="{{ isSheet }}"');const sheetEnd=t.indexOf('<sc-if value="{{ isOverview }}"',sheetStart);
 if(sheetStart<0||sheetEnd<sheetStart)throw Error('Sheet boundaries changed');
 let sheet=t.slice(sheetStart,sheetEnd);
 const skillSessionStart=sheet.indexOf('<!-- skill-evaluator:start -->');
 const skillSessionEnd=sheet.indexOf('<!-- skill-evaluator:end -->',skillSessionStart);
 if(skillSessionStart<0||skillSessionEnd<skillSessionStart)throw Error('Sheet skill session boundary changed');
 sheet=sheet.slice(0,skillSessionStart)+sheet.slice(skillSessionEnd+'<!-- skill-evaluator:end -->'.length);
 // Related skills already resolve from this sheet's assigned bindings. Remove
 // the separate version tree so that the existing skills section follows metadata.
 const versionStart=sheet.indexOf('<sc-if value="{{ sheet.pick.hasVersionNodes }}"');
 const versionEnd=sheet.indexOf('</sc-if>',versionStart);
 if(versionStart<0||versionEnd<versionStart)throw Error('Sheet version tree boundary changed');
 sheet=sheet.slice(0,versionStart)+sheet.slice(versionEnd+'</sc-if>'.length);
 sheet=sheet.replace('查看产物、版本关系与审核记录','查看产物、相关 Skill 与审核记录');
 // Instructions belong to an on-demand help tooltip, not a persistent status banner.
 const tipStart=sheet.indexOf('<sc-if value="{{ sheet.showTip }}"');
 const tipEnd=sheet.indexOf('</sc-if>',tipStart);
 if(tipStart<0||tipEnd<tipStart)throw Error('Sheet help boundary changed');
 sheet=sheet.slice(0,tipStart)+sheet.slice(tipEnd+'</sc-if>'.length);
 sheet=sheet.replace('<div data-forge-segmented="pill" role="group"', '<div class="pm-sheet-filters" data-forge-segmented="pill" role="group" aria-label="子项状态筛选"');
 sheet=sheet.replace('<div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--forge-border);flex-wrap:wrap">', '<div class="pm-sheet-toolbar" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--forge-border);flex-wrap:wrap">');
 sheet=sheet.replace('{{ sheet.count }}</div>', '{{ sheet.count }}</div><span class="pm-sheet-help">操作说明<span data-forge-tooltip="点击子项查看产物、相关 Skill 与审核记录。在详情页中使用 ↑ / ↓ 切换子项，Esc 关闭。" data-tooltip-label="子项操作说明"></span></span>');
 sheet=sheet.replace('class="forge-sheet-scroll" style="grid-column:2;grid-row:1;','class="forge-sheet-scroll pm-item-details-panel" style="grid-column:2;grid-row:1;');
 sheet=sheet.replace('<div sc-camel-on-click="{{ goDelivery }}"','<div class="pm-sheet-back" sc-camel-on-click="{{ goDelivery }}"')
 .replace('<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px">','<div class="pm-sheet-heading" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px">')
 .replace('<div style="background:#fff;border:1px solid var(--forge-border);border-radius:12px;padding:16px 18px;margin-bottom:14px">','<div class="pm-sheet-progress" style="background:#fff;border:1px solid var(--forge-border);border-radius:12px;padding:16px 18px;margin-bottom:14px">')
 .replace('<div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px">','<div class="pm-sheet-metrics" style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px">')
 .replace('<div style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;overflow:hidden">','<div class="pm-sheet-list" style="background:#fff;border:1px solid var(--forge-border);border-radius:14px;overflow:hidden">')
 .replace('<div style="display:grid;grid-template-columns:52px','<div class="pm-sheet-columns" style="display:grid;grid-template-columns:52px');
 t=t.slice(0,sheetStart)+sheet+t.slice(sheetEnd);
 // Stable semantic hooks survive DCLogic's normalized runtime style attributes.
 t=t.replace('<div style="display:flex;flex-direction:column;height:calc(100vh - 56px)">','<div class="pm-pipeline-editor pm-page-pipeedit" style="display:flex;flex-direction:column;height:calc(100vh - 56px)">');
 t=t.replace('<div style="flex:1;min-height:0;position:relative;overflow:auto;background-color:#faf8f5;background-image:radial-gradient(#e6e0d6 1px,transparent 1px);background-size:22px 22px">','<div class="pm-pipeline-canvas" style="flex:1;min-height:0;position:relative;overflow:auto;background-color:#faf8f5;background-image:radial-gradient(#e6e0d6 1px,transparent 1px);background-size:22px 22px">');
 t=t.replace('<div sc-camel-on-click="{{ n.select }}" style="width:clamp(186px,21vw,264px);border:1px solid {{ n.cardBorder }};border-left:4px solid {{ n.accent }};border-radius:12px;background:#fff;box-shadow:{{ n.shadow }};padding:clamp(11px,1.3vw,14px) clamp(12px,1.4vw,15px);cursor:pointer">','<div class="pm-pipeline-node" data-node-kind="{{ n.kind }}" sc-camel-on-click="{{ n.select }}" style="width:clamp(186px,21vw,264px);border:1px solid {{ n.cardBorder }};border-left:4px solid {{ n.accent }};border-radius:12px;background:#fff;box-shadow:{{ n.shadow }};padding:clamp(11px,1.3vw,14px) clamp(12px,1.4vw,15px);cursor:pointer">');
 t=t.replace('<div style="width:9px;height:9px;flex:none;border-radius:2px;background:{{ n.accent }};transform:rotate(45deg)"></div>','<div class="pm-pipeline-node-mark" style="width:9px;height:9px;flex:none;border-radius:2px;background:{{ n.accent }};transform:rotate(45deg)"></div>');
 t=t.replace('<div style="flex:none;font-size:12px;color:{{ n.kindFg }};background:{{ n.kindBg }};border-radius:6px;padding:1px 8px;letter-spacing:.06em;white-space:nowrap">{{ n.kind }}</div>','<div class="pm-pipeline-node-kind" style="flex:none;font-size:12px;color:{{ n.kindFg }};background:{{ n.kindBg }};border-radius:6px;padding:1px 8px;letter-spacing:.06em;white-space:nowrap">{{ n.kind }}</div>');
 t=t.replace('<div style="width:{{ n.progW }};height:100%;background:{{ n.accent }}"></div>','<div class="pm-pipeline-node-progress" style="width:{{ n.progW }};height:100%;background:{{ n.accent }}"></div>');
 t=t.replace('<div sc-camel-on-click="{{ n.toggle }}"','<div role="checkbox" aria-label="启用节点 {{ n.name }}" aria-checked="{{ n.check }}" sc-camel-on-click="{{ n.toggle }}"');
 t=t.replace('&quot;default&quot;:460','&quot;default&quot;:660');
 t=installPipelineResponsive(t);
 t=installItemExplorer(t);
 t=installItemPipelineView(t);
 t=installItemRunEntryActions(t);
 // Named page hooks avoid coupling the new patterns to inline style strings.
 for (const [flag,name] of [['isOverview','overview'],['isPipelines','pipelines'],['isDatasets','datasets'],['isResources','resources'],['isReview','review'],['isRun','run']]) {
  const i=t.indexOf('<sc-if value="{{ '+flag+' }}"'); const page=t.indexOf('class="forge-page"',i);
  if(i>=0 && page>i) t=t.slice(0,page)+t.slice(page).replace('class="forge-page"','class="forge-page pm-page-'+name+'"');
 }
 t=t.replace('<section class="forge-page forge-route-error"','<section class="forge-page forge-route-error pm-page-error"');
 t=t.replace('<div class="forge-life-page"','<div class="forge-life-page pm-page-itemlife"');
 t=t.replace('<div data-forge-segmented="pill" role="group" style="display:flex;gap:2px;background:var(--forge-border);border-radius:10px;padding:3px">\n<sc-for list="{{ review.owners }}"', '<div class="pm-owner-segment" data-forge-segmented="pill" role="group" aria-label="审核人范围" style="display:flex;gap:2px;background:var(--forge-border);border-radius:10px;padding:3px">\n<sc-for list="{{ review.owners }}"');
 const submitted=t.indexOf('<sc-if value="{{ isSubmitted }}"');
 const submittedRoot=t.indexOf('<div style="max-width:620px;',submitted);
 if(submitted>=0&&submittedRoot>submitted)t=t.slice(0,submittedRoot)+t.slice(submittedRoot).replace('<div style="max-width:620px;','<div class="pm-page-submitted" style="max-width:620px;');
 const dsStart=t.indexOf('<sc-if value="{{ isDatasets }}"');
 const dsEnd=t.indexOf('<sc-if value="{{ isResources }}"',dsStart);
 let ds=t.slice(dsStart,dsEnd).replace('<div style="display:flex;align-items:flex-start;gap:14px">','<div class="pm-dataset-split" style="display:flex;align-items:flex-start;gap:14px">');
 // Dataset rows and item details share the document's vertical scroll. Menus
 // and import previews retain their own bounded scrolling.
 for(const style of ['flex:1;min-height:0;overflow-y:auto','flex:1 1 0;min-height:200px;overflow-y:auto']){
  const anchor='<div style="'+style+'">';
  if(!ds.includes(anchor))throw Error('Dataset page scroll anchor changed: '+style);
  ds=ds.replace(anchor,'<div class="pm-dataset-page-content" style="'+style+'">');
 }
 t=t.slice(0,dsStart)+ds+t.slice(dsEnd);
 t=installReviewQueue(t);
 t=installRunRecords(t);
 t=installModelStatus(t);
 t=refineOverviewSummary(t);
 t=installFeedbackRefinements(t);
 t=installLifecyclePhotos(t);
 t=installLinkedItemToast(t);
 t=installReviewAllocation(t);
 replace('<p class="forge-delivery-help">请继续填写 List 清单，Tag 和 Skill 为选填。</p>','');
 replace('<p class="forge-delivery-help forge-delivery-notification-note">{{ deliveryEditor.notificationHint }}</p>','');
 const editorFooter=t.indexOf('<footer class="forge-delivery-editor-footer">');
 const footerCopy=t.indexOf('<div class="forge-delivery-footer-copy">',editorFooter);
 const footerActions=t.indexOf('<div class="forge-delivery-footer-actions">',footerCopy);
 if(editorFooter<0||footerCopy<0||footerActions<0)throw Error('Delivery editor footer boundary changed');
 t=t.slice(0,footerCopy)+t.slice(footerActions);

 const savedListStart=t.indexOf('    <div class="forge-delivery-section-heading"><h2>List 清单');
 const savedListEnd=t.indexOf('    <sc-if value="{{ sheet.extras.hasSkills }}"',savedListStart);
 if(savedListStart<0||savedListEnd<0)throw Error('Saved delivery list boundary changed');
 t=t.slice(0,savedListStart)+t.slice(savedListEnd);
 replace('<sc-if value="{{ sheet.extras.visible }}" hint-placeholder-val="{{ false }}">','<sc-if value="{{ sheet.extras.hasSkills }}" hint-placeholder-val="{{ false }}">');
 replace('aria-label="交付清单与审核技能"','aria-label="数据单 Skill"');
 t=installListAssociation(t);
 t=installEntryTagStyle(t);

 t=installSheetInlineAssignment(t);
 t=installDatasetPipelineGuide(t);
 t=installDatasetEditor(t);
 t=installPipelineOwnerEditor(t);
 t=installPipelineVersionHistory(t);
 t=installWizardChecklist(t);
 t=installTaskTags(t);
 t=installDeliveryEditPage(t);
 t=installProfileSkillEditor(t);
 t=installPipelineNodeDrawer(t);
 replace('<label for="forge-branch-note">本次迭代说明 ', '<label for="forge-branch-note">返工说明 ');
 t=installAnt200Mock(t);
 t=installStepV2WMock(t);
 t=installItemPreviewPage(t);
 t=installSheetReviewHistory(t);
 t=installProgressIndicators(t);
 replace('<p>仅用于案例沉淀，不影响审核结论。</p>','');
 replace('<button type="button" class="forge-delivery-secondary" disabled="{{ deliveryEditor.workspace.locked }}" sc-camel-on-click="{{ deliveryEditor.workspace.back }}">返回列表</button>','');
 replace('返回列表会保留未完成内容；创建成功的 Skill 不随数据单取消而删除。','创建成功的 Skill 不随数据单取消而删除。');
 replace('<span class="review-workbench-ref-count" data-available="{{ it.hasReferences }}">{{ it.referenceCount }}</span>','');
 const skillDownloadIcon=fs.readFileSync(new URL('assets/phosphor/regular/download-simple.svg',root),'utf8').replace('<svg ','<svg width="18" height="18" aria-hidden="true" focusable="false" ');
 t=t.replaceAll('aria-label="{{ relatedSkill.downloadLabel }}" sc-camel-on-click="{{ relatedSkill.download }}">下载 .md</button>', 'aria-label="{{ relatedSkill.downloadLabel }}" title="{{ relatedSkill.downloadLabel }}" sc-camel-on-click="{{ relatedSkill.download }}">'+skillDownloadIcon+'</button>');
 t=installReviewReferenceSkills(t);
 t=installReviewPreviewPage(t);
 const wizardHeading='<div class="forge-wizard-task-heading"><h2 id="forge-wizard-step-title" tabindex="-1" aria-label="{{ deliveryEditor.wizard.title }}">{{ deliveryEditor.wizard.title }}</h2><p class="forge-delivery-help">{{ deliveryEditor.wizard.help }}</p></div>';
 replace(wizardHeading,'');
 replace('<div class="forge-wizard-layout">',wizardHeading+'\n<div class="forge-wizard-layout pm-wizard-aligned">');
 t=installNotificationToggle(t);
 t=installUtilityPanels(t);
 const logicStart=t.indexOf('<script type="text/x-dc"');
 let markup=t.slice(0,logicStart);
 markup=markup.replace(/<(div|span|button|input|select)\b[^>]*>/g,tag=>{
   const inline=tag.match(/\sstyle="([^"]*)"/)?.[1]||'';
   const action=tag.match(/sc-camel-on-click="\{\{\s*([\w.]+)\s*\}\}"/)?.[1];
   // Legacy table/group headers and controls still contain literal warm grays.
   // Normalize presentation attributes only; business values and callbacks stay intact.
   if(/background:#faf8f5/.test(inline)&&inline.includes('border-bottom:'))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-table-heading="true"');
   tag=tag.replace(/\b(style|style-hover)="([^"]*)"/g,(_,attr,value)=>{
     const neutral=value.replace(/#faf8f5\b/g,'var(--pm-subtle)').replace(/#(?:f7f4ef|f1efec|f2efe9)\b/g,'var(--pm-hover)').replace(/#f4f0ea\b/g,'var(--pm-border)').replace(/#(?:c1b8ab|d3cabd)\b/g,attr==='style-hover'?'var(--pm-hover-border)':'var(--pm-control)');
     return attr+'="'+neutral+'"';
   });
   const bordered=/border:1px solid var\(--forge-(?:control-border|border)\)/.test(inline)&&/background:#fff(?:;|$)/.test(inline);
   const secondaryAction=['d.download','d.retry','life.download','it.review','sheet.hideTip'].includes(action);
   // Event propagation guards on dialog containers are not button actions.
   if((bordered&&(tag.startsWith('<button')||(action&&!/\bstop/.test(action))))||secondaryAction){
     if(!tag.includes('data-pm-secondary='))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-secondary="true"');
   }
   if(['clearReroll','goDelivery','life.backToTrunk','q.toggleNote','pe.back','pe.closeSel','closeImport','sheet.clearQuery','pe.zoomOut','pe.zoomFit','pe.zoomIn'].includes(action))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-tertiary="true"');
   if(['o.pick','v.pick'].includes(action))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-option="true"');
   if(action==='p.toggle')tag=tag.replace('<div','<div data-pm-row="true" aria-expanded="{{ p.expanded }}"');
   if(/sc-camel-on-click=/.test(tag)&&!tag.includes('data-pm-click')&&!/sc-camel-on-click="[^"]*\bstop/.test(tag))tag=tag.replace(/^<(div|span|button)/,'<$1 data-pm-click="true"');
   if(tag.startsWith('<button')&&/style="[^"]*background(?:-color)?:var\(--forge-accent\)/.test(tag))tag=tag.replace('<button','<button data-pm-primary="true"');
   // Legacy classes swap meanings between review and rework modes. Bind visual
   // priority to the actual action while preserving handlers and validation.
   if(tag.startsWith('<button')){
     if(['sheet.pick.appendRework','sheet.pick.rework','sheet.pick.submitRework','it.rework','it.submitNote'].includes(action)&&!tag.includes('data-pm-primary='))tag=tag.replace('<button','<button data-pm-primary="true"');
     if(['sheet.pick.pass','sheet.pick.cancelRework','it.pass','it.cancelNote'].includes(action))tag=tag.replace('<button','<button data-pm-secondary="true"');
   }
   if(/style="[^"]*height:(?:36|38|40)px/.test(tag))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-control="true"');
   if(/style="[^"]*border-radius:(?:10|12|14)px/.test(tag))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-radius="true"');
   if(/background-image:repeating-linear-gradient/.test(tag))tag=tag.replace(/^<(\w+)/,'<$1 data-pm-placeholder="true"');
   if(tag.startsWith('<button')&&tag.includes('cursor:not-allowed')&&!tag.includes('disabled='))tag=tag.replace('<button','<button disabled="disabled"');
   return tag;
 });
 markup=markup.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/g,(button,attrs,body)=>{
   if(!body.includes('新建资源包'))return button;
   const next=attrs.replace(/\sdata-pm-secondary="true"/g,'');
   return '<button'+next+' data-pm-primary="true">'+body+'</button>';
 });
 markup=markup.replace(/<button([^>]*?)>(\s*{{ sheet.exportLabel }}\s*)<\/button>/, '<button type="button"$1 disabled="{{ sheet.exportUnavailable }}" sc-camel-on-click="{{ sheet.exportItems }}">$2</button>');
 t=semanticMarkup(markup)+t.slice(logicStart);
 // A concurrent prototype update introduced real routes. Preserve its codec,
 // guards and history behavior while retaining this independent preview entry.
 if(t.includes('const ForgeRoutes = (() => {')){
  replace('const ForgeRoutes = (() => {','const ForgeBaseRoutes = (() => {');
  replace('// forge-routing-core:end','// forge-routing-core:end\n'+fs.readFileSync(new URL('scripts/postman-ui/routes.js',root),'utf8'));
  t=t.replaceAll("ForgeRoutes.write(Object.assign({}, this.state, { routeAnchor: '' })).split", "PostmanRoutes.unwrap(ForgeRoutes.write(Object.assign({}, this.state, { routeAnchor: '' }))).split");
  replace("new URL(value || '/', host.location.origin)","new URL(PostmanRoutes.unwrap(value || '/'), host.location.origin)");
  t=t.replace("title + ' | Forge'", "title + ' | Forge · Postman UI 优化版'");
 }
 t=installTabs(t);
 t=installImportMotion(t);
 t=installGlobalResponsive(t);
 t=installLoadingStates(t);
 t=installCheckboxMotion(t);
 const css=['primitives.css','tokens.css','workspace.css','pages.css','controls.css'].map(n=>fs.readFileSync(new URL('public/postman-ui/'+n,root),'utf8')).join('\n')+'\n'+legacyPaletteCss()+'\n'+fs.readFileSync(new URL('public/postman-ui/states.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/review-queue.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/run-records.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/item-preview-page.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/progress-indicators.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/tabs.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/pipeline-responsive.css',root),'utf8')+'\n'+fs.readFileSync(new URL('public/postman-ui/item-explorer.css',root),'utf8')+'\n'+['global-responsive.css','motion.css','loading.css','checkbox-motion.css','empty-states.css'].map(n=>fs.readFileSync(new URL('public/postman-ui/'+n,root),'utf8')).join('\n');
 const itemPipelineCss=fs.readFileSync(new URL('public/postman-ui/item-pipeline-view.css',root),'utf8');
 replace('</style>', '\n/* postman-ui: overrides after the legacy foundation */\n'+css+'\n'+itemPipelineCss+'\n'+fs.readFileSync(new URL('public/postman-ui/import-motion.css',root),'utf8')+'\n</style>');
 replace('</head>','<script type="module" src="/postman-ui/behavior.mjs"></script>\n</head>');
 const logic=t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1];new Function(logic);
 return source.slice(0,start+opening.length).replace(/<title>[^<]*<\/title>/,'<title>Forge · Postman UI 优化版</title>')+'\n'+JSON.stringify(t).replaceAll('</script>','<\\u002Fscript>')+closing;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const src=fs.readFileSync(new URL('scripts/templates/forge-base.html',root),'utf8');
 const output=buildPostman(src);
 fs.writeFileSync(new URL('public/forge-postman.html',root),output);
 const sha=value=>createHash('sha256').update(value).digest('hex');
 fs.writeFileSync(new URL('public/postman-ui/build-info.json',root),JSON.stringify({name:'Postman UI 优化版',source:'scripts/templates/forge-base.html',sourceSha256:sha(src),output:'public/forge-postman.html',outputSha256:sha(output)},null,2)+'\n');
 console.log('Postman UI 优化版 → /forge-postman.html. Built from the internal Forge base template.');
}
