  // overview-summary-methods:start
  overviewDeliveryIdentity(sheet) {
    const name = String(sheet.customer || '').trim() || '未设置供应商';
    const initial = Array.from(String(sheet.customer || '').trim())[0]?.toUpperCase() || '供';
    const logoUrl = typeof sheet.logo?.url === 'string' ? sheet.logo.url.trim() : '';
    const hasLogo = !!logoUrl && this.state.overviewLogoFailures?.[sheet.key] !== logoUrl;
    return {
      name, initial, logoUrl, hasLogo, noLogo: !hasLogo,
      onError: () => {
        if (!logoUrl || this.deliverySheet(sheet.key)?.logo?.url?.trim() !== logoUrl) return;
        this.setState({ overviewLogoFailures: Object.assign({}, this.state.overviewLogoFailures, { [sheet.key]: logoUrl }) });
      }
    };
  }
  overviewFinalDeliveryCount(sheet) {
    const entries = this.deliveryEntries?.(sheet) || [];
    if (!entries.length) return Math.max(0, Number(sheet?.passed) || 0);
    const linkedIds = new Set(entries.map(entry => String(this.deliveryEntryId(entry))));
    const finalIds = new Set();
    for (const row of this.sheetRows(sheet)) {
      const id = String(row?.[2] || '');
      if (id && linkedIds.has(id) && row?.[3] === 'passed') finalIds.add(id);
    }
    return finalIds.size;
  }
  supplierPerformanceValues() {
    const mocked = !this.props.fellowSupplierRisk;
    const source = this.props.fellowSupplierRisk || {
      status: 'ready', complete: true, suppliers: [
        { id: 'mock-weixiang', name: '维象制作', atRisk: true, finalRiskState: 'high', primaryReason: '关键交付节点延期', deadlineAt: '2026-09-10', passRate: 96.2 },
        { id: 'mock-lingxi', name: '灵犀三维', atRisk: true, finalRiskState: 'medium', primaryReason: '临近交付日期', deadlineAt: '2026-09-12', passRate: 92.4 },
        { id: 'mock-guanlan', name: '观澜质检', atRisk: true, finalRiskState: 'low', primaryReason: '质量复核待完成', deadlineAt: '2026-09-18', passRate: 87.8 }
      ], yesterdayPassRate: 92.4, previousDayPassRate: 90.3
    };
    const unavailable = message => ({ connected: false, ready: false, metric: '待接入', rows: [], message,
      canOpenAll: true, openAll: () => this.openOutsourcingSuppliers() });
    if (source.status !== 'ready' || source.complete !== true || !Array.isArray(source.suppliers)) {
      return unavailable(source.status === 'loading' ? '外部专家风险数据读取中' : '外部专家风险数据不可用');
    }
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    const labels = { critical: '严重风险', high: '高风险', medium: '中风险', low: '低风险' };
    const validRate = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
    const rows = source.suppliers.filter(supplier => supplier && supplier.atRisk === true && rank[supplier.finalRiskState])
      .map(supplier => {
        const rawScore = validRate(supplier.passRate) ? Number(supplier.passRate) : validRate(supplier.qualityPassRate) ? Number(supplier.qualityPassRate) : null;
        return {
          id: String(supplier.id || ''), name: String(supplier.name || '').trim(), score: rawScore == null ? null : Math.round(rawScore * 10) / 10,
          level: String(supplier.riskLevel || labels[supplier.finalRiskState]), reason: String(supplier.primaryReason || '').trim(),
          rank: rank[supplier.finalRiskState], deadline: Number.isFinite(Date.parse(supplier.deadlineAt)) ? Date.parse(supplier.deadlineAt) : Infinity,
          canOpen: true,
          open: () => this.openOutsourcingSuppliers('performance', String(supplier.id || ''))
        };
      }).filter(row => row.id && row.name && row.reason)
      .sort((a, b) => b.rank - a.rank || a.deadline - b.deadline || a.name.localeCompare(b.name));
    const hasPassRate = validRate(source.yesterdayPassRate);
    const passRate = hasPassRate ? Math.round(Number(source.yesterdayPassRate) * 10) / 10 : '—';
    const hasPreviousRate = validRate(source.previousDayPassRate);
    const passRateDelta = hasPassRate && hasPreviousRate
      ? (() => { const delta = Math.round((Number(source.yesterdayPassRate) - Number(source.previousDayPassRate)) * 10) / 10; return delta === 0 ? '与前日持平' : '较前日 ' + (delta > 0 ? '+' : '−') + Math.abs(delta).toFixed(1) + 'pp'; })()
      : '';
    return { connected: !mocked, mocked, ready: true, metric: rows.length, rows: rows.slice(0, 5), hasPassRate, passRate, passRateDelta, message: rows.length ? '' : '当前没有存在履约风险的外部专家团队',
      canOpenAll: true,
      openAll: () => this.openOutsourcingSuppliers() };
  }
  overviewSummary(runs, sheets) {
    const mine = [...new Map(this.pendingQueue()
      .filter(item => this.assignmentOf(String(item.id), this.roundsOf(item.id)).mine)
      .map(item => [String(item.id), item])).values()];
    const running = [...new Map(runs.filter(run => run.status === 'running' && (run.id || run.runId)).map(run => [String(run.id || run.runId), run])).values()];
    const gaps = sheets.map(sheet => Math.max((Number(sheet.target) || 0) - this.overviewFinalDeliveryCount(sheet), 0));
    const shortage = gaps.reduce((sum, gap) => sum + gap, 0);
    return [
      { k: '待审核', v: mine.length, unit: '项', fg: 'var(--forge-text)',
        cardLabel: '待审核，待我审核 ' + mine.length + ' 项',
        description: '当前用户负责且尚未完成的审核 Item 数量，按 Item ID 去重。',
        actionable: true, actionLabel: '进入审核队列，筛选待我审核', go: () => this.openReview('all', { reviewOwner: 'mine', reviewPhase: 'pending' }) },
      { k: '运行中', v: running.length, unit: '个任务', fg: 'var(--forge-text)',
        cardLabel: '运行中，运行中 ' + running.length + ' 个任务',
        description: '状态为运行中的 Run 任务数量，按 Run ID 去重，不统计运行中的 Item 数。',
        actionable: true, actionLabel: '进入运行记录，筛选运行中', go: () => this.setState({ view: 'runs', runsFilter: '运行中' }) },
      { k: '交付缺口', v: shortage, unit: '项', fg: shortage ? '#8a5a16' : 'var(--forge-text)',
        cardLabel: '交付缺口，距离目标还差 ' + shortage + ' 项',
        description: '所有未达标数据单的目标数量减最终有效交付量之和。最终有效交付须已通过审核并关联数据单，按交付 Item ID 去重；每张数据单最低为 0。',
        actionable: true, actionLabel: '进入交付数据单，筛选未达标', go: () => this.setState({ view: 'delivery', delStatus: 'unmet' }) }
    ];
  }
  overviewSignalValues() {
    const billing = this.billingYesterday();
    const billingSource = this.billingSource();
    const range = this.billingPreset('yesterday'), start = this.billingStamp(range.start);
    const buckets = Array.from({ length: 12 }, (_, index) => this.billingSum((billingSource.events || []).filter(row => row.occurredAt >= start + index * 7200000 && row.occurredAt < start + (index + 1) * 7200000)).cost / 1000000);
    const sparkline = values => {
      const safe = values.map(value => Number.isFinite(Number(value)) ? Number(value) : 0), max = Math.max(...safe), min = Math.min(...safe), spread = max - min;
      const points = safe.map((value, index) => {
        const x = safe.length > 1 ? index * 100 / (safe.length - 1) : 50;
        const y = spread ? 43 - (value - min) / spread * 36 : 24;
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      return { points, area: '0,48 ' + points + ' 100,48' };
    };
    const costTrend = sparkline(buckets);
    const modelMocked = this.props.modelMonitoring == null;
    const modelInput = modelMocked ? this.modelDemoInput() : this.props.modelMonitoring;
    const model = this.modelStatusSnapshot(modelInput);
    const modelTotal = Math.max(0, Number(model.total) || 0), width = value => 'width:' + (modelTotal ? Math.max(0, Number(value) || 0) * 100 / modelTotal : 0).toFixed(1) + '%';
    const supplier = this.supplierPerformanceValues();
    const expertTones = ['one', 'two', 'three', 'four'];
    const experts = supplier.rows.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name)).slice(0, 4).map((row, index) => ({
      name: row.name, value: row.score == null ? '—' : row.score.toFixed(1) + '%', style: 'width:' + (row.score == null ? 0 : row.score) + '%', tone: expertTones[index]
    }));
    const errorLabels = { timeout: '调用超时', model_not_found: '模型未找到', no_available_channel: '无可用通道', rate_limited: '请求限流', key_unavailable: 'Key 不可用', authentication_failed: '鉴权失败', insufficient_balance: '余额不足', arrears: '账户欠费', quota_exhausted: '额度耗尽', downstream_error: '下游服务错误', upstream_error: '上游服务错误' };
    let totalCalls = 0, totalFailures = 0;
    const groups = new Map();
    if (modelInput && modelInput.status === 'ready' && Array.isArray(modelInput.routes)) modelInput.routes.forEach(route => {
      if (!route || route.enabled !== true || route.routable !== true) return;
      const usage = route.usage?.windows?.['24h'] || route.usage || {}, calls = Number(usage.calls), failures = Number(usage.failures);
      if (!Number.isSafeInteger(calls) || calls < 0 || !Number.isSafeInteger(failures) || failures < 0 || failures > calls) return;
      totalCalls += calls; totalFailures += failures;
      if (!failures) return;
      const label = errorLabels[route.errorCode] || '未分类错误';
      groups.set(label, (groups.get(label) || 0) + failures);
    });
    const errorTones = ['one', 'two', 'three', 'four'];
    const errors = [...groups].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 4).map((row, index) => {
      const percent = totalFailures ? row.count * 100 / totalFailures : 0;
      return { ...row, value: percent.toFixed(1) + '%', style: 'width:' + percent.toFixed(1) + '%', tone: errorTones[index] };
    });
    const errorRate = totalCalls ? totalFailures * 100 / totalCalls : 0;
    const deltaTone = value => String(value || '').includes('+') ? 'danger' : String(value || '').includes('−') || String(value || '').includes('-') ? 'success' : 'neutral';
    const expertTone = String(supplier.passRateDelta || '').includes('+') ? 'success' : String(supplier.passRateDelta || '').includes('−') || String(supplier.passRateDelta || '').includes('-') ? 'danger' : 'neutral';
    return {
      demo: billingSource.demo === true || modelMocked || supplier.mocked === true,
      cost: { value: billing.value, delta: billing.delta, tone: deltaTone(billing.delta), caption: billing.note, description: billing.description, cardLabel: '昨日成本 ' + billing.value + (billing.delta ? '，' + billing.delta : ''), points: costTrend.points, area: costTrend.area, go: () => this.openBilling() },
      model: { value: model.hasRate ? model.rate : '—', unit: model.hasRate ? '%' : '', note: model.note, tone: !model.hasRate ? 'neutral' : model.unavailable > 0 ? 'danger' : 'success', caption: modelMocked ? '近 5 分钟 · 演示检测' : '近 5 分钟 · 生产检测', description: '当前确认可用的生产模型数除以当前启用的生产模型总数；未知或过期状态单独列出，不计为可用。' + (modelMocked ? ' 当前为演示数据。' : ''), cardLabel: model.hasRate ? '模型状态，可用率 ' + model.rate + '%，' + model.note : '模型状态，待检测', availableStyle: width(model.available), unavailableStyle: width(model.unavailable), unknownStyle: width(model.unknown), rows: [{ label: '可用', value: model.available, tone: 'success' }, { label: '不可用', value: model.unavailable, tone: 'danger' }, { label: '待确认', value: model.unknown, tone: 'muted' }], go: () => { this.openModelStatus(); this.setState({ modelSource: modelMocked ? '' : 'live', modelDimension: 'providers' }); } },
      experts: { value: supplier.hasPassRate ? supplier.passRate : '—', unit: supplier.hasPassRate ? '%' : '', delta: supplier.hasPassRate ? supplier.passRateDelta : supplier.message, tone: expertTone, caption: '昨日已完成审核批次', description: supplier.hasPassRate ? '昨日通过的外部专家交付批次占昨日已完成审核的外部专家交付批次比例。' + (supplier.mocked ? ' 当前为演示数据。' : '') : '外部专家昨日通过率尚未接入。', cardLabel: supplier.hasPassRate ? '外部专家表现，昨日通过率 ' + supplier.passRate + '%' + (supplier.passRateDelta ? '，' + supplier.passRateDelta : '') : '外部专家表现，昨日通过率待接入', rows: experts, go: supplier.openAll },
      errors: { value: totalFailures.toLocaleString('zh-CN'), rate: totalCalls ? errorRate.toFixed(2) + '% 的请求' : '调用统计待接入', tone: totalFailures ? 'danger' : 'success', caption: modelMocked ? '近 24 小时 · 演示数据' : '近 24 小时 · 生产线路', description: '按近 24 小时生产线路的失败调用归类；缺少标准错误码的失败计入“未分类错误”。', cardLabel: '错误类型，近 24 小时共 ' + totalFailures + ' 次错误', rows: errors, empty: errors.length === 0, go: () => { this.openModelStatus(); this.setState({ modelSource: modelMocked ? '' : 'live', modelPageTab: 'lines', modelSort: 'errors' }); } }
    };
  }
  // overview-summary-methods:end
