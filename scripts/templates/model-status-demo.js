  // model-status-demo:start
  modelDemoInput() {
    // Explicitly synthetic, session-stable snapshot. No endpoint, message or billing calls.
    const at = this.state.modelDemoAt || (this._modelDemoAt ||= Date.now());
    const providers = [
      ['yunqiao', '云桥', 420, 121, 'balance_low', true],
      ['qinghe', '青禾', 1680, 29, 'ok', true],
      ['beichen', '北辰', 860, 41, 'ok', true],
      ['anthropic', 'Anthropic', 36, 6, 'balance_low', false],
      ['openai', 'OpenAI', 3200, 123, 'ok', true]
    ].map(([id, name, balanceUsd, hourlySpendUsd, status, hasBackup]) => ({
      id, name, billing: { status, checkedAt: at, balanceUsd, hourlySpendUsd, hasBackup, alertThresholdUsd: id === 'anthropic' ? 50 : 200, spendWindowLabel: '近 1 小时全部线路消费' }
    }));
    const models = [
      ['claude-sonnet', 'Claude Sonnet 4.5', 'anthropic-messages'],
      ['claude-opus', 'Claude Opus 4.1', 'anthropic-messages'],
      ['gpt-41', 'GPT-4.1', 'openai-responses'],
      ['gpt-4o-mini', 'GPT-4o mini', 'openai-responses'],
      ['qwen', 'Qwen3', 'openai-chat']
    ].map(([id, name, requiredProtocol]) => ({ id, name, requiredProtocol, enabled: true }));
    const specs = [
      { id: 'production-02', modelId: 'claude-sonnet', providerId: 'yunqiao', current: 11910, baseline: 3420, total: 18600, totalBaseline: 7750, tps: 42, tpsDelta: -8, calls: 1800, failures: 126, cost: 78.4, quality: 93, qualityBase: 94, error: 'timeout', status: 'severe', alertReasons: ['downstream_error', 'key_unavailable'], action: '联系供应商', impact: { tasks: 2, project: 'Vision2Web', ddl: '距 DDL 1 天', failedCalls: 126 }, cause: '更可能是供应商排队或线路拥堵。', explanation: '下游供应商返回超时与 Key 暂时不可用报警；TTFT 明显升高，官方直连未出现相同异常。', errors: '下游 504 超时 98 次 · Key 暂时不可用 28 次', qualityKind: 'normal', started: '今天 12:35', startedOffset: 10800000 },
      { id: 'production-01', modelId: 'gpt-41', providerId: 'yunqiao', current: 5580, baseline: 3100, total: 9100, totalBaseline: 6200, tps: 46, tpsDelta: 1, calls: 950, failures: 11, cost: 42.6, quality: 92, qualityBase: 93, error: '', status: 'performance', alertReasons: ['account_shortage'], action: '查看详情', impact: { tasks: 1, project: 'Web3D 中国地标', ddl: '距 DDL 4 天', failedCalls: 11 }, cause: '供应商可用账号不足，导致请求排队增加。', explanation: '供应商账号紧缺报警；TTFT 上升 1.8×，生成速度与错误率仍处于基线范围。', errors: '偶发 504 超时 11 次', qualityKind: 'normal', started: '今天 13:10', startedOffset: 7200000 },
      { id: 'proxy-03', modelId: 'gpt-4o-mini', providerId: 'qinghe', current: 1760, baseline: 1600, total: 6800, totalBaseline: 6400, tps: 51, tpsDelta: -2, calls: 2200, failures: 9, cost: 18.2, quality: 76.4, qualityBase: 86.8, error: '', status: 'quality', action: '运行对比测试', impact: { tasks: 0, project: 'WebDev Eval', ddl: '距 DDL 3 天', failedCalls: 9 }, cause: '固定测试集表现出现质量漂移。', explanation: '延迟和错误率正常，但 Benchmark 连续三轮低于历史基线。', errors: '错误率稳定，无集中错误码', qualityKind: 'drift', started: '昨天 18:20', startedOffset: 64800000 },
      { id: 'proxy-07', modelId: 'claude-sonnet', providerId: 'beichen', current: 4080, baseline: 3400, total: 7900, totalBaseline: 7200, tps: 44, tpsDelta: -3, calls: 860, failures: 7, cost: 35.3, quality: 88, qualityBase: 92, error: '', status: 'confirm', action: '立即复测', impact: { tasks: 0, project: '模型一致性测试', ddl: '今日待完成', failedCalls: 7 }, cause: '存在疑似模型不一致信号，需要复测确认。', explanation: 'Fingerprint 发生变化，与官方直连的固定测试结果差异 18%。', errors: '无集中错误码', qualityKind: 'mismatch', fingerprint: 'fp_9c2 → fp_41a', directGap: 18, started: '今天 11:50', startedOffset: 14400000 },
      { id: 'official-opus', line: '官方直连', modelId: 'claude-opus', providerId: 'anthropic', current: 3020, baseline: 3150, total: 8200, totalBaseline: 8400, tps: 38, tpsDelta: 2, calls: 540, failures: 2, cost: 6, quality: 91, qualityBase: 91, error: '', status: 'billing', alertReasons: ['supplier_balance'], action: '去充值', impact: { tasks: 0, project: '新任务可能失败', ddl: '预计 6 小时后耗尽', failedCalls: 2 }, cause: '供应商余额低于安全阈值。', explanation: '供应商余额不足报警：当前余额低于 $50 安全阈值，调用尚未中断，预计可用 6 小时。', errors: '暂无余额导致的失败', qualityKind: 'normal', started: '今天 14:00', startedOffset: 1800000 },
      { id: 'official-gpt', line: '官方直连', modelId: 'gpt-41', providerId: 'openai', current: 2790, baseline: 3100, total: 6100, totalBaseline: 6400, tps: 49, tpsDelta: 4, calls: 1320, failures: 3, cost: 68.6, quality: 93, qualityBase: 93, error: '', status: 'normal', action: '查看详情', impact: { tasks: 3, project: '3 个运行任务', ddl: '无紧迫 DDL', failedCalls: 3 }, cause: '当前线路运行正常。', explanation: '性能、质量、错误率和账户余额均处于历史基线范围。', errors: '3 次偶发错误', qualityKind: 'normal', started: '—' },
      { id: 'official-sonnet', line: '官方直连', modelId: 'claude-sonnet', providerId: 'anthropic', current: 3100, baseline: 3420, total: 7200, totalBaseline: 7750, tps: 45, tpsDelta: 2, calls: 840, failures: 2, cost: 54.8, quality: 94, qualityBase: 94, error: '', status: 'normal', action: '查看详情', impact: { tasks: 1, project: '官方直连对照', ddl: '无紧迫 DDL', failedCalls: 2 }, cause: '当前线路运行正常。', explanation: '同类请求与固定测试集未发现明显回退，可作为对照线路。', errors: '2 次偶发错误', qualityKind: 'normal', started: '—' },
      { id: 'proxy-11', modelId: 'qwen', providerId: 'qinghe', current: 920, baseline: 980, total: 3900, totalBaseline: 4100, tps: 57, tpsDelta: 5, calls: 1560, failures: 3, cost: 10.5, quality: 91, qualityBase: 91, error: '', status: 'normal', action: '查看详情', impact: { tasks: 1, project: '金融文档', ddl: '距 DDL 6 天', failedCalls: 3 }, cause: '当前线路运行正常。', explanation: '性能、质量与错误率均在历史基线范围内。', errors: '3 次偶发错误', qualityKind: 'normal', started: '—' }
    ];
    const routes = specs.map(spec => {
      const wave = spec.current >= spec.baseline * 1.5 ? [1.02, 1.10, 1.04, 1.22, 1.18, 1.34, 1.42, 1.56, 2.10, 2.42, 3.22, spec.current / spec.baseline] : [0.96, 1.02, 0.98, 1.04, 1.01, 0.99, 1.03, 1.02, 0.98, 1.04, 1.01, spec.current / spec.baseline];
      const usageWindows = [
        ['1h', '近 1 小时', 1, 1, 1],
        ['24h', '近 24 小时', 22, 18, 21.7],
        ['7d', '近 7 天', 142, 108, 139.5],
        ['30d', '近 30 天', 585, 430, 572]
      ].reduce((windows, [id, windowLabel, callFactor, failureFactor, costFactor]) => {
        windows[id] = { calls: Math.round(spec.calls * callFactor), failures: Math.round(spec.failures * failureFactor), costUsd: Math.round(spec.cost * costFactor * 100) / 100, checkedAt: at, windowLabel };
        return windows;
      }, {});
      return {
        id: spec.id, modelId: spec.modelId, providerId: spec.providerId, protocol: models.find(model => model.id === spec.modelId).requiredProtocol, enabled: true, routable: true,
        checkedAt: at, outcome: 'passed', errorCode: spec.error,
        latency: { metric: 'ttft_p95', currentMs: spec.current, baselineMs: spec.baseline, sampleCount: Math.max(20, Math.floor((spec.calls - spec.failures) / 12)), baselineSampleCount: 2400, comparable: true, checkedAt: at, windowLabel: '最近 5 分钟', baselineLabel: '过去 7 天 · 相同模型 · 相近输入长度请求的中位数' },
        quality: { status: spec.qualityKind === 'drift' ? 'regressed' : 'normal', score: spec.quality, baselineScore: spec.qualityBase, sampleCount: 100, baselineSampleCount: 100, testSetId: 'forge-canary-v3', baselineTestSetId: 'forge-canary-v3', rubricId: 'rubric-2026-09', baselineRubricId: 'rubric-2026-09', checkedAt: at },
        usage: { ...usageWindows['1h'], windows: usageWindows },
        demoEvidence: { line: spec.line || spec.id, status: spec.status, alertReasons: spec.alertReasons || [], action: spec.action, cause: spec.cause, explanation: spec.explanation, errors: spec.errors, qualityKind: spec.qualityKind, fingerprint: spec.fingerprint || '', directGap: spec.directGap || 0, totalMs: spec.total, totalBaselineMs: spec.totalBaseline, tokensPerSecond: spec.tps, tokensPerSecondDelta: spec.tpsDelta, impact: spec.impact, abnormalStartedAt: spec.started, abnormalStartedAtMs: Number.isFinite(spec.startedOffset) ? at - spec.startedOffset : null,
          tests: spec.qualityKind === 'drift' ? 'Benchmark 86.8 → 76.4 · 连续 3 轮下降' : spec.qualityKind === 'mismatch' ? 'Fingerprint 变化 · 与官方直连差异 18%' : '固定测试集处于历史基线范围',
          trend: wave.map((value, index) => ({ at: at - (11 - index) * 300000, ms: Math.round(spec.baseline * value) })) }
      };
    });
    return { status: 'ready', synthetic: true, catalogComplete: true, catalogCheckedAt: at, freshnessMs: 86400000, models, providers, routes };
  }
  // model-status-demo:end
