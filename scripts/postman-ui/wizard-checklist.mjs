import fs from 'node:fs';
export const wizardChecklistCopy = [
 ["const filtered = editor.entries.filter(entry => !editor.onlyExceptions || (entry.parseStatus || (entry.itemId ? 'matched' : 'unmatched')) !== 'matched');", 'const filtered = this.pmWizardCandidates(editor);'],
 ['stats, hasEntries: !!editor.entries.length, noRows: !rows.length, rows, onlyExceptions: !!editor.onlyExceptions,\n      onExceptions: event => patch({ onlyExceptions: event.target.checked, entryPage: 1 }),', 'stats, hasEntries: !!editor.entries.length, noRows: !rows.length, rows, // pm-preview-all-rows'],
 ["productionQuery: '', productionPipeline: '', entryPage: 1, onlyExceptions: false,", "productionQuery: '', productionPipeline: '', entryPage: 1, /* pm-preview-no-filter */"],
 ["return Object.assign({}, entry, { ...this.pmEntryTagStyle(entry, editor, true), status, label:","return Object.assign({}, entry, { ...this.pmEntryTagStyle(entry, editor, true), selected:editor.entries.some(row=>row.key===entry.key), selectLabel:'加入清单：' + entry.name, onSelect:event=>this.pmSelectWizardEntry(entry.key,event.target.checked,id), status, label:"],
 ["onTag: event => patch({ entries: this.state.deliveryEditor.entries.map(row => row.key === entry.key ? Object.assign({}, row, { tagId: event.target.value }) : row) }),", "onTag: event => this.pmWizardEntryTag(entry.key,event.target.value,id),"],
 ["this.patchDeliveryEditor({ listText: text, entries, listChanged:","this.patchDeliveryEditor({ pmWizardPool:null, listText: text, entries, listChanged:"],
 ["this.patchDeliveryEditor({ importMode: 'zip', productionTaskIds: [], entries,", "this.patchDeliveryEditor({ pmWizardPool:null, importMode: 'zip', productionTaskIds: [], entries,"],
 ["[previousMode]: { text: editor.listText, entries: editor.entries, archive:","[previousMode]: { pool:editor.pmWizardPool, text: editor.listText, entries: editor.entries, archive:"],
 ["this.patchDeliveryEditor({ importModes: modes, importMode: mode, listText:","this.patchDeliveryEditor({ pmWizardPool:next.pool || null, importModes: modes, importMode: mode, listText:"],
 ["patch({ archive: null, entries: [], listText: '', listChanged:","patch({ pmWizardPool:null, archive: null, entries: [], listText: '', listChanged:"]
];
export function installWizardChecklist(t) {
 for(const [a,b] of wizardChecklistCopy){if(!t.includes(a))throw Error('Wizard checklist anchor changed: '+a);t=t.replace(a,()=>b);}
 t=t.replace('<span role="columnheader">Item 名称 / ID</span>', '<span role="columnheader">选择</span><span role="columnheader">Item 名称 / ID</span>');
 t=t.replace('<span role="columnheader">操作</span></div><sc-for list="{{ deliveryEditor.wizard.rows }}"','</div><sc-for list="{{ deliveryEditor.wizard.rows }}"');
 t=t.replace('<div class="forge-wizard-table-row" role="row">','<div class="forge-wizard-table-row" role="row"><div role="cell" class="pm-wizard-check"><input type="checkbox" checked="{{ entry.selected }}" aria-label="{{ entry.selectLabel }}" sc-camel-on-change="{{ entry.onSelect }}" /></div>');
 t=t.replace(/<div role="cell"><button[^>]*sc-camel-on-click="\{\{ entry.remove \}\}"[^>]*>删除<\/button><\/div>/,'');
 t=t.replace(/<label class="forge-wizard-checkbox"><input[^>]*sc-camel-on-change="\{\{ deliveryEditor.wizard.onExceptions \}\}"[^>]*\/>只看异常<\/label>/,'');
 t=t.replace('<p class="forge-wizard-empty">没有可展示的条目，请重新同步生产任务或关闭异常筛选。</p>', '<div class="pm-wizard-empty-row" role="row"><div role="cell" aria-colspan="4" class="forge-wizard-empty">选择 Pipeline × 数据集的生产任务，或上传 ZIP 后，条目会显示在这里。</div></div>');
 t=t.replace('<p class="forge-wizard-preview-summary" role="status">{{ deliveryEditor.wizard.totalLabel }}<sc-if value="{{ deliveryEditor.wizard.hasExceptions }}"><span>{{ deliveryEditor.wizard.exceptionSummary }}</span></sc-if></p>', '<p class="forge-wizard-preview-summary" role="status">共 {{ deliveryEditor.wizard.stats.recognized }} 条</p>');
 t=t.replace('<sc-if value="{{ deliveryEditor.wizard.canUseCount }}"><button type="button" class="forge-delivery-text-button" sc-camel-on-click="{{ deliveryEditor.wizard.useValidCount }}">将目标调整为 {{ deliveryEditor.wizard.stats.valid }} 项</button></sc-if>', '');
 t=t.replace(/<div class="forge-wizard-pagination"><span>{{ deliveryEditor.wizard.range }}<\/span><sc-if value="{{ deliveryEditor.wizard.paginated }}" hint-placeholder-val="{{ false }}">([\s\S]*?)<\/sc-if><\/div>/, '<sc-if value="{{ deliveryEditor.wizard.paginated }}" hint-placeholder-val="{{ false }}"><div class="forge-wizard-pagination">$1</div></sc-if>');
 t=t.replace('placeholder="搜索任务或数据集"', 'placeholder="搜索 Pipeline、数据集或 Run ID"');
 t=t.replace('aria-label="关联任务 {{ task.name }}"', 'aria-label="关联 {{ task.pipeline }} × {{ task.dataset }} · Run {{ task.id }}"');
 t=t.replace('<strong>{{ task.name }}<sc-if value="{{ task.demo }}"><small>示例</small></sc-if></strong><span title="{{ task.pipeline }}">{{ task.pipeline }}</span><span title="{{ task.dataset }}">数据集 · {{ task.dataset }}</span>', '<strong><span>{{ task.pipeline }} × {{ task.dataset }}</span><sc-if value="{{ task.demo }}"><small>示例</small></sc-if></strong><span title="{{ task.id }}">Run · {{ task.id }}</span><span title="{{ task.name }}">{{ task.name }}</span>');
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('wizard-checklist-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
