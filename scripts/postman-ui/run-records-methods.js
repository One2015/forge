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
    const patch=p=>this.setState({runsPage:1,runsMenu:'',runsFilterMenu:null,...p});
    const clear=()=>patch({runsQuery:'',runsFilter:'全部',runsMine:false,runsOwner:'',runsAction:'all'});
    const filter=({'运行中':'running','成功':'completed','运行完成':'completed','失败':'failed','运行失败':'failed','排队中':'queued','已取消':'cancelled'})[st.runsFilter]||'all';
    const query=String(st.runsQuery||'').trim().toLowerCase();
    const currentUser=this.props.currentUser||'一万';
    const owners=[...new Set(all.rows.map(r=>r.owner).filter(Boolean))];
    const requestedOwner=String(st.runsOwner||(st.runsMine?'mine':'')).trim();
    const resolvedOwner=requestedOwner==='mine'?currentUser:requestedOwner;
    const owner=owners.includes(resolvedOwner)?resolvedOwner:'';
    const actionOf=r=>r.counts.review>0?'review':(r.n>0&&r.counts.failed===r.n)||r.state==='failed'?'cause':r.state==='running'?'progress':r.state==='completed'?'result':'detail';
    const actionLabels={review:'人工审核',cause:'查看原因',progress:'查看进度',result:'查看结果',detail:'查看详情'};
    const actionFilterValue=Object.hasOwn(actionLabels,st.runsAction)?st.runsAction:'all';
    const matches=all.rows.filter(r=>(actionFilterValue==='all'||actionOf(r)===actionFilterValue)&&(filter==='all'||r.state===filter)&&(!owner||r.owner===owner)&&(!query||[r.strategy,r.name,r.pipe,r.dsName,r.id,r.owner].join(' ').toLowerCase().includes(query))).sort((a,b)=>b.started-a.started);
    const size=[10,20,50].includes(Number(st.runsPageSize))?Number(st.runsPageSize):10, pages=Math.max(1,Math.ceil(matches.length/size)), page=Math.min(pages,Math.max(1,Number(st.runsPage)||1));
    const stop=e=>e?.stopPropagation();
    const open=(r,failures=false)=>e=>{stop(e);const index=Array.from({length:r.n},(_,i)=>i).find(i=>(st.runItemTech?.[r.id+':'+i]?.status|| (i<r.done?'success':i<r.done+r.running?'running':i<r.done+r.running+r.failed?'failed':'queued'))==='failed');this.setState({view:'run',activeRun:r.id,runItem:failures&&index!=null?r.id+':'+index:null,runsMenu:''});if(failures&&index!=null)setTimeout(()=>{if(typeof document!=='undefined')document.querySelectorAll('.pm-run-item')[index]?.scrollIntoView({block:'center',behavior:'instant'});},100);};
    const labels={queued:'排队中',running:'运行中',completed:'运行完成',failed:'运行失败',cancelled:'已取消'};
    const rows=matches.slice((page-1)*size,page*size).map(r=>{
      const detail=open(r), failed=open(r,true), review=e=>{stop(e);this.setState({runsMenu:''});this.openReview(r.id);};
      const counts=r.counts;
      const actionKey=actionOf(r),action=['review','cause'].includes(actionKey)?actionKey:'detail';
      const progress=[['queued','排队'],['processing','处理中'],['review','待审核'],['passed','已通过'],['failed','失败'],['cancelled','未完成']].filter(([key])=>counts[key]).map(([key,label])=>counts[key]+' '+label).join(' · ')+' / '+r.n;
      const duration=r.duration==null?'—':r.duration<60000?Math.round(r.duration/1000)+' s':(r.duration>=3600000?Math.floor(r.duration/3600000)+'h ':'')+Math.floor(r.duration/60000%60)+'m '+String(Math.floor(r.duration/1000%60)).padStart(2,'0')+'s';
      return {...r,isRunning:r.state==='running',isComplete:r.state==='completed',statusLabel:labels[r.state],progress,durationLabel:duration,durationHint:r.duration==null?'当前记录未提供执行耗时':(r.durationSynthetic?'Mock 执行时长快照 · ':'')+(r.state==='running'?'已运行时长':'执行耗时'),costLabel:all.money(r.costNumber),when:this.ago(Number(Math.max(0,(now-r.started)/3600000).toFixed(1))),timeFull:new Date(r.started).toLocaleString('zh-CN',{hour12:false}),
        segments:[['queued','排队'],['processing','处理中'],['review','待审核'],['passed','已通过'],['failed','失败'],['cancelled','未完成']].filter(([key])=>counts[key]).map(([key,label])=>({key,width:(r.n?counts[key]/r.n*100:0)+'%',label:label+' '+counts[key]})),
        open:detail,keyOpen:e=>{if(e.target!==e.currentTarget||!['Enter',' '].includes(e.key))return;e.preventDefault();detail(e);},
        actionTone:action,actionKey,actionLabel:actionLabels[actionKey],action:action==='review'?review:action==='cause'?failed:detail};
    });
    const kpis=[['all','全部',all.rows.length,'','当前范围内的全部运行记录'],['review','待审核',all.review,'','所有运行的待审核 Item 总数'],['running','运行中',all.running,'','按运行状态统计'],['failed','运行失败',all.failed,'','仅统计运行失败；不包含运行已完成但部分 Item 失败']].map(([key,label,value,hint,title])=>({key,label,value,hint,hasHint:!!hint,title,priority:['review','failed'].includes(key)?'primary':'secondary'}));
    const filterCount=Number(filter!=='all')+Number(!!owner)+Number(actionFilterValue!=='all');
    const menuState=st.runsFilterMenu||null;
    const focusFilter=key=>{if(typeof document==='undefined')return;setTimeout(()=>document.getElementById('rr-filter-'+key)?.focus(),0);};
    const closeFilterMenu=event=>{event?.preventDefault?.();event?.stopPropagation?.();const key=menuState?.key;this.setState({runsFilterMenu:null});if(key)focusFilter(key);};
    const makeFilter=(key,ariaLabel,selected,options,apply)=>{
      const current=options.find(option=>option[0]===selected)||options[0],open=menuState?.key===key;
      return {key,ariaLabel,label:selected===options[0][0]?ariaLabel:current[1],selectionLabel:current[1],open,filtered:selected!==options[0][0],left:open?menuState.left:0,top:open?menuState.top:0,width:open?menuState.width:0,placement:open?menuState.placement:'bottom',
        toggle:event=>{event?.preventDefault?.();event?.stopPropagation?.();if(open){closeFilterMenu(event);return;}const rect=event?.currentTarget?.getBoundingClientRect?.()||{left:12,top:48,bottom:84,width:176};const viewportWidth=typeof window==='undefined'?1440:Number(window.innerWidth)||1440,viewportHeight=typeof window==='undefined'?900:Number(window.innerHeight)||900;const labelWidth=label=>Array.from(String(label)).reduce((sum,character)=>sum+(/[^\u0000-\u00ff]/.test(character)?14:8),0);const naturalWidth=Math.ceil(Math.max(...options.map(option=>labelWidth(option[1])))+48),width=Math.min(viewportWidth-24,Math.max(Math.ceil(rect.width||0),naturalWidth));const rawLeft=Math.round(rect.left),rectRight=Math.round(Number(rect.right)||rawLeft+Number(rect.width||0));const left=rawLeft+width<=viewportWidth-12?Math.max(12,rawLeft):Math.max(12,Math.min(rectRight-width,viewportWidth-width-12));const optionHeight=viewportWidth<=760?44:36,height=Math.min(288,options.length*optionHeight+8),below=viewportHeight-rect.bottom>=height+12,placement=below?'bottom':'top',desiredTop=below?rect.bottom+6:rect.top-height-6,top=Math.max(12,Math.min(Math.round(desiredTop),viewportHeight-height-12));this.setState({runsFilterMenu:{key,left,top,width,placement}});if(event?.detail===0&&typeof document!=='undefined')setTimeout(()=>document.querySelector('#rr-filter-menu [aria-checked="true"]')?.focus(),0);},
        options:options.map(([value,label])=>({value,label,selected:value===selected,pick:event=>{event?.preventDefault?.();event?.stopPropagation?.();apply(value);focusFilter(key);}}))};
    };
    const filterControls=[
      makeFilter('status','运行状态',filter,[['all','全部状态'],['running','运行中'],['completed','运行完成'],['failed','运行失败'],['queued','排队中'],['cancelled','已取消']],value=>patch({runsFilter:value==='all'?'全部':labels[value]||'全部'})),
      makeFilter('owner','发起人',owner||'all',[['all','全部发起人'],...owners.map(name=>[name,name])],value=>patch({runsOwner:value==='all'?'':value,runsMine:false})),
      makeFilter('action','操作',actionFilterValue,[['all','全部操作'],...Object.entries(actionLabels).filter(([key])=>['review','cause','progress'].includes(key)||all.rows.some(row=>actionOf(row)===key))],value=>patch({runsAction:value}))
    ];
    const activeFilter=filterControls.find(control=>control.open)||null;
    const statusFilter=filterControls[0],ownerFilter=filterControls[1],actionFilter=filterControls[2];
    const filterMenuKey=event=>{if(event.key==='Escape'){closeFilterMenu(event);return;}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const options=Array.from(event.currentTarget?.querySelectorAll?.('.rr-filter-option')||[]);if(!options.length)return;event.preventDefault();const index=options.indexOf(typeof document==='undefined'?null:document.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowUp'?(index<=0?options.length-1:index-1):(index+1)%options.length;options[next].focus();};
    return {rows,kpis,subtitle:raw.length+' 次运行',count:matches.length+' / '+raw.length,hasAny:!!raw.length,empty:!matches.length,emptyTitle:raw.length?'没有匹配的运行':'还没有运行记录',emptyHint:raw.length?'试试减少筛选条件，或换个关键词。':'从 Pipeline 发起运行后，记录会显示在这里。',query:st.runsQuery||'',onQuery:e=>patch({runsQuery:e.target.value}),filter,setFilter:e=>patch({runsFilter:e.target.value==='all'?'全部':labels[e.target.value]||'全部'}),owner,filterCount,hasFilterSelections:filterCount>0,filterControls,statusFilter,ownerFilter,actionFilter,activeFilter,filterMenuOpen:!!activeFilter,closeFilterMenu,filterMenuKey,
      filters:[['all','全部'],['running','运行中'],['completed','运行完成'],['failed','运行失败'],['queued','排队中'],['cancelled','已取消']].map(([key,label])=>({label,selected:filter===key,pick:()=>patch({runsFilter:label})})),
      hasFilters:!!query||filter!=='all'||!!owner||actionFilterValue!=='all',clear,metricLabel:'',hasMetric:false,
      total:matches.length,page,pages,size,first:page===1,last:page===pages,prev:()=>this.setState({runsPage:Math.max(1,page-1)}),next:()=>this.setState({runsPage:Math.min(pages,page+1)}),setSize:e=>patch({runsPageSize:Number(e.target.value)}),
      notice:st.runsNotice||'',hasNotice:!!st.runsNotice,dismiss:()=>this.setState({runsNotice:''})};
  }
  async copyRunRecordId(id) {
    try { if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw Error('clipboard unavailable'); await navigator.clipboard.writeText(id);this.setState({runsCopied:id,runsNotice:'Run ID 已复制'}); }
    catch {this.setState({runsNotice:'复制失败，请选中 Run ID 手动复制。'});}
  }
  runItemStatusValues(run, runId) {
    const states = [['all', '全部状态'], ['success', '待审核'], ['running', '运行中'], ['failed', '失败'], ['queued', '排队中'], ['stopping', '停止中'], ['stopped', '已停止'], ['cancelled', '已取消']];
    const saved = this.state.runItemStatusFilters?.[runId] || 'all';
    const selected = states.some(([key]) => key === saved) ? saved : 'all';
    const rows = run.items;
    const items = selected === 'all' ? rows : rows.filter(item => item.statusKey === selected);
    return {...run, items,
      itemHint: selected === 'all' ? run.itemHint : '显示 ' + items.length + ' / ' + rows.length + ' 条 · 节点进度按 18 步计',
      statusFilter: selected,
      statusOptions: states.map(([value, label]) => ({value, label})),
      filterStatus: event => {
        const value = event.target.value;
        if (!states.some(([key]) => key === value)) return;
        this.setState({runItemStatusFilters: {...this.state.runItemStatusFilters, [runId]: value}});
      },
      noStatusMatches: !items.length,
      clearStatusFilter: () => this.setState({runItemStatusFilters: {...this.state.runItemStatusFilters, [runId]: 'all'}})
    };
  }
  // pm-run-records-methods:end
