// Delivery creation is transient. Keep the unsaved-form guard, but remove the
// persisted draft feature from this preview without deleting existing user data.
export function removeDeliveryDrafts(t) {
 t=t.replace(/<!-- delivery-drafts:start -->[\s\S]*?<!-- delivery-drafts:end -->/,'')
   .replace(/\/\* delivery-drafts:start \*\/[\s\S]*?\/\* delivery-drafts:end \*\//,'')
   .replace(/  \/\/ delivery-drafts:start[\s\S]*?  \/\/ delivery-drafts:end/,'');
 // Legacy edit-dialog footer: remove the entire nested draft status group.
 t=t.replace(/^.*<sc-if value="\{\{ deliveryEditor.page \}\}"[^\n]*forge-delivery-draft-status[^\n]*\n/gm,'')
   .replace(/<sc-if value="\{\{ deliveryEditor.page \}\}"[^>]*><button[^>]*deliveryEditor\.draft\.save[^>]*>[\s\S]*?<\/button><\/sc-if>/g,'')
   .replaceAll(' disabled="{{ deliveryEditor.draft.busy }}"','');
 for(const line of [
  '    this._deliveryDraftUnmounted = false;\n',
  '    this.loadDeliveryDrafts();\n',
  '    this._deliveryDraftUnmounted = true;\n',
  '    this.clearCommittedDeliveryDraft(editor);\n',
  '      deliveryDrafts: this.deliveryDraftListValues(),\n',
  '    if (editor.draftSaving) return;\n',
  "    if (editor.draftSaving) return '草稿正在保存，请稍候。';\n",
  '    if (this.state.deliveryEditor?.draftSaving) { event?.preventDefault(); return; }\n',
  "      if (patch.routeAnchor === 'drafts') patch.deliveryDraftsExpanded = true;\n",
  "      ['.forge-delivery-drafts', 'drafts'],\n",
 ]) t=t.replaceAll(line,'');
 t=t.replaceAll(', draft: this.deliveryDraftControls()','')
   .replaceAll('!!editor.draftSaving || ','')
   .replaceAll(' || this.state.deliveryEditor.draftSaving','')
   .replaceAll(' && (!route.draft || route.draft === editor.savedDraftId)','')
   .replaceAll(' && (!route.draft || route.draft === current.savedDraftId)','')
   .replaceAll("; result.draft = get('draft');",';')
   .replaceAll("set('draft', s.deliveryEditor?.savedDraftId); ",'')
   .replaceAll("editor: null, draft: '', error: ''","editor: null, error: ''")
   .replace(/        if \(route\.draft && !sameEditor\) \{[\s\S]*?\} else if \(!sameEditor\) this\.openDeliveryEditor\(route\.editor\.key\);/,
    '        if (!sameEditor) this.openDeliveryEditor(route.editor.key);')
   .replaceAll('已保存的草稿仅在当前浏览器和账号下可用。','');
 // These methods only protect in-progress form edits; name them accordingly.
 for (const [from,to] of [
  ['deliveryDraftSignature','deliveryFormSignature'], ['deliveryDraftDirty','deliveryFormDirty'],
  ['mountDeliveryDraftGuard','mountDeliveryFormGuard'], ['unmountDeliveryDraftGuard','unmountDeliveryFormGuard'],
  ['keepDeliveryDraft','keepDeliveryForm'], ['discardDeliveryDraft','discardDeliveryForm'],
  ['draftBaseline','formBaseline'],
 ]) t=t.replaceAll(from,to);
 return t;
}
