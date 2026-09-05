const replaceOnce = (source, from, to, label) => {
  if (!source.includes(from)) throw Error(label + ' anchor changed');
  return source.replace(from, to);
};

export function installUtilityPanels(t) {
  const downloadId = t.indexOf('id="forge-download-panel"');
  const notificationId = t.indexOf('id="forge-notification-panel"');
  const panelsEnd = t.indexOf('<!-- forge-sidebar-floating-panels:end -->', notificationId);
  if (downloadId < 0 || notificationId < downloadId || panelsEnd < notificationId) {
    throw Error('Sidebar utility panel boundaries changed');
  }

  let downloads = t.slice(downloadId, notificationId);
  downloads = replaceOnce(
    downloads,
    '<div style="padding:12px 15px;border-bottom:1px solid #f4f0ea">',
    '<div class="pm-utility-row pm-download-row" data-unread="{{ d.notDone }}" style="padding:12px 15px;border-bottom:1px solid #f4f0ea">',
    'Download row'
  );

  let notifications = t.slice(notificationId, panelsEnd);
  notifications = replaceOnce(
    notifications,
    '<button type="button" aria-label="{{ n.cta }} · {{ n.title }}" sc-camel-on-click="{{ n.go }}"',
    '<button type="button" class="pm-utility-row pm-notification-row" data-unread="{{ n.weight === \'600\' }}" aria-label="{{ n.cta }} · {{ n.title }}" sc-camel-on-click="{{ n.go }}"',
    'Notification row'
  );
  return t.slice(0, downloadId) + downloads + notifications + t.slice(panelsEnd);
}
