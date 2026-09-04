  // model-status-dashboard:start
  modelStatusDashboard(input, snapshot, isDemo) {
    const state = this.state;
    const { fresh } = this.modelEvidenceClock(input);
    const rawRoutes = new Map((Array.isArray(input?.routes) ? input.routes : []).map(route => [route.id, route]));
    const providerRecords = new Map((Array.isArray(input?.providers) ? input.providers : []).map(provider => [provider.id, provider]));
    const num = (value, digits = 1) => Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
    const money = value => '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const percent = value => Number(value).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    const signed = (value, suffix = '%') => value > 0 ? '+' + num(value) + suffix : value < 0 ? '−' + num(Math.abs(value)) + suffix : '正常';
    const time = at => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const statusLabels = { severe: '严重', performance: '警告', quality: '质量异常', confirm: '需确认', billing: '余额不足', normal: '正常', failed: '调用失败', unknown: '待确认', inactive: '未纳入生产' };
    // Use explicit error categories; severity and latency alone cannot identify a supplier cause.
    const alertReasonLabels = { supplier_balance: '供应商余额不足', key_unavailable: 'Key 暂时不可用', account_shortage: '供应商账号紧缺', downstream_error: '下游供应商报错' };
    const errorReasons = { insufficient_balance: 'supplier_balance', arrears: 'supplier_balance', key_unavailable: 'key_unavailable', authentication_failed: 'key_unavailable', account_shortage: 'account_shortage', downstream_error: 'downstream_error', upstream_error: 'downstream_error' };
    const toneFor = status => ['severe', 'failed', 'billing'].includes(status) ? 'danger' : ['performance', 'quality', 'confirm'].includes(status) ? 'warning' : status === 'normal' ? 'success' : 'muted';
    const lines = snapshot.rows.map(row => {
      const raw = rawRoutes.get(row.id) || {}, usage = raw.usage || {}, latency = raw.latency || {}, quality = raw.quality || {}, evidence = isDemo ? raw.demoEvidence || {} : {};
      const usageKnown = !row.uncertain && fresh(usage.checkedAt) && Number.isSafeInteger(usage.calls) && usage.calls >= 0 && Number.isSafeInteger(usage.failures) && usage.failures >= 0 && usage.failures <= usage.calls && Number.isFinite(usage.costUsd) && usage.costUsd >= 0;
      const latencyKnown = row.latencyLabel.includes('×') && Number.isFinite(latency.currentMs) && Number.isFinite(latency.baselineMs) && latency.baselineMs > 0;
      const calls = usageKnown ? usage.calls : null, failures = usageKnown ? usage.failures : null, failureRate = calls ? failures / calls * 100 : calls === 0 ? 0 : null;
      const ratio = latencyKnown ? latency.currentMs / latency.baselineMs : null;
      const totalMs = Number.isFinite(evidence.totalMs) ? evidence.totalMs : latency.metric === 'total_p95' && latencyKnown ? latency.currentMs : null;
      const totalBaselineMs = Number.isFinite(evidence.totalBaselineMs) ? evidence.totalBaselineMs : latency.metric === 'total_p95' && latencyKnown ? latency.baselineMs : null;
      const totalRatio = totalMs != null && totalBaselineMs > 0 ? totalMs / totalBaselineMs : null;
      const throughput = Number.isFinite(evidence.tokensPerSecond) ? evidence.tokensPerSecond : null;
      const throughputDelta = Number.isFinite(evidence.tokensPerSecondDelta) ? evidence.tokensPerSecondDelta : null;
      const billing = providerRecords.get(row.providerId)?.billing || {};
      const balanceKnown = !row.uncertain && fresh(billing.checkedAt) && Number.isFinite(billing.balanceUsd) && billing.balanceUsd >= 0;
      const hourlySpendKnown = balanceKnown && Number.isFinite(billing.hourlySpendUsd) && billing.hourlySpendUsd > 0;
      const runway = hourlySpendKnown ? billing.balanceUsd / billing.hourlySpendUsd : null;
      const qualityKnown = ['未见下降', '下降 · 待复测'].includes(row.qualityLabel);
      const qualityKind = evidence.qualityKind || (row.regressed ? 'drift' : qualityKnown ? 'normal' : 'retest');
      const inferredStatus = row.result === 'failed' && row.active ? 'failed' : row.slow ? 'severe' : row.regressed ? 'quality' : row.billingAlert ? 'billing' : row.active && row.result === 'passed' ? 'normal' : row.active || row.uncertain ? 'unknown' : 'inactive';
      const statusKey = evidence.status || inferredStatus;
      const callReason = row.result === 'failed' && Object.hasOwn(errorReasons, raw.errorCode) ? errorReasons[raw.errorCode] : '';
      const balanceReason = fresh(billing.checkedAt) && ['balance_low', 'arrears'].includes(billing.status) ? 'supplier_balance' : '';
      const alertReasons = row.active && !row.uncertain ? [...new Set((isDemo ? evidence.alertReasons || [] : [callReason, balanceReason]).filter(reason => Object.hasOwn(alertReasonLabels, reason)))] : [];
      const alertReason = alertReasons.map(reason => alertReasonLabels[reason]).join(' · ');
      const impact = evidence.impact || { tasks: 0, project: '业务影响待接入', ddl: 'DDL 待接入', failedCalls: failures || 0 };
      const qualityTitle = qualityKind === 'drift' ? '质量漂移' : qualityKind === 'mismatch' ? '疑似模型不一致' : qualityKind === 'retest' ? '需要复测' : '正常';
      const qualityDetail = qualityKind === 'drift' && qualityKnown ? 'Benchmark ' + quality.baselineScore + ' → ' + quality.score : qualityKind === 'mismatch' ? (evidence.fingerprint ? 'Fingerprint 变化' : '与官方直连差异显著') : qualityKind === 'retest' ? '样本量不足' : '固定测试集稳定';
      const action = evidence.action || (row.result === 'failed' ? '查看错误' : row.billingAlert ? '去充值' : row.regressed ? '运行对比测试' : row.slow ? '联系供应商' : '查看详情');
      const urgentDdl = /1 天|今日|小时/.test(impact.ddl || '');
      const severity = { severe: 6, failed: 6, billing: 5, quality: 4, confirm: 4, performance: 3, unknown: 2, normal: 0, inactive: -1 }[statusKey] ?? 1;
      const businessScore = severity * 100 + (impact.tasks || 0) * 18 + (urgentDdl ? 25 : 0);
      const line = {
        ...row, raw, evidence, id: row.id, providerId: row.providerId, modelId: row.modelId, line: evidence.line || row.id, calls, failures, failureRate, usageKnown,
        statusKey, status: statusLabels[statusKey] || row.availability, tone: toneFor(statusKey), severity, businessScore, alertReasons, alertReason, alertReasonItems: alertReasons.map(id => ({ id, label: alertReasonLabels[id] })),
        latencyMs: latencyKnown ? latency.currentMs : null, baselineMs: latencyKnown ? latency.baselineMs : null, ratio,
        latencyValue: latencyKnown ? (latency.currentMs / 1000).toFixed(2) + 's' : '—', baselineValue: latencyKnown ? (latency.baselineMs / 1000).toFixed(2) + 's' : '—',
        ratioLabel: ratio != null ? num(ratio) + '×' : '待检测', totalMs, totalBaselineMs, totalRatio, throughput, throughputDelta,
        performanceMain: latencyKnown ? 'P95 TTFT ' + (latency.currentMs / 1000).toFixed(2) + 's · ' + num(ratio) + '×' : 'P95 TTFT 待检测',
        performanceSub: throughput != null ? num(throughput) + ' Tokens/s · ' + signed(throughputDelta || 0) : '生成速度待接入',
        performanceTooltip: latencyKnown ? '当前 P95 TTFT ' + (latency.currentMs / 1000).toFixed(2) + 's；基线 ' + (latency.baselineMs / 1000).toFixed(2) + 's；差异 ' + num(ratio) + '×；当前样本 ' + latency.sampleCount + '；基线范围：' + (latency.baselineLabel || '过去 7 天同类请求') : '当前没有足够的可比延迟样本。',
        qualityKnown, qualityValue: qualityKnown ? num(quality.score || 0) : '—', qualityKind, qualityTitle, qualityDetail,
        qualityDelta: qualityKind === 'drift' && qualityKnown ? signed((quality.score - quality.baselineScore) / quality.baselineScore * 100) : qualityKind === 'mismatch' ? '与直连差异 ' + num(evidence.directGap || 0) + '%' : '',
        failure: failureRate == null ? '—' : percent(failureRate), failureDetail: usageKnown ? num(failures, 0) + ' / ' + num(calls, 0) : '调用统计待接入',
        cost: usageKnown ? money(usage.costUsd) : '—', balance: balanceKnown ? money(billing.balanceUsd) : '—', runway: runway == null ? '—' : num(runway) + 'h', hourlySpend: hourlySpendKnown ? money(billing.hourlySpendUsd) + ' / 小时' : '消耗速率待接入',
        billing, impact, impactMain: impact.tasks ? impact.tasks + ' 个运行任务' : impact.project, impactSub: impact.tasks ? impact.project + ' · ' + impact.ddl : impact.ddl,
        action, reason: alertReason || evidence.cause || row.reason, explanation: evidence.explanation || (balanceReason && !callReason ? row.billingEvidence : row.reason), errors: evidence.errors || '错误分布待接入', tests: evidence.tests || row.qualityEvidence,
        checked: row.checked, abnormalStartedAt: evidence.abnormalStartedAt || '待确认', selected: false
      };
      return line;
    });
    const filter = state.modelFilter || 'production', provider = state.modelProvider || '', model = state.modelModel || '', route = state.modelLine || '';
    const query = String(state.modelQuery || '').trim().toLowerCase(), businessOnly = !!state.modelBusinessOnly;
    const matchesStatus = line => filter === 'production' ? line.active || line.uncertain : filter === 'attention' ? ['severe', 'failed', 'billing', 'performance', 'quality', 'confirm'].includes(line.statusKey) : filter === 'severe' ? line.statusKey === 'severe' || line.statusKey === 'failed' || line.statusKey === 'billing' : filter === 'performance' || filter === 'slow' ? line.statusKey === 'performance' || line.statusKey === 'severe' : filter === 'quality' ? ['quality', 'confirm'].includes(line.statusKey) : filter === 'billing' ? line.statusKey === 'billing' : filter === 'normal' ? line.statusKey === 'normal' : filter === 'available' ? line.active && line.result === 'passed' : filter === 'failed' ? line.statusKey === 'failed' : filter === 'unknown' ? ['unknown', 'confirm'].includes(line.statusKey) : filter === 'inactive' ? line.statusKey === 'inactive' : true;
    let visible = lines.filter(line => (!query || (line.provider + ' ' + line.model + ' ' + line.line + ' ' + line.status + ' ' + line.alertReason).toLowerCase().includes(query)) && (!provider || line.providerId === provider) && (!model || line.modelId === model) && (!route || line.id === route) && (!businessOnly || line.impact.tasks > 0 || /失败|DDL|耗尽/.test(line.impactMain + line.impactSub)) && (Object.hasOwn(alertReasonLabels, filter) ? line.alertReasons.includes(filter) : matchesStatus(line)));
    const sort = state.modelSort || 'impact';
    const compare = {
      impact: (a, b) => b.businessScore - a.businessScore,
      severity: (a, b) => b.severity - a.severity,
      latency: (a, b) => (b.ratio || -1) - (a.ratio || -1),
      errors: (a, b) => (b.failureRate ?? -1) - (a.failureRate ?? -1),
      balance: (a, b) => (Number.isFinite(a.billing.balanceUsd) ? a.billing.balanceUsd : Infinity) - (Number.isFinite(b.billing.balanceUsd) ? b.billing.balanceUsd : Infinity),
      updated: (a, b) => String(b.checked).localeCompare(String(a.checked))
    }[sort] || ((a, b) => b.businessScore - a.businessScore);
    visible = visible.slice().sort((a, b) => compare(a, b) || a.provider.localeCompare(b.provider, 'zh-CN') || a.id.localeCompare(b.id));
    const uniqueOptions = (key, label) => Array.from(new Map(lines.map(line => [line[key], { id: line[key], name: label(line) }])).values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    const providerOptions = uniqueOptions('providerId', line => line.provider), modelOptions = uniqueOptions('modelId', line => line.model), lineOptions = uniqueOptions('id', line => line.line);
    const chips = [
      ['production', '生产线路', lines.filter(line => line.active).length, 'muted'],
      ['normal', '正常', lines.filter(line => line.statusKey === 'normal').length, 'success'],
      ['severe', '严重异常', lines.filter(line => ['severe', 'failed', 'billing'].includes(line.statusKey)).length, 'danger'],
      ['performance', '性能下降', lines.filter(line => ['performance', 'severe'].includes(line.statusKey)).length, 'warning'],
      ['quality', '质量异常', lines.filter(line => line.statusKey === 'quality').length, 'warning'],
      ['billing', '余额风险', lines.filter(line => line.statusKey === 'billing').length, 'danger']
    ].map(([id, name, count, tone]) => ({ id, name, count, tone, selected: filter === id, select: () => this.setState({ modelFilter: id, modelSelection: '', modelRoute: '', modelDrawerMode: '', modelChartPoint: null }) }));
    const legacySelection = state.modelSelection === 'direct' ? 'official-gpt' : state.modelSelection;
    const selected = lines.find(line => line.id === state.modelRoute || line.id === legacySelection) || lines.find(line => line.providerId === legacySelection || line.modelId === legacySelection) || null;
    lines.forEach(line => { line.selected = selected?.id === line.id; });
    const notify = message => this.setState({ modelRetestMessage: message });
    const openLine = (line, mode = 'diagnostic') => this.setState({ modelSelection: line.id, modelRoute: line.id, modelDrawerMode: mode, modelNoteOpen: false, modelChartPoint: null, modelTestResult: false, modelRetestMessage: '' });
    const noteFor = line => ['【模拟数据 · 仅供界面演示】', '供应商 / 模型：' + line.provider + ' / ' + line.model, '线路：' + line.line, '异常开始：' + line.abnormalStartedAt, '当前指标：' + line.performanceMain + '；' + line.performanceSub + '；错误率 ' + line.failure, '历史基线：P95 TTFT ' + line.baselineValue, '错误：' + line.errors, '业务影响：' + line.impactMain + '；' + line.impactSub, '请供应商确认：是否存在排队、限流、网关拥堵或上游容量变化。'].join('\n\n');
    const copyFollowup = async line => {
      try { if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(noteFor(line)); } catch {}
      notify('已复制供应商跟进信息');
    };
    visible.forEach(line => {
      line.select = event => { event?.stopPropagation?.(); openLine(line); };
      line.primary = event => { event?.stopPropagation?.(); if (line.action === '去充值') openLine(line, 'billing'); else if (/复测|对比测试/.test(line.action)) openLine(line, 'test'); else { openLine(line); if (line.action === '联系供应商') this.setState({ modelNoteOpen: true }); } };
      line.openImpact = event => { event?.stopPropagation?.(); this.setState({ view: 'runs', runsQuery: line.impact.project || line.model, modelSelection: '', modelRoute: '' }); };
      line.copy = event => { event?.stopPropagation?.(); copyFollowup(line); };
      line.markFalsePositive = event => { event?.stopPropagation?.(); notify('已在本地示例中标记为误报，未修改真实告警。'); };
      line.mute = event => { event?.stopPropagation?.(); notify('已在本地示例中静默该告警，未修改生产配置。'); };
    });
    const evidence = selected?.evidence || {}, metric = state.modelChartMetric || 'ttft';
    const metricConfig = {
      ttft: { label: 'P95 TTFT', unit: 's', baseline: selected?.baselineMs ? selected.baselineMs / 1000 : 0, values: (evidence.trend || []).map(point => point.ms / 1000) },
      throughput: { label: 'Tokens/s', unit: '', baseline: selected?.throughput ? selected.throughput / (1 + (selected.throughputDelta || 0) / 100) : 0, values: (evidence.trend || []).map((point, index, list) => selected?.throughput ? selected.throughput * (.96 + index / Math.max(1, list.length - 1) * .04) : 0) },
      total: { label: 'P95 总耗时', unit: 's', baseline: selected?.totalBaselineMs ? selected.totalBaselineMs / 1000 : 0, values: (evidence.trend || []).map(point => selected?.totalBaselineMs && selected?.baselineMs ? point.ms / selected.baselineMs * selected.totalBaselineMs / 1000 : 0) },
      errors: { label: '错误率', unit: '%', baseline: .3, values: (evidence.trend || []).map((point, index, list) => selected?.failureRate != null ? Math.max(.2, selected.failureRate * (.12 + index / Math.max(1, list.length - 1) * .88)) : 0) }
    }[metric];
    const chartValues = metricConfig?.values || [], chartMax = Math.max(1, ...(chartValues || []), metricConfig?.baseline || 0) * 1.08;
    const chartPoints = chartValues.map((value, index) => {
      const x = chartValues.length > 1 ? index / (chartValues.length - 1) * 100 : 50, y = 38 - value / chartMax * 34;
      return { id: index, x, y, value, label: metricConfig.label + ' ' + num(value, metric === 'ttft' || metric === 'total' ? 2 : 1) + metricConfig.unit, title: time((evidence.trend || [])[index]?.at || input.catalogCheckedAt) + ' · ' + metricConfig.label + ' ' + num(value, 2) + metricConfig.unit, style: 'left:' + x.toFixed(2) + '%;top:' + (y / 40 * 100).toFixed(2) + '%', show: () => this.setState({ modelChartPoint: index }), hide: () => this.setState({ modelChartPoint: null }) };
    });
    const pointed = chartPoints.find(point => point.id === state.modelChartPoint);
    const baselineY = 38 - (metricConfig?.baseline || 0) / chartMax * 34;
    const chartPath = chartPoints.map((point, index) => (index ? 'L ' : 'M ') + point.x.toFixed(2) + ' ' + point.y.toFixed(2)).join(' ');
    const diagnosisMetrics = selected ? [
      { label: 'P95 TTFT', value: selected.latencyValue + ' · ' + selected.ratioLabel, tone: selected.ratio >= 2 ? 'danger' : selected.ratio >= 1.5 ? 'warning' : 'normal' },
      { label: 'Tokens/s', value: selected.throughput == null ? '—' : num(selected.throughput) + ' · ' + signed(selected.throughputDelta || 0), tone: (selected.throughputDelta || 0) <= -15 ? 'warning' : 'normal' },
      { label: 'P95 总耗时', value: selected.totalMs == null ? '—' : (selected.totalMs / 1000).toFixed(1) + 's · ' + num(selected.totalRatio || 0) + '×', tone: (selected.totalRatio || 0) >= 2 ? 'warning' : 'normal' },
      { label: '错误率', value: selected.failureRate == null ? '—' : percent(selected.failureRate) + (selected.failureRate > .3 ? ' · +' + num(selected.failureRate - .3) + 'pp' : ''), tone: selected.failureRate >= 5 ? 'danger' : 'normal' }
    ] : [];
    const issueLines = lines.filter(line => !['normal', 'inactive', 'confirm'].includes(line.statusKey));
    const totalCostKnown = lines.filter(line => line.active).every(line => line.usageKnown);
    const groupBy = key => Array.from(new Map(lines.map(line => [line[key], line])).values()).map(line => ({ id: line[key], name: key === 'providerId' ? line.provider : line.model, rows: lines.filter(row => row[key] === line[key]) }));
    const legacyGroups = groupBy(state.modelDimension === 'models' ? 'modelId' : 'providerId').map(group => {
      const calls = group.rows.reduce((sum, line) => sum + (line.calls || 0), 0), failures = group.rows.reduce((sum, line) => sum + (line.failures || 0), 0), cost = group.rows.reduce((sum, line) => sum + (Number(line.raw.usage?.costUsd) || 0), 0), worst = group.rows.slice().sort((a, b) => (b.latencyMs || 0) - (a.latencyMs || 0))[0];
      const usageKnown = group.rows.every(line => line.usageKnown);
      const latencyMetrics = new Set(group.rows.filter(line => line.latencyMs != null).map(line => line.raw.latency?.metric));
      return { ...group, failure: usageKnown && calls ? percent(failures / calls * 100) : usageKnown && calls === 0 ? '0.0%' : '—', cost: usageKnown ? money(cost) : '—', latency: latencyMetrics.size === 1 ? worst?.latencyValue?.replace('s', ' s') || '—' : '—', availability: group.rows.filter(line => line.active && line.result === 'passed').length + ' / ' + group.rows.filter(line => line.active).length + ' 条可用', account: group.rows[0]?.qualityKnown ? group.rows[0].qualityValue : '—', select: () => this.setState({ modelSelection: group.id, modelRoute: '' }) };
    });
    return {
      isDemo, source: isDemo ? 'demo' : 'live', hasMonitoring: this.props.modelMonitoring != null,
      sourceLabel: isDemo ? '示例数据' : '监控数据', updated: input?.catalogCheckedAt ? '最近更新 1 分钟前' : '监控数据未接入',
      sourceToggle: () => this.setState({ modelSource: isDemo ? 'live' : '', modelSelection: '', modelRoute: '', modelDrawerMode: '' }), sourceToggleLabel: isDemo ? '查看接入状态' : '查看示例数据',
      refresh: () => { if (isDemo) this.setState({ modelDemoAt: Date.now(), modelRetestMessage: '示例快照已刷新；未请求真实监控。', modelChartPoint: null }); },
      runDiagnosis: () => { const line = lines.find(item => item.statusKey === 'severe') || lines[0]; if (line) openLine(line, 'test'); },
      chips, lines: visible, allLines: lines, groups: legacyGroups, groupCount: visible.length + ' 条线路', resultCount: visible.length + ' 条线路', hasRows: visible.length > 0,
      providerOptions, modelOptions, lineOptions, query: state.modelQuery || '', provider, model, line: route, filter, businessOnly, sort,
      hasFilters: !!(query || provider || model || route || businessOnly || filter !== 'production' || sort !== 'impact'),
      onQuery: event => this.setState({ modelQuery: event.target.value, modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      onProvider: event => this.setState({ modelProvider: event.target.value, modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      onModel: event => this.setState({ modelModel: event.target.value, modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      onLine: event => this.setState({ modelLine: event.target.value, modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      onFilter: event => this.setState({ modelFilter: event.target.value, modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      onBusiness: event => this.setState({ modelBusinessOnly: !!event.target.checked, modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      onSort: event => this.setState({ modelSort: event.target.value }),
      reset: () => this.setState({ modelQuery: '', modelProvider: '', modelModel: '', modelLine: '', modelFilter: 'production', modelBusinessOnly: false, modelSort: 'impact', modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      anomalySummary: isDemo ? '4 条线路存在异常 · 5 个待处理问题' : issueLines.length + ' 条线路存在异常 · ' + issueLines.length + ' 个待处理问题',
      urgentText: '云桥 / Claude Sonnet 4.5 的 P95 TTFT 升至基线 3.5×；Anthropic 账户预计 6 小时后耗尽。',
      issueCount: isDemo ? 5 : issueLines.length,
      showIssues: () => this.setState({ modelFilter: 'attention', modelSelection: '', modelRoute: '', modelDrawerMode: '' }),
      totalCost: totalCostKnown && lines.length ? money(lines.filter(line => line.active).reduce((sum, line) => sum + (line.raw.usage?.costUsd || 0), 0)) : '—',
      hasSelection: !!selected, drawerOpen: !!selected, drawerDiagnostic: !!selected && (state.modelDrawerMode || 'diagnostic') === 'diagnostic', drawerTest: !!selected && state.modelDrawerMode === 'test', drawerBilling: !!selected && state.modelDrawerMode === 'billing',
      selected: selected || {}, selectedRoute: selected?.id || '', selectedGroup: selected ? selected.provider + ' / ' + selected.model : '',
      billingThreshold: Number.isFinite(selected?.billing?.alertThresholdUsd) ? money(selected.billing.alertThresholdUsd) : '—',
      backupLabel: selected?.billing?.hasBackup ? '已配置' : '未配置',
      closeDrawer: () => this.setState({ modelSelection: '', modelRoute: '', modelDrawerMode: '', modelNoteOpen: false, modelChartPoint: null, modelTestResult: false }),
      diagnosisMetrics, reason: selected?.reason || '', explanation: selected?.explanation || '', errors: selected?.errors || '', qualityTests: selected?.tests || '',
      metricTabs: [['ttft', 'P95 TTFT'], ['throughput', 'Tokens/s'], ['total', 'P95 总耗时'], ['errors', '错误率']].map(([id, label]) => ({ id, label, selected: metric === id, select: () => this.setState({ modelChartMetric: id, modelChartPoint: null }) })),
      trendTitle: metricConfig?.label + ' 趋势', chartPath, chartPoints, hasTrend: chartPoints.length > 0, baselineStyle: 'top:' + (baselineY / 40 * 100).toFixed(2) + '%', chartBaseline: '基线 ' + num(metricConfig?.baseline || 0, 2) + (metricConfig?.unit || ''), chartReadout: pointed?.title || '最近 1 小时 · 每 5 分钟 · 基线为过去 7 天同类请求中位数',
      note: selected ? noteFor(selected) : '', noteOpen: !!state.modelNoteOpen,
      contact: () => this.setState({ modelNoteOpen: true, modelRetestMessage: '已生成供应商跟进信息，未自动发送。' }),
      drawerPrimary: () => {
        if (!selected) return;
        if (selected.action === '去充值') openLine(selected, 'billing');
        else if (/复测|对比测试/.test(selected.action)) openLine(selected, 'test');
        else if (selected.action === '联系供应商') this.setState({ modelNoteOpen: true, modelRetestMessage: '已生成供应商跟进信息，未自动发送。' });
        else notify('已打开当前线路的完整诊断信息。');
      },
      copyFollowup: () => selected && copyFollowup(selected),
      switchRoute: () => notify('已模拟切换到备用线路；未修改生产路由。'),
      openRetest: () => this.setState({ modelDrawerMode: 'test', modelTestResult: false, modelNoteOpen: false }),
      runComparison: () => this.setState({ modelTestResult: true, modelRetestMessage: '模拟对比测试已完成；未发起真实调用，未扣费。', modelDemoAt: Date.now() }),
      testResult: !!state.modelTestResult,
      closeBilling: () => this.setState({ modelDrawerMode: 'diagnostic' }),
      dismissMessage: () => this.setState({ modelRetestMessage: '' }), message: state.modelRetestMessage || '',
      tabs: [['providers', '供应商'], ['models', '模型评估']].map(([id, label]) => ({ id, label, selected: state.modelDimension === id, select: () => this.setState({ modelDimension: id }) })),
      providersView: state.modelDimension !== 'models', modelsView: state.modelDimension === 'models', accountTitle: state.modelDimension === 'models' ? '固定集得分' : '账户余额'
    };
  }
  // model-status-dashboard:end
