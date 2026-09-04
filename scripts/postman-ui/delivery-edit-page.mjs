export const deliveryEditPageCopy = [
 ["if (editor && !editor.key && patch && patch.view", "if (editor && patch && patch.view"],
 ["if (!editor || editor.key || !this.deliveryFormDirty(editor)) return;", "if (!editor || !this.deliveryFormDirty(editor)) return;"],
 ["if (!editor || editor.key) { this.closeDeliveryEditor(); return; }", "if (!editor) { this.closeDeliveryEditor(); return; }"],
 ["event.preventDefault(); if (editor.key) this.saveDeliveryEditor(); else this.deliveryWizardValues().next();", "event.preventDefault(); this.deliveryWizardValues().next();"],
 ["} else if (!editor.key && event.key === 'Escape'", "} else if (event.key === 'Escape'"],
 ["if (!editor || editor.key || editor.id !== id || ![1, 2, 3, 4].includes(step)) return;", "if (!editor || editor.id !== id || ![1, 2, 3, 4].includes(step)) return;"],
 ["deliveryWizardValues() {\n    const editor = this.state.deliveryEditor;\n    if (!editor || editor.key) return {};", "deliveryWizardValues() {\n    const editor = this.state.deliveryEditor;\n    if (!editor) return {};"],
 ["const titles = ['基础信息', '关联条目', '配置规则', '确认创建'];", "const titles = ['基础信息', '关联条目', '配置规则', editor.key ? '确认保存' : '确认创建'];"],
 ["'核对配置并设置成员权限，确认后创建数据单。'];", "editor.key ? '核对配置并设置成员权限，确认后保存更改。' : '核对配置并设置成员权限，确认后创建数据单。'];"],
 ["action: step === 4 ? '创建数据单' : '下一步'", "action: step === 4 ? (editor.key ? '保存更改' : '创建数据单') : '下一步'"],
 ["if (this.state.deliveryEditor && !this.state.deliveryEditor.key) return;", "if (this.state.deliveryEditor) return;"],
 ["const entries = sheet ? this.deliveryEntries(sheet) : [];", "const entries = sheet ? this.deliveryEntries(sheet) : [];\n    const sourceTaskIds = this.pmDeliverySourceTaskIds(sheet, entries);"],
 ["productionTaskIds: sheet?.sourceRunIds || []", "productionTaskIds: sourceTaskIds"],
 ["tab: 'basic', step: 1, reachedStep: 1, importMode: key ? 'paste' : 'production'", "tab: 'basic', step: 1, reachedStep: key ? 4 : 1, importMode: key && !sourceTaskIds.length ? 'zip' : 'production'"],
 ["editor.formBaseline = this.deliveryFormSignature(editor);", "if (key) { editor.pmWizardPool = entries.map(entry=>({...entry})); editor.productionExcluded = this.deliveryProductionTasks().filter(task=>editor.productionTaskIds.includes(task.id)).flatMap(task=>task.entries).filter(entry=>!entries.some(row=>row.itemId===entry.itemId)).map(entry=>entry.itemId); }\n    editor.formBaseline = this.deliveryFormSignature(editor);"],
 ["this.setState(Object.assign({ deliveryEditor: editor, deliveryLeave: null }, !key ? { view: 'delivery-create', dlOpen: false, notifOpen: false } : {}));", "this.setState({ deliveryEditor: editor, deliveryLeave: null, view: 'delivery-create', sheetKey: key || null, routeAnchor: '', dlOpen: false, notifOpen: false });"],
 ["if (!key) { this.closeProfile(); this.endSidebarPeek(true); this.mountDeliveryFormGuard(); }", "this.closeProfile(); this.endSidebarPeek(true); this.mountDeliveryFormGuard();"],
 ["if (!key) { document.getElementById('forge-delivery-title')?.focus(); return; }\n      const dialog = document.querySelector('.forge-delivery-editor');\n      if (dialog && !dialog.open) dialog.showModal();", "document.getElementById('forge-delivery-title')?.focus();"],
 ["const page = this.state.deliveryEditor && !this.state.deliveryEditor.key;", "const page = !!this.state.deliveryEditor, returnKey = this.state.deliveryEditor?.key;"],
 ["page ? { view: 'delivery' } : {}", "page ? { view: returnKey ? 'sheet' : 'delivery', sheetKey: returnKey || null } : {}"],
 ["const page = !editor.key;", "const page = true;"],
 ["page ? this.requestDeliveryLeave(undefined, event) : this.closeDeliveryEditor(event)", "page ? this.requestDeliveryLeave(editor.key ? {view:'sheet',sheetKey:editor.key,sheetRow:null} : undefined, event) : this.closeDeliveryEditor(event)"],
 ["if(!editor || editor.id!==id || editor.key || editor.listLoading)return;", "if(!editor || editor.id!==id || editor.listLoading)return;"],
 ["const pool=editor.key?editor.entries:this.pmWizardCandidates(editor),entry=", "const pool=this.pmWizardCandidates(editor),entry="],
 ["pmWizardPool:editor.key?editor.pmWizardPool:pool.map(update)", "pmWizardPool:pool.map(update)"],
 ["if (editor && !editor.key) {", "if (editor) {"],
 ["if (editor && !editor.key && !sameEditor && this.deliveryFormDirty(editor))", "if (editor && !sameEditor && this.deliveryFormDirty(editor))"],
 ["if (this.state.deliveryEditor.key) this.patchDeliveryEditor({ tab: route.editor.tab });\n          else this.goDeliveryWizardStep(['basic', 'list', 'skills', 'confirm'].indexOf(route.editor.tab) + 1);", "this.goDeliveryWizardStep(['basic', 'list', 'skills', 'confirm'].indexOf(route.editor.tab === 'reviewers' ? 'confirm' : route.editor.tab) + 1);"],
 ["if (this.state.deliveryEditor?.key === sheet.key) this.patchDeliveryEditor({ tab: 'reviewers' });", "if (this.state.deliveryEditor?.key === sheet.key) this.goDeliveryWizardStep(4);"],
 ["const entries = editor.key ? this.resolveSheetLines(text.split(/\\r?\\n/), editor.entries) : this.parseDeliveryWizardLines(text.split(/\\r?\\n/), editor.entries);", "const entries = this.parseDeliveryWizardLines(text.split(/\\r?\\n/), editor.entries);"],
 ["(editor.key ? this.resolveSheetLines(lines, editor.entries) : this.parseDeliveryWizardLines(lines, editor.entries))", "this.parseDeliveryWizardLines(lines, editor.entries)"],
 ["if(editor.importMode==='production') {", "if(editor.importMode==='production' && !(editor.key && editor.pmWizardPool)) {"],
 ["this.patchDeliveryEditor({ importMode: 'production', productionTaskIds: requested, archive: null, entries,", "this.patchDeliveryEditor({ pmWizardPool:null, importMode: 'production', productionTaskIds: requested, archive: null, entries,"],
 ["[previousMode]: { pool:editor.pmWizardPool, text: editor.listText,", "[previousMode]: { taskIds:(editor.productionTaskIds || []).slice(), excluded:(editor.productionExcluded || []).slice(), pool:editor.pmWizardPool, text: editor.listText,"],
 ["pmWizardPool:next.pool || null, importModes: modes, importMode: mode, listText:", "pmWizardPool:next.pool || null, importModes: modes, importMode: mode, productionTaskIds:mode === 'production' ? (next.taskIds || []).slice() : [], productionExcluded:mode === 'production' ? (next.excluded || []).slice() : [], listText:"],
 ["const productionRows = productionTasks.filter(task =>", "const productionRows = productionTasks.slice().sort((a,b) => editor.key ? Number(editor.productionTaskIds.includes(b.id)) - Number(editor.productionTaskIds.includes(a.id)) : 0).filter(task =>"],
 ["defaultTagId: editor.defaultTagId || '',\n      datasetReviews:", "defaultTagId: editor.defaultTagId || '', defaultTaskTagIds: editor.defaultTaskTagIds,\n      datasetReviews:"]
];
export function installDeliveryEditPage(t) {
 for(const [from,to] of deliveryEditPageCopy){if(!t.includes(from))throw Error('Delivery edit page anchor changed: '+from);t=t.replace(from,()=>to);}
 t=t.replace("if (parts.length === 3 && parts[2] === 'edit') result.editor = { key: parts[1], tab: patch.routeAnchor === 'tags' ? 'list' : oneOf(patch.routeAnchor, ['basic', 'list', 'skills', 'reviewers'], 'basic') };", "if (parts.length === 3 && parts[2] === 'edit') { patch.view = 'delivery-create'; result.editor = { key: parts[1], tab: patch.routeAnchor === 'tags' ? 'list' : oneOf(patch.routeAnchor, ['basic', 'list', 'skills', 'reviewers', 'confirm'], 'basic') }; }");
 t=t.replace("case 'delivery-create': path = '/delivery/new';", "case 'delivery-create': path = s.sheetKey ? '/delivery/' + enc(s.sheetKey) + '/edit' : '/delivery/new';");
 t=t.replace('<h1 id="forge-delivery-title" tabindex="-1">创建数据单</h1>','<h1 id="forge-delivery-title" tabindex="-1">{{ deliveryEditor.title }}</h1>');
 t=t.replace('<p>分四步配置交付清单与规则，确认无误后创建。</p>','<p>分四步配置交付清单与规则。</p>');
 t=t.replace('aria-label="创建数据单步骤"','aria-label="数据单配置步骤"');
 t=t.replace('<button type="button" class="forge-delivery-text-button" sc-camel-on-click="{{ deliveryEditor.wizard.editBasic }}">修改基础信息</button>', '<button type="button" class="forge-delivery-text-button pm-wizard-edit-link" title="修改基础信息" sc-camel-on-click="{{ deliveryEditor.wizard.editBasic }}">修改</button>');
 t=t.replace('选择本单需要的 Skill，创建数据单后生效。已选择的 Skill 固定在顶部。','选择本单需要的 Skill，保存数据单后生效。已选择的 Skill 固定在顶部。');
 return t;
}
