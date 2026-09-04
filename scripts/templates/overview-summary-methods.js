  // overview-summary-methods:start
  overviewDeliveryIdentity(sheet) {
    const name = String(sheet.customer || '').trim() || '未设置供应商';
    const initial = Array.from(String(sheet.customer || '').trim())[0]?.toUpperCase() || '供';
    const logoUrl = typeof sheet.logo?.url === 'string' ? sheet.logo.url.trim() : '';
    const hasLogo = !!logoUrl && this.state.overviewLogoFailures?.[sheet.key] !== logoUrl;
    return {
      name, initial, logoUrl, hasLogo, noLogo: !hasLogo,
      onError: () => {
        // A late image error must not hide a replacement Logo on the same sheet.
        if (!logoUrl || this.deliverySheet(sheet.key)?.logo?.url?.trim() !== logoUrl) return;
        this.setState({ overviewLogoFailures: Object.assign({}, this.state.overviewLogoFailures, { [sheet.key]: logoUrl }) });
      }
    };
  }
  overviewSummary(runs, sheets) {
    const fullQueue = this.pendingQueue();
    const mine = fullQueue.filter(q => this.assignmentOf(String(q.id), this.roundsOf(q.id)).mine);
    const others = fullQueue.length - mine.length;
    // Name the actual review Items, not a mixture of delivery sheets and dataset groups.
    const reviewTitles = mine.slice(0, 2).map(q => {
      const title = String(q.meta?.[4] || '').trim();
      return title ? this.itemTitle(title) : 'Item ' + String(q.id).slice(0, 8);
    });
    const reviewPreview = reviewTitles.join('、') + (mine.length > 2 ? '等' : '');
    const running = runs.filter(run => run.running > 0);
    const runningItems = running.reduce((sum, run) => sum + run.running, 0);
    const gaps = sheets.filter(sheet => sheet.passed < sheet.target);
    // Calendar-day billing uses occurrence timestamps, never Run ages.
    const billing = this.billingYesterday();
    // Overview and detail use the same evidence-aware, per-model aggregation.
    const { input: modelInput, isDemo } = this.modelStatusSource();
    const model = this.modelStatusSnapshot(modelInput);
    const demo = isDemo ? this.modelStatusDashboard(modelInput, model, true) : null;
    // Use all lines: detail-page filters must not change the overview totals.
    const slowest = demo?.allLines.filter(line => line.active && line.ratio != null).sort((a, b) => b.ratio - a.ratio)[0];
    const modelDetail = demo ? demo.issueCount + ' 个待处理问题' + (slowest ? ' · 最高延迟 ' + slowest.ratioLabel : '') : model.detail;
    const assignmentDetail = '指派给你 ' + mine.length + ' 项 · 另有 ' + others + ' 项在别人名下';
    return [
      { k: '待审核', v: mine.length, unit: '项', fg: 'var(--forge-text)',
        note: reviewPreview || '暂无指派给你的待审内容',
        description: '等待你审核的内容（Item）数量，同一 Item 只计一次。' + assignmentDetail + '。卡片列出前两项内容，点击查看完整待审列表。',
        actionable: true, actionLabel: '查看指派给我的待审核内容', go: () => this.openReview('all', { reviewOwner: 'mine' }) },
      { k: '运行中', v: running.length, unit: '个任务', fg: 'var(--forge-text)',
        note: running.length ? '正在处理 ' + runningItems + ' 项内容' : '暂无运行中的任务',
        description: '正在生成或修复内容的运行任务（Run）数量。一个任务可以处理多项内容；当前 ' + running.length + ' 个任务正在处理 ' + runningItems + ' 项内容，不含排队和待审核内容。',
        actionable: true, actionLabel: '查看运行记录', go: () => this.setState({ view: 'runs' }) },
      { k: '交付缺口', v: gaps.reduce((sum, sheet) => sum + sheet.target - sheet.passed, 0), unit: '项', fg: gaps.length ? '#8a5a16' : 'var(--forge-text)',
        note: gaps.length ? gaps.length + ' 张数据单待补齐' : (sheets.length ? '交付数量已满足目标' : '暂无交付数据单'),
        description: '各数据单还需补齐的可交付数量之和，按“目标数量 − 当前可交付数量”计算，每单最低为 0。生产中或待审核内容尚不计入可交付；数量缺口不代表质量不合格或交付逾期。',
        actionable: true, actionLabel: '查看交付数据单与数量缺口', go: () => this.setState({ view: 'delivery' }) },
      { k: '昨日成本', v: billing.value, unit: '', fg: 'var(--forge-text)',
        note: billing.note, description: billing.description,
        actionable: true, actionLabel: '查看昨日成本与用量分析', go: () => this.openBilling() },
      { k: '模型状态', v: model.rate, unit: model.hasRate ? '% 当前可用' : '', fg: 'var(--forge-text)',
        note: (isDemo ? '示例数据 · ' : '') + model.note, detail: modelDetail, checked: model.checked,
        description: (isDemo ? '当前为模型页的同一份示例快照，非真实监测结果。' : '') + '当前可用模型占比 = 已确认可用的模型数 ÷ 生产启用的模型总数，按模型去重，保留 1 位小数。至少一条生产可路由且协议匹配的线路在 ' + model.freshnessLabel + ' 内通过生成验证，模型才计为可用。清单不完整、检测过期或存在未知模型时不显示百分比。100% 可用也可能有线路需处理；延迟、质量和账户状态单独衡量。',
        actionable: true, actionLabel: '查看模型状态与线路问题', go: () => this.openModelStatus() }
    ];
  }
  // overview-summary-methods:end
