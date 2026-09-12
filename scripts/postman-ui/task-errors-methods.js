  taskErrorsValues() {
    const st=this.state,anchor=this._taskErrorsAnchor||(this._taskErrorsAnchor=Date.now());
    const raw=this.runsData().map(r=>{const cycle=r.itemMeta||(this.dsData().find(d=>d.name===r.dsName)?.items||[]);const picked=r.itemIds?cycle.filter(x=>r.itemIds.includes(x[0])):cycle.slice(0,r.n);return {...r,itemIds:Array.from({length:r.n},(_,i)=>(picked[i]||cycle[i%cycle.length]||[])[0]||r.itemIds?.[i]||(r.id.replace(/[^a-f0-9]/g,'')+String(i).padStart(2,'0')).slice(0,32))};});
    const demo=!Array.isArray(this.props.taskErrorAttempts),attempts=demo?ForgeTaskErrors.fixtures(raw,anchor):this.props.taskErrorAttempts;
    const opts={anchor,owner:st.teOwner||'',start:st.teStart||'',end:st.teEnd||'',mode:st.teMode||'item',type:st.teType||'',date:st.teDate||'',query:st.teQuery||'',page:st.tePage||1,tech:st.runItemTech||{},direction:st.teDirection||'desc'};
    const out=ForgeTaskErrors.calculate(raw,attempts,opts),patch=p=>this.setState({tePage:1,teDetail:'',...p});
    const fmt=n=>Number(n).toLocaleString('en-US'),time=at=>new Date(at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
    const decorate=a=>({...a,typeLabel:ForgeTaskErrors.reasons[a.type],name:a.run.subject||a.run.name,owner:a.run.owner,pipe:a.run.pipe,time:time(a.at),runHref:ForgeRoutes.write({view:'run',activeRun:a.runId}),itemHref:ForgeRoutes.write({view:'itemlife',lifeRun:a.runId,lifeItem:a.itemId,lifeFrom:'run',lifeRunIndex:a.index}),open:()=>{this.setState({teDetail:a.id});setTimeout(()=>document.getElementById('te-context-title')?.focus(),0);}});
    const detail=out.errors.find(a=>a.id===st.teDetail),maximum=Math.max(1,...out.trend.map(d=>d.count)),maxReason=Math.max(1,...out.distribution.map(d=>d.count));
    return {...out,...opts,demo,hasRecords:out.records.length>0,empty:!out.total,
      modeLabel:opts.mode==='attempt'?'失败 Attempt':'失败 Item',
      note:opts.mode==='attempt'?'每次执行失败均保留；后续重试成功不会移除历史错误。取消与正常业务停止不计入。':'仅统计当前最终失败的 Item；重试恢复后会减少。同一任务内的 Item 去重统计。',
      metrics:[{label:'失败 Item',value:fmt(out.failedItems),hint:'当前最终失败',tone:'error'},{label:'失败 Attempt',value:fmt(out.failedAttempts),hint:'包含重试失败记录',tone:'normal'},{label:'受影响任务',value:fmt(out.affected),hint:'存在失败 Attempt',tone:'normal'},{label:'任务失败率',value:out.rate===null?'—':out.rate.toFixed(1)+'%',hint:`${out.failedRuns} / ${out.completed} 个已结束任务 · 排除取消`,tone:'normal'}],
      ownerLabel:opts.owner||'全部',
      owners:[{value:'',label:'全部创建人'},...[...new Set(raw.map(r=>r.owner))].sort().map(value=>({value,label:value}))].map(o=>({...o,selected:opts.owner===o.value,pick:e=>{e?.target?.closest?.('details')?.removeAttribute('open');patch({teOwner:o.value});}})),
      setOwner:e=>patch({teOwner:e.target.value}),setStart:e=>patch({teStart:e.target.value}),setEnd:e=>patch({teEnd:e.target.value}),setQuery:e=>patch({teQuery:e.target.value}),
      reset:()=>patch({teOwner:'',teStart:'',teEnd:'',teQuery:'',teType:'',teDate:'',teDirection:'desc'}),
      modes:[['item','Item 级错误'],['attempt','Attempt 级错误']].map(([key,label])=>({label,selected:opts.mode===key,pick:()=>patch({teMode:key,teType:'',teDate:''})})),
      trend:out.trend.map((d,i)=>({...d,label:out.trend.length<=7||i===0||i===out.trend.length-1||i===Math.floor(out.trend.length/2)?d.date.slice(5).replace('-','/'):'',countLabel:d.count||'',title:d.date+' · '+d.count+' '+(opts.mode==='attempt'?'次失败':'项失败'),style:'height:'+d.count/maximum*100+'%',selected:opts.date===d.date,pick:()=>patch({teDate:opts.date===d.date?'':d.date})})),
      distribution:out.distribution.map(d=>({...d,width:'width:'+d.count/maxReason*100+'%',selected:opts.type===d.key,pick:()=>patch({teType:opts.type===d.key?'':d.key})})),
      filterLabel:[ForgeTaskErrors.reasons[opts.type],opts.date].filter(Boolean).join(' · '),hasFilter:!!opts.type||!!opts.date,clear:()=>patch({teType:'',teDate:''}),
      rows:out.rows.map(decorate),first:out.page===1,last:out.page===out.pages,prev:()=>patch({tePage:out.page-1}),next:()=>patch({tePage:out.page+1}),
      sortLabel:opts.direction==='desc'?'发生时间 ↓':'发生时间 ↑',sort:()=>patch({teDirection:opts.direction==='desc'?'asc':'desc'}),
      detailOpen:!!detail,close:()=>{this.setState({teDetail:''});setTimeout(()=>document.getElementById('te-list-title')?.focus(),0);},
      detail:detail?{...decorate(detail),attempts:out.errors.filter(a=>a.runId===detail.runId&&a.itemId===detail.itemId&&a.index===detail.index).sort((a,b)=>a.at-b.at).map(decorate),status:ForgeTaskErrors.state(detail.run,Number.isInteger(detail.index)?detail.index:detail.run.itemIds.indexOf(detail.itemId),opts.tech)==='failed'?'最终失败':'已恢复或正在重试'}:{},
      missing:opts.mode==='item'&&out.failedItems>out.records.length
    };
  }
