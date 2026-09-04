import fs from 'node:fs';
export const taskTagCopy = [
 ["const tagIds = new Set(editor.entries.map(entry => entry.tagId === '__none__' ? '' : entry.tagId || editor.defaultTagId).filter(Boolean));", "const tagIds = new Set(editor.entries.flatMap(entry=>this.pmTaskTagIds(editor,entry)).concat(this.pmTaskTagIds(editor)));"],
 ["isDefault: tag.id === editor.defaultTagId, applied: editor.entries.filter(entry => entry.tagId !== '__none__' && (entry.tagId || editor.defaultTagId) === tag.id).length", "isDefault: this.pmTaskTagIds(editor).includes(tag.id), applied: editor.entries.filter(entry=>this.pmTaskTagIds(editor,entry).includes(tag.id)).length"],

 ["defaultTagId: sheet?.defaultTagId || '', skillCategory:","defaultTaskTagIds: sheet?.defaultTaskTagIds, defaultTagId: sheet?.defaultTagId || '', skillCategory:"],
 ['  addDeliveryTag() {','  pmLegacyAddDeliveryTag() {'],
 ['  deliveryDatasetReviewValues() {','  pmLegacyDatasetReviewValues() {'],
 ["return { hasTagStyle: !!tag,", "return { taskTags:this.pmTaskTagPicker(editor,entry), hasTagStyle: !!tag,"],
 ['      defaultTagId: editor.defaultTagId || \'\', sourceRunIds:',"      defaultTaskTagIds:this.pmTaskTagIds(editor), defaultTagId: editor.defaultTagId || '', sourceRunIds:"],
 ['    const custom = (this.state.deliverySheets || []).slice();\n    const index = custom.findIndex(value => value.key === key);', '    this.pmSaveTaskTags(sheet,editor);\n    const custom = (this.state.deliverySheets || []).slice();\n    const index = custom.findIndex(value => value.key === key);'],
 ['      defaultTagId: editor.defaultTagId || \'\', defaultTagName:',"      taskTags:this.pmTaskTagPicker(editor), taskTagNames:this.pmTaskTagNames(editor), defaultTagId: editor.defaultTagId || '', defaultTagName:"],
 ["      tagCount: tagIds.size, skillCount:","      tagCount: new Set(editor.entries.flatMap(entry=>this.pmTaskTagIds(editor,entry)).concat(this.pmTaskTagIds(editor))).size, skillCount:"],
 ["      const row = Object.assign({}, entry, { tagId: previous?.tagId || '', sourceRefs:","      const row = Object.assign({}, entry, { taskTagIds:previous?.taskTagIds, tagId: previous?.tagId || '', sourceRefs:"],
 ["itemId: match?.[2] || '', deliveryItemId: match?.[2] || '', tagId: old?.tagId || '', parseStatus,", "itemId: match?.[2] || '', deliveryItemId: match?.[2] || '', taskTagIds:old?.taskTagIds, tagId: old?.tagId || '', parseStatus,"],
 ["taskTag:tagId, taskTagOptions, ...this.pmEntryTagStyle({tagId},{tags}),", "taskTag:tagId, taskTagOptions, ...this.pmEntryTagStyle({tagId},{tags}), taskTags:this.pmTaskTagPicker(sheet,entry,true),"]
];
function picker(path){return `<details class="pm-task-tag-picker"><summary aria-label="{{ ${path}.label }}"><span class="pm-task-tag-chips"><sc-for list="{{ ${path}.selected }}" as="chosen"><span class="pm-task-tag-chip" style="--task-tag-bg:{{ chosen.color }};--task-tag-fg:{{ chosen.fg }}">{{ chosen.name }}</span></sc-for><sc-if value="{{ ${path}.empty }}"><span>未设置</span></sc-if></span></summary><div class="pm-task-tag-options" role="group" aria-label="{{ ${path}.label }}"><sc-for list="{{ ${path}.options }}" as="choice"><label><input type="checkbox" checked="{{ choice.checked }}" disabled="{{ ${path}.readonly }}" sc-camel-on-change="{{ choice.toggle }}" /><span class="pm-task-tag-chip" style="--task-tag-bg:{{ choice.color }};--task-tag-fg:{{ choice.fg }}">{{ choice.name }}</span></label></sc-for><sc-if value="{{ ${path}.noOptions }}"><span>请先创建 Tag</span></sc-if></div></details>`;}
export function installTaskTags(t) {
 for(const [a,b] of taskTagCopy){if(!t.includes(a))throw Error('Task Tag anchor changed: '+a);t=t.replace(a,()=>b);}
 t=t.replace('默认 Tag <span class="forge-wizard-optional">','设置 Tag <span class="forge-wizard-optional">');
 t=t.replace('应用于所有 Item；在条目预览中可为单条 Item 覆盖。','可设置多个 task Tag，应用到条目；每个 Item 的 task 状态可在条目预览或审核分配中调整。');
 t=t.replace(/<sc-if value="\{\{ deliveryEditor.wizard.canSkip \}\}"[^>]*><button\b[^>]*sc-camel-on-click="\{\{ deliveryEditor.wizard.skip \}\}"[^>]*>跳过规则，继续确认<\/button><\/sc-if>/,'');
 const difference='<p class="forge-wizard-difference" data-mismatch="{{ deliveryEditor.wizard.mismatch }}">{{ deliveryEditor.wizard.differenceLabel }}</p>';
 t=t.replaceAll(difference,'<sc-if value="{{ deliveryEditor.wizard.mismatch || !deliveryEditor.wizard.hasTarget }}">'+difference+'</sc-if>');
 t=t.replace(/<select aria-label="默认 Tag"[\s\S]*?<\/select>/,picker('deliveryEditor.wizard.taskTags'));
 t=t.replace(/<sc-if value="\{\{ deliveryEditor.wizard.hasDefaultTag \}\}">[\s\S]*?<\/sc-if>/,'');
 t=t.replace('<dt>默认 Tag</dt><dd>{{ deliveryEditor.wizard.defaultTagName }}</dd>','<dt>Task 状态</dt><dd>{{ deliveryEditor.wizard.taskTagNames }}</dd>');
 t=t.replaceAll(/<select[^>]*sc-camel-on-change="\{\{ entry.onTag \}\}"[^>]*>[\s\S]*?<\/select>/g,picker('entry.taskTags'));
 t=t.replaceAll(/<select[^>]*sc-camel-on-change="\{\{ dataset.onStatus \}\}"[^>]*>[\s\S]*?<\/select>/g,picker('dataset.taskTags'));
 t=t.replace(/<select[^>]*sc-camel-on-change="\{\{ r.assignTag \}\}"[^>]*>[\s\S]*?<\/select>/,`<span class="pm-task-tag-chips pm-sheet-task-tags-display"><sc-for list="{{ r.taskTags.selected }}" as="chosen"><span class="pm-task-tag-chip" style="--task-tag-bg:{{ chosen.color }};--task-tag-fg:{{ chosen.fg }}">{{ chosen.name }}</span></sc-for><sc-if value="{{ r.taskTags.empty }}"><span>-</span></sc-if></span>`);
 t=t.replaceAll('默认 · ', '已设置 · ');
 t=t.replaceAll('筛选处理状态','筛选 task 状态').replaceAll('<span role="columnheader">状态</span></div>\n      <sc-for list="{{ deliveryEditor.reviewAssignment.rows }}"','<span role="columnheader">Task 状态</span></div>\n      <sc-for list="{{ deliveryEditor.reviewAssignment.rows }}"');
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('task-tags-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
