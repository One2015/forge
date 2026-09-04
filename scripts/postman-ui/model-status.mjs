// Keep the standalone preview refinements separate from the source prototype.
export const modelStatusCopy = [
  ["businessOnly = !!state.modelBusinessOnly", "businessOnly = false"],
  ["showIssues: () => this.setState({ modelFilter: 'attention', modelSelection: '', modelRoute: '', modelDrawerMode: '' })", "showIssues: () => this.setState({ modelFilter: 'attention', modelQuery: '', modelProvider: '', modelModel: '', modelLine: '', modelBusinessOnly: false, modelSelection: '', modelRoute: '', modelDrawerMode: '' })"]
];

export function installModelStatus(t) {
  for (const [from, to] of modelStatusCopy) {
    if (!t.includes(from)) throw Error('Model status logic anchor changed: ' + from);
    t = t.replace(from, () => to);
  }
  const replace = (from, to) => {
    if (!t.includes(from)) throw Error('Model status markup anchor changed: ' + from.slice(0, 80));
    t = t.replace(from, () => to);
  };
  const health = t.match(/    <section class="forge-model-health"[\s\S]*?<\/section>/)?.[0];
  if (!health) throw Error('Model status summary missing');
  replace(health, `    <section class="forge-model-health" aria-label="线路状态摘要">
      <p>{{ modelStatus.anomalySummary }}</p>
      <div class="pm-model-summary forge-overview-summary" role="group" aria-label="模型状态摘要">
        <sc-for list="{{ modelStatus.chips }}" as="chip">
          <article class="forge-summary-card pm-model-summary-item" data-actionable="true" data-selected="{{ chip.selected }}">
            <div class="forge-summary-heading"><span class="forge-summary-title">{{ chip.name }}</span></div>
            <div class="forge-summary-value"><strong>{{ chip.count }}</strong></div>
            <button type="button" class="forge-summary-link" aria-label="{{ chip.name }}" aria-pressed="{{ chip.selected }}" sc-camel-on-click="{{ chip.select }}"></button>
          </article>
        </sc-for>
      </div>
    </section>`);
  replace('sc-camel-on-click="{{ modelStatus.showIssues }}">查看', 'title="在下方表格显示全部待处理线路，并清除其他筛选" sc-camel-on-click="{{ modelStatus.showIssues }}">筛选');
  const impact = t.match(/      <label class="forge-model-impact-filter">[^\n]+<\/label>\n/)?.[0];
  if (!impact) throw Error('Model impact filter missing');
  replace(impact, '');
  replace('<span role="columnheader">供应商 / 模型</span>', '<span role="columnheader">供应商</span><span role="columnheader">模型</span>');
  replace('<span role="columnheader">业务影响</span><span role="columnheader">操作</span>', '<span role="columnheader">业务影响</span>');
  replace('<div role="cell" class="forge-model-identity"><strong>{{ line.provider }} /</strong><span>{{ line.model }}</span></div>', '<div role="cell" class="pm-model-provider">{{ line.provider }}</div><div role="cell" class="pm-model-name">{{ line.model }}</div>');
  const actions = t.match(/              <div role="cell" class="forge-model-actions">[^\n]+\n/)?.[0];
  if (!actions) throw Error('Model action column missing');
  replace(actions, '');
  return t;
}
