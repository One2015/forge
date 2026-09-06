import fs from 'node:fs';
import {phosphorIcon} from './phosphor-icons.mjs';

export const pipelineVersionHistoryCopy = [
  [
    "versions: this.pmPipelineHistory(p).map((h, i) => ({ tag: h[0], change: h[1], when: h[2], fg: i === 0 ? 'var(--forge-accent)' : 'var(--forge-muted)' })),",
    "versions: this.pmPipelineHistory(p).map((h, i) => ({ tag: h[0], change: h[1], when: h[2], fg: i === 0 ? 'var(--forge-accent)' : 'var(--forge-muted)', ariaLabel: '查看 '+(p.displayName || p.name)+' '+h[0]+' 版本详情', open: event => this.pmOpenPipelineVersion(p.name,h[0],event) })),"
  ],
  [
    '      pipelineEditor: this.pmPipelineEditorValues(),\n      pipeEmpty: pipelines.length === 0,',
    '      pipelineEditor: this.pmPipelineEditorValues(),\n      pipelineVersion: this.pmPipelineVersionValues(),\n      pipeEmpty: pipelines.length === 0,'
  ]
];

export function installPipelineVersionHistory(t) {
  for (const [from, to] of pipelineVersionHistoryCopy) {
    if (!t.includes(from)) throw Error('Pipeline version history anchor changed: ' + from.slice(0, 100));
    t = t.replace(from, () => to);
  }
  const historyStart = t.indexOf('<sc-for list="{{ p.versions }}" as="v"');
  const historyEnd = t.indexOf('</sc-for>', historyStart);
  if (historyStart < 0 || historyEnd < historyStart) throw Error('Pipeline version list boundary changed');
  let history = t.slice(historyStart, historyEnd);
  history = history.replace(/<div class="pm-pipelines-version"([^>]*)>/, '<button type="button" class="pm-pipelines-version" aria-label="{{ v.ariaLabel }}" sc-camel-on-click="{{ v.open }}"$1>');
  history = history.replace(/<div (style="font-size:12px;color:[^"]*;text-align:right;white-space:nowrap")>\{\{ v\.when \}\}<\/div>/, '<div class="pm-pipelines-version-time" $1>{{ v.when }}</div>');
  const rowEnd = history.lastIndexOf('</div>');
  if (!history.includes('<button type="button" class="pm-pipelines-version"') || !history.includes('pm-pipelines-version-time') || rowEnd < 0) throw Error('Pipeline version row anchor changed');
  history = history.slice(0, rowEnd) + phosphorIcon('arrow-right', 16, {className: 'pm-pipelines-version-arrow'}) + '\n                              </button>' + history.slice(rowEnd + '</div>'.length);
  t = t.slice(0, historyStart) + history + t.slice(historyEnd);
  const main = '<main class="forge-main"';
  const start = t.indexOf('>', t.indexOf(main)) + 1;
  t = t.slice(0, start) + fs.readFileSync(new URL('pipeline-version-history.html', import.meta.url), 'utf8') + t.slice(start);
  const methods = fs.readFileSync(new URL('pipeline-version-history-methods.js', import.meta.url), 'utf8');
  return t.replace('  tagForeground(hex) {', methods + '  tagForeground(hex) {');
}
