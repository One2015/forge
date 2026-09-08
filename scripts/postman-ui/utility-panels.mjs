import {phosphorIcon} from './phosphor-icons.mjs';

const replaceOnce = (source, from, to, label) => {
  if (!source.includes(from)) throw Error(label + ' anchor changed');
  return source.replace(from, to);
};

export const utilityPanelLogicCopy = [
  [
    "{ id: 'd2', name: '天坛 · 最终产物', meta: '20260825-081120 · 652.5 MB', state: 'paused', pct: 34 },",
    "{ id: 'd2', name: '天坛 · 最终产物', meta: '20260825-081120 · 652.5 MB', state: 'downloading', pct: 34 },",
    'Download demo state'
  ],
  [
    '    const dlState = st.dlState || {};',
    '    const dlState = st.dlState || {};\n    const dlRead = st.dlRead || {};',
    'Download read state'
  ],
  [
    "      running: ['#8a5a16', '#e0c48c', '#fdf8ef', '打包中', '#c8912f'],\n      paused: ['var(--forge-muted)', 'var(--forge-control-border)', '#f7f4ef', '已暂停', 'var(--forge-muted)'],",
    "      running: ['#8a5a16', '#e0c48c', '#fdf8ef', '打包中', '#c8912f'],\n      downloading: ['var(--pm-link)', '#adc9e6', '#f1f6fb', '下载中', 'var(--pm-link)'],\n      paused: ['var(--forge-muted)', 'var(--forge-control-border)', '#f7f4ef', '已暂停', 'var(--forge-muted)'],",
    'Download palettes'
  ],
  [
    "    const activeN = dlItems.filter(x => x.state === 'running').length;",
    "    const activeN = dlItems.filter(x => x.state === 'running' || x.state === 'downloading').length;",
    'Active download count'
  ],
  [
    "      toggle: () => this.setState({ dlOpen: !st.dlOpen, notifOpen: false }),",
    `      toggle: () => {
        const open = !st.dlOpen;
        const read = Object.assign({}, dlRead);
        if (open) dlItems.forEach(item => { read[item.id] = true; });
        this.setState({ dlOpen: open, notifOpen: false, dlRead: read });
      },`,
    'Download viewed behavior'
  ],
  [
    "          isRunning: x.state === 'running', isPaused: x.state === 'paused',",
    "          isPacking: x.state === 'running', isDownloading: x.state === 'downloading',",
    'Download state flags'
  ],
  [
    "          notDone: x.state !== 'done',",
    "          notDone: x.state !== 'done', unread: !st.dlOpen && !dlRead[x.id],",
    'Download unread flag'
  ],
  [
    "          showBar: x.state === 'running' || x.state === 'paused',\n          pct: x.pct + '%',\n          canPause: x.state === 'running',\n          canResume: x.state === 'paused',",
    "          showBar: x.state === 'running' || x.state === 'downloading',\n          pct: x.pct + '%',\n          canCancelPacking: x.state === 'running',\n          canStopDownload: x.state === 'downloading',",
    'Download actions'
  ],
  [
    "          pause: set('paused'),\n          resume: set('running'),",
    "          cancelPacking: e => { e.stopPropagation(); this.setState({ dlRemoved: Object.assign({}, st.dlRemoved, { [x.id]: true }) }); },\n          stopDownload: set('done'),",
    'Download action handlers'
  ]
];

export function installUtilityPanels(t) {
  for (const [from, to, label] of utilityPanelLogicCopy) t = replaceOnce(t, from, to, label);

  const downloadId = t.indexOf('id="forge-download-panel"');
  const notificationId = t.indexOf('id="forge-notification-panel"');
  const panelsEnd = t.indexOf('<!-- forge-sidebar-floating-panels:end -->', notificationId);
  if (downloadId < 0 || notificationId < downloadId || panelsEnd < notificationId) {
    throw Error('Sidebar utility panel boundaries changed');
  }

  let downloads = t.slice(downloadId, notificationId);
  downloads = downloads.replace(/<div\b[^>]*sc-camel-on-click="\{\{ dl\.clearDone \}\}"[^>]*>清除已完成<\/div>/, '');
  downloads = replaceOnce(
    downloads,
    '<div style="padding:12px 15px;border-bottom:1px solid #f4f0ea">',
    '<div class="pm-utility-row pm-download-row" data-unread="{{ d.unread }}">',
    'Download row'
  );
  downloads = replaceOnce(
    downloads,
    '<sc-if value="{{ d.notDone }}" hint-placeholder-val="{{ true }}"><div style="font-size:12px;color:{{ d.stateFg }};white-space:nowrap">{{ d.state }}</div></sc-if>',
    '<sc-if value="{{ d.notDone }}" hint-placeholder-val="{{ true }}"><span class="pm-download-state" style="color:{{ d.stateFg }}">{{ d.state }}</span></sc-if>\n                        <sc-if value="{{ d.canRetry }}" hint-placeholder-val="{{ false }}"><button type="button" class="pm-download-inline-action" sc-camel-on-click="{{ d.retry }}" aria-label="重试 {{ d.name }}">重试</button></sc-if>',
    'Download state label'
  );

  const iconStart = downloads.indexOf('                      <sc-if value="{{ d.isRunning }}"');
  const iconEnd = downloads.indexOf('                    </div>\n\n                    <div style="flex:1;min-width:0">', iconStart);
  if (iconStart < 0 || iconEnd < iconStart) throw Error('Download icon boundary changed');
  const icons = `                      <sc-if value="{{ d.isPacking }}" hint-placeholder-val="{{ true }}">${phosphorIcon('cube', 16)}</sc-if>
                      <sc-if value="{{ d.isDownloading }}" hint-placeholder-val="{{ false }}">${phosphorIcon('download-simple', 16)}</sc-if>
                      <sc-if value="{{ d.isDone }}" hint-placeholder-val="{{ false }}">${phosphorIcon('check', 16)}</sc-if>
                      <sc-if value="{{ d.isFailed }}" hint-placeholder-val="{{ false }}">${phosphorIcon('x', 12)}</sc-if>
`;
  downloads = downloads.slice(0, iconStart) + icons + downloads.slice(iconEnd);

  const progressStart = downloads.indexOf('                      <sc-if value="{{ d.showBar }}"');
  const whyStart = downloads.indexOf('                      <sc-if value="{{ d.hasWhy }}"', progressStart);
  if (progressStart < 0 || whyStart < progressStart) throw Error('Download progress boundary changed');
  const progress = `                      <sc-if value="{{ d.showBar }}" hint-placeholder-val="{{ true }}">
                        <div class="pm-download-progress" role="group" aria-label="{{ d.state }} {{ d.pct }}">
                          <div class="pm-download-track" aria-hidden="true"><span style="width:{{ d.pct }};background:{{ d.barBg }}"></span></div>
                          <span class="pm-download-percent">{{ d.pct }}</span>
                          <sc-if value="{{ d.canCancelPacking }}" hint-placeholder-val="{{ true }}"><button type="button" class="pm-download-inline-action" sc-camel-on-click="{{ d.cancelPacking }}" aria-label="取消打包 {{ d.name }}">取消打包</button></sc-if>
                          <sc-if value="{{ d.canStopDownload }}" hint-placeholder-val="{{ false }}"><button type="button" class="pm-download-inline-action" sc-camel-on-click="{{ d.stopDownload }}" aria-label="停止下载 {{ d.name }}">停止</button></sc-if>
                        </div>
                      </sc-if>

`;
  downloads = downloads.slice(0, progressStart) + progress + downloads.slice(whyStart);

  let notifications = t.slice(notificationId, panelsEnd);
  notifications = replaceOnce(
    notifications,
    '<button type="button" aria-label="{{ n.cta }} · {{ n.title }}" sc-camel-on-click="{{ n.go }}"',
    '<button type="button" class="pm-utility-row pm-notification-row" data-unread="{{ n.weight === \'600\' }}" aria-label="{{ n.cta }} · {{ n.title }}" sc-camel-on-click="{{ n.go }}"',
    'Notification row'
  );
  return t.slice(0, downloadId) + downloads + notifications + t.slice(panelsEnd);
}
