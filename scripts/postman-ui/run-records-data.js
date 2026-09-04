// pm-run-records-data:start
const ForgeRunRecords = (() => {
  const money = value => '$' + value.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
  const amount = value => Math.max(0, Number(String(value ?? 0).replace(/[^\d.-]/g,'')) || 0);
  const date = value => { if(value == null || value === '')return null;const n=Number.isFinite(Number(value))?Number(value):Date.parse(value);return Number.isFinite(n)?n:null; };
  const status = value => ({success:'completed',partial:'completed',completed:'completed',running:'running',failed:'failed',queued:'queued',cancelled:'cancelled',stopped:'cancelled'})[value] || 'queued';
  function calculate(records, {now=Date.now(), anchor=now, telemetry=[], timings=[], decisions={}, itemTech={}}={}) {
    const day = new Date(now); day.setHours(0,0,0,0);
    const yesterday = new Date(day); yesterday.setDate(yesterday.getDate()-1);
    const rows = records.map(r => {
      const counts = {queued:0,processing:0,review:0,passed:0,failed:0,cancelled:0};
      for(let i=0;i<r.n;i++) {
        const id=r.itemIds?.[i];
        const decision=id ? decisions[r.id+':'+id] : null;
        const tech=itemTech[r.id+':'+i]?.status;
        const base=i<r.done?'success':i<r.done+r.running?'running':i<r.done+r.running+r.failed?'failed':'queued';
        const state=tech||base;
        const target=state==='success'?(decision==='pass'?'passed':decision==='rework'?'cancelled':i<(r.approved||r.passed||0)?'passed':'review'):({running:'processing',failed:'failed',queued:'queued',stopped:'cancelled',cancelled:'cancelled'})[state]||'queued';
        counts[target]++;
      }
      // Explicit review counts from a future API take priority over the legacy done aggregate.
      if(Number.isInteger(r.pendingReview)&&r.pendingReview>=0) { counts.review=Math.min(r.n,r.pendingReview); counts.passed=Math.min(r.n-counts.review,Math.max(0,r.approved||r.passed||0)); }
      const started=date(r.startedAt ?? r.createdAt) ?? anchor-(Number(r.h)||0)*3600000;
      const ended=date(r.completedAt ?? r.finishedAt);
      const executionStart=date(r.startedAt), timing=timings.find(t=>t.runId===r.id);
      const actualDuration=Number.isFinite(r.durationMs)?Math.max(0,r.durationMs):executionStart!=null&&ended!=null&&ended>=executionStart?ended-executionStart:status(r.status)==='running'&&executionStart!=null?Math.max(0,now-executionStart):Number.isFinite(r.elapsedMs)?Math.max(0,r.elapsedMs):null;
      const duration=actualDuration ?? (Number.isFinite(timing?.durationMs)?Math.max(0,timing.durationMs):status(r.status)==='queued'?0:null);
      const durationSynthetic=actualDuration==null&&!!timing?.synthetic;
      const usage=telemetry.filter(x=>x.runId===r.id&&Number.isFinite(x.calls)&&Number.isFinite(x.successes)&&x.calls>=0&&x.successes>=0&&x.successes<=x.calls);
      return {...r, state:status(r.status), counts, started, duration, durationSynthetic, costNumber:amount(r.cost), today:started>=+day&&started<=now, yesterday:started>=+yesterday&&started<+day, usage};
    });
    const todayCost=rows.filter(r=>r.today).reduce((s,r)=>s+r.costNumber,0), yesterdayCost=rows.filter(r=>r.yesterday).reduce((s,r)=>s+r.costNumber,0);
    const usage=rows.flatMap(r=>r.usage), calls=usage.reduce((s,x)=>s+x.calls,0), successes=usage.reduce((s,x)=>s+x.successes,0);
    return {rows, running:rows.filter(r=>r.state==='running').length, review:rows.reduce((s,r)=>s+r.counts.review,0), failed:rows.filter(r=>r.state==='failed').length,
      todayCost, yesterdayCost, costLabel:money(todayCost), delta:yesterdayCost ? '较昨日 '+(todayCost>=yesterdayCost?'+':'−')+Math.abs((todayCost-yesterdayCost)/yesterdayCost*100).toFixed(1)+'%' : '暂无昨日对比',
      calls,successes, successRate:calls?successes/calls*100:null, modelLabel:calls?(successes/calls*100).toFixed(1)+'%':'—', money};
  }
  // Missing per-run telemetry uses an explicit isolated fixture, not invented API values.
  function mockTelemetry(records) {
    const ids=['20260825-093412-a4f7c1','20260825-081120-7b3e9d','20260825-034505-c19f2a','20260824-215530-2c2f09','20260824-170415-c8e7d8','20260824-142208-5e1b6f','20260824-163805-814774','20260811-104412-9d3a71','20260821-094005-3f8b2e'];
    return ids.filter(id=>records.some(r=>r.id===id)).map((runId,i)=>({runId,calls:i===0?2000:1000,successes:i===0?1952:976,synthetic:true}));
  }
  function mockTimings() {
    // Execution snapshots for the nine legacy mock runs, never submission age.
    return [['20260825-093412-a4f7c1',462],['20260825-081120-7b3e9d',388],['20260825-034505-c19f2a',2648],['20260824-215530-2c2f09',1894],['20260824-170415-c8e7d8',156],['20260824-142208-5e1b6f',2227],['20260824-163805-814774',73],['20260811-104412-9d3a71',824],['20260821-094005-3f8b2e',1090]].map(([runId,seconds])=>({runId,durationMs:seconds*1000,synthetic:true}));
  }
  return {calculate,mockTelemetry,mockTimings,status};
})();
// pm-run-records-data:end
