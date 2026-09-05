  // model-status-methods:start
  openModelStatus() {
    this.setState({ view: 'models', modelPageTab: 'overview', modelOverviewWindow: '1h', modelQuery: '', modelProvider: '', modelModel: '', modelLine: '', modelFilter: 'production', modelBusinessOnly: false, modelSort: 'impact', modelTimeRange: 'all', modelTimeStart: '', modelTimeEnd: '', modelSelection: '', modelRoute: '', modelDrawerMode: '', modelChartMetric: 'ttft', modelTestResult: false, modelRiskDismissed: false });
    setTimeout(() => { if (this.state.view === 'models' && typeof document !== 'undefined') document.getElementById('forge-model-title')?.focus(); }, 0);
  }
  mountModelStatusClock() {
    if (this._modelStatusClock != null || typeof setInterval !== 'function') return;
    // Freshness expires without a click. This clock never makes a network request.
    this._modelStatusClock = setInterval(() => {
      if (['overview', 'models'].includes(this.state.view) && this.props.modelMonitoring) this.setState({ modelClock: Date.now() });
    }, 15000);
  }
  unmountModelStatusClock() {
    if (this._modelStatusClock != null && typeof clearInterval === 'function') clearInterval(this._modelStatusClock);
    this._modelStatusClock = null;
  }
  modelEvidenceClock(input) {
    const now = Date.now();
    const freshness = Number.isFinite(input?.freshnessMs) && input.freshnessMs >= 1000 && input.freshnessMs <= 86400000 ? input.freshnessMs : 300000;
    const stamp = value => {
      const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
      return Number.isFinite(parsed) && Number.isFinite(new Date(parsed).getTime()) ? parsed : NaN;
    };
    const timeState = value => value == null || value === '' ? 'missing' : !Number.isFinite(stamp(value)) || stamp(value) > now ? 'invalid' : now - stamp(value) > freshness ? 'expired' : 'fresh';
    return { now, freshness, stamp, timeState, fresh: value => timeState(value) === 'fresh' };
  }
  modelStatusSnapshot(input = this.props.modelMonitoring) {
    const empty = (kind, note) => ({ kind, rate: '—', hasRate: false, note, detail: '', checked: '', rows: [], providers: [], total: 0, available: 0, unavailable: 0, unknown: 0, attention: 0, issue: note, freshnessLabel: '5 分钟' });
    if (!input || typeof input !== 'object' || Array.isArray(input)) return empty('disconnected', '可用性检测待接入');
    if (input.status === 'loading') return empty('loading', '正在读取检测结果');
    if (input.status === 'error') return empty('error', '检测数据读取失败');
    if (input.status !== 'ready') return empty('error', '检测数据状态待校验');
    const { now, freshness, stamp, timeState, fresh } = this.modelEvidenceClock(input);
    const time = value => timeState(value) === 'missing' ? '未检测' : timeState(value) === 'invalid' ? '时间待校验' : new Date(stamp(value)).toLocaleString('zh-CN', { hour12: false });
    const timeLabel = (value, missing) => timeState(value) === 'missing' ? missing : timeState(value) === 'invalid' ? '时间待校验' : '检测已过期';
    const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : fallback;
    let valid = true;
    const records = value => {
      if (!Array.isArray(value)) { valid = false; return []; }
      const unique = new Map();
      value.forEach(row => {
        if (!row || typeof row !== 'object' || Array.isArray(row) || !text(row.id)) { valid = false; return; }
        const key = row.id.trim();
        const previous = unique.get(key);
        if (previous && JSON.stringify(previous) !== JSON.stringify(row)) {
          valid = false;
          // Quarantine all evidence, not whichever conflicting record arrived first.
          unique.set(key, { id: key, evidenceConflict: true });
        } else if (!previous) unique.set(key, row);
      });
      return Array.from(unique.values());
    };
    const modelList = records(input.models), providers = records(input.providers), routes = records(input.routes);
    const modelMap = new Map(modelList.map(row => [row.id.trim(), row]));
    const providerMap = new Map(providers.map(row => [row.id.trim(), row]));
    modelList.forEach(row => { if (typeof row.enabled !== 'boolean' || (row.enabled && !text(row.requiredProtocol))) valid = false; });
    routes.forEach(row => {
      if (!modelMap.has(text(row.modelId)) || !providerMap.has(text(row.providerId)) || !text(row.protocol) || typeof row.enabled !== 'boolean' || typeof row.routable !== 'boolean') valid = false;
    });
    const models = modelList.filter(row => row.enabled === true || row.evidenceConflict);
    const catalogFresh = fresh(input.catalogCheckedAt);
    const complete = input.catalogComplete === true && valid && catalogFresh;
    const protocolNames = { 'anthropic-messages': 'Anthropic Messages', 'openai-chat': 'OpenAI Chat Completions', 'openai-responses': 'OpenAI Responses', 'gemini-content': 'Gemini GenerateContent' };
    const failures = { model_not_found: '无可用通道', no_available_channel: '无可用通道', timeout: '调用超时', insufficient_balance: '余额不足', arrears: '账户欠费', quota_exhausted: '额度耗尽', rate_limited: '请求限流', authentication_failed: '鉴权失败', key_unavailable: 'Key 暂时不可用', account_shortage: '供应商账号紧缺', downstream_error: '下游供应商报错', upstream_error: '下游供应商报错' };
    const billingNames = { ok: '正常', balance_low: '余额偏低', arrears: '账户欠费', quota_exhausted: '额度耗尽' };
    const billingErrors = { insufficient_balance: '余额不足', arrears: '账户欠费', quota_exhausted: '额度耗尽' };
    const positive = value => Number.isFinite(value) && value > 0;
    const samples = (value, min) => Number.isSafeInteger(value) && value >= min;
    const eligible = (route, model) => !route.evidenceConflict && !model?.evidenceConflict && model?.enabled === true && route.enabled === true && route.routable === true && text(route.protocol) === text(model.requiredProtocol) && !!text(model.requiredProtocol) && providerMap.has(text(route.providerId)) && !providerMap.get(text(route.providerId)).evidenceConflict;
    const routeResult = route => fresh(route.checkedAt) && ['passed', 'failed'].includes(route.outcome) ? route.outcome : 'unknown';
    const rows = routes.map(route => {
      const model = modelMap.get(text(route.modelId)), provider = providerMap.get(text(route.providerId));
      const uncertain = !!(route.evidenceConflict || model?.evidenceConflict || provider?.evidenceConflict || !model || !provider || typeof route.enabled !== 'boolean' || typeof route.routable !== 'boolean' || !text(route.protocol) || typeof model.enabled !== 'boolean' || model.enabled && !text(model.requiredProtocol));
      const active = !uncertain && eligible(route, model), result = uncertain ? 'unknown' : routeResult(route);
      const availability = uncertain ? '状态未知' : active ? result === 'passed' ? '可用' : result === 'failed' ? '不可用' : '状态未知' : '未纳入生产';
      const failure = Object.hasOwn(failures, route.errorCode) ? failures[route.errorCode] : '生成验证失败';
      const unknownReason = timeState(route.checkedAt) === 'invalid' ? '生成验证时间待校验，请检查时间戳与客户端时钟后重新检测。' : timeState(route.checkedAt) === 'expired' ? '生成验证已过期，请重新检测。' : '生成验证结果未知，请补充近期检测结果。';
      const reason = uncertain ? '目录记录冲突或不完整，线路状态待确认。请校验目录后重新检测。' : !active ? route.enabled !== true ? '线路未启用，不计入模型可用性。' : model?.enabled !== true ? '模型未启用，不计入模型可用性。' : route.routable !== true ? '生产不会路由到此线路，不计入模型可用性。' : '协议不匹配，不计入模型可用性。' : result === 'failed' ? failure : result === 'unknown' ? unknownReason : '近期生成验证通过。';
      const latency = !uncertain && route.latency || {}, quality = !uncertain && route.quality || {}, billing = !uncertain && provider?.billing || {};
      const latencyMetric = latency.metric === 'total_p95' ? 'P95 总耗时' : latency.metric === 'ttft_p95' ? 'P95 首字延迟' : '';
      const enoughLatency = samples(latency.sampleCount, 20) && samples(latency.baselineSampleCount, 20);
      const comparableLatency = latency.comparable === true && !!latencyMetric && positive(latency.currentMs) && positive(latency.baselineMs);
      const latencyKnown = fresh(latency.checkedAt) && enoughLatency && comparableLatency;
      const ratio = latencyKnown ? latency.currentMs / latency.baselineMs : null;
      const slow = ratio !== null && ratio >= 2;
      const roundedRatio = Math.round(ratio * 10) / 10;
      const latencyLabel = latencyKnown ? ratio < 2 && roundedRatio >= 2 ? '< 2×' : roundedRatio === 0 ? '< 0.1×' : roundedRatio + '×' : !fresh(latency.checkedAt) ? timeLabel(latency.checkedAt, '待检测') : !enoughLatency ? '样本不足' : '不可比较';
      const latencyEvidence = latencyKnown ? latencyMetric + '：' + (latency.currentMs / 1000).toFixed(2) + ' s；基线 ' + (latency.baselineMs / 1000).toFixed(2) + ' s。当前样本 ' + latency.sampleCount + '，基线样本 ' + latency.baselineSampleCount + '。' : '需同类请求、同一延迟指标，当前与基线各至少 20 个样本。';
      const score = value => Number.isFinite(value) && value >= 0 && value <= 100;
      const qualityKnown = fresh(quality.checkedAt) && samples(quality.sampleCount, 10) && samples(quality.baselineSampleCount, 10) && !!text(quality.testSetId) && quality.testSetId === quality.baselineTestSetId && !!text(quality.rubricId) && quality.rubricId === quality.baselineRubricId && score(quality.score) && score(quality.baselineScore) && ['normal', 'regressed'].includes(quality.status);
      const regressed = qualityKnown && quality.status === 'regressed';
      const qualityLabel = qualityKnown ? regressed ? '下降 · 待复测' : '未见下降' : !fresh(quality.checkedAt) ? timeLabel(quality.checkedAt, '待检测') : '证据不足';
      const qualityEvidence = qualityKnown ? '固定测试集 ' + text(quality.testSetId) + ' · 评分标准 ' + text(quality.rubricId) + '；得分 ' + quality.score + ' / 100，基线 ' + quality.baselineScore + ' / 100；样本 ' + quality.sampleCount + ' / ' + quality.baselineSampleCount + '。' : '需同一固定测试集与评分标准，当前与基线各至少 10 个样本。质量退化需复测，不能据此认定供应商替换模型。';
      const billingKnown = fresh(billing.checkedAt) && Object.hasOwn(billingNames, billing.status);
      const callBilling = active && result === 'failed' && Object.hasOwn(billingErrors, route.errorCode) ? billingErrors[route.errorCode] : '';
      const billingAlert = billingKnown && billing.status !== 'ok' || !!callBilling;
      const billingConflict = !!callBilling && billingKnown && billing.status === 'ok';
      const accountLabel = billingKnown ? billingNames[billing.status] : !fresh(billing.checkedAt) ? timeLabel(billing.checkedAt, '未接入') : '状态未知';
      const billingLabel = billingConflict ? '计费结果不一致' : callBilling ? callBilling + '（调用返回）' : accountLabel;
      const billingEvidence = '账户数据：' + accountLabel + '（' + time(billing.checkedAt) + '）。' + (callBilling ? '调用返回：' + callBilling + '（' + time(route.checkedAt) + '）。' : '') + (billingConflict ? '两个来源不一致，请核对时间与账户映射，并复测调用。' : '');
      const issues = active ? [result === 'failed' ? reason : '', slow ? '延迟升高' : '', regressed ? '质量下降 · 待复测' : '', billingAlert ? callBilling || billingNames[billing.status] : ''].filter(Boolean) : [];
      const attention = issues.length > 0;
      const nextSteps = [];
      if (active && result === 'failed') nextSteps.push('核对生产通道、所需协议和供应商返回的错误分类，确认备用线路。');
      if (active && billingAlert) nextSteps.push('核实供应商账户的余额或额度，再由有权限的人员充值或联系供应商。');
      if (active && slow) nextSteps.push('对照同类请求与历史基线复测延迟，确认是否需要切换线路或联系供应商。');
      if (active && regressed) nextSteps.push('用同一测试集复测并检查输出差异，排除提示词、采样参数与模型版本变化。');
      if (active && result === 'unknown') nextSteps.push('补充近期生成验证，未知结果不计为可用。');
      if (uncertain) nextSteps.push('校验冲突或缺失的目录记录后重新检测；当前证据不用于确认模型可用。');
      if ([route.checkedAt, latency.checkedAt, quality.checkedAt, billing.checkedAt].some(value => timeState(value) === 'invalid')) nextSteps.push('检查检测时间戳与客户端时钟，修正后重新获取检测数据。');
      if (billingConflict) nextSteps.push('账户数据与调用计费错误不一致，请核对两个来源的时间和账户映射后复测。');
      return {
        id: text(route.id), modelId: text(route.modelId), model: text(model?.name, text(route.modelId, '未知模型')), provider: text(provider?.name, '未知供应商'), providerId: text(route.providerId),
        protocol: Object.hasOwn(protocolNames, route.protocol) ? protocolNames[route.protocol] : text(route.protocol, '协议未知'), active, uncertain, result, availability, reason,
        attention, issues: Array.from(new Set(issues)).join(' · '), tone: active ? result === 'failed' ? 'danger' : attention ? 'warning' : result === 'unknown' ? 'muted' : 'success' : 'muted',
        rank: uncertain ? 3 : !active ? 5 : result === 'failed' ? 0 : billingAlert ? 1 : attention ? 2 : result === 'unknown' ? 3 : 4,
        latencyLabel, latencyCaption: latencyKnown ? latencyMetric + ' / 基线' : '相对历史基线', latencyEvidence, slow: active && slow,
        latencyWindow: '当前窗口：' + text(latency.windowLabel, '未提供') + '；基线窗口：' + text(latency.baselineLabel, '未提供'), latencyChecked: time(latency.checkedAt),
        qualityLabel, qualityEvidence, qualityChecked: time(quality.checkedAt), regressed: active && regressed,
        billingLabel, billingEvidence, billingConflict, billingAlert: active && billingAlert,
        checked: time(route.checkedAt), nextStep: nextSteps.join(' ') || (active ? '暂无已确认的异常；延迟、质量与账单未接入不代表正常。' : '此线路仅供核对，不计入生产统计。')
      };
    }).sort((a, b) => a.rank - b.rank || a.model.localeCompare(b.model, 'zh-CN') || a.provider.localeCompare(b.provider, 'zh-CN') || a.id.localeCompare(b.id));
    const states = models.map(model => {
      const candidates = routes.filter(route => text(route.modelId) === model.id.trim() && eligible(route, model));
      if (!text(model.requiredProtocol)) return 'unknown';
      if (candidates.some(route => routeResult(route) === 'passed')) return 'available';
      if (!complete || candidates.some(route => routeResult(route) === 'unknown')) return 'unknown';
      return 'unavailable';
    });
    const available = states.filter(value => value === 'available').length;
    const unavailable = states.filter(value => value === 'unavailable').length;
    const unknown = states.length - available - unavailable;
    const attention = rows.filter(row => row.attention).length;
    const unknownRoutes = rows.filter(row => (row.active || row.uncertain) && row.result === 'unknown').length;
    const hasRate = complete && models.length > 0 && unknown === 0;
    const issue = !valid ? '统计数据待校验：模型、供应商或线路记录不完整或冲突。' : input.catalogComplete !== true ? '生产清单尚不完整，暂不计算百分比。' : !catalogFresh ? '生产清单' + timeLabel(input.catalogCheckedAt, '未检测') + '，暂不计算百分比。' : unknown ? unknown + ' 个模型状态未知，暂不计算百分比。' : '';
    const checkedTimes = routes.filter(route => models.some(model => text(route.modelId) === model.id.trim() && eligible(route, model))).map(route => stamp(route.checkedAt)).filter(value => Number.isFinite(value) && value <= now);
    return {
      kind: 'ready', rate: hasRate ? Math.round(available / models.length * 1000) / 10 : '—', hasRate,
      note: !complete ? '已确认 ' + available + ' 个可用 · 清单待确认' : !models.length ? '尚未启用生产模型' : available + ' / ' + models.length + ' 个模型可用',
      detail: attention + ' 条线路需处理' + (unknownRoutes ? ' · ' + unknownRoutes + ' 条待确认' : ''),
      checked: checkedTimes.length ? '最近生成验证 ' + time(checkedTimes.reduce((a, b) => Math.max(a, b))) : '尚无生成验证记录',
      rows, providers: providers.map(row => ({ id: text(row.id), name: text(row.name, '未命名供应商') })),
      total: models.length, available, unavailable, unknown, attention, issue, freshnessLabel: (freshness / 60000).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + ' 分钟'
    };
  }
  modelStatusSource() {
    const isDemo = this.props.modelMonitoring == null && this.state.modelSource !== 'live';
    return { isDemo, input: isDemo ? this.modelDemoInput() : this.props.modelMonitoring };
  }
  modelStatusValues() {
    if (this.state.view !== 'models') return { open: false };
    const { input, isDemo } = this.modelStatusSource();
    const snapshot = this.modelStatusSnapshot(input);
    const dashboard = this.modelStatusDashboard(input, snapshot, isDemo);
    return Object.assign({}, snapshot, dashboard, {
      open: true, ready: snapshot.kind === 'ready', connected: snapshot.kind === 'ready' && snapshot.rows.length > 0,
      disconnected: snapshot.kind === 'disconnected', loading: snapshot.kind === 'loading', failed: snapshot.kind === 'error',
      emptyCatalog: snapshot.kind === 'ready' && snapshot.rows.length === 0, hasRows: dashboard.hasRows, rows: dashboard.lines,
      back: () => {
        this.setState({ view: 'overview' });
        setTimeout(() => { if (typeof document !== 'undefined') document.querySelector('[aria-label="查看模型状态与线路问题"]')?.focus(); }, 0);
      }
    });
  }
  // model-status-methods:end
