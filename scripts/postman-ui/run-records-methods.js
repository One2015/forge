  // pm-run-records-methods:start
  runModelSummary(rec) {
    // Only run-scoped usage is evidence of execution; current Pipeline configuration is not.
    const telemetry=Array.isArray(this.props.runTelemetry)?this.props.runTelemetry:null;
    const explicit=Array.isArray(rec.modelsUsed)?rec.modelsUsed:null;
    const mock=!telemetry && !explicit && rec.id==='20260825-093412-a4f7c1';
    const source=explicit || (telemetry ? telemetry.filter(row=>row.runId===rec.id && Number(row.calls)>0) : mock ? [{modelName:'Claude Sonnet 4.5'},{modelName:'GPT-4.1'}] : []);
    const names=[...new Set(source.map(row=>typeof row==='string'?row:row?.modelName || row?.model || row?.modelId).filter(name=>typeof name==='string' && name.trim()).map(name=>name.trim()))];
    return {names:names.map(name=>({name})),empty:!names.length,mock};
  }
  runRecordsValues() {
    const st=this.state, now=Date.now(), anchor=this._runRecordsAnchor||(this._runRecordsAnchor=now);
    const raw=this.runsData().map(r=>({...r,itemIds:r.itemIds?.length?r.itemIds:(this.dsData().find(d=>d.name===r.dsName)?.items||[]).slice(0,r.n).map(i=>i[0])}));
    const synthetic=!Array.isArray(this.props.runTelemetry);
    const telemetry=synthetic?ForgeRunRecords.mockTelemetry(raw):this.props.runTelemetry;
    const all=ForgeRunRecords.calculate(raw,{now,anchor,telemetry,timings:Array.isArray(this.props.runTimings)?this.props.runTimings:ForgeRunRecords.mockTimings(),decisions:st.reviewDecisions,itemTech:st.runItemTech});
    const patch=p=>this.setState({runsPage:1,runsMenu:'',...p});
    const clear=()=>patch({runsQuery:'',runsFilter:'全部',runsMine:false});
    const filter=({'运行中':'running','成功':'completed','运行完成':'completed','失败':'failed','运行失败':'failed','排队中':'queued','已取消':'cancelled'})[st.runsFilter]||'all';
    const query=String(st.runsQuery||'').trim().toLowerCase();
    const matches=all.rows.filter(r=>(filter==='all'||r.state===filter)&&(!st.runsMine||r.owner===(this.props.currentUser||'一万'))&&(!query||[r.strategy,r.name,r.pipe,r.dsName,r.id,r.owner].join(' ').toLowerCase().includes(query))).sort((a,b)=>b.started-a.started);
    const size=[10,20,50].includes(Number(st.runsPageSize))?Number(st.runsPageSize):10, pages=Math.max(1,Math.ceil(matches.length/size)), page=Math.min(pages,Math.max(1,Number(st.runsPage)||1));
    const stop=e=>e?.stopPropagation();
    const open=(r,failures=false)=>e=>{stop(e);const index=Array.from({length:r.n},(_,i)=>i).find(i=>(st.runItemTech?.[r.id+':'+i]?.status|| (i<r.done?'success':i<r.done+r.running?'running':i<r.done+r.running+r.failed?'failed':'queued'))==='failed');this.setState({view:'run',activeRun:r.id,runItem:failures&&index!=null?r.id+':'+index:null,runsMenu:''});if(failures&&index!=null)setTimeout(()=>{if(typeof document!=='undefined')document.querySelectorAll('.pm-run-item')[index]?.scrollIntoView({block:'center',behavior:'instant'});},100);};
    const labels={queued:'排队中',running:'运行中',completed:'运行完成',failed:'运行失败',cancelled:'已取消'};
    const rows=matches.slice((page-1)*size,page*size).map(r=>{
      const action=r.state==='failed'?'cause':r.counts.failed?'failed':r.state==='completed'&&r.counts.review?'review':'detail';
      const detail=open(r), failed=open(r,true), review=e=>{stop(e);this.setState({runsMenu:''});this.openReview(r.id);};
      const counts=r.counts;
      const progress=[['queued','排队'],['processing','处理中'],['review','待审核'],['passed','已通过'],['failed','失败'],['cancelled','未完成']].filter(([key])=>counts[key]).map(([key,label])=>counts[key]+' '+label).join(' · ')+' / '+r.n;
      const duration=r.duration==null?'—':r.duration<60000?Math.round(r.duration/1000)+' s':(r.duration>=3600000?Math.floor(r.duration/3600000)+'h ':'')+Math.floor(r.duration/60000%60)+'m '+String(Math.floor(r.duration/1000%60)).padStart(2,'0')+'s';
      const detailLabel=r.state==='running'?'查看进度':r.state==='completed'?'查看结果':'查看详情';
      return {...r,isRunning:r.state==='running',isComplete:r.state==='completed',statusLabel:labels[r.state],progress,durationLabel:duration,durationHint:r.duration==null?'当前记录未提供执行耗时':(r.durationSynthetic?'Mock 执行时长快照 · ':'')+(r.state==='running'?'已运行时长':'执行耗时'),costLabel:all.money(r.costNumber),when:this.ago(Number(Math.max(0,(now-r.started)/3600000).toFixed(1))),timeFull:new Date(r.started).toLocaleString('zh-CN',{hour12:false}),
        segments:[['queued','排队'],['processing','处理中'],['review','待审核'],['passed','已通过'],['failed','失败'],['cancelled','未完成']].filter(([key])=>counts[key]).map(([key,label])=>({key,width:(r.n?counts[key]/r.n*100:0)+'%',label:label+' '+counts[key]})),
        open:detail,keyOpen:e=>{if(e.target!==e.currentTarget||!['Enter',' '].includes(e.key))return;e.preventDefault();detail(e);},
        actionTone:action,actionLabel:({cause:'查看原因',failed:'查看失败项',review:'去审核',detail:detailLabel})[action],action:action==='review'?review:['failed','cause'].includes(action)?failed:detail,
        copy:e=>{stop(e);this.copyRunRecordId(r.id);},copyLabel:st.runsCopied===r.id?'已复制':'复制 Run ID '+r.id};
    });
    const kpis=[['all','全部',all.rows.length,'','当前范围内的全部运行记录'],['running','运行中',all.running,'','按运行状态统计'],['review','待审核',all.review,'','所有运行的待审核 Item 总数'],['failed','运行失败',all.failed,'','仅统计运行失败；不包含运行已完成但部分 Item 失败']].map(([key,label,value,hint,title])=>({key,label,value,hint,hasHint:!!hint,title}));
    return {rows,kpis,subtitle:raw.length+' 次运行',count:matches.length+' / '+raw.length,hasAny:!!raw.length,empty:!matches.length,emptyTitle:raw.length?'没有匹配的运行':'还没有运行记录',emptyHint:raw.length?'试试减少筛选条件，或换个关键词。':'从 Pipeline 发起运行后，记录会显示在这里。',query:st.runsQuery||'',onQuery:e=>patch({runsQuery:e.target.value}),mineSelected:!!st.runsMine,toggleMine:()=>patch({runsMine:!st.runsMine}),
      filters:[['all','全部'],['running','运行中'],['completed','运行完成'],['failed','运行失败'],['queued','排队中'],['cancelled','已取消']].map(([key,label])=>({label,selected:filter===key,pick:()=>patch({runsFilter:label})})),
      hasFilters:!!query||filter!=='all'||!!st.runsMine,clear,metricLabel:'',hasMetric:false,
      total:matches.length,page,pages,size,first:page===1,last:page===pages,prev:()=>this.setState({runsPage:Math.max(1,page-1)}),next:()=>this.setState({runsPage:Math.min(pages,page+1)}),setSize:e=>patch({runsPageSize:Number(e.target.value)}),
      notice:st.runsNotice||'',hasNotice:!!st.runsNotice,dismiss:()=>this.setState({runsNotice:''})};
  }
  async copyRunRecordId(id) {
    try { if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw Error('clipboard unavailable'); await navigator.clipboard.writeText(id);this.setState({runsCopied:id,runsNotice:'Run ID 已复制'}); }
    catch {this.setState({runsNotice:'复制失败，请选中 Run ID 手动复制。'});}
  }
  // pm-run-records-methods:end
