// Task and Attempt diagnostics. No authenticated production logs are bundled.
const ForgeTaskErrors = (() => {
  const reasons = {validation:'数据校验失败',sandbox:'沙盒执行失败',model:'模型调用失败',other:'其他'};
  const day = ms => new Date(ms + 8*3600000).toISOString().slice(0,10);
  const terminal = r => ['success','partial','completed','failed'].includes(r.status);
  const state = (r,i,tech) => tech[r.id+':'+i]?.status || (i<r.done?'success':i<r.done+r.running?'running':i<r.done+r.running+r.failed?'failed':'queued');
  function fixtures(runs,anchor) {
    const examples = [
      ['validation','validate_output','产物缺少必填字段','ValidationError: required field "output_path" is missing.'],
      ['sandbox','build','沙盒执行超时','TimeoutError: execution exceeded the configured time limit.'],
      ['model','generate','模型请求被限流','RateLimitError: request limit reached. Retry after the provider cooldown.'],
      ['validation','evaluate','产物未通过验收检查','ValidationError: output does not satisfy the configured postcondition.']
    ];
    return runs.filter(r=>/^202608/.test(r.id)).flatMap((r,ri)=> {
      const start = anchor-(r.h||0)*3600000;
      const out=[];
      for(let i=0;i<r.n;i++) {
        const failed=state(r,i,{})==='failed';
        // A recovered execution demonstrates why Attempt and Item totals differ.
        if(!failed && !(i===0 && r.status==='success'))continue;
        const spec=examples[(ri+i)%examples.length], tries=failed && i%2===0?2:1;
        for(let n=1;n<=tries;n++)out.push({id:`demo-${r.id}-${i}-${n}`,runId:r.id,itemId:r.itemIds[i],index:i,node:spec[1],status:'failed',type:spec[0],summary:spec[2],message:spec[3],at:start+n*60000,synthetic:true});
      }
      return out;
    });
  }
  function calculate(runs, attempts, {anchor=Date.now(),owner='',start='',end='',mode='item',type='',date='',query='',page=1,tech={},direction='desc'}={}) {
    const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00+08:00'));
    const invalid=!!(start&&!validDate(start)||end&&!validDate(end)||start&&end&&start>end);
    const scope=invalid?[]:runs.filter(r=>{
      const at=Date.parse(r.createdAt||'') || anchor-(r.h||0)*3600000;
      const d=day(at);return (!owner||r.owner===owner)&&(!start||d>=start)&&(!end||d<=end);
    });
    const map=new Map(scope.map(r=>[r.id,r]));
    const seen=new Set();
    const errors=attempts.filter(a=>{const r=map.get(a.runId);if(!r||a.status!=='failed'||a.businessStop||!Number.isFinite(a.at)||seen.has(a.id)||!a.itemId)return false;seen.add(a.id);return true;}).map(a=>({...a,run:map.get(a.runId),type:reasons[a.type]?a.type:'other'}));
    const items=new Map();
    for(const a of errors){const r=a.run,index=Number.isInteger(a.index)&&r.itemIds[a.index]===a.itemId?a.index:r.itemIds.indexOf(a.itemId);if(index<0||state(r,index,tech)!=='failed')continue;const key=r.id+':'+index;if(!items.has(key)||items.get(key).at<a.at)items.set(key,a);}
    const failedItems=scope.reduce((sum,r)=>sum+Array.from({length:r.n},(_,i)=>state(r,i,tech)==='failed'?1:0).reduce((a,b)=>a+b,0),0);
    const completed=scope.filter(terminal),failedRuns=completed.filter(r=>r.status==='failed');
    const records=mode==='attempt'?errors:[...items.values()];
    const distribution=Object.entries(reasons).map(([key,label])=>({key,label,count:records.filter(a=>a.type===key).length})).sort((a,b)=>b.count-a.count);
    const dates=[...new Set(records.map(a=>day(a.at)))].sort();
    if(dates.length>1){const first=Date.parse(dates[0]+'T00:00:00Z'),last=Date.parse(dates[dates.length-1]+'T00:00:00Z');if((last-first)/86400000<366){dates.length=0;for(let t=first;t<=last;t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));}}
    const trend=dates.map(date=>({date,count:records.filter(a=>day(a.at)===date).length}));
    const q=query.trim().toLowerCase();
    const filtered=records.filter(a=>(!type||a.type===type)&&(!date||day(a.at)===date)&&(!q||[a.id,a.runId,a.itemId,a.run.name,a.run.pipe,a.node,a.summary,a.message].join(' ').toLowerCase().includes(q))).sort((a,b)=>(direction==='asc'?a.at-b.at:b.at-a.at)||a.id.localeCompare(b.id));
    const pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.max(1,Math.min(pages,Math.floor(Number(page))||1));
    return {invalid,scope,errors,records,failedItems,failedAttempts:errors.length,affected:new Set(errors.map(a=>a.runId)).size,rate:completed.length?failedRuns.length/completed.length*100:null,completed:completed.length,failedRuns:failedRuns.length,distribution,trend,total:filtered.length,pages,page:current,rows:filtered.slice((current-1)*10,current*10)};
  }
  return {calculate,fixtures,reasons,day,state};
})();
