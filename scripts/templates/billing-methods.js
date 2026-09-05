  // billing-methods:start
  billingTimezoneOffsetMinutes() {
    const configured = Number(this.props.workspaceTimezoneOffsetMinutes);
    return Number.isFinite(configured) && configured >= -720 && configured <= 840 ? configured : 480;
  }
  billingTimezoneLabel() {
    const configured = String(this.props.workspaceTimezoneName || '').trim();
    if (configured) return configured;
    const offset = this.billingTimezoneOffsetMinutes(), sign = offset >= 0 ? '+' : '−', absolute = Math.abs(offset);
    return 'UTC' + sign + Math.floor(absolute / 60) + (absolute % 60 ? ':' + String(absolute % 60).padStart(2, '0') : '');
  }
  billingDay(stamp) {
    return new Date(stamp + this.billingTimezoneOffsetMinutes() * 60000).toISOString().slice(0, 10);
  }
  billingStamp(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NaN;
    const stamp = Date.parse(day + 'T00:00:00Z') - this.billingTimezoneOffsetMinutes() * 60000;
    return Number.isFinite(stamp) && this.billingDay(stamp) === day ? stamp : NaN;
  }
  billingPreset(preset) {
    const today = this.billingDay(Date.now()), midnight = this.billingStamp(today), yesterday = this.billingDay(midnight - 86400000);
    if (preset === 'week') return { preset, start: this.billingDay(midnight - 7 * 86400000), end: yesterday, grain: 'day' };
    if (preset === 'month') return { preset, start: today.slice(0, 8) + '01', end: today, grain: 'day' };
    if (preset === 'year') {
      const monthStart = this.billingStamp(today.slice(0, 8) + '01');
      return { preset, start: String(Number(today.slice(0, 4)) - 1) + today.slice(4, 8) + '01', end: this.billingDay(monthStart - 86400000), grain: 'month' };
    }
    if (preset === 'years') return { preset, start: String(Number(today.slice(0, 4)) - 2) + '-01-01', end: yesterday, grain: 'year' };
    return { preset: 'yesterday', start: yesterday, end: yesterday, grain: 'hour' };
  }
  billingMoney(micros) {
    return '$' + (micros / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  billingNumber(value) {
    return value.toLocaleString('en-US');
  }
  billingCompact(value) {
    return value >= 1000000000 ? (value / 1000000000).toFixed(1) + 'B' : value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(1) + 'K' : String(value);
  }
  billingDemo() {
    const today = this.billingDay(Date.now());
    if (this._billingDemo?.today === today) return this._billingDemo.data;
    // Deliberately synthetic event ledger, not prices or production account spend.
    // Each amount is an illustrative billed amount; no public rate table is inferred.
    const catalog = [
      ['anthropic', 'Anthropic', 'sonnet', 'Claude Sonnet 4.5', 'anthropic-direct', 'Anthropic 直连'],
      ['anthropic', 'Anthropic', 'opus', 'Claude Opus 4.1', 'gateway-a', '代理供应商 A'],
      ['openai', 'OpenAI', 'gpt-4o-mini', 'GPT-4o mini', 'openai-direct', 'OpenAI 直连'],
      ['openai', 'OpenAI', 'gpt-4.1', 'GPT-4.1', 'gateway-a', '代理供应商 A'],
      ['google', 'Google', 'gemini-pro', 'Gemini 2.5 Pro', 'google-direct', 'Google 直连'],
      ['stepfun', '阶跃星辰', 'step-3', 'Step 3', 'stepfun-direct', '阶跃星辰直连']
    ];
    const projects = [['web3d', 'Web3D 中国地标'], ['vision', 'Vision2Web'], ['finance', '金融文档'], ['eval', 'WebDev 美学评测']];
    const events = [], end = this.billingStamp(today);
    for (let day = 1; day <= 1000; day++) {
      if (day % 19 === 0) continue;
      catalog.forEach((model, m) => {
        for (let n = 0; n < 3; n++) {
          const project = projects[(day + m + n) % projects.length], scale = 2 + ((day * 13 + m * 7 + n * 11) % 17);
          events.push({ id: 'demo-' + day + '-' + m + '-' + n, runId: 'run-' + day + '-' + ((m+n)%5), taskName: project[1] + ' · 批次生成', anomalyReason: (day+m+n)%17===0 ? '重试次数与上下文长度同时升高' : '', occurredAt: end - day * 86400000 + ((m * 3 + n * 7) % 24) * 3600000 + 900000,
            projectId: project[0], projectName: project[1], brandId: model[0], brandName: model[1], modelId: model[2], modelName: model[3], providerId: model[4], providerName: model[5],
            inputTokens: scale * (6200 + m * 1100), outputTokens: scale * (1200 + n * 400), costMicros: scale * (430000 + m * 275000 + n * 61000) });
        }
      });
    }
    const data = { kind: 'ready', demo: true, events, message: '', complete: true, coverageStart: end - 1000 * 86400000, coverageEnd: end, updatedAt: Date.now() };
    this._billingDemo = { today, data };
    return data;
  }
  billingRunRecords() {
    const source = this.billingSource();
    if (!source.demo) return [];
    const range = this.billingPreset('yesterday'), start = this.billingStamp(range.start), end = start + 86400000;
    const groups = new Map();
    source.events.filter(row => row.occurredAt >= start && row.occurredAt < end && row.runId).forEach(row => {
      if (!groups.has(row.runId)) groups.set(row.runId, { id: row.runId, events: [], cost: 0, reasons: new Set() });
      const run = groups.get(row.runId); run.events.push(row); run.cost += row.costMicros;
      if (row.anomalyReason) run.reasons.add(row.anomalyReason);
    });
    const values = Array.from(groups.values()), average = values.length ? values.reduce((sum, row) => sum + row.cost, 0) / values.length : 0;
    return values.filter(row => row.cost > average * 1.05 || row.reasons.size).map((row, index) => {
      const first = row.events[0], itemMeta = row.events.map((event, itemIndex) => [
        'billing-' + row.id + '-' + String(itemIndex + 1).padStart(2, '0'), event.modelName, '费用异常', '', event.modelName + ' · ' + event.providerName
      ]);
      const startedAt = Math.min(...row.events.map(event => event.occurredAt));
      return { id: row.id, subject: first.taskName || first.projectName + ' · 批次生成', strategy: '费用异常监测', pipe: 'billing-cost-observer', ver: 'v1',
        name: (first.taskName || first.projectName + ' · 批次生成') + ' · 费用异常监测', dsName: '', owner: this.props.currentUser || '一万',
        startedAt, completedAt: startedAt + (7 + index * 3) * 60000, durationMs: (7 + index * 3) * 60000,
        n: itemMeta.length, done: itemMeta.length, running: 0, failed: 0, cost: this.billingMoney(row.cost), status: 'success', itemMeta,
        itemIds: itemMeta.map(item => item[0]), itemCosts: row.events.map(event => this.billingMoney(event.costMicros)), modelsUsed: [...new Set(row.events.map(event => event.modelName))],
        billingMock: true, anomalyReason: Array.from(row.reasons)[0] || '成本高于同范围 Run 平均值' };
    });
  }
  billingSource() {
    const input = this.props.billingUsage;
    if (input === undefined) return this.billingDemo();
    const empty = (kind, message) => ({ kind, message, events: [], demo: false, complete: false });
    if (!input) return empty('disconnected', '账单数据待接入');
    if (input.status === 'loading') return empty('loading', '正在读取账单数据');
    if (input.status !== 'ready') return empty('error', '账单读取失败，请检查数据源后重试。');
    if (input.currency !== 'USD' || input.complete !== true || !Array.isArray(input.events)) return empty('error', '账单币种或完整性待确认，暂不展示汇总。');
    if (this._billingInput === input) return this._billingValidated;
    const seen = new Map(), names = new Map(), events = [];
    let valid = true;
    const required = ['id', 'projectId', 'projectName', 'providerId', 'providerName', 'brandId', 'brandName', 'modelId', 'modelName'];
    const totals = { inputTokens: 0, outputTokens: 0, costMicros: 0 };
    for (const row of input.events) {
      if (!row || required.some(key => typeof row[key] !== 'string' || !row[key].trim())) { valid = false; break; }
      const stamp = typeof row.occurredAt === 'number' ? row.occurredAt : typeof row.occurredAt === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(row.occurredAt) ? Date.parse(row.occurredAt) : NaN;
      if (!Number.isFinite(stamp) || Math.abs(stamp) > 8.64e15 || stamp > Date.now()) { valid = false; break; }
      const record = Object.fromEntries(required.map(key => [key, row[key].trim()]));
      for (const key of ['runId', 'taskName', 'anomalyReason']) record[key] = typeof row[key] === 'string' ? row[key].trim().slice(0, 200) : '';
      record.occurredAt = stamp;
      for (const key of Object.keys(totals)) {
        if (!Number.isSafeInteger(row[key]) || row[key] < 0) valid = false;
        record[key] = row[key];
      }
      if (!valid) break;
      const serialized = JSON.stringify(record);
      if (seen.has(record.id)) { if (seen.get(record.id) !== serialized) valid = false; continue; }
      seen.set(record.id, serialized);
      for (const dimension of ['project', 'provider', 'brand', 'model']) {
        const key = JSON.stringify([dimension, dimension === 'model' ? record.brandId : '', record[dimension + 'Id']]);
        if (names.has(key) && names.get(key) !== record[dimension + 'Name']) valid = false;
        names.set(key, record[dimension + 'Name']);
      }
      for (const key of Object.keys(totals)) { totals[key] += record[key]; if (!Number.isSafeInteger(totals[key])) valid = false; }
      if (!Number.isSafeInteger(totals.inputTokens + totals.outputTokens)) valid = false;
      events.push(record);
    }
    const timestamp = value => typeof value === 'number' ? value : typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
    const coverageStart = timestamp(input.coverageStart), coverageEnd = timestamp(input.coverageEnd), updatedAt = timestamp(input.updatedAt);
    const result = valid ? { kind: 'ready', events, demo: false, complete: true, message: '', coverageStart, coverageEnd, updatedAt: Number.isFinite(updatedAt) && updatedAt <= Date.now() ? updatedAt : NaN } : empty('error', '账单记录缺失、冲突或数值异常，暂不展示可能不完整的汇总。');
    this._billingInput = input; this._billingValidated = result;
    return result;
  }
  billingSum(events) {
    return events.reduce((sum, row) => ({ cost: sum.cost + row.costMicros, input: sum.input + row.inputTokens, output: sum.output + row.outputTokens, calls: sum.calls + 1 }), { cost: 0, input: 0, output: 0, calls: 0 });
  }
  billingYesterday() {
    const source = this.billingSource(), range = this.billingPreset('yesterday'), start = this.billingStamp(range.start);
    const sum = this.billingSum(source.events.filter(row => row.occurredAt >= start && row.occurredAt < start + 86400000));
    const previous = this.billingSum(source.events.filter(row => row.occurredAt >= start - 86400000 && row.occurredAt < start));
    const change = source.kind === 'ready' && previous.cost > 0 ? (sum.cost / previous.cost - 1) * 100 : null;
    const delta = change == null ? '' : '较前日 ' + (Math.abs(change) < .05 ? '0%' : (change > 0 ? '+' : '−') + Math.abs(change).toFixed(1) + '%');
    return { value: source.kind === 'ready' ? this.billingMoney(sum.cost) : '—', note: source.demo ? '示例账单 · ' + range.start + ' · UTC+8' : source.kind === 'ready' ? range.start + ' · UTC+8' : source.message,
      delta,
      description: '按工作区时区（' + this.billingTimezoneLabel() + '）昨日 00:00 至今日 00:00 的费用发生时间统计 USD 模型调用费用。不是按运行创建时间筛选，也不含充值、税费或人工费用。' + (source.demo ? '当前展示示例账单，尚未接入真实消费。' : '') };
  }
  openBilling() {
    this.setState({ view: 'billing', billing: Object.assign(this.billingPreset('yesterday'), { tab: 'overview', project: '', provider: '', model: '', sort: 'cost', bin: null }) });
    setTimeout(() => { if (this.state.view === 'billing' && typeof document !== 'undefined') document.getElementById('forge-billing-title')?.focus(); }, 0);
  }
  updateBilling(patch) {
    const scopeChanged = ['start', 'end', 'grain', 'project', 'provider', 'model'].some(key => key in patch);
    this.setState({ billing: Object.assign({}, this.state.billing, { page: 1, exportNotice: '' }, scopeChanged ? { bin: null } : {}, patch) });
  }
  billingCompatibleGrain(startDay, endDay, currentGrain) {
    const start = this.billingStamp(startDay), end = this.billingStamp(endDay);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return currentGrain;
    const days = (end - start) / 86400000 + 1;
    if (currentGrain === 'hour' && days > 7) return 'day';
    if (currentGrain === 'day' && days > 366) return 'month';
    if (currentGrain === 'month' && days > 3653) return 'year';
    return currentGrain;
  }
  billingChange(current, previous, known = true) {
    if (!known) return '上一周期数据不足';
    if (!previous) return current ? '本期新增' : '持平 0%';
    const delta = (current / previous - 1) * 100;
    return Math.abs(delta) < .05 ? '持平 0%' : (delta > 0 ? '+' : '−') + Math.abs(delta).toFixed(1) + '%';
  }
  billingCSV(rows) {
    // Quote every cell and neutralize spreadsheet formulas, including leading whitespace.
    return '\uFEFF' + rows.map(row => row.map(value => {
      let cell = String(value ?? '');
      if (/^[\s]*[=+@-]|^[\t\r\n]/.test(cell)) cell = "'" + cell;
      return '"' + cell.replaceAll('"', '""') + '"';
    }).join(',')).join('\r\n');
  }
  billingDownload(rows, name) {
    const csv = this.billingCSV(rows);
    if (typeof document === 'undefined') return csv;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.setState({ billing: Object.assign({}, this.state.billing, { exportNotice: '已生成 CSV（' + (rows.length - 1) + ' 条记录）' }) });
    return csv;
  }
  billingValues() {
    if (this.state.view !== 'billing') return { open: false };
    const source = this.billingSource(), s = Object.assign({ tab: 'overview', project: '', provider: '', model: '', sort: 'cost', direction: 'desc', metric: 'cost', query: '', page: 1, pageSize: 10, bin: null }, this.billingPreset('yesterday'), this.state.billing);
    if (s.tab === 'projects') s.tab = 'overview';
    const start = this.billingStamp(s.start), end = this.billingStamp(s.end) + 86400000, today = this.billingDay(Date.now()), days = (end - start) / 86400000;
    let error = !Number.isFinite(start) || !Number.isFinite(end) ? '请选择开始和结束日期。' : start >= end ? '结束日期不能早于开始日期。' : s.end > today ? '结束日期不能晚于今天。' : '';
    const limits = { hour: 7, day: 366, month: 3653, year: 18263 };
    if (!error && (!limits[s.grain] || days > limits[s.grain])) error = '当前范围过长：按小时最多查看 7 天，按日最多 366 天；请缩短日期范围或切换到月／年。';
    const ready = source.kind === 'ready' && !error, modelKey = row => JSON.stringify([row.brandId, row.modelId]);
    const dimensionOptions = (events, key, name) => Array.from(new Map(events.map(row => [key(row), { id: key(row), name: name(row) }])).values()).sort((a, b) => a.name.localeCompare(b.name));
    const projects = dimensionOptions(source.events, r => r.projectId, r => r.projectName);
    const providers = dimensionOptions(source.events, r => r.providerId, r => r.providerName);
    const models = dimensionOptions(source.events.filter(r => !s.provider || r.providerId === s.provider), modelKey, r => r.modelName);
    projects.forEach(r => r.selected = r.id === s.project); providers.forEach(r => r.selected = r.id === s.provider); models.forEach(r => r.selected = r.id === s.model);
    const scoped = source.events.filter(r => (!s.project || r.projectId === s.project) && (!s.provider || r.providerId === s.provider) && (!s.model || modelKey(r) === s.model));
    const inRange = (a, b) => scoped.filter(r => r.occurredAt >= a && r.occurredAt < b);
    const matched = ready ? inRange(start, end) : [];
    const covered = (a, b) => ready && Number.isFinite(source.coverageStart) && Number.isFinite(source.coverageEnd) && source.coverageStart <= a && source.coverageEnd >= b;
    const keyOf = stamp => {
      const local = new Date(stamp + this.billingTimezoneOffsetMinutes() * 60000).toISOString();
      return s.grain === 'hour' ? local.slice(0, 13) : s.grain === 'day' ? local.slice(0, 10) : s.grain === 'month' ? local.slice(0, 7) : local.slice(0, 4);
    };
    const buckets = [], bucketMap = new Map();
    if (ready) {
      for (let cursor = start; cursor < end;) {
        const offset=this.billingTimezoneOffsetMinutes()*60000, local = new Date(cursor + offset), key = keyOf(cursor);
        const next = s.grain === 'hour' ? cursor + 3600000 : s.grain === 'day' ? cursor + 86400000 : s.grain === 'month' ? Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - offset : Date.UTC(local.getUTCFullYear() + 1, 0, 1) - offset;
        const b = { key, start: cursor, end: Math.min(next, end), cost: 0, input: 0, output: 0, calls: 0 };
        buckets.push(b); bucketMap.set(key, b); cursor = next;
      }
      matched.forEach(r => { const b = bucketMap.get(keyOf(r.occurredAt)); b.cost += r.costMicros; b.input += r.inputTokens; b.output += r.outputTokens; b.calls++; });
    }
    const selected = bucketMap.get(s.bin), rangeStart = selected ? selected.start : start;
    const rangeEnd = Math.min(selected ? selected.end : end, Date.now());
    const current = selected ? matched.filter(r => keyOf(r.occurredAt) === selected.key) : matched;
    const previousStart = rangeStart - (rangeEnd - rangeStart), previous = ready ? inRange(previousStart, rangeStart) : [];
    const comparisonKnown = covered(previousStart, rangeEnd);
    const sum = this.billingSum(current), prior = this.billingSum(previous), totalTokens = sum.input + sum.output;
    const compareText = this.billingChange(sum.cost, prior.cost, comparisonKnown);
    const labelTime = stamp => new Date(stamp + this.billingTimezoneOffsetMinutes() * 60000).toISOString().slice(0, 16).replace('T', ' ');
    const bucketLabel = b => s.grain === 'hour' ? labelTime(b.start) + '–' + labelTime(b.end).slice(b.end - b.start <= 3600000 && this.billingDay(b.start) === this.billingDay(b.end) ? 11 : 0) : s.grain === 'day' ? b.key : this.billingDay(b.start) + ' 至 ' + this.billingDay(b.end - 1);
    const metricValue = b => s.metric === 'tokens' ? b.input + b.output : s.metric === 'calls' ? b.calls : b.cost;
    const dimension = s.tab === 'suppliers' ? 'provider' : s.tab === 'models' ? 'model' : 'project';
    const tableLabel = { project: '项目', provider: '模型供应商', model: '模型' }[dimension];
    const dimensionId = row => dimension === 'model' ? modelKey(row) : row[dimension + 'Id'], dimensionName = row => row[dimension + 'Name'];
    const eventMetric = row => s.metric === 'tokens' ? row.inputTokens + row.outputTokens : s.metric === 'calls' ? 1 : row.costMicros;
    const seriesMap = new Map(); matched.forEach(row => { const id=dimensionId(row); if(!seriesMap.has(id))seriesMap.set(id,{id,name:dimensionName(row),value:0}); seriesMap.get(id).value+=eventMetric(row); });
    const colors=['var(--pm-chart-1)','var(--pm-chart-2)','var(--pm-chart-3)','var(--pm-chart-4)','var(--pm-chart-5)','var(--pm-chart-6)'];
    const sortedSeries=Array.from(seriesMap.values()).sort((a,b)=>b.value-a.value), keep=sortedSeries.slice(0,5), keepIds=new Set(keep.map(row=>row.id));
    const chartSeries=keep.map((row,index)=>({...row,color:colors[index]})); if(sortedSeries.length>5)chartSeries.push({id:'__other',name:'其他',color:colors[5]});
    const maxCost = Math.max(1, ...buckets.map(b => b.cost)), maxTokens = Math.max(1, ...buckets.map(b => b.input + b.output));
    const chartMax = Math.max(1, ...buckets.map(metricValue));
    const chartFormat = value => s.metric === 'cost' ? this.billingMoney(value) : this.billingCompact(value);
    const tickStep = Math.max(1, Math.ceil(buckets.length / 6));
    const showTick = i => i === 0 || i === buckets.length - 1 || (i % tickStep === 0 && buckets.length - 1 - i >= Math.max(2, tickStep));
    const bars = buckets.map((b, i) => {
      const beforeEnd = b.start, beforeStart = b.start - (Math.min(b.end, Date.now()) - b.start), before = this.billingSum(inRange(beforeStart, beforeEnd));
      const change = this.billingChange(metricValue(b), metricValue(before), covered(beforeStart, Math.min(b.end, Date.now())));
      const label = bucketLabel(b), cost = this.billingMoney(b.cost), input = this.billingNumber(b.input), output = this.billingNumber(b.output), calls = this.billingNumber(b.calls);
      const bucketMix = new Map();
      inRange(b.start, b.end).forEach(row => {
        const rawId=dimensionId(row), mixKey=keepIds.has(rawId)?rawId:'__other', name=keepIds.has(rawId)?dimensionName(row):'其他';
        if (!bucketMix.has(mixKey)) bucketMix.set(mixKey, { id:mixKey,name,value:0 });
        bucketMix.get(mixKey).value += eventMetric(row);
      });
      const total=metricValue(b), segments=chartSeries.map(series=>{const value=bucketMix.get(series.id)?.value||0;return {name:series.name,value,style:'height:'+(100*value/chartMax)+'%;background:'+series.color,label:series.name+' '+chartFormat(value)+' · '+(total?Math.round(value*1000/total)/10:0)+'%'};}).filter(segment=>segment.value>0);
      const mixLines = segments.slice().reverse().map(entry => entry.label);
      const tooltip = [label + ' · '+this.billingTimezoneLabel(), '总量  ' + chartFormat(total), ...(mixLines.length ? ['', tableLabel+'构成', ...mixLines] : [])].join('\n');
      return { key: b.key, label, axis: showTick(i) ? s.grain === 'hour' ? (days > 1 ? b.key.slice(5, 10) + ' ' : '') + b.key.slice(11) + ':00' : s.grain === 'day' ? b.key.slice(5) : b.key : '',
        height: (100 * metricValue(b) / chartMax) + '%', segments, costHeight: (100 * b.cost / maxCost) + '%', inputHeight: (100 * b.input / maxTokens) + '%', outputHeight: (100 * b.output / maxTokens) + '%',
        cost, tokens: this.billingNumber(b.input + b.output), input, output, calls, zero: metricValue(b) === 0, active: b.key === s.bin, tooltip, help: tooltip.split('\n').filter(Boolean).join('，'),
        pick: () => this.updateBilling({ bin: b.key === s.bin ? null : b.key }) };
    });
    const groupRows = (events, dimension) => {
      const groups = new Map();
      events.forEach(row => {
        const id = dimension === 'model' ? modelKey(row) : row[dimension + 'Id'];
        if (!groups.has(id)) groups.set(id, { id, name: row[dimension + 'Name'], brand: dimension === 'model' ? row.brandName : '', events: [] });
        groups.get(id).events.push(row);
      });
      return Array.from(groups.values()).map(group => ({ ...group, ...this.billingSum(group.events) }));
    };
    const oldGroups = new Map(groupRows(previous, dimension).map(g => [g.id, g]));
    const inspect = (id, dim = dimension) => {
      const trail = (this.state.billing?.trail || []).concat([{ ...s, trail: undefined }]);
      this.updateBilling({ ...(dim === 'project' ? { project: id, tab: 'suppliers' } : dim === 'provider' ? { provider: id, model: '', tab: 'models' } : { model: id, tab: 'overview' }), bin: s.bin, query: '', trail });
    };
    const allRows = groupRows(current, dimension).map(g => {
      const providersCount = new Set(g.events.map(r => r.providerId)).size, modelsCount = new Set(g.events.map(modelKey)).size, projectsCount = new Set(g.events.map(r => r.projectId)).size;
      const shareRaw = sum.cost ? 100 * g.cost / sum.cost : 0, oldCost = oldGroups.get(g.id)?.cost || 0;
      return { id: g.id, name: g.name, brand: g.brand, subtitle: dimension === 'model' ? g.brand + ' · ' + providersCount + ' 家供应商' : modelsCount + ' 个模型 · ' + (dimension === 'provider' ? projectsCount + ' 个项目' : providersCount + ' 家供应商'),
        costRaw: g.cost, tokenRaw: g.input + g.output, inputRaw: g.input, outputRaw: g.output, callsRaw: g.calls, shareRaw, cost: this.billingMoney(g.cost), tokens: this.billingNumber(g.input + g.output), input: this.billingNumber(g.input), output: this.billingNumber(g.output), calls: this.billingNumber(g.calls),
        share: sum.cost ? shareRaw.toFixed(1) + '%' : '—', width: shareRaw.toFixed(3) + '%', change: this.billingChange(g.cost, oldCost, comparisonKnown), delta: g.cost - oldCost, inspect: () => inspect(g.id),
        inspectLabel: '下钻 ' + g.name + '，查看' + (dimension === 'project' ? '供应商和模型' : dimension === 'provider' ? '模型和项目' : '项目和供应商') + '分布',
        inspectButton: event => { event?.stopPropagation?.(); inspect(g.id); } };
    });
    const sortFields = { cost: 'costRaw', share: 'shareRaw', tokens: 'tokenRaw', input: 'inputRaw', output: 'outputRaw', calls: 'callsRaw' };
    const filteredRows = allRows.filter(r => (r.name + ' ' + r.brand).toLocaleLowerCase().includes(s.query.trim().toLocaleLowerCase()));
    filteredRows.sort((a, b) => ((s.sort === 'name' ? a.name.localeCompare(b.name) : a[sortFields[s.sort] || 'costRaw'] - b[sortFields[s.sort] || 'costRaw']) * (s.direction === 'asc' ? 1 : -1)) || a.name.localeCompare(b.name));
    const pageSize = [5, 10, 20, 50].includes(Number(s.pageSize)) ? Number(s.pageSize) : 10, pages = Math.max(1, Math.ceil(filteredRows.length / pageSize)), page = Math.max(1, Math.min(pages, Number(s.page) || 1));
    const rows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const sort = id => this.updateBilling({ sort: id, direction: s.sort === id && s.direction !== 'asc' ? 'asc' : 'desc' });
    const columns = [['name', tableLabel], ['cost', '费用（USD）'], ['share', '费用占比'], ['tokens', '总 Tokens'], ['input', '输入 Tokens'], ['output', '输出 Tokens'], ['calls', '调用次数']].map(([id, name]) => ({ id, name, state: s.sort === id ? s.direction === 'asc' ? 'ascending' : 'descending' : 'none', symbol: s.sort === id ? s.direction === 'asc' ? '↑' : '↓' : '↕', pick: () => sort(id) }));
    const contributors = [...allRows].sort((a, b) => b.costRaw - a.costRaw).slice(0, 5);
    const remainder = allRows.length > 5 ? sum.cost - contributors.reduce((n, r) => n + r.costRaw, 0) : 0;
    const top = contributors[0];
    const currentAvg = sum.calls ? sum.cost / sum.calls : 0, previousAvg = prior.calls ? prior.cost / prior.calls : 0;
    const signedMoney = value => (value > 0 ? '+' : value < 0 ? '−' : '') + this.billingMoney(Math.abs(value));
    const volumeEffect = (sum.calls - prior.calls) * previousAvg, mixEffect = sum.calls * (currentAvg - previousAvg);
    let insight = comparisonKnown ? '较上一等长周期，费用' + compareText + '（' + signedMoney(sum.cost - prior.cost) + '）。' : '上一周期覆盖范围未确认，暂不判断费用变化。';
    if (comparisonKnown && prior.calls && sum.calls) insight += '调用量变化贡献 ' + signedMoney(volumeEffect) + '；单次用量／模型组合变化贡献 ' + signedMoney(mixEffect) + '。';
    else if (comparisonKnown && !prior.calls && sum.calls) insight += '上一周期无调用，本期费用来自新增调用。';
    else if (comparisonKnown && !sum.calls) insight += '当前筛选范围没有调用费用。';
    const contributorsWithHistory = [...allRows, ...Array.from(oldGroups.values()).filter(g => !allRows.some(r => r.id === g.id)).map(g => ({ name: g.name, delta: -g.cost }))];
    const decreasing = sum.cost < prior.cost;
    const driverRow = contributorsWithHistory.sort((a, b) => decreasing ? a.delta - b.delta : b.delta - a.delta)[0];
    const driver = comparisonKnown && driverRow && (decreasing ? driverRow.delta < 0 : driverRow.delta > 0) ? (decreasing ? '费用减少最多的是 ' : '最大增量来自 ') + driverRow.name + '：' + signedMoney(driverRow.delta) + '。' : top && sum.cost ? '主要费用来自 ' + top.name + '，占 ' + top.share + '。' : '当前范围暂无费用构成。';
    const changeReasons = [
      { label:'请求量', value:comparisonKnown?signedMoney(volumeEffect):'—', note:comparisonKnown?'按调用次数变化与前期平均单次成本计算':'上一周期覆盖不足' },
      { label:'模型路由与用量组合', value:comparisonKnown?signedMoney(mixEffect):'—', note:'包含模型组合和单次用量变化' },
      { label:'重试', value:'—', note:'账单尚未提供可归因的重试费用' },
      { label:'单价', value:'—', note:'账单尚未提供有效单价版本' },
      { label:'上下文长度', value:'—', note:'账单尚未提供可归因的上下文差异' }
    ];
    const runGroups=new Map(); current.filter(row=>row.runId).forEach(row=>{if(!runGroups.has(row.runId))runGroups.set(row.runId,{id:row.runId,task:row.taskName||'所属任务待接入',cost:0,reasons:new Set()});const run=runGroups.get(row.runId);run.cost+=row.costMicros;if(row.anomalyReason)run.reasons.add(row.anomalyReason);});
    const runValues=Array.from(runGroups.values()),runAverage=runValues.length?runValues.reduce((n,row)=>n+row.cost,0)/runValues.length:0;
    const abnormalRuns=runValues.filter(row=>row.cost>runAverage*1.05||row.reasons.size).map(row=>({id:row.id,runId:row.id,task:row.task,cost:this.billingMoney(row.cost),deviation:runAverage?'+'+Math.round((row.cost/runAverage-1)*100)+'%':'—',reason:Array.from(row.reasons)[0]||'成本高于同范围 Run 平均值',href:'?view=run&activeRun='+encodeURIComponent(row.id),open:event=>{event?.preventDefault?.();this.setState({view:'run',activeRun:row.id,runItem:null,runsQuery:''});}})).sort((a,b)=>Number(b.deviation.replace(/[^\d.-]/g,''))-Number(a.deviation.replace(/[^\d.-]/g,''))).slice(0,5);
    const costTone = (value, baseline) => !comparisonKnown || value === baseline ? 'neutral' : value < baseline ? 'success' : 'danger';
    const metric = (label, value, note, help, tone = 'neutral', detail = '') => ({ label, value: ready ? value : '—', note, help, tone, detail });
    const presets = [['yesterday', '昨日'], ['week', '近 7 天'], ['month', '本月'], ['year', '近 12 个月'], ['years', '近 3 年'], ['custom', '自定义']].map(([id, name]) => ({ id, name, selected: s.preset === id }));
    const period = s.start === s.end ? s.start : s.start + ' — ' + s.end, presetName = presets.find(p => p.selected)?.name || '自定义';
    const chips = [['project', s.project, projects], ['provider', s.provider, providers], ['model', s.model, models]].filter(([, id]) => id).map(([key, id, options]) => ({ name: options.find(o => o.id === id)?.name || id, clear: () => this.updateBilling({ [key]: '', trail: [] }) }));
    const defaultRange = this.billingPreset('yesterday');
    const filtered = !!(s.project || s.provider || s.model || s.bin || s.query || s.start !== defaultRange.start || s.end !== defaultRange.end);
    const fileSuffix = (source.demo ? '示例-' : '') + s.start + '-' + s.end + (selected ? '-所选时段' : '');
    return {
      open: true, ready, loading: source.kind === 'loading', failed: source.kind === 'error', disconnected: source.kind === 'disconnected', unavailable: source.kind === 'error' || source.kind === 'disconnected', demo: source.demo, message: source.message, error,
      start: s.start, end: s.end, today, preset: s.preset, grain: s.grain, period, presetName, custom: s.preset === 'custom', showOverviewSummary: s.tab === 'overview', exportNotice: s.exportNotice || '',
      updated: Number.isFinite(source.updatedAt) ? '最近更新 ' + labelTime(source.updatedAt) + ' · ' + this.billingTimezoneLabel() : '数据更新时间未提供', timezoneLabel:this.billingTimezoneLabel(),
      project: s.project, provider: s.provider, model: s.model, projects, providers, models, noProject: !s.project, noProvider: !s.provider, noModel: !s.model, filtered, presets,
      chips, hasChips: chips.length > 0, showScope: chips.length > 0 || !!selected, canGoBack: !!s.trail?.length,
      drillBack: () => { const trail = [...(s.trail || [])], previous = trail.pop(); if (previous) this.updateBilling({ ...previous, trail }); },
      tabs: [['overview', '总览'], ['suppliers', '按模型供应商'], ['models', '按模型']].map(([id, name]) => ({ id, name, active: s.tab === id, current: s.tab === id ? 'page' : 'false', pick: () => this.updateBilling({ tab: id, query: '' }) })),
      grains: [['hour', '小时'], ['day', '日'], ['month', '月'], ['year', '年']].map(([id, name]) => ({ id, name, active: s.grain === id, pick: () => this.updateBilling({ grain: id }) })),
      chartMetrics: [['cost', '费用'], ['tokens', 'Tokens'], ['calls', '调用次数']].map(([id, name]) => ({ id, name, active: s.metric === id, pick: () => this.updateBilling({ metric: id }) })),
      chartSeries, chartTitle: s.metric === 'tokens' ? 'Token 用量分布' : s.metric === 'calls' ? '调用次数分布' : '费用分布', unit: s.metric === 'cost' ? 'USD' : s.metric === 'tokens' ? 'Tokens' : '次',
      metrics: [
        metric(s.preset==='yesterday'&&!selected?'昨日成本':'总费用', this.billingMoney(sum.cost), comparisonKnown ? (s.preset==='yesterday'&&!selected?'较前日 ':'较上一周期 ') + signedMoney(sum.cost-prior.cost) + ' · ' + compareText : '上一周期数据不足', '当前时间范围与筛选条件下的账单费用合计。按 UTC+8 的调用计费时间统计 USD 金额，包含所选结束日期；计入产生费用的失败请求，不含充值、税费或人工费用。变化比例对比上一等长时段。', costTone(sum.cost, prior.cost), driver),
        metric('总 Tokens', this.billingNumber(totalTokens), '输入 ' + this.billingCompact(sum.input) + ' / 输出 ' + this.billingCompact(sum.output), '当前范围的输入 Tokens 与输出 Tokens 之和。输入包含账单已报告的缓存用量，不重复累计。'),
        metric('调用次数', this.billingNumber(sum.calls), sum.calls ? '平均 ' + this.billingNumber(Math.round(totalTokens / sum.calls)) + ' Tokens / 次' : '平均 Tokens / 次 —', '当前范围内的调用记录数，包含计费失败请求。卡片下方的平均 Tokens / 次 = 总 Tokens ÷ 调用次数。'),
        metric('平均调用成本', sum.calls ? this.billingMoney(currentAvg) : '—', comparisonKnown ? '较上一周期 ' + this.billingChange(currentAvg, previousAvg, true) + ' · USD / 次' : 'USD / 次 · 含计费失败请求', '总费用 ÷ 调用次数，单位为 USD / 次，包含计费失败请求。没有调用时显示 —；不代表模型的单 Token 价格。', costTone(currentAvg, previousAvg))
      ],
      inputShare: totalTokens ? (100 * sum.input / totalTokens).toFixed(1) + '%' : '0%', insight, driver, comparisonKnown,
      comparisonPeriod: comparisonKnown ? '对比 ' + labelTime(previousStart) + ' — ' + labelTime(rangeStart) + '（不含结束时刻）' : '', changeReasons, abnormalRuns, hasAbnormalRuns:abnormalRuns.length>0,
      contributors, remainder: this.billingMoney(remainder), hasRemainder: remainder > 0, compositionLabel: tableLabel + '费用构成', compositionNote: top && sum.cost ? 'Top 1 · ' + top.name + ' 占 ' + top.share : '当前范围没有计费金额',
      hasRows: rows.length > 0, hasData: allRows.length > 0, rows, tableLabel, columns, resultCount: filteredRows.length, groupCount: allRows.length,
      callCount: this.billingNumber(sum.calls), query: s.query, noSearch: !s.query, page, pages, pageSize, rangeLabel: filteredRows.length ? ((page - 1) * pageSize + 1) + '–' + Math.min(page * pageSize, filteredRows.length) : '0',
      pageSizes: [5, 10, 20, 50].map(id => ({ id, selected: id === pageSize })), firstPage: page === 1, lastPage: page === pages,
      prevPage: () => this.updateBilling({ page: page - 1 }), nextPage: () => this.updateBilling({ page: page + 1 }), onPageSize: e => this.updateBilling({ pageSize: Number(e.target.value) }), onSearch: e => this.updateBilling({ query: e.target.value }), clearSearch: () => this.updateBilling({ query: '' }),
      sortedCost: s.sort === 'cost', sortedTokens: s.sort === 'tokens', costSort: s.sort === 'cost' ? s.direction === 'asc' ? 'ascending' : 'descending' : 'none', tokenSort: s.sort === 'tokens' ? s.direction === 'asc' ? 'ascending' : 'descending' : 'none',
      costAxis: [this.billingMoney(maxCost), this.billingMoney(maxCost / 2), '$0'], tokenAxis: [this.billingCompact(maxTokens), this.billingCompact(maxTokens / 2), '0'],
      chartAxis: [chartFormat(chartMax), chartFormat(chartMax / 2), s.metric === 'cost' ? '$0' : '0'], bars, chartMinWidth: Math.max(260, buckets.length * 18) + 'px',
      focusLabel: selected ? bucketLabel(selected) : '', focusCost: selected ? this.billingMoney(selected.cost) : '', focusTokens: selected ? '输入 ' + this.billingNumber(selected.input) + ' / 输出 ' + this.billingNumber(selected.output) : '', hasFocus: !!selected, clearBin: () => this.updateBilling({ bin: null }),
      onPreset: e => e.target.value === 'custom' ? this.updateBilling({ preset: 'custom' }) : this.updateBilling(this.billingPreset(e.target.value)),
      openCustomTime: () => {
        this.updateBilling({ preset: 'custom' });
        setTimeout(() => {
          if (typeof document === 'undefined') return;
          const calendar = document.getElementById('forge-billing-calendar');
          if (!calendar || typeof calendar.showPopover !== 'function') return;
          try { if (!calendar.matches(':popover-open')) calendar.showPopover(); } catch (_) {}
        }, 0);
      },
      onStart: e => this.updateBilling({ start: e.target.value, preset: 'custom', grain:this.billingCompatibleGrain(e.target.value,s.end,s.grain) }), onEnd: e => this.updateBilling({ end: e.target.value, preset: 'custom', grain:this.billingCompatibleGrain(s.start,e.target.value,s.grain) }),
      onProject: e => this.updateBilling({ project: e.target.value, trail: [] }), onProvider: e => this.updateBilling({ provider: e.target.value, model: '', trail: [] }), onModel: e => this.updateBilling({ model: e.target.value, trail: [] }),
      reset: () => this.updateBilling({ ...this.billingPreset('yesterday'), project: '', provider: '', model: '', query: '', trail: [] }), resetDates: () => this.updateBilling(this.billingPreset('yesterday')),
      sortCost: () => sort('cost'), sortTokens: () => sort('tokens'),
      exportDetails: () => this.billingDownload([['数据类型', '调用 ID', '调用时间 UTC+8', '项目', '供应商', '模型', '输入 Tokens', '输出 Tokens', '费用 USD'], ...[...current].sort((a,b) => a.occurredAt - b.occurredAt).map(r => [source.demo ? '示例' : '账单', r.id, labelTime(r.occurredAt), r.projectName, r.providerName, r.modelName, r.inputTokens, r.outputTokens, (r.costMicros / 1000000).toFixed(6)])], 'Forge-调用明细-' + fileSuffix + '.csv'),
      exportTable: () => this.billingDownload([['数据类型', tableLabel, '费用 USD', '费用占比', '总 Tokens', '输入 Tokens', '输出 Tokens', '调用次数'], ...filteredRows.map(r => [source.demo ? '示例' : '账单', r.name, (r.costRaw / 1000000).toFixed(6), r.share, r.tokenRaw, r.inputRaw, r.outputRaw, r.callsRaw])], 'Forge-' + tableLabel + '汇总-' + fileSuffix + '.csv'),
      back: () => { this.setState({ view: 'overview' }); setTimeout(() => { if (typeof document !== 'undefined') document.querySelector('[aria-label="查看昨日成本与用量分析"]')?.focus(); }, 0); }
    };
  }
  // billing-methods:end
