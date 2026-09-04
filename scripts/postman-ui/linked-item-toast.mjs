// Extend the existing Toast action without changing branch-run notifications.
export const linkedItemToastCopy = [
 ["this.notifyTaskLink(message, source.approved ? 'success' : 'info');", "this.notifyTaskLink(message, source.approved ? 'success' : 'info', { label: '查看关联 Item', sheetKey: sheet.key, itemId: id });"],
 ["action: action?.runId ? { label: action.label, runId: action.runId } : null", "action: action?.itemId && action?.sheetKey ? { label: action.label, sheetKey: action.sheetKey, itemId: action.itemId } : action?.runId ? { label: action.label, runId: action.runId } : null"],
 ["  openTaskLinkToastAction(toast, event) {\n    event?.preventDefault(); event?.stopPropagation();", `  openTaskLinkToastAction(toast, event) {
    if (toast?.action?.itemId && (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey || event?.button > 0)) return;
    event?.preventDefault(); event?.stopPropagation();
    if (toast?.action?.itemId) {
      if (this.state.taskLinkToast !== toast) return;
      const sheet = this.deliverySheet(toast.action.sheetKey);
      const entry = sheet && this.deliveryEntries(sheet).find(value => this.deliveryEntryId(value) === toast.action.itemId);
      if (!entry) { this.notifyTaskLink('该关联 Item 已不可用，请在交付清单中查看。', 'warning'); return; }
      this.dismissTaskLinkToast();
      this.setState({ view: 'sheet', sheetKey: sheet.key, sheetRow: toast.action.itemId, sheetFilter: 'all', sheetQuery: '', sheetTagFilter: '', runItem: null, reviewOpen: null, sheetReworkAsk: null });
      return;
    }`],
 ["hasAction: !!toast?.action?.runId, actionLabel:", "hasAction: !!(toast?.action?.runId || toast?.action?.itemId), actionLabel:"],
 ["actionHref: toast?.action?.runId ? '?view=run&activeRun=' + encodeURIComponent(toast.action.runId) : '',", "actionHref: toast?.action?.itemId ? ForgeRoutes.write({ view: 'sheet', sheetKey: toast.action.sheetKey, sheetRow: toast.action.itemId }) : toast?.action?.runId ? '?view=run&activeRun=' + encodeURIComponent(toast.action.runId) : '',"]
];
export function installLinkedItemToast(t) {
 for (const [from,to] of linkedItemToastCopy) {
  if (!t.includes(from)) throw Error('Linked Item Toast anchor changed: ' + from.slice(0,80));
  t=t.replace(from,()=>to);
 }
 return t;
}
