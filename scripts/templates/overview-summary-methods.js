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
    const auxiliary = (text, lowerIsBetter = false) => {
      const value = String(text || '');
      const match = value.match(/^(.*?)([+−-]\d+(?:\.\d+)?(?:%|pp))$/);
      if (!match) return { auxiliary: value, auxiliaryLabel: value, auxiliaryValue: '', auxiliaryTone: 'neutral' };
      const increased = match[2].startsWith('+');
      return {
        auxiliary: value,
        auxiliaryLabel: match[1].trim(),
        auxiliaryValue: match[2],
        auxiliaryTone: increased === lowerIsBetter ? 'danger' : 'success'
      };
    };
    const mine = [...new Map(this.pendingQueue()
      .filter(item => this.assignmentOf(String(item.id), this.roundsOf(item.id)).mine)
      .map(item => [String(item.id), item])).values()];
    const running = [...new Map(runs.filter(run => run.status === 'running' && (run.id || run.runId)).map(run => [String(run.id || run.runId), run])).values()];
    const gaps = sheets.map(sheet => Math.max((Number(sheet.target) || 0) - this.overviewFinalDeliveryCount(sheet), 0));
    const shortage = gaps.reduce((sum, gap) => sum + gap, 0);
    const billing = this.billingYesterday();
    const modelMocked = this.props.modelMonitoring == null;
    const model = this.modelStatusSnapshot(modelMocked ? this.modelDemoInput() : this.props.modelMonitoring);
    const supplier = this.supplierPerformanceValues();
    return [
      { k: '内部待审核', v: mine.length, unit: '项', fg: 'var(--forge-text)', ...auxiliary(''),
        cardLabel: '待审核，待我审核 ' + mine.length + ' 项',
        description: '当前用户负责且尚未完成的审核 Item 数量，按 Item ID 去重。',
        actionable: true, actionLabel: '进入审核队列，筛选待我审核', go: () => { this.openReview('all', { reviewOwner: 'mine', reviewPhase: 'pending' }); this.setState({reviewAudience:'internal'}); } },
      { k: '质检通过率', v: supplier.hasPassRate ? supplier.passRate : '—', unit: supplier.hasPassRate ? '%' : '', fg: 'var(--forge-text)', ...auxiliary(supplier.hasPassRate ? supplier.passRateDelta : (supplier.ready ? '通过率待接入' : supplier.message)),
        cardLabel: supplier.hasPassRate ? '质检通过率，昨日通过率 ' + supplier.passRate + '%' + (supplier.passRateDelta ? '，' + supplier.passRateDelta : '') : '质检通过率，昨日通过率待接入',
        description: supplier.hasPassRate ? '昨日通过的外部专家交付批次占昨日已完成审核的外部专家交付批次比例。' + (supplier.mocked ? ' 当前为演示数据。' : '') : '外部专家昨日通过率尚未接入。',
        actionable: true, actionLabel: '查看质检通过率', go: supplier.openAll },
      { k: '运行中', v: running.length, unit: '个任务', fg: 'var(--forge-text)', ...auxiliary(''),
        cardLabel: '运行中，运行中 ' + running.length + ' 个任务',
        description: '状态为运行中的 Run 任务数量，按 Run ID 去重，不统计运行中的 Item 数。',
        actionable: true, actionLabel: '进入运行记录，筛选运行中', go: () => this.setState({ view: 'runs', runsFilter: '运行中' }) },
      { k: '交付缺口', v: shortage, unit: '项', fg: shortage ? '#8a5a16' : 'var(--forge-text)', ...auxiliary(''),
        cardLabel: '交付缺口，距离目标还差 ' + shortage + ' 项',
        description: '所有未达标数据单的目标数量减最终有效交付量之和。最终有效交付须已通过审核并关联数据单，按交付 Item ID 去重；每张数据单最低为 0。',
        actionable: true, actionLabel: '进入交付数据单，筛选未达标', go: () => this.setState({ view: 'delivery', delStatus: 'unmet' }) },
      { k: '昨日成本', v: billing.value, unit: '', fg: 'var(--forge-text)', ...auxiliary(billing.delta || '', true),
        cardLabel: '昨日成本 ' + billing.value + (billing.delta ? '，' + billing.delta : ''),
        description: billing.description,
        actionable: true, actionLabel: '进入成本分析，时间范围为昨日', go: () => this.openBilling() },
      { k: '模型状态', v: model.hasRate ? model.rate : '—', unit: model.hasRate ? '%' : '', fg: 'var(--forge-text)', ...auxiliary(model.hasRate ? model.note : '待检测'),
        cardLabel: model.hasRate ? '模型状态，可用模型 ' + model.rate + '%，' + model.note : '模型状态，待检测',
        description: '当前确认可用的生产模型数除以当前启用的生产模型总数。清单不完整、检测过期或健康状态未知时不显示百分比。' + (modelMocked ? ' 当前为演示数据。' : ''),
        actionable: true, actionLabel: '进入模型供应商表现与错误原因分析', go: () => { this.openModelStatus(); this.setState({ modelSource: modelMocked ? '' : 'live', modelDimension: 'providers' }); } },

    ];
  }
  overviewMetricGroups(runs, sheets) {
    const metrics = this.overviewSummary(runs, sheets).map(metric => {
      const displayValue = Number.isInteger(metric.v) ? metric.v.toLocaleString('en-US') : metric.v;
      return { ...metric, displayValue, longValue: String(displayValue).length > (typeof metric.v === 'number' ? 6 : 10) };
    });
    return [
      { label: '待处理', priority: 'primary', metrics: [metrics[0], metrics[3]] },
      { label: '生产情况', priority: 'secondary', metrics: [metrics[1], metrics[2]] },
      { label: '辅助信息', priority: 'tertiary', metrics: [metrics[4], metrics[5]] }
    ];
  }

  overviewDeliveryProgress(sheet) {
    const target = Math.max(0, Number(sheet.target) || 0);
    const delivered = Math.max(0, Number(sheet.passed) || 0);
    const remaining = Math.max(0, target - delivered);
    const percentage = target > 0 ? Math.min(100, Math.round(delivered / target * 100)) : 0;
    return { target, delivered, remaining, percentage,
      targetLabel: target.toLocaleString('en-US'), deliveredLabel: delivered.toLocaleString('en-US'),
      remainingLabel: remaining.toLocaleString('en-US'), percentageLabel: target > 0 ? percentage + '%' : '—',
      label: '可交付 ' + delivered + ' / 目标 ' + target + (target > 0 ? '，' + percentage + '%' : '，未设置目标') };
  }
  // overview-summary-methods:end
